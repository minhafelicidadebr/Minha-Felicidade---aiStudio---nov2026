# TRUST-1.2.1 — RECEIPT DE ANALYTICS SERVER-SIDE

**Status:** ✅ arquitetura B implementada e provada localmente.

## Fronteira

`get_org_analytics_series(uuid)` é `SECURITY DEFINER`, fixa
`search_path = public`, resolve `auth.uid()`/`is_org_admin()` no banco e expõe
somente agregados. `PUBLIC`/`anon` não executam; `authenticated` e
`service_role` têm o grant mínimo documentado.

A resposta contém oito semanas ISO ordenadas, `minimum_group_size` e grupos
`divulgado | vazio | suprimido`. Não contém `user_id`, feedback, contexto ou
metadata. `get_org_engagement_summary(uuid)` foi redefinida com o mesmo gate por
métrica e informa `suppressed_metrics`.

## Cliente

`useOrgAnalytics.ts` chama apenas as RPCs e segrega cache por
`organizationId`. `NpsEvolution`, `EngagementChart` e `EngagementMetrics` não
consultam mais tabelas raw. O servidor continua revalidando tenant e papel em
toda chamada; a query key não é autorização.

## Evidência

- antes: **3/12 verdes, 9/12 vermelhos**;
- depois: **12/12 verdes**;
- quatro suítes runtime: **78/78 verdes**;
- security gate: verde e com proibição explícita de leitura raw institucional.

Produção não foi consultada nem alterada.