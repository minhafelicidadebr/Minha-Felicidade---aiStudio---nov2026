# Evidência — Falha #2: `resend_invitation` quebrada por `search_path`

## Identificação

| Campo | Valor |
|---|---|
| Data | 2026-08-24 |
| Ambiente | Supabase local (Docker), portas 55321-55329 |
| Como foi encontrada | Teste SQL/RLS T15 da TRUST-1.1B (chamada real da RPC) |
| Objeto afetado | `public.resend_invitation(uuid)` |
| Migration de origem | `20260727120000_ux3_school_metrics_and_governance.sql` linha 488 |
| Risco | **R20** |
| Severidade | **P0** — defeito latente com consumidor ativo em produção |

## Erro exato

```
ERROR:  function digest(text, unknown) does not exist
LINE 1: _recipient_hash := encode(digest(lower(trim(_inv.invited_ema...
HINT:  No function matches the given name and argument types.
QUERY:  _recipient_hash := encode(digest(lower(trim(_inv.invited_email)), 'sha256'), 'hex')
CONTEXT:  PL/pgSQL function resend_invitation(uuid) line 31 at assignment
```

## Causa raiz

`digest()` vem do **pgcrypto**, e no Supabase o pgcrypto é instalado no schema
`extensions`, não em `public`:

```
 extname  |   schema
----------+------------
 pgcrypto | extensions
 uuid-ossp| extensions
```

A função obedece corretamente à doutrina (`SET search_path = public`), e é
exatamente esse pinning — necessário para segurança — que remove `extensions`
do caminho de resolução. A chamada não qualificada nunca encontra `digest`.

## Alcance

Não é um artefato do ambiente local. O pinning é o mesmo em qualquer ambiente e
o pgcrypto do Supabase mora em `extensions` por padrão, inclusive na nuvem. A
função falha em **toda** invocação, no primeiro `digest`, antes de qualquer
escrita.

Consumidor ativo: `src/hooks/useDecisionActions.ts` chama
`supabase.rpc("resend_invitation", ...)` a partir do botão "Reenviar convite" da
`DecisionQueue` (UX-3). Ou seja: **o botão de reenvio nunca funcionou**.

Por que os testes de UX-3 não pegaram: são testes de *invariante de texto* sobre
o arquivo `.sql` (`src/lib/ux3-migration-invariants.test.ts`) — leem o corpo da
função como string e verificam a política de antiburla. Nenhum deles executa a
função contra um Postgres. Esta é precisamente a lacuna que a TRUST-1 existe
para fechar.

## Classificação

| Campo | Valor |
|---|---|
| Tipo | Erro histórico — dependência de extensão fora do `search_path` |
| Natureza | Não destrutivo; a função aborta antes de escrever |
| Comprovação | **Comprovado no ambiente** (execução real da RPC no Postgres local) |
| Domínio | Dashboard OS / Governança de convites |

## Menor correção defensável

Qualificar a chamada com o schema da extensão, mantendo `SET search_path = public`:

```
encode(extensions.digest(...), 'hex')
```

Aplicada via `CREATE OR REPLACE FUNCTION` na migration reconciliada forward-only.
Nenhum outro trecho do corpo muda. Nenhum dado é tocado.

## O que NÃO fazer

- Adicionar `extensions` ao `search_path` da função (afrouxa o pinning que a
  doutrina exige e vale para todo o corpo, não só para esta chamada)
- Instalar pgcrypto em `public` (muda o ambiente para acomodar o código)
- Trocar o hash por outra construção só para evitar a extensão (mudaria a
  semântica do antiburla e invalidaria contagens já gravadas no ledger)

## Varredura correlata

Busca por uso não qualificado de pgcrypto em todas as 42 migrations
(`digest|gen_random_bytes|crypt|hmac|encrypt|decrypt`): **uma única ocorrência**,
a desta evidência. Nenhum outro objeto tem o mesmo defeito.
