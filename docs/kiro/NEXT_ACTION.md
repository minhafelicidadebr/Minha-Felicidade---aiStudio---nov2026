# NEXT_ACTION

## Estado: TRUST-1.2.1 concluída localmente — parada obrigatória

A Macro-Onda E fechou a fronteira de analytics institucional no replay local:

- R31: `org_admin` não lê mais linhas raw de NPS/engagement;
- R32: limiar por contribuidores distintos em cada métrica/bucket;
- RPC server-side para série de 8 semanas e resumo de 30 dias;
- UI/PDF com vazio, supressão parcial e divulgação distintos;
- 46/46 migrations, 78/78 contratos runtime, 405/405 testes;
- `npm run quality` verde;
- produção e catálogo remoto intocados.

Branch: `trust-1.2.1-server-analytics-boundary`.

## Bloqueio antes de produção — R22

Executar o checklist **read-only** em
`TRUST_1_R22_PREFLIGHT_CHECKLIST.md` com credencial explicitamente autorizada.
Comparar catálogo remoto, migrations aplicadas, policies, grants e assinaturas de
função antes de promover #43–#46. Não usar `db push` ou `--linked` sem uma janela
de mudança aprovada.

Migrations TRUST pendentes, nesta ordem:

1. `20260824120000_trust1_dashboard_os_reconciled.sql`
2. `20260826120000_trust1_5_ledger_read_rpc.sql`
3. `20260828120000_trust1_2_privacy_and_archive.sql`
4. `20260901120000_trust1_2_1_server_analytics_boundary.sql`

## Riscos ainda abertos

- R02/R11: integridade de escrita de engagement/NPS — TRUST-1.4.
- R06: consentimento verificável por responsável — TRUST-1.6.
- R29: leituras ainda não filtram entidades arquivadas.
- R30: roster administrativo permanece fora do limiar por decisão.

## Próxima ação

**Parar aqui. Não iniciar TRUST-1.3 automaticamente.** Primeiro integrar esta
branch com CI `quality` e `runtime-db` verdes; promoção remota somente após R22 e
autorização humana explícita.