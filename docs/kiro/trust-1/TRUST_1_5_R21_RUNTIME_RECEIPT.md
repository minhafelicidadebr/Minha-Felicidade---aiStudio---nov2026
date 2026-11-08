# TRUST-1.5 — RECEIPT DE RUNTIME DO R21

**Status: ✅ R21 FECHADO — 🟡 dois achados novos abertos por decisão (R23, R24)**

Sem secrets, credenciais ou dados pessoais. Todos os dados usados são sintéticos
(`@example.invalid`, RFC 2606) em banco local descartável.

## Identificação

| Campo | Valor |
|---|---|
| Branch | `trust-1.5-schema-type-contract` |
| Migration | `20260826120000_trust1_5_ledger_read_rpc.sql` |
| Ambiente | Supabase local em Docker, portas 55321-55329 |
| Migrations após reset | **44/44 desde banco vazio** |
| Produção tocada | **NÃO** |
| Dados reais | **NÃO** |

## Procedência do código

A migration partiu de um candidato não commitado encontrado na árvore de trabalho
ao final da TRUST-1.1B, preservado antes de qualquer troca de branch:

| Campo | Valor |
|---|---|
| SHA-256 do candidato | `F5E890B5CCA2E01C7A54C722D6BBAB40483F3065E64DEFC5D248CB5D703E8A8B` |
| Verificado após preservação | ✅ hash idêntico |
| Tratamento | `UNVALIDATED_TRUST_1_5_CANDIDATE` — ponto de partida, não fonte de verdade |

Alterações feitas sobre o candidato:

1. **Determinismo do resultado.** O candidato ordenava só na subquery (o que
   define *quais* linhas entram na página) e agregava com `jsonb_agg` sem
   `ORDER BY` (o que deixa a ordem *do resultado* indefinida). Adicionado
   `ORDER BY p.created_at DESC, p.id DESC` no agregado.
2. **Pré-condições ampliadas.** Somadas a verificação de `data_access_logs` e a
   exigência de que os **dois** gatilhos append-only existam — esta migration abre
   um caminho de leitura e não deve ser aplicada em ledger que perdeu a proteção
   de escrita.
3. **Timestamp.** `20260824180000` → `20260826120000`, refletindo a data real de
   autoria e validação.
4. **Comentário do R24.** Ver §Achados.

## Decisão de contrato aplicada

`authenticated` **não** recebe `GRANT SELECT` bruto em
`institutional_decision_events`. Leitura por RPC dedicada, no mesmo padrão de
`guardian_consent_events`.

A policy inerte `"Org admins read decision events"` foi **removida**: sem grant,
nunca foi avaliada, e mantê-la deixava no schema a afirmação falsa de que
org_admin acessa a tabela diretamente.

## Estado verificado no Postgres local

| Verificação | Esperado | Medido |
|---|---|---|
| Migrations aplicadas desde zero | 44 | **44** |
| `has_table_privilege('anon', ledger, 'SELECT')` | false | **false** |
| `has_table_privilege('authenticated', ledger, 'SELECT')` | false | **false** |
| `has_table_privilege(anon/authenticated, ledger, 'INSERT')` | false | **false** |
| Policies na tabela | 0 | **0** |
| Gatilhos append-only | 2 | **2** |
| RPC `SECURITY DEFINER` | sim | **sim** |
| RPC `search_path` | `public` | **`public`** |
| `has_function_privilege('anon', RPC)` | false | **false** |
| `has_function_privilege('authenticated', RPC)` | true | **true** |
| `has_function_privilege('service_role', RPC)` | false | **false** |

## Testes de execução real — 15 casos

Cenário: 2 tenants sintéticos, 120 eventos no tenant A (com `created_at`
deliberadamente repetido em blocos, para exercitar o desempate por `id`), 3 no
tenant B, e quatro identidades — org_admin de A, org_admin de B, educator de A,
usuário sem vínculo.

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| T1 | org_admin lê a própria organização | total 120, limit 50, has_more, 50 eventos | ✅ exatamente |
| T2 | `recipient_hash` na resposta | ausente | ✅ ausente — e o valor plantado também |
| T2 | `idempotency_key` na resposta | ausente | ✅ ausente |
| T2 | `metadata` cru na resposta | ausente | ✅ ausente |
| T3 | Chaves devolvidas por evento | projeção fechada | ✅ 15 chaves: `actor_role, actor_user_id, class_id, created_at, event_type, id, reason, resend, resends, result, school_id, severity, source_entity, source_id, target_role` |
| T4 | Pedir `_limit = 5000` | teto 100 | ✅ limit 100, 100 eventos |
| T5 | `_limit = -10` / `= 0` | normalizado para 1 | ✅ 1 / 1 |
| T5 | `_offset = -5` | normalizado para 0 | ✅ 0 |
| T5 | `_days = 9999` | teto 180 | ✅ 180 |
| T6 | Duas páginas de 50 | 100 linhas, 100 ids distintos | ✅ sem repetir, sem perder |
| T6 | Mesma página pedida 2× | idêntica | ✅ estável |
| T6 | Ordem por `created_at` | decrescente | ✅ |
| T7 | org_admin de A pede organização B | negar 42501 | ✅ `Organization not available for this account` |
| T8 | Usuário sem membership | negar | ✅ mesma mensagem |
| T9 | **Educator da mesma organização** | negar (só org_admin audita) | ✅ mesma mensagem |
| T10 | Organização inexistente | mesma negativa (não é sonda) | ✅ idêntica |
| T11 | `_organization_id = NULL` | negar, não tratar como curinga | ✅ |
| T12 | `anon` executa a RPC | negar por privilégio | ✅ `permission denied for function` |
| T13 | `SELECT` direto na tabela por `authenticated` | negar | ✅ `permission denied for table` |
| T14 | `UPDATE` / `DELETE` no ledger | rejeitar | ✅ append-only intacto |
| T15 | Leitura de sucesso auditada | 1 linha em `data_access_logs` | ✅ `purpose = get_institutional_decision_events`, `row_count = 3` |

