import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
    createPreference,
    createServiceClient,
    MpCredentialError,
    mpCorsHeaders,
} from "../_shared/mercadopago.ts";
import { requireAuthContext } from "../_shared/auth.ts";
import { calculateSchoolPricing } from "../_shared/school-pricing.ts";

// mp-create-preference (Onda 1)
// Resolve preço/plano NO SERVIDOR (nunca do cliente), cria uma purchase_intent
// e devolve o checkout_url do Mercado Pago.
// - individual: exige JWT válido; user_id vem do token, nunca do payload.
// - escolar: aceita chamada sem JWT (gestor pré-cadastro), exige contato.

interface RequestBody {
    kind?: string;
    plan_slug?: string;
    billing_interval?: string;
    seats_students?: number;
    seats_schools?: number;
    contact_email?: string;
    contact_name?: string;
    is_public_ngo?: boolean;
}

class ValidationError extends Error {
    status = 400;
}

function normalizeInterval(value: string | undefined): "monthly" | "yearly" {
    return value === "yearly" ? "yearly" : "monthly";
}

function jsonResponse(payload: unknown, status: number): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...mpCorsHeaders, "Content-Type": "application/json" },
    });
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: mpCorsHeaders });
    }

    try {
        const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
        if (!accessToken) {
            throw new MpCredentialError("MERCADO_PAGO_ACCESS_TOKEN não configurado");
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const siteUrl = (Deno.env.get("PUBLIC_SITE_URL") ?? "").replace(/\/$/, "");
        if (!siteUrl) {
            throw new Error("PUBLIC_SITE_URL não configurado");
        }

        const body = (await req.json()) as RequestBody;
        const billingInterval = normalizeInterval(body.billing_interval);
        const service = createServiceClient();

        // Campos comuns da intent, preenchidos conforme o tipo.
        let userId: string | null = null;
        let planSlug: string;
        let amountBrlCents: number;
        let itemTitle: string;
        let payerEmail: string | undefined;
        let seatsStudents: number | null = null;
        let seatsSchools: number | null = null;
        let contactEmail: string | null = null;
        let contactName: string | null = null;

        if (body.kind === "individual") {
            // user_id resolvido do JWT (Requirement 1.2 / 4.1), nunca do payload.
            const { user } = await requireAuthContext(req.headers.get("Authorization"));
            userId = user.id;
            payerEmail = user.email;

            if (!body.plan_slug) {
                throw new ValidationError("plan_slug é obrigatório para checkout individual");
            }

            const { data: plan, error } = await service
                .from("subscription_plans")
                .select("slug, name, price_monthly, price_yearly, is_active")
                .eq("slug", body.plan_slug)
                .eq("is_active", true)
                .maybeSingle();

            if (error) throw error;
            if (!plan) {
                throw new ValidationError(`Plano inválido ou inativo: ${body.plan_slug}`);
            }

            const priceMonthly = Number(plan.price_monthly);
            const priceYearly = Number(plan.price_yearly);
            amountBrlCents = billingInterval === "yearly" ? priceYearly : priceMonthly;
            if (!Number.isFinite(amountBrlCents) || amountBrlCents <= 0) {
                throw new ValidationError("Plano gratuito ou sem preço não pode ser assinado");
            }
            planSlug = String(plan.slug);
            itemTitle = `Felicidade.lab — ${plan.name} (${billingInterval === "yearly" ? "anual" : "mensal"})`;
        } else if (body.kind === "escolar") {
            contactEmail = (body.contact_email ?? "").trim();
            contactName = (body.contact_name ?? "").trim();
            if (!contactEmail || !contactName) {
                throw new ValidationError("contact_email e contact_name são obrigatórios para checkout escolar");
            }

            const students = Number(body.seats_students ?? 0);
            const schools = Number(body.seats_schools ?? 1);
            if (!Number.isFinite(students) || students <= 0) {
                throw new ValidationError("seats_students inválido");
            }

            const pricing = calculateSchoolPricing({
                students,
                schools,
                annual: billingInterval === "yearly",
                isPublicOrNgo: Boolean(body.is_public_ngo),
            });

            if (pricing.customQuote) {
                throw new ValidationError("Volume acima de 2000 alunos é sob consulta — use o formulário de contato");
            }

            amountBrlCents = pricing.chargeAmountCents;
            if (amountBrlCents <= 0) {
                throw new ValidationError("Valor calculado inválido");
            }
            planSlug = "advanced";
            seatsStudents = Math.floor(students);
            seatsSchools = Math.max(1, Math.floor(schools));
            payerEmail = contactEmail;
            itemTitle = `Felicidade.lab Escolar — ${seatsStudents} alunos (${billingInterval === "yearly" ? "anual" : "mensal"})`;
        } else {
            throw new ValidationError("kind deve ser 'individual' ou 'escolar'");
        }

        // Cria a intent (service role — cliente não tem acesso a purchase_intents).
        const { data: intent, error: intentError } = await service
            .from("purchase_intents")
            .insert({
                kind: body.kind,
                user_id: userId,
                plan_slug: planSlug,
                billing_interval: billingInterval,
                seats_students: seatsStudents,
                seats_schools: seatsSchools,
                contact_email: contactEmail,
                contact_name: contactName,
                amount_brl_cents: amountBrlCents,
            })
            .select("id, external_reference")
            .single();

        if (intentError) throw intentError;

        const preference = await createPreference({
            accessToken,
            externalReference: String(intent.external_reference),
            item: {
                title: itemTitle,
                quantity: 1,
                unit_price: Math.round(amountBrlCents) / 100, // MP espera reais, não centavos
                currency_id: "BRL",
            },
            payerEmail,
            notificationUrl: `${supabaseUrl}/functions/v1/mp-webhook`,
            successUrl: `${siteUrl}/assinatura/sucesso`,
            pendingUrl: `${siteUrl}/assinatura/pendente`,
            failureUrl: `${siteUrl}/assinatura/pendente`,
        });

        await service
            .from("purchase_intents")
            .update({ mp_preference_id: preference.id, updated_at: new Date().toISOString() })
            .eq("id", intent.id);

        return jsonResponse({ checkout_url: preference.init_point }, 200);
    } catch (e) {
        console.error("mp-create-preference error:", e);
        if (e instanceof Error && e.message === "Authentication required") {
            return jsonResponse({ error: "Autenticação necessária para assinar o plano individual" }, 401);
        }
        if (e instanceof ValidationError) {
            return jsonResponse({ error: e.message }, e.status);
        }
        if (e instanceof MpCredentialError) {
            return jsonResponse({ error: "Configuração de pagamento indisponível. Tente novamente mais tarde." }, e.status);
        }
        return jsonResponse({ error: "Não foi possível iniciar o checkout" }, 500);
    }
});
