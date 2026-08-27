# Achado — Policy de leitura do ledger é inerte (falta GRANT SELECT)

## Identificação

| Campo | Valor |
|---|---|
| Data | 2026-08-24 |
| Como foi encontrado | Testes SQL/RLS T10 e T13 da TRUST-1.1B |
| Objeto | `public.institutional_decision_events` |
| Migration de origem | `20260727120000_ux3_school_metrics_and_governance.sql` linhas 106-116 |
| Risco | **R21** |
| Severidade | **P1** — inconsistência declarativa, sem consumidor afetado hoje |

## Observado

```
SELECT count(*) FROM public.institutional_decision_events;   -- como authenticated
ERROR:  permission denied for table institutional_decision_events
```

Privilégios efetivos de tabela no schema final:

| grantee | privilégios |
|---|---|
| `anon` | REFERENCES, TRIGGER, TRUNCATE |
| `authenticated` | REFERENCES, TRIGGER, TRUNCATE |
| `service_role` | REFERENCES, TRIGGER, TRUNCATE |
| `postgres` | todos |

Nenhum `SELECT`, `INSERT`, `UPDATE` ou `DELETE` para os papéis da API.

## Causa raiz

A migration cria a policy `"Org admins read decision events"` (SELECT, para
`authenticated`) mas nunca emite `GRANT SELECT ... TO authenticated`. Em
PostgreSQL, RLS **restringe** um privilégio existente; não o concede. Sem o
privilégio de tabela, a policy nunca é avaliada.

Os privilégios residuais (REFERENCES/TRIGGER/TRUNCATE) vêm das default
privileges do Supabase; os privilégios de DML não foram concedidos e o
`REVOKE UPDATE, DELETE` da linha 116 operou sobre algo que já não existia.

## Efeito prático

**Nenhum, hoje.** Nenhum caminho do cliente lê essa tabela diretamente
(`grep` em `src/**` só encontra o nome em testes de invariante). O ledger é
escrito exclusivamente pelas RPCs `SECURITY DEFINER`, que rodam como `postgres`
e não dependem do grant.

O que existe é uma **divergência entre intenção declarada e estado efetivo**: o
comentário e a policy afirmam que org_admin lê o histórico de governança, e ele
não lê.

## Por que NÃO foi corrigido nesta onda

Há dois desfechos possíveis e eles não são equivalentes:

1. `GRANT SELECT ON institutional_decision_events TO authenticated` — torna a
   policy efetiva e cumpre a intenção original. **É um alargamento de
   privilégio** sobre uma tabela de auditoria, sem consumidor que o justifique
   hoje.
2. `DROP POLICY` — remove a declaração inerte e assume que a leitura do ledger,
   quando existir, passará por uma RPC de leitura dedicada (que é o padrão do
   projeto para `guardian_consent_events`).

Escolher entre alargar privilégio e remover uma policy declarada é decisão de
contrato de produto, não correção mecânica. O protocolo TRUST-1 manda aplicar
apenas a menor correção defensável e parar diante de decisão metodológica não
coberta. Portanto: **registrado, classificado, não alterado.**

Recomendação técnica (não aplicada): opção 2, coerente com o padrão de
`guardian_consent_events` — ledger sem leitura direta, leitura por RPC própria.

## Comprovação

Comprovado no ambiente (Postgres local após reset integral).
