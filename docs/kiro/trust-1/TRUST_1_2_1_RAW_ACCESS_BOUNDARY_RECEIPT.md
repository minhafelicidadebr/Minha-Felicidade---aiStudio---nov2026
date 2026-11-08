# TRUST-1.2.1 — RECEIPT DA FRONTEIRA DE ACESSO RAW

**Status:** ✅ R31 fechado no ambiente local. Produção intocada.

## Falha medida antes da correção

Com papel `org_admin`, o Postgres permitia projetar linhas completas de
`nps_responses` e `engagement_events` da organização. Assim, `user_id`, feedback,
contexto e metadata podiam atravessar a API. No teste vermelho inicial, o conjunto
TRUST-1.2.1 teve **3 aprovações e 9 falhas**.

## Correção

A migration `20260901120000_trust1_2_1_server_analytics_boundary.sql` remove
policies administrativas de SELECT bruto por semântica (`pg_policies.qual`
contendo `is_org_admin`), não por nome. Renomear uma policy não contorna o gate.

Permanece:
- self-read legítimo do estudante (`user_id = auth.uid()`);
- acesso operacional de `service_role`;
- `anon` sem acesso;
- cross-tenant sem linhas.

Analytics institucional passa exclusivamente pelas RPCs agregadoras. O
`security:gate` rejeita novos consumidores institucionais que consultem as duas
tabelas raw.

## Evidência pós-correção

Os cinco contratos R31 passaram contra PostgreSQL real: NPS raw negado,
engagement raw negado, self-read preservado, cross-tenant/anon negados e
`service_role` preservado. O conjunto TRUST-1.2.1 ficou **12/12 verde**.

Isto prova a fronteira técnica no replay local; não prova o estado remoto. R22
continua obrigatório antes de qualquer promoção.