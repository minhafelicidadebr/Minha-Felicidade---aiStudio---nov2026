# NEXT_ACTION

## Estado: ONDA UX-2 concluída — PR #37 aberto

`npm run quality` verde: 18 arquivos de teste, 166 testes, lint 0 warnings, typecheck, build,
security gate. Nenhuma biblioteca nova. Nenhuma migration criada.

Entregue: OrgDashboardPage sobre RoleAwareAppShell, estados canônicos (Skeleton/Empty/Error),
MetricCards com contrato completo, EngagementChart em Recharts + ChartFrame, eliminação de
`return null` em 4 componentes, migração para useDashboardContext (multi-org via ContextSwitcher).

## Decisão pendente (D33) — perguntar ao humano

O route map do contrato manda:
- `school_admin` → `/escolas` (mas `/escolas` hoje é a landing pública de aquisição)
- O dashboard autenticado deveria ser `/escolas/:schoolId`

**Sugestão:** manter `/escolas` como landing pública, criar `/escola/:id` como painel autenticado
na UX-3 (single school dashboard). Confirmar com o humano antes de implementar.

## Próxima ação (ONDA UX-3 — escola + docente)

Pendente de D33, mas o backlog da UX-3 inclui:
1. Resolver D33 e atualizar `IMPLEMENTED_ROLE_HOME` para `school_admin`.
2. Criar `/escola/:id` (single school dashboard) com o mesmo shell.
3. Migrar `/admin` (educator) para o shell (hoje `AdminPage.tsx` ainda usa Navbar/Footer).
4. Mover `/admin` para a rota que o contrato quer (requer atualizar `security-gate.mjs`).
5. RPCs agregadas por escola com filtro de período e limiar de privacidade (N≥5).
6. DecisionQueue integrada na /org com ações reais (aprovar convite, escalar alerta).

## Riscos e dívidas registrados

- **D33** ambiguidade `/escolas` no contrato — pendente decisão humana.
- **Chunk grande** — OrgDashboardPage ~882 kB (Recharts inlined). Não bloqueante; pode ser
  resolvido com dynamic import de Recharts numa onda futura.
- **`/admin` continua servindo professor/gestor** — o contrato quer `/admin` reservado à
  plataforma, mas `scripts/security-gate.mjs` exige o literal
  `path: "/admin", element: <AdminPage />, roles: ["teacher", "manager"]`. Mover é UX-3.
- `useOrganization` ainda existe (outros consumidores); remoção quando não for mais necessário.
- Dois vocabulários de papel no banco (D29) — unificação opcional, não bloqueante.

## Backlog anterior (mantido)

- Configurar `RESEND_API_KEY` + `PUBLIC_SITE_URL` nos secrets (e-mails de convite/lembrete).
- Domínio: migrar para minhafelicidade.com.br.
- Migrar react-router v6→v7 (advisory de audit; não bloqueia com `--audit-level=critical`).
- Instrumentar mais ações de engajamento (debate, poesia, co-design).
- Cron para `enqueue_engagement_reminders`.
