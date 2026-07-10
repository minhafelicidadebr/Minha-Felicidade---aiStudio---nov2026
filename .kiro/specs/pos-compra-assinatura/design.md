# Design Document

## Overview

Adiciona o ciclo de vida da assinatura (e-mails transacionais, lembrete de
renovação, expiração, cancelamento self-service e feature discovery) SEM acoplar
a ativação ao envio de e-mail. A ativação (Onda 1) continua sendo a fonte de
verdade; o e-mail vira um efeito posterior, desacoplado por uma **outbox**
(transactional outbox), o que garante idempotência e resiliência a falhas de
envio (Requirement 1.3/1.4).

## Architecture

```
Webhook aprovado ──▶ activate_subscription_from_intent (RPC, já existe)
                          │ (ativa assinatura — fonte de verdade)
                          ▼
                    notification_outbox (INSERT: 'subscription_welcome')
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                     ▼
  process-notifications (edge, agendada)   subscription-lifecycle (Job diário)
        │ lê outbox pendente                 │ varre assinaturas:
        │ envia via Resend                   │  - renovação em N dias → outbox
        │ marca enviado (idempotente)        │  - period_end vencido → expira + outbox
        ▼
      Resend API
```

Princípio: a ativação nunca depende do e-mail. Reentrega do webhook não duplica
e-mail por causa do `dedupe_key UNIQUE`.

## Components and Interfaces

### RPC `activate_subscription_from_intent` (alteração)
No caminho "aprovado/ativado", insere na outbox:
```sql
INSERT INTO public.notification_outbox (kind, recipient_email, user_id, payload, dedupe_key)
VALUES ('subscription_welcome', <email>, _intent.user_id,
        jsonb_build_object('plan_slug', _intent.plan_slug,
                           'billing_interval', _intent.billing_interval,
                           'period_end', _period_end),
        'welcome:' || p_mp_payment_id)
ON CONFLICT (dedupe_key) DO NOTHING;
```
E-mail do destinatário: individual → e-mail do `auth.users` do `user_id`;
escolar → `contact_email` da intent. Mantém `SECURITY DEFINER`,
`SET search_path = public` e REVOKE/GRANT existentes.

### Edge function `process-notifications`
Service role. Lê `notification_outbox WHERE status='pending'` (em lote),
renderiza template por `kind`, envia via Resend (`RESEND_API_KEY`), marca
`sent`/`failed` e incrementa `attempts`. Reexecução só reprocessa pendentes/falhas.
Disparo: agendada (Job do Lovable) e/ou chamada pelo webhook após ativar.

### Edge/Job `subscription-lifecycle` (diário)
- `active` com `current_period_end` em [hoje, hoje+N] e sem lembrete no ciclo →
  enfileira `renewal_reminder` (dedupe por período).
- `active` com `current_period_end < now()` → `UPDATE status='expired'` (RPC
  service role) + enfileira `subscription_expired`. `get_my_plan` já ignora
  não-ativas → acesso cai para gratuito.

### RPC `request_subscription_cancellation` (nova)
`SECURITY DEFINER`, self-scoped: marca `cancel_at_period_end = true` SOMENTE na
assinatura do `auth.uid()`, registra em `data_access_logs`, enfileira
`subscription_canceled`. `REVOKE EXECUTE FROM PUBLIC, anon; GRANT ... authenticated`.

### Função pura `_shared/email-templates.ts`
Por `kind` gera `{ subject, html }` em PT, sem overclaim. Testável isoladamente.

### UI
- Página de assinatura: botão "Cancelar renovação" (premium) → confirma → chama
  a RPC → mostra "ativa até <data>, não renova". Nunca escreve direto na tabela.
- Dashboard: banner de feature discovery para novos premium (marca visto em
  `localStorage`), com CTA ao primeiro recurso premium.

## Data Models

### Nova tabela `notification_outbox`
```sql
CREATE TABLE public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN
    ('subscription_welcome','renewal_reminder','payment_failed',
     'subscription_expired','subscription_canceled')),
  recipient_email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.notification_outbox TO service_role;
```
Reutiliza `user_subscriptions`/`organization_subscriptions` (colunas `status`,
`cancel_at_period_end`, `current_period_end` já existem).

## Correctness Properties

### Property 1: Idempotência de e-mail
`dedupe_key UNIQUE` ⇒ o mesmo evento de pagamento nunca gera dois e-mails, mesmo
com reentrega da notificação do Mercado Pago.
**Validates: Requirements 1.4**

### Property 2: Não-bloqueio da ativação
Falha de envio de e-mail nunca reverte nem impede a ativação da assinatura (a
outbox desacopla envio de ativação).
**Validates: Requirements 1.3**

### Property 3: Self-scope do cancelamento
A RPC de cancelamento só altera a assinatura do `auth.uid()` — nunca a de terceiros.
**Validates: Requirements 4.3**

### Property 4: Menor privilégio
A outbox e toda mudança de estado de assinatura só são escritas por service_role
ou RPC `SECURITY DEFINER`, nunca pelo cliente.
**Validates: Requirements 6.1**

## Error Handling

- Envio falho → `status='failed'`, `attempts++`, `last_error`; reprocessado na
  próxima execução (com teto de tentativas para evitar loop infinito).
- Resend indisponível → não afeta ativação nem experiência de compra.
- E-mail ausente (escolar pré-cadastro sem contato) → não enfileira; loga.

## Testing Strategy

- Unit (Vitest): função pura de templates por `kind`; lógica de seleção de
  destinatário.
- Integração/manual: compra → 1 e-mail de boas-vindas (reenviar webhook não
  duplica); cancelar → mantém acesso até fim do ciclo, não renova; expiração
  simulada → rebaixa para gratuito.
- `npm run quality` verde a cada tarefa; secrets nunca commitados.
