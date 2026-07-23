# NEXT_ACTION (uma única próxima ação)

## Concluído
- P0.0 (marca/PI/independência): **APROVADO**.
- ONDA 1 · Corte 1.1 (entitlement canônico): rotas premium exigem feature server-side.
- ONDA 1 · Corte 1.2 (integridade da assinatura): policy UPDATE removida de org_subscriptions.
- ONDA 1 · Corte 1.3 (limites de IA centralizados): `enforce_ai_usage_limit` lê do plano.
- ONDA 1 · Corte 1.4 (idade e consentimento): trigger protege `birth_date` como imutável;
  `guardian_consent_events` e RPCs de consentimento confirmados ok.

## Próxima ação recomendada: ONDA 2 — Migration de multitenancy mínimo
Criar uma **única** migration (`20260722220000_institutional_multitenancy.sql`) com:
- `organizations` (id, name, slug, owner_id, status, created_at)
- `schools` (id, organization_id, name, municipality, created_at)
- `classes` (id, school_id, name, year, semester, created_at)
- `memberships` (id, organization_id, user_id, role [org_admin|school_admin|educator|student|guardian], school_id nullable, class_id nullable, status, created_at)
- `invitations` (id, organization_id, invited_email, role, token, expires_at, accepted_at, created_at)

RLS habilitada em todas. Policies mínimas:
- SELECT: membership ativa na mesma org.
- INSERT/UPDATE/DELETE: só org_admin (via membership).
- Sem cross-org reads. Tenant obrigatório em toda consulta.

Grants: nenhuma policy de DELETE/UPDATE direta para student. Convites: INSERT só por org_admin.

**NÃO criar** nesta migration: dashboard, UI, RPCs de convite, onboarding. Apenas o schema + RLS.
Isso é o "corte vertical de dados" sem frontend — o frontend vem no próximo corte.
