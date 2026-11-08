# TRUST-1.5 / R23 — DECISÃO: ARCHIVE_INSTEAD_OF_HARD_DELETE

**Status: ✅ CLOSED / ARCHIVE_CONTRACT**

Sem secrets nem dados pessoais.

## O achado

Comprovado em execução na TRUST-1.5: as FKs de
`institutional_decision_events` são

```
organization_id  → organizations(id)  ON DELETE CASCADE
school_id        → schools(id)        ON DELETE SET NULL
class_id         → classes(id)        ON DELETE SET NULL
```

Qualquer uma delas dispara **escrita** na tabela, e os gatilhos append-only
rejeitam escrita. Resultado medido:

| Operação | Antes desta decisão |
|---|---|
| `DELETE FROM schools` com evento referenciando | ❌ `institutional_decision_events is append-only` |
| `DELETE FROM organizations` com evento | ❌ mesma mensagem |
| O mesmo como `service_role` | ❌ idem — o gatilho não distingue papel |
| `DELETE FROM schools` **sem** evento | ✅ funcionava |

A mensagem não dizia nada sobre a causa real, e o caminho **era alcançável**:
`20260722220000` concede `GRANT ... DELETE ... TO authenticated` e cria policies
`FOR ALL` para org_admin em `schools` e `classes`.

## A decisão

**Preservar a integridade referencial e o ledger.** Entidade institucional
referenciada por histórico auditável não é fisicamente removida — é **arquivada**.

Alternativas rejeitadas:

| Opção | Por que não |
|---|---|
| FKs para `NO ACTION` | Troca uma mensagem obscura por outra. Não responde "como então removo?" |
| Gatilhos ignorarem ação de FK | Enfraquece o append-only: o ledger passaria a perder linhas junto com o tenant. Auditoria que desaparece com o auditado não é auditoria |
| `ON DELETE CASCADE` no ledger | Mesma objeção, mais explícita |

## O que foi implementado

**Modelo de estado, espelhando o que já existia.** `organizations` já tinha
`status IN ('active','suspended','archived')`. `schools` e `classes` não tinham
modelo nenhum — agora têm o mesmo vocabulário, com `DEFAULT 'active'` e CHECK.
Nenhum sistema paralelo foi inventado.

**Erro de domínio compreensível.** Gatilho `BEFORE DELETE` em `organizations`,
`schools` e `classes` que verifica o ledger e, havendo histórico, recusa com:

```
schools has auditable governance history (1 event(s)) and cannot be deleted.
Archive it instead: UPDATE public.schools SET status = 'archived' WHERE id = '...'.
HINT: O histórico de decisões institucionais é append-only por design.
      Arquivar preserva a auditoria e remove a entidade da operação.
```

`ERRCODE = 23001` (restrict violation). Roda **antes** da ação da FK, então é esta
mensagem que a pessoa vê, não a do append-only.

A função é `SECURITY DEFINER` com `search_path = public`. Necessário: desde a
TRUST-1.5 nem `authenticated` nem `service_role` têm `SELECT` no ledger — a
leitura passa por RPC. Um gatilho `INVOKER` falharia com
`permission denied for table`, que é justamente o tipo de erro obscuro que esta
função existe para eliminar. Ela não devolve dado do ledger: só conta e recusa.
`EXECUTE` revogado de `PUBLIC`, `anon` e `authenticated` — gatilho dispara sem
precisar de grant.

## O que NÃO foi implementado, e por quê

**Nenhuma UI de exclusão ou arquivamento.** O painel institucional hoje só
**insere** escola e turma; não existe botão de apagar. Inventar fluxo de
arquivamento seria criar feature não pedida.

**Nenhuma leitura passou a filtrar `archived`.** Nada define esse estado hoje, então
filtrar seria mudança sem efeito com risco de regressão silenciosa. Quando o
arquivamento virar operação real, filtrar as leituras é trabalho da onda que o
expor — e é o principal débito que esta decisão deixa em aberto.

**Nenhum sistema de retenção.** Fora de escopo por instrução explícita.

## Verificado em execução — 13 contratos

`src/lib/archive-runtime-contract.test.ts`

| Caso | Resultado |
|---|---|
| `schools` e `classes` têm `status` com o vocabulário de `organizations` | ✅ |
| `archived` é aceito; estado inventado é recusado pelo CHECK | ✅ |
| os três gatilhos existem | ✅ |
| ledger **não** usa `ON DELETE CASCADE` em `school_id`/`class_id` | ✅ `SET NULL` preservado |
| apagar escola com histórico → erro de **domínio**, não de FK | ✅ e a mensagem antiga não aparece mais |
| apagar turma com histórico | ✅ mesmo erro |
| apagar organização com histórico | ✅ mesmo erro |
| a proteção vale para `service_role` | ✅ |
| histórico permanece legível após a tentativa | ✅ e a entidade não fica meio-apagada |
| arquivar funciona e preserva o vínculo | ✅ |
| entidade **sem** histórico continua deletável | ✅ a proteção é dirigida, não um bloqueio geral |
| org_admin de outro tenant não vê nem arquiva a escola alheia | ✅ 0 linhas |
| org_admin de outro tenant não consegue apagar a escola alheia | ✅ 0 linhas |

## Nota metodológica

A primeira versão do seed deste teste começava apagando as entidades para
garantir estado limpo — e **quebrou contra a própria proteção**: na segunda
execução a turma já tinha histórico e o `DELETE` foi corretamente recusado.

Vale como evidência independente de que o gatilho funciona, e como lição: seed de
teste não pode assumir que consegue destruir o que criou. O seed passou a ser
idempotente por `ON CONFLICT DO NOTHING`, sem prelúdio destrutivo, e a
idempotência foi verificada rodando a suíte duas vezes seguidas.
