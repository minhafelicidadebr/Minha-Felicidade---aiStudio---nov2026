// Fonte única dos templates de e-mail transacional (Onda 1.5).
// Função pura: (tipo + dados) -> { subject, html }. Sem I/O, testável.
// Espelhada 1:1 em supabase/functions/_shared/email-templates.ts (Deno), que a
// edge function process-notifications usa. Se mudar aqui, mude no espelho.
//
// Honestidade (doutrina §1): a cópia NÃO promete conformidade legal nem
// cobrança recorrente automática — a v1 é cobrança única por ciclo.

export type NotificationKind =
    | "subscription_welcome"
    | "renewal_reminder"
    | "payment_failed"
    | "subscription_expired"
    | "subscription_canceled"
    | "escolar_claim"
    | "institutional_invite"
    | "engagement_reminder"
    | "guardian_consent_request";

export interface EmailTemplateInput {
    kind: NotificationKind;
    planName?: string;
    billingInterval?: string; // 'monthly' | 'yearly'
    periodEnd?: string; // ISO date
    appUrl?: string;
    claimToken?: string; // só para 'escolar_claim' (código de associação)
    inviteRole?: string; // só para 'institutional_invite'
    inviteToken?: string; // só para 'institutional_invite'
    orgName?: string; // só para 'institutional_invite'
    guardianConsentToken?: string; // só para 'guardian_consent_request'
    policyVersion?: string; // só para 'guardian_consent_request'
}

export interface RenderedEmail {
    subject: string;
    html: string;
}

