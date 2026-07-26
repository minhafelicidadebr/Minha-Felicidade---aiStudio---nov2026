# NEXT_ACTION

## Estado: ONDA UX-1 concluída — parada no gate, como instruído

`npm run quality` verde: 18 arquivos de teste, 166 testes (83 novos), lint com 0 warnings,
typecheck, build e security gate. Nenhuma biblioteca nova. Nenhum dashboard redesenhado.

Entregue: papel→home canônico, navegação por papel, `/inicio` role-aware, contexto organizacional
com switcher, componentes-base (MetricCard, InsightCard, DecisionQueue, ChartFrame com tabela
alternativa), estados canônicos (loading/empty/denied/demo/erro) e responsividade homologada por
teste em 320/375/390/768/1024/1280/1440.

## Próxima ação (ONDA UX-2 — /org + /escolas)

**Primeiro passo, obrigatório antes de qualquer redesign de conteúdo:** montar
`src/pages/OrgDashboardPage.tsx` sobre `RoleAwareAppShell` (remover `Navbar`/`Footer` locais,
manter a lógica de dados atual). Isso:
1. torna o shell verificável visualmente (hoje ele não está montado em nenhuma rota);
2. valida os estados canônicos com dados reais;
3. só depois vale extrair `DecisionQueue`, funil e portfólio de escolas.

Em seguida, na UX-2:
- Resolver a ambiguidade **D33**: `school_admin` → `/escolas` (landing pública) vs
  `/escolas/:schoolId` (dashboard autenticado). Decidir e atualizar `role-home.ts` + contrato.
- Migrar `/org` de `useOrganization` (`.limit(1)`) para `useDashboardContext` (multi-organização).
- Substituir `EngagementChart.tsx` (SVG manual) por Recharts dentro de `ChartFrame`.
- Reescrever os `return null` de `EngagementMetrics`/`NpsEvolution`/`OperationalMetrics` usando
  `DashboardSkeleton`/`DashboardEmptyState`/`DashboardErrorState`.
- RPCs agregadas por organização/escola com filtro de período e limiar de privacidade (N≥5).

## Riscos e dívidas registrados

- **Shell não homologado visualmente** (D38) — não há screenshot possível enquanto nenhuma página o
  monta. Mitigação: 20 testes de viewport verificam o comportamento por breakpoint (drawer em
  mobile, navegação persistente em ≥768, landmark único, espaço para bottom nav).
- **D33** ambiguidade `/escolas` no contrato — pendente de decisão humana na UX-2.
- **`/admin` continua servindo professor/gestor** — o contrato quer `/admin` reservado à plataforma,
  mas `scripts/security-gate.mjs` exige o literal
  `path: "/admin", element: <AdminPage />, roles: ["teacher", "manager"]`. Mover é UX-3 e requer
  atualizar o security gate na mesma mudança.
- `useOrganization` ainda com `.limit(1)` (intencional; migração UX-2).
- Dois vocabulários de papel no banco (D29) — unificação opcional, não bloqueante.

## Backlog anterior (mantido)

- Configurar `RESEND_API_KEY` + `PUBLIC_SITE_URL` nos secrets (e-mails de convite/lembrete).
- Domínio: migrar para minhafelicidade.com.br.
- Migrar react-router v6→v7 (advisory de audit; não bloqueia com `--audit-level=critical`).
- Instrumentar mais ações de engajamento (debate, poesia, co-design).
- Cron para `enqueue_engagement_reminders`.
