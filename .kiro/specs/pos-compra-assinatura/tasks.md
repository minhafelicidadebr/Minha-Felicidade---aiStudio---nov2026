# Implementation Plan: Onda 1.5 — Pós-compra, E-mail Transacional & Gestão de Assinatura

## Overview

Trabalhar em branch nova (`feat/onda-1.5-pos-compra`), nunca direto na `main`.
Ao fim de cada tarefa: `npm run quality` verde. Secrets nunca commitados. A
ativação da assinatura (Onda 1) permanece a fonte de verdade; o e-mail é efeito
posterior desacoplado por outbox.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1], "description": "Fundação: tabela notification_outbox" },
    { "wave": 2, "tasks": [2, 3, 7, 8], "description": "Enfileirar boas-vindas, templates, feature discovery, histórico de pagamentos" },
    { "wave": 3, "tasks": [4, 5, 6], "description": "Envio (process-notifications), ciclo de vida diário, cancelamento" },
    { "wave": 4, "tasks": [9], "description": "Agendamento, secrets e documentação" },
    { "wave": 5, "tasks": [10], "description": "Gate final e testes de ponta a ponta" }
  ]
}
```

## Tasks

- [x] 1. Migration: tabela `notification_outbox`
  - Schema do `design.md` (RLS on, sem policy de cliente, `REVOKE ALL FROM
    PUBLIC, anon, authenticated`, `GRANT ALL TO service_role`, `dedupe_key UNIQUE`).
  - Adicionar ao `docs/security-invariants-runbook.md`.
  - _Requirements: 1.4, 6.1_

- [x] 2. Migration: enfileirar boas-vindas na ativação
  - Alterar `activate_subscription_from_intent` para inserir
    `subscription_welcome` na outbox (dedupe `welcome:<mp_payment_id>`,
    `ON CONFLICT DO NOTHING`), resolvendo e-mail (auth.users p/ individual,
    contact_email p/ escolar). Preservar SECURITY DEFINER + REVOKE/GRANT.
  - _Requirements: 1.1, 1.4_

- [x] 3. Função pura de templates de e-mail
  - `_shared/email-templates.ts`: por `kind`, gera assunto + corpo (PT, sem
    overclaim). Testes cobrindo cada tipo.
  - _Requirements: 1.2, 6.3_

- [ ] 4. Edge function `process-notifications`
  - Lê outbox pendente (lote), envia via Resend (`RESEND_API_KEY`), marca
    sent/failed + attempts. Idempotente e não-bloqueante.
  - _Requirements: 1.1, 1.3, 3.1_

- [ ] 5. Edge/Job `subscription-lifecycle` (diário)
  - Enfileira `renewal_reminder` (N dias antes, 1x/ciclo) e expira assinaturas
    vencidas (`status='expired'` via RPC service role) + enfileira
    `subscription_expired`.
  - _Requirements: 2.1, 2.2, 3.2_

- [x] 6. RPC `request_subscription_cancellation` + UI
  - RPC self-scoped (`SECURITY DEFINER`): `cancel_at_period_end=true` só da
    assinatura do `auth.uid()`; log em `data_access_logs`; enfileira
    `subscription_canceled`. REVOKE de PUBLIC/anon, GRANT authenticated.
  - Botão "Cancelar renovação" na página de assinatura (premium) com confirmação.
  - _Requirements: 4.2, 4.3_

- [x] 7. Feature discovery no dashboard
  - Banner "recém-desbloqueado" para novos premium (marca visto em localStorage),
    com CTA ao primeiro recurso premium.
  - _Requirements: 5.1_

- [x] 8. Histórico de faturas e pagamentos (RPC + UI)
  - Migration: RPC `get_my_payment_history` (`SECURITY DEFINER`, self-scoped)
    que lê os pagamentos do `auth.uid()` de `purchase_intents` (join com
    `subscription_plans`), expondo só os campos necessários. `REVOKE EXECUTE
    FROM PUBLIC, anon; GRANT ... authenticated`.
  - UI: seção "Faturas e pagamentos" na página de assinatura (data, plano,
    valor, status), com estado vazio claro.
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 9. Agendamento + secrets + docs
  - Configurar o disparo diário (cron/Job do Lovable) da `subscription-lifecycle`
    e do `process-notifications`.
  - Documentar `RESEND_API_KEY` no runbook (server-only, nunca commitado).
  - _Requirements: 6.2_

- [ ] 10. Gate final
  - `npm run quality` completo.
  - Testes manuais: compra → e-mail de boas-vindas chega 1x (reenviar webhook
    não duplica); cancelar → mantém acesso até fim do ciclo, não renova;
    simular expiração → rebaixa para gratuito; histórico lista os pagamentos do
    próprio usuário.
  - _Requirements: todas_

## Notes

- Reaproveita infra Resend (Onda 3) e entitlements `features`/`limits` (Parte C).
- Alimenta eventos de funil da Onda 2 (`upgrade`, `renewal`, `churn`).
- "Faturas e pagamentos" nesta onda é **histórico** (dados já existentes). Método
  de pagamento editável, renovação automática e Nota Fiscal dependem de billing
  recorrente — trilha estratégica separada ("Billing Maduro"), fora daqui.
- Fora de escopo: recorrência automática, reembolso self-service, notas fiscais,
  SSO multi-app.