function formatDateBr(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function intervalLabel(interval?: string): string {
    return interval === "yearly" ? "anual" : "mensal";
}

function shell(title: string, bodyHtml: string, appUrl?: string): string {
    const cta = appUrl
        ? `<p style="margin:24px 0"><a href="${appUrl}" style="background:#f97316;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Ir para a plataforma</a></p>`
        : "";
    return [
        `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">`,
        `<h1 style="font-size:20px">${title}</h1>`,
        bodyHtml,
        cta,
        `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>`,
        `<p style="font-size:12px;color:#6b7280">Instituto Felicidade Para Todos • Ciência do Bem-Estar</p>`,
        `</div>`,
    ].join("");
}

/** Renderiza o e-mail para um tipo de notificação. Determinística e pura. */
export function renderEmail(input: EmailTemplateInput): RenderedEmail {
    const plan = input.planName ?? "seu plano";
    const renew = formatDateBr(input.periodEnd);
    const interval = intervalLabel(input.billingInterval);

    switch (input.kind) {
        case "subscription_welcome":
            return {
                subject: `Sua assinatura ${plan} está ativa 🎉`,
                html: shell(
                    `Bem-vindo(a) ao plano ${plan}!`,
                    `<p>Seu pagamento foi confirmado e o plano <strong>${plan}</strong> (${interval}) já está ativo.</p>` +
                    (renew ? `<p>Próxima renovação: <strong>${renew}</strong>. A cobrança é única por ciclo — na data da renovação você poderá assinar novamente.</p>` : "") +
                    `<p>Você desbloqueou recursos como AlegrIA ilimitada, simulador de decisões e certificado. Bons estudos!</p>`,
                    input.appUrl,
                ),
            };

        case "renewal_reminder":
            return {
                subject: `Sua assinatura ${plan} renova em breve`,
                html: shell(
                    `Renovação se aproximando`,
                    (renew ? `<p>Seu acesso ao plano <strong>${plan}</strong> vai até <strong>${renew}</strong>.</p>` : `<p>Seu acesso ao plano <strong>${plan}</strong> está chegando ao fim do ciclo.</p>`) +
                    `<p>Como a cobrança é única por ciclo, para continuar com o plano é só assinar novamente na plataforma.</p>`,
                    input.appUrl,
                ),
            };

        case "payment_failed":
            return {
                subject: `Não conseguimos concluir seu pagamento`,
                html: shell(
                    `Pagamento não concluído`,
                    `<p>O pagamento do plano <strong>${plan}</strong> não foi concluído e nenhuma cobrança foi efetivada.</p>` +
                    `<p>Você pode tentar novamente quando quiser, direto na plataforma.</p>`,
                    input.appUrl,
                ),
            };

        case "subscription_expired":
            return {
                subject: `Sua assinatura ${plan} expirou`,
                html: shell(
                    `Assinatura expirada`,
                    `<p>Seu acesso ao plano <strong>${plan}</strong> chegou ao fim do ciclo e sua conta voltou ao plano gratuito.</p>` +
                    `<p>Quando quiser, você pode assinar novamente e retomar os recursos premium.</p>`,
                    input.appUrl,
                ),
            };

        case "subscription_canceled":
            return {
                subject: `Renovação cancelada`,
                html: shell(
                    `Renovação cancelada`,
                    (renew ? `<p>Sua renovação foi cancelada. Você mantém o acesso ao plano <strong>${plan}</strong> até <strong>${renew}</strong>, sem nova cobrança.</p>` : `<p>Sua renovação foi cancelada. Você mantém o acesso até o fim do ciclo atual, sem nova cobrança.</p>`) +
                    `<p>Mudou de ideia? É só assinar de novo quando quiser.</p>`,
                    input.appUrl,
                ),
            };

        case "escolar_claim":
            return {
                subject: `Ative a assinatura escolar da sua escola`,
                html: shell(
                    `Assinatura escolar paga`,
                    `<p>Recebemos o pagamento do Plano Escolar. Para ativar e gerir a assinatura, crie sua conta (ou entre) e informe o código de associação abaixo na página de assinatura:</p>` +
                    (input.claimToken ? `<p style="font-size:18px;letter-spacing:1px"><strong>${input.claimToken}</strong></p>` : "") +
                    `<p>Você pode usar qualquer e-mail para criar a conta — este código é a sua prova de compra.</p>`,
                    input.appUrl,
                ),
            };

        case "institutional_invite": {
            const role = input.inviteRole ?? "membro";
            const org = input.orgName ?? "uma organização";
            const acceptUrl = input.appUrl
                ? `${input.appUrl}/aceitar-convite?token=${input.inviteToken ?? ""}`
                : undefined;
            return {
                subject: `Convite para a plataforma Ciência do Bem-Estar`,
                html: shell(
                    `Você foi convidado(a)! 🌟`,
                    `<p>Você recebeu um convite para participar de <strong>${org}</strong> como <strong>${role}</strong> na plataforma Ciência do Bem-Estar.</p>` +
                    (acceptUrl
                        ? `<p style="margin:24px 0"><a href="${acceptUrl}" style="background:#f97316;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Aceitar convite</a></p>`
                        : `<p>Crie sua conta na plataforma para aceitar o convite.</p>`) +
                    `<p style="font-size:13px;color:#6b7280">Se não reconhece este convite, ignore este e-mail.</p>`,
                ),
            };
        }

        case "guardian_consent_request": {
            const decisionUrl = input.appUrl
                ? `${input.appUrl}/autorizacao-responsavel?token=${input.guardianConsentToken ?? ""}`
                : undefined;
            return {
                subject: "Pedido de autorização para uso da plataforma",
                html: shell(
                    "Revise um pedido de autorização",
                    `<p>Você recebeu um pedido para revisar a participação de um adolescente na plataforma Ciência do Bem-Estar.</p>` +
                    `<p>Antes de decidir, leia o termo apresentado no link seguro abaixo. A abertura do link confirma apenas o controle deste canal de e-mail; a decisão é registrada separadamente.</p>` +
                    (decisionUrl
                        ? `<p style="margin:24px 0"><a href="${decisionUrl}" style="background:#f97316;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Revisar pedido</a></p>`
                        : `<p>Acesse a plataforma pelo endereço institucional para revisar o pedido.</p>`) +
                    (input.policyVersion ? `<p style="font-size:12px;color:#6b7280">Versão do termo: ${input.policyVersion}.</p>` : "") +
                    `<p style="font-size:13px;color:#6b7280">Se você não reconhece este pedido, ignore esta mensagem.</p>`,
                ),
            };
        }

        case "engagement_reminder":
            return {
                subject: `Sua jornada de bem-estar sente sua falta 🌱`,
                html: shell(
                    `Faz tempo que não nos vemos!`,
                    `<p>Sua streak de prática está esperando por você. Bastam <strong>2 minutos</strong> para manter o ritmo:</p>` +
                    `<ul style="padding-left:20px;color:#374151">` +
                    `<li>Complete a microação do dia</li>` +
                    `<li>Converse com a AlegrIA sobre como está se sentindo</li>` +
                    `<li>Revise um flashcard do último módulo</li>` +
                    `</ul>` +
                    `<p style="font-size:13px;color:#6b7280">A ciência mostra que consistência importa mais que intensidade (Lally et al., 2010).</p>`,
                    input.appUrl,
                ),
            };
    }
}
