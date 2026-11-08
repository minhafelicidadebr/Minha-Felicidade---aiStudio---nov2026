---
inclusion: always
---

# Contexto do produto — Ciência do Bem-Estar (Curso Yale)

Edtech de bem-estar emocional para adolescentes brasileiros, adaptando o curso
"The Science of Well-Being" (Yale, Laurie Santos) + PERMA-V (Seligman).
Instituto Felicidade Para Todos. B2C (aluno individual) + B2B (escolas).

## Stack

React 18 + Vite + TypeScript + npm (não bun, não yarn) + shadcn/ui + Tailwind 3
+ Supabase (Lovable Cloud) + Deno edge functions. Testes: Vitest.

## Schema de assinaturas já existente (não recriar)

- `subscription_plans` (slug: `free` | `intermediate` | `advanced`,
  `price_monthly`/`price_yearly` em **centavos BRL**, `features` jsonb,
  `limits` jsonb).
- `user_subscriptions` (individual; `status`, `billing_interval`,
  `current_period_end`, `external_subscription_id`/`external_customer_id`
  já previstos para o provedor de pagamento).
- `organization_subscriptions` + `organization_members` (escolar/B2B, seats).
- RPC `get_my_plan()` resolve individual → organização → gratuito, nessa
  ordem. Client-side: `useSubscription()` (`src/hooks/useSubscription.ts`) e
  `<FeatureGate feature="...">` (`src/components/FeatureGate.tsx`).
- **Já removidas** (migration de 2026-06-13): policies de `INSERT`/`UPDATE` de
  `authenticated` em `user_subscriptions`/`organization_subscriptions`. A ÚNICA
  escritora do estado de assinatura é a RPC `activate_subscription_from_intent`
  (`SECURITY DEFINER`, service_role), chamada pela `mp-webhook`.

> Atualização (2026-07): a Onda 1 **já foi entregue e mergeada**. O checkout
> real via Mercado Pago existe (`src/lib/checkout.ts` → `mp-create-preference`
> → `mp-webhook`). As descrições abaixo de "o botão só navega para /auth" são
> **históricas** (estado pré-Onda-1) — hoje os botões iniciam o checkout de
> verdade. Mantidas apenas como contexto de origem.

## Onde o preço/plano já aparece na UI (não recriar, só conectar)

- `src/components/landing/PricingSection.tsx` — cards individuais + toggle
  mensal/anual + aba "Escolas" com faixas fixas. Botão "Assinar Agora" hoje
  só navega para `/auth`, não inicia checkout.
- `src/components/landing/SchoolCalculator.tsx` — calculadora B2B por
  número de alunos/rede já construída na UI (ver `.lovable/plan.md` §1.4
  para a tabela de preço por faixa/desconto de rede/anual/ONG). Inspecione
  este arquivo antes de escrever a função de cálculo do servidor — a tabela
  de preços deve ser a MESMA dos dois lados (client mostra estimativa,
  servidor recalcula e cobra o valor de verdade).
- `src/pages/SubscriptionPage.tsx` — mostra plano atual + botões "Assinar
  Agora" que hoje também só navegam, sem checkout real.

## O que já está pronto e não deve ser tocado nesta onda

- Protocolo de crise nas 4 funções de IA (`supabase/functions/_shared/crisis.ts`).
- Consentimento parental LGPD (`guardian_consent_events` e RPCs relacionadas,
  `RequireGuardianConsent` em `src/components/routing/`).
- Rate limiting de IA (`enforce_ai_usage_limit`, `supabase/functions/_shared/ai-usage.ts`).

## Referência de padrão (mesma conta, produto irmão — NÃO copiar arquivos, só se inspirar na forma)

O produto irmão "Educação Felicidade" já tem uma integração Mercado Pago
funcionando em produção com esta forma: edge function pública
`mp-create-preference` cria um registro de intenção de compra + preferência
no Checkout Pro da API do MP; edge function pública `mp-webhook` valida a
assinatura HMAC (`x-signature`/`x-request-id` contra
`MERCADO_PAGO_WEBHOOK_SECRET`), busca o pagamento na API do MP pelo id, e só
então chama uma RPC `SECURITY DEFINER` que é a ÚNICA escritora do estado de
assinatura. O spec desta onda (`.kiro/specs/onda-1-monetizacao/`) adapta essa
forma ao schema deste projeto — não são os mesmos arquivos, é o mesmo padrão
arquitetural comprovado.
