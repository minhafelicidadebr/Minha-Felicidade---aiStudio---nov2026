# TRUST-1.5 — RECEIPT DO TYPECHECK (R03)

**Status: ✅ R03 FECHADO**

Sem secrets, credenciais ou dados pessoais.

## Identificação

| Campo | Valor |
|---|---|
| Branch | `trust-1.5-schema-type-contract` |
| Base | `main` após PR #47 e #48 |
| Data | 2026-08-26 |
| Produção tocada | **NÃO** |

## O defeito

`package.json` declarava:

```json
"typecheck": "tsc --noEmit"
```

E `tsconfig.json` na raiz é um arquivo-solução:

```json
{ "files": [], "references": [
  { "path": "./tsconfig.app.json" },
  { "path": "./tsconfig.node.json" } ] }
```

Com `files: []` e nenhum `include`, `tsc --noEmit` compila **zero arquivo**.
`references` só é seguido em modo build (`tsc -b`), que não estava em uso.
Confirmado por `tsc --showConfig`: `files: null`, `include: null`.

O gate de tipos do projeto era vazio desde que essa estrutura existe.

## Prova negativa — antes

Arquivo temporário em `src/` com erro inequívoco:

```ts
export const deliberateTypeError: number = "isto não é um número";
```

```
> tsc --noEmit
EXIT: 0
```

**Exit 0 com erro flagrante presente.** O gate não verificava nada.

## Correção

`tsc -b` foi descartado: exige `composite: true` nos projetos referenciados, e
nem `tsconfig.app.json` nem `tsconfig.node.json` são composite. Adicionar
`composite` mudaria o pipeline de build para gerar artefatos de declaração — mais
invasivo do que o necessário.

Adotada a verificação explícita de cada projeto:

```json
"typecheck": "tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit"
```

Cobertura resultante: `src/**` (app) e `vite.config.ts` (node). Ambos os
tsconfigs já tinham `noEmit: true`; o flag é explicitado no comando.

## Prova negativa — depois

Mesmo arquivo temporário, novo comando:

```
> tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit
src/__trust15_negative_proof.ts(3,14): error TS2322: Type 'string' is not assignable to type 'number'.
EXIT: 2
```

Repetido ao final da onda, após todas as demais mudanças:

| Cenário | Exit |
|---|---|
| Com erro deliberado em `src/` | **2** |
| Sem o erro | **0** |

Nenhum código inválido foi versionado: o arquivo de prova foi criado e removido
na mesma execução, duas vezes.

## Estado do código após ativar o typecheck real

**0 erros.** Não porque o código estava correto, mas porque os commits do Lovable
que precederam esta onda já haviam mascarado os erros com casts. O
`.trust1-5-candidate/evidence-tsc-before.txt`, capturado em sessão anterior,
mostra o que o typecheck real acusava antes desse mascaramento:

- `DashboardEmptyState.tsx` — `Property 'onClick' does not exist on type` (união discriminada)
- `useDecisionActions.ts` (3 ocorrências) — `"resend_invitation"` e `"escalate_indicator"` não atribuíveis ao union de RPCs
- `useSchoolMetrics.ts` — `"get_school_metrics"` não atribuível ao union de RPCs
- `engagement.ts` — `No overload matches this call` no insert de `engagement_events`

Ou seja: R03 e R04 eram o mesmo defeito visto de dois lados. Ativar o typecheck
sem sincronizar os tipos teria produzido pressão para mais casts. Por isso as
duas correções foram feitas na mesma onda — ver
`TRUST_1_5_SCHEMA_TYPE_CONTRACT.md`.

## Limitação conhecida

`strict: false` e `strictNullChecks: false` continuam nos dois tsconfigs. O gate
agora **verifica os arquivos reais**, mas com o rigor configurado hoje. Endurecer
o modo strict é trabalho separado, com diff grande, e não foi feito aqui.

Registrado como dívida: **R26 — typecheck real mas não strict.**
