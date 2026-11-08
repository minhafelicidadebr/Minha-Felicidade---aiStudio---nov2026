# TRUST-1 / R22 — CHECKLIST DE PREFLIGHT READ-ONLY

**Status: 🔴 OPEN / REQUIRED_BEFORE_PRODUCTION**

Este documento é a lista de verificação **somente leitura** a executar contra o
schema remoto **antes** de promover qualquer migration TRUST para produção.

Nada aqui foi executado. Nenhuma credencial remota foi usada em nenhuma onda
TRUST-1. Nenhum `db push` foi executado em momento algum.

## Por que existe

Todas as afirmações sobre o lado remoto do schema, em todas as ondas, derivam de
**comportamento em runtime** e de leitura das migrations — não de consulta ao
catálogo do PostgreSQL remoto. O indício mais forte de convergência obtido até
aqui: o diff entre os tipos gerados do banco local homologado e os tipos gerados
do remoto (pelo Lovable) foi de **duas linhas**. Indício não é consulta.

## Regras de execução

- **Somente leitura.** Nenhum `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`,
  `DROP`, `GRANT`, `REVOKE`. Nenhum `supabase db push`. Nenhum `--linked` com
  intenção de escrita.
- Credencial de leitura obtida por caminho seguro, usada e descartada. Nunca
  registrada em receipt, log, snapshot ou commit.
- Divergência encontrada **para** o processo. Não se corrige remoto ao vivo.

## Migrations TRUST pendentes de promoção

| # | Migration | Onda | Pré-condições que abortam |
|---|---|---|---|
| 43 | `20260824120000_trust1_dashboard_os_reconciled.sql` | 1.1B | `get_school_metrics` presente e sem `e.school_id`; ledger presente; 2 gatilhos append-only; `metric_minimum_group_size` presente; pgcrypto instalado |
| 44 | `20260826120000_trust1_5_ledger_read_rpc.sql` | 1.5 | ledger presente; `is_org_admin` presente; `data_access_logs` presente; 2 gatilhos append-only |
| 45 | `20260828120000_trust1_2_privacy_and_archive.sql` | 1.2 | ledger presente; `schools`/`classes` presentes; `metric_minimum_group_size` presente; `get_school_metrics` **não** pode ser a versão com `e.school_id` |

As três abortam com mensagem explícita diante de estado incompatível. O preflight
existe para descobrir isso **antes** de tentar, não durante.

## 1. Histórico de migrations

```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
SELECT count(*) AS total FROM supabase_migrations.schema_migrations;
```

Confirmar:
- [ ] Quais das 42 migrations históricas constam como aplicadas
- [ ] Se `20260728194005` / `20260728194702` (contaminantes) constam
- [ ] Se as três migrations TRUST acima **não** constam
- [ ] Se existe versão aplicada remotamente que **não** existe no repositório

## 2. Funções: existência, assinatura, modo, `search_path`

```sql
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef,
       pg_get_userbyid(p.proowner) AS owner,
       coalesce(array_to_string(p.proconfig, ','), '(nenhum)') AS config
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;
```

Confirmar:
- [ ] Toda função `SECURITY DEFINER` tem `search_path=public` (esperado: 0 exceções)
- [ ] `get_school_metrics(uuid, text)` existe com a assinatura esperada
- [ ] `resend_invitation`, `escalate_indicator`, `can_read_school`,
      `metric_minimum_group_size`, `is_org_admin`, `get_org_engagement_summary` existem
