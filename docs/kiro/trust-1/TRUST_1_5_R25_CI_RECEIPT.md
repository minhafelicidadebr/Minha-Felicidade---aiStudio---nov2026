# TRUST-1.5 / R25 — RECEIPT DO CI COM POSTGRES REAL

**Status: ✅ CLOSED**

Sem secrets nem credenciais. O job usa ambiente completamente efêmero.

## O problema

Os contratos de runtime exigem Docker e o stack Supabase local. No runner do
GitHub Actions não havia nenhum dos dois, então a suíte era **pulada** — e
"0 testes executados" aparecia como job verde.

Isso esvazia a própria razão de existir da categoria. O R20 (`resend_invitation`
nunca resolveu `digest`) passou por todo teste que **lia** o SQL; só execução real
pegou. Um CI que pula a execução real reintroduz exatamente o ponto cego que a
TRUST-1 fechou.

## O job

`.github/workflows/quality-gate.yml` → job `runtime-db`, paralelo ao `quality`.

Sequência exigida pelo contrato:

```
checkout → Node + dependências → Supabase CLI → stack local
         → migrations desde zero → contratos de runtime → verificação de contagem
```

| Passo | O que faz |
|---|---|
| `actions/checkout@v4` | — |
| `actions/setup-node@v4` (20, cache npm) | — |
| `npm ci` | Dependências travadas pelo lockfile |
| `supabase/setup-cli@v1` versão `2.115.0` | Mesma versão usada localmente |
| `docker version` / `docker info` | Falha o job se o daemon não responder |
| `supabase start` | Aplica **todas** as migrations desde banco vazio |
| `supabase migration list --local` | Registra e exige contagem > 0 |
| Verificação do container | Confere `supabase_db_ctjwyybmlwhynherikqy` de pé |
| `vitest run` dos três arquivos de contrato | Executa |
| Verificação anti-skip | Falha se houver skip **ou** se menos de 50 contratos executarem |
| `supabase stop --no-backup` (`if: always()`) | Limpeza |

## Skip não é sucesso

Duas travas, porque uma só não basta:

**1. Detecção de skip.** A saída do Vitest é capturada e, se contiver `skipped`,
o job emite `::error::` e sai com 1.

**2. Piso de contagem.** O número de contratos aprovados é extraído da saída e
comparado com um mínimo de 50. Hoje executam **62**. O piso pega o caso em que a
suíte roda mas silenciosamente perde arquivos.

O `set -o pipefail` garante que a falha do `vitest` não seja engolida pelo `tee`.

## Isolamento — nada aponta para produção

| Verificação | Situação |
|---|---|
| `--linked` | ❌ não usado |
| `db push` | ❌ não usado |
| `project-ref` remoto | ❌ não usado |
| `SUPABASE_ACCESS_TOKEN` | ❌ não usado |
| senha de banco de produção | ❌ não usada |
| `--db-url` remoto | ❌ não usado |
| Segredos do repositório | ❌ nenhum consumido pelo job |

`supabase start` sobe containers locais com as chaves default públicas do próprio
CLI. O ambiente morre com o runner.

## Efeito colateral positivo

O job também trava o invariante da TRUST-1.1B: se a sequência histórica de
migrations deixar de reconstruir o schema desde banco vazio, `supabase start`
falha e o job falha. Antes, isso só era verificado quando alguém rodava o reset na
própria máquina.

## Ajuste necessário nos testes

Cada chamada ao Postgres passa por `docker exec`, que custa centenas de
milissegundos. Suítes com dezenas de round-trips estouravam o timeout padrão de 5s
do Vitest — falha que não indica defeito nenhum.

Timeout elevado a 120s **apenas nas três suítes de runtime**, via
`describe(name, { timeout }, fn)`. Não foi mexido no timeout global: um teste de
unidade que pendura deve continuar falhando rápido.

## Contagem atual

| Arquivo | Contratos |
|---|---|
| `rpc-runtime-contract.test.ts` | 26 |
| `archive-runtime-contract.test.ts` | 13 |
| `privacy-runtime-contract.test.ts` | 23 |
| **Total** | **62** |

## Evidência do runner

PR #51, run `33233305899`, job `Runtime DB contracts`: **pass** em 2m54s.

```
Migrations aplicadas desde banco vazio: 45
Contratos de runtime executados: 62
```

Ambos os números vêm do próprio log do runner, não da máquina local.

## Duas iterações antes de fechar

O job falhou duas vezes, e as duas falhas foram do **verificador**, não da
execução. Vale registrar, porque é a mesma classe de erro que o R25 existe para
evitar — instrumentação que mede errado e induz a conclusão errada.

**1ª falha — contagem de migrations.** O passo usava
`supabase migration list --local` com `grep -c '^ *[0-9]'`. O formato de saída do
CLI não casou e devolveu `0`, enquanto o `supabase start` tinha aplicado as
migrations sem erro. Trocado por consulta direta a
`supabase_migrations.schema_migrations` via `docker exec psql` — a mesma fonte que
os testes usam, sem depender de formato de apresentação.

**2ª falha — contagem de contratos.** A saída do Vitest vem com escapes ANSI
(`Tests \e[22m \e[1m\e[32m62 passed`), e o `grep` sobre texto decorado leu `0`. O
log do mesmo run já mostrava `62 passed`. Corrigido com `NO_COLOR`/`FORCE_COLOR` no
ambiente do passo e `sed` removendo escapes remanescentes antes de medir.

Nas duas vezes os contratos **executaram e passaram**. Se a trava de contagem não
existisse, o job teria ficado verde nas duas — e ninguém saberia que a medição
estava quebrada. É o argumento a favor de ter a trava.

## O que este receipt NÃO prova

Que o job continua verde diante de mudança de versão do CLI ou da imagem do
Postgres. Ele fixa `2.115.0`, o que torna a execução reprodutível, mas também
significa que atualizar o CLI é uma mudança que precisa ser exercitada.