Nenhum teste textual foi aceito como evidência: todas as linhas acima são
resultado de invocação real da RPC no Postgres.

## Contratos de runtime versionados

`src/lib/rpc-runtime-contract.test.ts` — **26 testes**, categoria
`RPC_RUNTIME_CONTRACT`, cobrindo `resend_invitation`, `get_school_metrics`,
`escalate_indicator` e `get_institutional_decision_events`.

Inclui o teste que teria pegado o R20 no dia em que nasceu: cada função é
**recompilada** pelo Postgres com `check_function_bodies = on`, o que força a
resolução de todos os objetos que o corpo referencia sob o `search_path` pinado.

Degradação honesta verificada: com o container parado, o resultado é
**26 pulados**, não 26 aprovados, e um aviso explícito é impresso.

## Achados novos — abertos por decisão

### R23 (P1) — o ledger torna organizações, escolas e turmas indeletáveis

As FKs do ledger são `organization_id ON DELETE CASCADE`,
`school_id ON DELETE SET NULL`, `class_id ON DELETE SET NULL`. Qualquer uma delas
dispara uma escrita na tabela — e os gatilhos append-only rejeitam escrita.

Comprovado em execução:

| Operação | Resultado |
|---|---|
| `DELETE FROM schools` (com evento referenciando) | ❌ `institutional_decision_events is append-only` via `UPDATE ... SET school_id = NULL` |
| `DELETE FROM organizations` (com evento referenciando) | ❌ mesma rejeição via `DELETE FROM ... WHERE organization_id = $1` |
| O mesmo como `service_role` | ❌ idem — gatilho não distingue papel |
| `DELETE FROM schools` **sem** evento no ledger | ✅ funciona |

Ou seja: assim que existe uma decisão de governança registrada, a organização
deixa de poder ser removida por qualquer caminho, inclusive administrativo.

Isso pode ser exatamente o desejado (auditoria fixa seus referentes) ou um
bloqueio operacional inaceitável. As saídas possíveis não são equivalentes:

| Opção | Efeito | Custo |
|---|---|---|
| A — manter | Auditoria imutável de verdade | Nenhuma organização/escola/turma pode ser apagada depois de qualquer governança. Erro confuso para quem tentar. |
| B — FKs para `NO ACTION` | Falha explícita e legível na FK | Exige tratamento na aplicação; não resolve o "como remover" |
| C — gatilhos ignorarem ação de FK | Deleção volta a funcionar | Enfraquece o append-only; o ledger passa a perder linhas com o tenant |

Escolher entre imutabilidade da auditoria e capacidade de remover tenant é
decisão de produto e retenção de dados. **Registrado, não alterado.**

### R24 (P1) — a auditoria da NEGATIVA nunca persiste

Tanto `get_institutional_decision_events` quanto `get_school_metrics` (padrão
herdado da UX-3) gravam uma linha em `data_access_logs` antes de negar acesso. O
`RAISE EXCEPTION` seguinte aborta a transação e **desfaz o INSERT junto**.

Comprovado em execução, com transações separadas como faz o PostgREST:

| Caminho | Linhas persistidas |
|---|---|
| Negativa em `get_institutional_decision_events` | **0** |
| Negativa em `get_school_metrics` | **0** |
| Sucesso em `get_institutional_decision_events` | **1** |

Consequência: `data_access_logs` **não é** registro de tentativas negadas. Só
registra acessos que deram certo. Qualquer análise de "quem tentou acessar o que
não podia" em cima dessa tabela hoje está vazia por construção.

O INSERT foi mantido de propósito, com comentário explícito no corpo da função
dizendo que não persiste: é o ponto de captura correto quando o R24 for resolvido
(registro fora da transação). Resolver exige ou abandonar a exceção — mudando o
contrato de segurança — ou um mecanismo de escrita autônoma. Decisão de
arquitetura. **Registrado, não alterado.**

### R25 (P1) — contratos de runtime não rodam no CI

Os 26 testes de `RPC_RUNTIME_CONTRACT` exigem Docker. O runner do GitHub Actions
não sobe o stack Supabase, então eles são pulados lá. O gate do CI continua sendo
texto + unidade; a prova de runtime é local e registrada em receipt.

## Gate de qualidade

```
npm run quality  → exit 0
  audit:security  ✅
  lint            ✅ 0 problemas
  typecheck       ✅ real (R03), 0 erros
  test            ✅ 26 arquivos, 346 testes
  build           ✅
  security:gate   ✅
```

## O que este receipt NÃO prova

- Que a migration aplica em **produção**. Foi provada em banco reconstruído desde
  zero. As pré-condições do §0 abortam em vez de adivinhar. R22 continua
  obrigatório antes de qualquer promoção.
- Que a interface consome a nova RPC. Nenhum componente foi ligado a ela nesta
  onda — a porta de leitura existe e está fechada corretamente; o consumo é
  trabalho do domínio de UI.
- Que `data_access_logs` registra tentativas negadas. Não registra — ver R24.