- [ ] `get_institutional_decision_events` **não** existe ainda (é da #44)
- [ ] `reject_delete_with_governance_history` **não** existe ainda (é da #45)

## 3. O corpo aplicado das funções críticas

```sql
SELECT position('e.school_id'      in pg_get_functiondef(p.oid)) AS ref_school_id,
       position('e.class_id'       in pg_get_functiondef(p.oid)) AS ref_class_id,
       position('institutional_memberships' in pg_get_functiondef(p.oid)) AS usa_memberships
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_school_metrics';
```

Confirmar:
- [ ] `ref_school_id = 0` e `ref_class_id = 0` — senão a #43 e a #45 abortam
- [ ] `resend_invitation` chama `digest` **sem** schema (esperado: sim, pois a #43
      é justamente a correção) — registra o estado, não corrige ao vivo
- [ ] Nenhuma outra função `SECURITY DEFINER` chama pgcrypto sem qualificar:

```sql
SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.prosecdef
  AND pg_get_functiondef(p.oid) ~ '[^.[:alnum:]_](digest|gen_random_bytes|crypt|hmac)[[:space:]]*\(';
```

## 4. Grants

```sql
SELECT p.proname,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authd,
       has_function_privilege('service_role',  p.oid, 'EXECUTE') AS svc,
       has_function_privilege('public',        p.oid, 'EXECUTE') AS pub
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' ORDER BY p.proname;
```

Confirmar:
- [ ] Nenhuma RPC de domínio executável por `anon`
- [ ] `activate_subscription_from_intent` só por `service_role`
- [ ] Privilégios de tabela do ledger:

```sql
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='institutional_decision_events'
ORDER BY grantee, privilege_type;
```
- [ ] Nem `anon` nem `authenticated` com `SELECT`/`INSERT`/`UPDATE`/`DELETE`

## 5. Policies e RLS

```sql
SELECT c.relname, c.relrowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;

SELECT tablename, policyname, cmd, roles::text FROM pg_policies
WHERE schemaname='public' ORDER BY tablename, policyname;
```

Confirmar:
- [ ] Nenhuma tabela em `public` sem RLS
- [ ] Nenhuma policy de `UPDATE`/`DELETE` em `institutional_decision_events`,
      `guardian_consent_events`, `user_subscriptions`, `organization_subscriptions`,
      `purchase_intents`
- [ ] Se a policy inerte `"Org admins read decision events"` ainda existe (a #44 a remove)

## 6. Colunas esperadas

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='engagement_events' ORDER BY ordinal_position;
```

Confirmar:
- [ ] `engagement_events` tem `user_id` e `organization_id` e **não** tem
      `school_id` nem `class_id`
- [ ] `organizations.status` existe com CHECK incluindo `archived`
- [ ] `schools.status` e `classes.status` **não** existem ainda (são da #45)
- [ ] `institutional_decision_events` tem as 15 colunas esperadas

## 7. Gatilhos e constraints do ledger

```sql
SELECT tgname FROM pg_trigger
WHERE tgrelid='public.institutional_decision_events'::regclass AND NOT tgisinternal;

SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='public.institutional_decision_events'::regclass ORDER BY contype, conname;
```

Confirmar:
- [ ] `trg_decision_events_no_update` e `trg_decision_events_no_delete` presentes
- [ ] FKs com `ON DELETE CASCADE` (organization) e `SET NULL` (school, class)
- [ ] 5 CHECKs de vocabulário controlado
- [ ] Índice parcial único de idempotência

## 8. Contaminantes

```sql
SELECT 'table' AS kind, table_name AS obj FROM information_schema.tables
WHERE table_schema='public' AND table_name IN
 ('runtime_gates','ergonomic_assessments','contextual_risk_reviews',
  'risk_criteria_versions','membership_invites','platform_admins','instrument_versions')
UNION ALL
SELECT 'function', p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('gate_enabled','compute_cycle_risk')
ORDER BY 1, 2;
```

Confirmar:
- [ ] Resultado vazio. Se houver resíduo: **inventariar e parar**. A #43 emite
      `RAISE WARNING` e não remove nada, de propósito

## 9. Contas de teste

```sql
SELECT count(*) FROM auth.users WHERE email LIKE '%@test.local';
SELECT count(*) FROM auth.users;
```

Confirmar:
- [ ] Nenhuma conta `@test.local` (verificado na TRUST-1.1A: não existiam)
- [ ] O total de contas corresponde ao esperado pela operação

## 10. Dados que as pré-condições da #45 podem afetar

```sql
SELECT count(*) FROM public.schools;
SELECT count(*) FROM public.classes;
```

Confirmar:
- [ ] `ALTER TABLE ... ADD COLUMN status NOT NULL DEFAULT 'active'` é seguro no
      volume observado (PostgreSQL ≥ 11 não reescreve a tabela para default constante)

## Desfecho

- [ ] Nenhuma divergência bloqueante → promoção pode ser proposta ao humano
- [ ] Divergência encontrada → registrar no schema diff, classificar, **parar**

Enquanto este checklist não for executado com resultado registrado, o R22
permanece **OPEN / REQUIRED_BEFORE_PRODUCTION** e nenhuma migration TRUST deve ser
promovida.
