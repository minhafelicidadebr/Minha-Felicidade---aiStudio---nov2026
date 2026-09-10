# TRUST-1.3 — ACHADO: UPSTREAM_GENERATED_TYPES_DRIFT

**Status:** ✅ reconciliado. Regra permanente adotada. CI agora detecta a
classe de defeito automaticamente. Produção intocada.

Sem secrets, credenciais ou dados pessoais.

## Contexto

Durante o rebase de `trust-1.3-context-isolation` sobre `origin/main`
(`2ba157c39dff5ab1686c4e2938f5875116cd7924`), o merge automático do Git em
`src/integrations/supabase/types.ts` produziu um arquivo sintaticamente válido
mas semanticamente incorreto: preservou as adições da TRUST-1.3 (R29) e ao
mesmo tempo manteve a remoção, vinda do `origin/main`, de:

- `schools.status` e `classes.status` (colunas reais, `Row`/`Insert`/`Update`);
- `get_org_analytics_series`;
- `get_institutional_decision_events`;
- `enqueue_engagement_reminders`.

O typecheck confirmou o problema de imediato: `useOrganizationDetail.ts` passou
a falhar porque `School`/`ClassRoom` no código exigiam `status` e o tipo gerado
não tinha mais essa propriedade.

## Causa raiz

`types.ts` é **artefato gerado**, nunca fonte de schema (regra já estabelecida
em `TRUST_1_5_SCHEMA_TYPE_CONTRACT.md`, R04). O `origin/main` deste projeto é
mantido também pelo editor Lovable, que a cada sessão regenera esse arquivo
contra o schema do projeto **remoto** vinculado. Esse schema remoto ainda não
tinha recebido as migrations TRUST (`20260828120000_trust1_2_privacy_and_
archive.sql` em diante), que só existiam localmente nas branches TRUST até
esta reconciliação.

O resultado: uma ferramenta de regeneração automática, operando contra a fonte
errada (schema remoto desatualizado em vez de schema local homologado),
**removeu contrato de dados válido em silêncio**, sem nenhuma migration que
justificasse a remoção. Ninguém decidiu apagar `schools.status` — o gerador
simplesmente nunca soube que ela existia.

## Por que isto é grave

Um `types.ts` que "emagrece" silenciosamente desliga a verificação de tipos
exatamente nos pontos onde ela protege este projeto: colunas de ciclo de vida
(`status`) usadas pelo R29 para tirar organizações/escolas/turmas arquivadas de
leituras operacionais, e RPCs institucionais (`get_org_analytics_series` etc.)
que compõem o contrato de privacidade da TRUST-1.2. Se esse `types.ts` fosse
aceito como está, o TypeScript deixaria de reclamar do código que hoje depende
desses contratos — abrindo a porta para alguém "corrigir" o erro de tipo
removendo o uso de `status` em vez de perceber que o `types.ts` é que estava
errado.

## Reconciliação aplicada

1. Rebase concluído normalmente (merge automático do Git, sem conflito
   textual detectado);
2. Supabase local subido (`npx supabase start`, portas locais do
   `config.toml`, sem `--linked`);
3. `npx supabase db reset --local` — **47/47 migrations** aplicadas desde
   banco vazio, incluindo a R29 (`20260902120000_trust1_3_r29_archived_
   operational_visibility.sql`);
4. `types.ts` **regenerado inteiramente** a partir desse schema local
   reconstruído: `npx supabase gen types typescript --local --schema public`;
5. Confirmado por grep dirigido que o resultado contém `schools.status`,
   `classes.status`, e as sete RPCs/RPCs-auxiliares TRUST
   (`archive_institutional_entity`, `enqueue_engagement_reminders`,
   `get_institutional_decision_events`, `get_org_analytics_series`,
   `get_school_metrics_r29_base`, `is_org_lifecycle_admin`,
   `is_school_lifecycle_admin`);
6. `src/hooks/useOrgAnalytics.ts` — removido o cast `(supabase as any).rpc(...)`
   que existia como muleta para a RPC não tipada; a chamada volta a ser
   totalmente tipada.

## Diff de contrato: `origin/main` vs. regenerado do schema local

| Diferença | Classificação |
|---|---|
| Bloco `__InternalSupabase.PostgrestVersion: "14.5"` | `GENERATOR_VERSION_CHANGE` — marcador de versão do CLI de geração, sem efeito de tipo |
| Parênteses redundantes nos generics (`TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes`) | `GENERATOR_VERSION_CHANGE` — diferença de formatação entre versões do gerador |
| `classes.status` / `schools.status` | `LEGITIMATE_TRUST_SCHEMA` — coluna real, rastreada à migration `20260828120000_trust1_2_privacy_and_archive.sql` |
| `archive_institutional_entity`, `enqueue_engagement_reminders`, `get_institutional_decision_events`, `get_org_analytics_series`, `get_school_metrics_r29_base`, `is_org_lifecycle_admin`, `is_school_lifecycle_admin` | `LEGITIMATE_TRUST_SCHEMA` — todas rastreadas a migrations reais já commitadas (TRUST-1.2, TRUST-1.5, TRUST-1.3/R29) |

Nenhuma diferença caiu em `REMOTE_SCHEMA_DRIFT` real (isto é, uma decisão de
schema genuína só existente no remoto) nem em `UNEXPECTED`.

## Regra permanente adotada

> **GENERATED TYPES MUST MATCH MIGRATION-BUILT SCHEMA.**
>
> `types.ts` nunca é editado à mão e nunca é aceito por resolução textual de
> merge/rebase. Após qualquer rebase ou merge que toque esse arquivo, ele deve
> ser regenerado a partir do Postgres local reconstruído (`supabase db reset
> --local` seguido de `supabase gen types typescript --local`), nunca escolhido
> por `ours`/`theirs`.

## Proteção futura — gate de CI

Adicionado um novo passo ao job `runtime-db` do workflow `Quality Gate`
(`.github/workflows/quality-gate.yml`), executado depois do `supabase db reset`
(migrations já aplicadas) e antes dos runtime contracts:

```yaml
- name: Detect generated types drift against local schema
  run: |
    npx supabase gen types typescript --local --schema public > /tmp/types.generated.ts
    if ! diff -q src/integrations/supabase/types.ts /tmp/types.generated.ts > /dev/null; then
      echo "::error::src/integrations/supabase/types.ts está desincronizado do schema local..."
      diff -u src/integrations/supabase/types.ts /tmp/types.generated.ts || true
      exit 1
    fi
```

O gate **detecta e falha**; ele nunca regenera e commita silenciosamente. Se um
PR futuro (inclusive vindo do Lovable) alterar `types.ts` sem que o schema
local produza exatamente esse conteúdo, o CI reprova o job com o diff completo
no log.

Testado localmente antes de comitar: `Compare-Object` entre o `types.ts`
versionado e uma regeração fresca a partir do mesmo banco local — **zero
diferenças**.

## Verificação

```
npm run typecheck        → 0 erros
as any | as never | @ts-ignore | @ts-expect-error em useOrgAnalytics.ts → 0
npx supabase db reset --local → 47/47 migrations
runtime contracts (4 arquivos) → 93/93, 0 skips
npm run quality           → exit 0 (audit:security, lint, typecheck, test 443/443, build, security:gate)
```

## O que este documento NÃO prova

Que o schema **remoto de produção** já recebeu as migrations TRUST. Continua
valendo o R22 (`OPEN / REQUIRED_BEFORE_PRODUCTION`): nenhuma migration TRUST foi
promovida remotamente nesta reconciliação, e nenhum `db push`/`--linked`/SQL
Editor de produção foi usado em nenhum momento.
