# TRUST-1.1B — SCHEMA DIFF

**Status: ✅ COMPLETO para A×B — ⚠️ PARCIAL para C (remoto inferido)**

## As três vias

| Lado | Fonte | Disponível |
|---|---|---|
| A | Schema esperado pelo código (RPCs chamadas, colunas lidas) | ✅ Inventariado na TRUST-1.1A |
| B | Schema local após `db reset` integral (43 migrations) | ✅ **Consultado no Postgres local** |
| C | Schema remoto | ⚠️ **Inferido por runtime**, não consultado — R22 |

O lado C continua sendo a lacuna. Consultá-lo exige credencial de leitura do
projeto remoto, que não foi usada nesta onda (protocolo: produção intocada).
Nenhuma classificação abaixo depende de adivinhação sobre C: onde C é incerto,
está dito.

## Estado final do lado B (medido)

| Métrica | Valor |
|---|---|
| Migrations registradas | 43 |
| Tabelas em `public` | 22 |
| Tabelas sem RLS | 0 |
| Funções em `public` | 36 |
| Funções `SECURITY DEFINER` sem `search_path` | 0 |
| Policies em `public` | 39 |
| Policies de UPDATE/DELETE em tabela append-only | 0 |
| Linhas em `auth.users` após reset | 0 |
| Limiar canônico de privacidade | 5 |

## Divergências classificadas

| # | Divergência | Classificação | Comprovação | Estado |
|---|---|---|---|---|
| D1 | `get_school_metrics` no arquivo `20260727120000` referencia `e.school_id`, coluna que não existe em `engagement_events`. Corrigida por `20260731100000`. | **HISTORICAL_DEBT** | Comprovado no ambiente (B: definição aplicada não contém `e.school_id`) | Contido. §0 da reconciliada aborta se a versão defeituosa estiver aplicada. |
| D2 | 4 RPCs usam `as never` no cliente (`get_my_payment_history`, `request_subscription_cancellation`, `claim_escolar_subscription`, `claim_escolar_with_token`) — `types.ts` não reflete o schema. | **REMOTE_DRIFT** | Comprovado no código | Aberto. TRUST-1.5 (R04). |
| D3 | `runtime_gates`, `gate_enabled()`, `compute_cycle_risk()` criados por `20260728194005` e removidos por `20260728194702`. | **CONTAMINANT** | Comprovado no ambiente: **ausentes** no estado final de B | Resolvido em B. Em C, a reconciliada emite `RAISE WARNING` se houver resíduo; não remove. |
| D4 | `DROP ... IF EXISTS` sobre tabelas de outro produto (`ergonomic_assessments`, `contextual_risk_reviews`, `risk_criteria_versions`, `membership_invites`, `platform_admins`, `instrument_versions`). | **CONTAMINANT** | Comprovado no ambiente: nunca existiram em B | Inócuo. `IF EXISTS` torna o DROP seguro. |
| D5 | `20260614163948` consolida e duplica parcialmente `20260613170000`, `20260613173000`, `20260613190000`. | **HISTORICAL_DEBT** | Comprovado no ambiente: sequência aplica limpo desde zero | Aceito. Idempotência resolve. |
| D6 | `20260709164400` duplica parcialmente `20260706194000` (guardian consent). | **HISTORICAL_DEBT** | Comprovado no ambiente: aplica limpo | Aceito. `CREATE OR REPLACE` + `IF NOT EXISTS`. |
| D7 | `20260706192738` continha credencial em claro. | **SANEADO** | `TRUST_1_R17_INCIDENT_RECEIPT.md` | Resolvido no source. Histórico Git mantém — credencial permanentemente comprometida. |
| D8 | `20260706192545` inseria `user_roles` com UUID literal de contas de `auth.users`. Impedia reconstrução desde zero (SQLSTATE 23503). | **BLOCKER** → resolvido | Comprovado no ambiente (falha real do reset) | ✅ Corrigido: `user_id` derivado de `auth.users` por e-mail. Nome e timestamp preservados. R18. |
| D9 | `resend_invitation` chamava `digest()` sem qualificar schema; pgcrypto vive em `extensions` e a função é pinada em `search_path = public`. Falhava em toda invocação. | **BLOCKER** → resolvido | Comprovado no ambiente (execução real da RPC, teste T15) | ✅ Corrigido na reconciliada: `extensions.digest`. R20. Vale para C também — o defeito não é do ambiente local. |
| D10 | Policy `"Org admins read decision events"` existe sem `GRANT SELECT`. RLS restringe, não concede: a policy é inerte. | **EXPECTED_RECONCILIATION** (não executada) | Comprovado no ambiente (privilégios de tabela consultados) | 🟡 Aberto por decisão de contrato. R21. |
| D11 | `20260722250000_demo_tenant_seed` usa UUIDs literais em `institutional_memberships` e `organizations.owner_id`. | **HISTORICAL_DEBT** — sem efeito | Comprovado no ambiente: aplica limpo em banco vazio | Aceito. Essas tabelas **não** têm FK para `auth.users`, por design (o vínculo pode preceder a conta). |
| D12 | Serviços do Supabase local fazem bind em `0.0.0.0` e usam chaves default públicas. | Não é divergência de schema | Aviso do próprio CLI | Registrado. Vale só para a máquina de ensaio. |

**Nenhuma divergência permanece sem classificação.**

## Perguntas do ensaio — todas respondidas

| # | Pergunta | Resposta |
|---|---|---|
| Q1 | A sequência aplica limpo em banco vazio? | **Não, originalmente.** Falhava na 11ª de 42 (D8). Depois de uma correção mínima: **sim**. Hoje 43/43 aplicam desde zero. |
| Q2 | Alguma migration depende de objeto criado fora de ordem? | **Não.** Nenhuma falha de dependência em nenhuma das três execuções. |
| Q3 | `20260706192545` falha em banco vazio? | **Sim, confirmado** — SQLSTATE 23503 na FK `user_roles_user_id_fkey`. A suspeita registrada na 1.1A era exata. Corrigido. |
| Q4 | `20260722250000_demo_tenant_seed` falha em banco vazio? | **Não.** Refutada. As tabelas institucionais não referenciam `auth.users` (D11). |
| Q5 | Os DROPs de `20260728194702` afetam objeto legítimo do domínio escolar? | **Não.** Todos os alvos são de outro produto ou criados pela própria migration anterior. Estado final de B limpo, domínio escolar intacto. |
| Q6 | Grants finais correspondem ao esperado? | **Quase.** As RPCs estão corretas (nenhuma executável por `anon`; escrita de assinatura só por `service_role`). A exceção é D10/R21: a tabela do ledger não tem grant de leitura, tornando a policy declarada inerte. |

## Achados novos desta onda

Dois defeitos que **só a execução revelou** — nenhum deles era visível por
leitura de código ou por teste de invariante textual:

1. **D8 / R18 (P0, corrigido):** o banco não podia ser reconstruído desde zero.
   Onboarding de dev novo falhava no passo 11; criar staging por replay era
   impossível.
2. **D9 / R20 (P0, corrigido):** o botão "Reenviar convite" nunca funcionou, em
   nenhum ambiente, inclusive produção.

E um achado de consistência declarativa:

3. **D10 / R21 (P1, aberto por decisão):** policy de leitura do ledger sem grant.
