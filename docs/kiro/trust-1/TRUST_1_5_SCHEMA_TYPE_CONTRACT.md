# TRUST-1.5 — CONTRATO SCHEMA ↔ TYPESCRIPT (R04)

**Status: ✅ R04 FECHADO**

Sem secrets, credenciais ou dados pessoais.

## A regra

`src/integrations/supabase/types.ts` é **gerado**, nunca editado à mão, e a fonte
é o **schema homologado** — o banco local reconstruído por replay integral das
migrations, não o remoto e não a memória de quem escreveu o código.

```bash
npx supabase start
npx supabase gen types typescript --local --schema public > src/integrations/supabase/types.ts
```

Quando o tipo não bate com o uso, a resposta é regerar ou corrigir o schema.
**Nunca** silenciar com cast.

## O defeito

Seis pontos do código usavam `as never` para chamar RPCs ou gravar colunas que os
tipos gerados supostamente não conheciam. Todos vinham com comentários no
espírito de "a RPC ainda não está nos tipos gerados até o Lovable regenerá-los".

O problema: `as never` não é um cast estreito. Ele desliga a verificação daquele
argumento por completo. Um nome de RPC errado, um parâmetro renomeado ou uma RPC
removida passariam silenciosamente — que é exatamente a classe de falha que a
TRUST-1 existe para eliminar.

## O que a verificação mostrou

Gerados os tipos a partir do schema local homologado (43 migrations), o diff
contra o `types.ts` então versionado foi de **2 inserções e 5 remoções**:

| Mudança | Natureza |
|---|---|
| `+ enqueue_engagement_reminders` | RPC presente no schema local e ausente nos tipos versionados |
| `- __InternalSupabase { PostgrestVersion: "14.5" }` | Marcador informativo emitido por outra versão do CLI |

Todas as RPCs que estavam sendo castadas **já estavam nos tipos**:
`claim_escolar_subscription`, `claim_escolar_with_token`,
`get_my_payment_history`, `request_subscription_cancellation`.

Conclusão honesta: os casts estavam **obsoletos**. Em algum momento os tipos
foram regenerados e ninguém voltou para remover as muletas. Elas permaneceram
como buracos permanentes na verificação, cada um com um comentário explicando um
motivo que já não existia.

Sobre a remoção de `__InternalSupabase`: verificado que nenhum `.d.ts` de
`@supabase/*` instalado (supabase-js 2.98.0) referencia esse marcador. Removê-lo
não altera resolução de tipos. Ele volta a aparecer se o projeto passar a gerar
tipos com um CLI que o emita.

## Casts removidos

| Arquivo | Antes | Depois |
|---|---|---|
| `src/lib/claim-escolar.ts` | `rpc("claim_escolar_subscription" as never)` | `rpc("claim_escolar_subscription")` |
| `src/lib/claim-escolar.ts` | `rpc("claim_escolar_with_token" as never, {...} as never)` | `rpc("claim_escolar_with_token", { _token: token })` |
| `src/pages/SubscriptionPage.tsx` | `rpc("get_my_payment_history" as never)` | `rpc("get_my_payment_history")` |
| `src/pages/SubscriptionPage.tsx` | `rpc("request_subscription_cancellation" as never)` | `rpc("request_subscription_cancellation")` |
| `src/lib/engagement.ts` | `metadata: (...) as never` | sem cast — `sanitize()` foi tipada corretamente |
| `src/hooks/useProgress.ts` | `data: (data \|\| {}) as never` | `as Json` — cast estreito e documentado |

### `engagement.ts` — cast eliminado por tipagem, não por asserção

A coluna `metadata` é `Json`. `sanitize()` declarava retorno
`Record<string, unknown>`, que não é atribuível a `Json`, e o descasamento era
escondido no insert.

O filtro de `sanitize()` já só deixava passar `string`, `number` e `boolean`. O
retorno passou a **dizer isso**:

```ts
function sanitize(obj: Record<string, unknown>): Record<string, string | number | boolean>
```

`Record<string, string | number | boolean>` é atribuível a `Json`. O insert
type-checa sem asserção nenhuma.

## Cast legítimo remanescente

Um só, documentado no código:

**`src/hooks/useProgress.ts` — `data: (data || {}) as Json`**

O parâmetro chega dos chamadores como `Record<string, unknown>` e a coluna é
`Json`. TypeScript não consegue provar serializabilidade de `unknown`. A troca de
`as never` por `as Json` importa: a asserção passou a ser **do tipo real da
coluna**, não do tipo bottom. Se a coluna mudar de tipo, isto quebra — que é o
comportamento desejado.

Também permanece, e é legítimo:

**`src/pages/SubscriptionPage.tsx` — `data as unknown as PaymentRow[]`**

`get_my_payment_history` devolve `Json` no schema. A forma das linhas é contrato
de aplicação, não de schema. Nenhum gerador de tipos pode inferir isso.

## Verificação

```
Casts de máscara em código (as never | as any | @ts-ignore | @ts-expect-error): 0
```

A busca só encontra ocorrências em **comentários** que descrevem a correção.

```
npm run typecheck  → 0 erros (com o gate real do R03)
npm run test       → 26 arquivos, 346 testes
npm run build      → verde
npm run security:gate → passou
```

## O que este documento NÃO prova

Que o schema **remoto** é idêntico ao local. Os tipos foram gerados do local. A
comparação com o `types.ts` anterior (gerado do remoto pelo Lovable) diverge em
apenas duas linhas, o que é **indício forte** de convergência — mas indício não é
consulta ao catálogo. Continua valendo o **R22**: leitura read-only do schema
remoto é obrigatória antes de promover qualquer migration TRUST para produção.
