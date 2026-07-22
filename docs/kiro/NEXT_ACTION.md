# NEXT_ACTION (uma única próxima ação)

## P0.0: APROVADO (2026-07)
Rótulo "Recurso externo" implementado no player de vídeo. Ver `COMMERCIAL_GATES.md` para o
detalhe do gate e pendências menores registradas no backlog (não bloqueiam o P0 principal).

> Ação manual pendente, fora de código: **renomear o domínio público** que contém "yale" no
> painel do Lovable (Configurações → Domínios). Isso não bloqueia a ONDA 1.

## Próxima ação: ONDA 1 — Corte 1.1 (Entitlement canônico)
Iniciar o P0 principal. Criar fonte única server-side para resolução de plano/feature:
`plan_id`, `feature_key`, `daily_limit`, `monthly_limit`, `is_unlimited`, `seat_limit`,
`ai_model_tier`, `status`. Verificar: resolução server-side, checagem de feature nas Edge
Functions, bloqueio de rotas premium, bloqueio visual no frontend, mensagens de upgrade, testes
por plano, comportamento seguro quando o plano não for reconhecido.

Critério de aceite: nenhuma função premium pode ser usada apenas digitando sua URL.

**Antes de editar:** localizar a RPC/hook atual (`get_my_plan`, `useSubscription`,
`FeatureGate`) e mapear onde a checagem hoje é só client-side, sem reanalisar o repositório
inteiro (usar buscas direcionadas).
