# TRUST-1.6.1 — GATE / Notification Outbox Contract

Status: **✅ APROVADO LOCALMENTE — PR #58**

Data: 2026-09-22  
Produção: **intocada**

## Objetivo

Fechar R33 e R34 antes da operacionalização real de convites e consentimento.

## RED / causa raiz

- `notification_outbox` canônico possui `payload`, mas não `body_html` nem
  `metadata`.
- `invite_member` e `resend_invitation` tentavam inserir nas duas colunas
  inexistentes e engoliam o erro com `EXCEPTION WHEN OTHERS THEN NULL`.
- A UI tratava a RPC como sucesso mesmo sem delivery request persistido.
- O worker `process-notifications` também selecionava `metadata`, inexistente.
- `guardian_consent_request` estava permitido no CHECK da outbox, mas não tinha
  template no dispatcher.

## Correção

Migration #50:
`20260922023000_trust1_6_1_notification_outbox_contract.sql`

Contrato canônico:
`kind, recipient_email, user_id, payload, dedupe_key, status, attempts,
last_error, created_at, sent_at`.

- `invite_member`: usa `payload`, idempotência preservada, sem swallow silencioso.
- `resend_invitation`: enqueue ocorre antes do ledger `succeeded`; falha de
  outbox aborta a operação e não consome quota de reenvio.
- `process-notifications`: lê apenas `payload`.
- Template `guardian_consent_request` adicionado no canônico e no espelho Deno.
- UI passa a falar em **enfileiramento/solicitação**, não em entrega confirmada.
- Copy de consentimento alinhada ao assurance real: canal verificado ≠ tutela
  jurídica verificada.

## Evidência de execução

GitHub Actions / PR #58:

- `quality`: ✅
- lint: ✅
- typecheck: ✅
- testes padrão: **366 passed**; runtime files explicitamente pulados nesse job
  por ausência de DB (executados separadamente no job runtime-db)
- build: ✅
- security invariants: ✅
- replay desde banco vazio: **50/50 migrations**
- generated-types drift gate: ✅
- runtime PostgreSQL: **161/161**, 7 arquivos, 0 skips no job runtime-db

Composição runtime:

- baseline TRUST-1.3: 93
- TRUST-1.4: 28
- TRUST-1.6: 35
- TRUST-1.6.1: 5
- total: **161**

Casos novos comprovados:

1. schema contém `payload` e não contém `body_html`/`metadata`;
2. `invite_member` cria convite + outbox real;
3. retry idempotente não duplica delivery request inicial;
4. `resend_invitation` cria nova entrega antes do ledger de sucesso;
5. segundo reenvio imediato é bloqueado e não cria entrega adicional.

## Riscos

- R33: ✅ CLOSED
- R34: ✅ CLOSED
- R09: 🔴 OPEN — entrega real depende de configuração do dispatcher
  (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PUBLIC_SITE_URL`).
- R22: 🔴 OPEN / REQUIRED_BEFORE_PRODUCTION.
- R26: backlog.

## Decisão

**APPROVED LOCALMENTE.**

Este gate comprova consistência do contrato de fila e regressão das TRUST
anteriores no ambiente efêmero de CI. Não constitui homologação do schema remoto
nem prova de entrega real por provedor externo.
