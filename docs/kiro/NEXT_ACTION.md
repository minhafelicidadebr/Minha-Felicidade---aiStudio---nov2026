# NEXT_ACTION

## Estado: ONDA UX-2 concluída — PR #37 aberto

`npm run quality` verde: 18 arquivos de teste, 166 testes, lint 0 warnings, typecheck, build,
security gate. Nenhuma biblioteca nova. Nenhuma migration criada.

Entregue: OrgDashboardPage sobre RoleAwareAppShell, estados canônicos (Skeleton/Empty/Error),
MetricCards com contrato completo, EngagementChart em Recharts + ChartFrame, eliminação de
`return null` em 4 componentes, migração para useDashboardContext (multi-org via ContextSwitcher).

## D33 — RESOLVIDA (decisão do humano)

`/escolas` **permanece** a landing pública de aquisição. O painel escolar autenticado será
`/escola/:schoolId` (singular, para não colidir com a landing no plural).

Já aplicado nesta onda: `CANONICAL_ROLE_HOME.school_admin = "/escola/:schoolId"` e o item de
navegação `org-schools` aponta para o novo caminho (segue `future: true`, sem link morto).
`IMPLEMENTED_ROLE_HOME.school_admin` continua `/org` até a rota existir.

## Próxima ação (ONDA UX-3 — escola + docente)

1. **Criar a rota `/escola/:schoolId`** (painel escolar autenticado) sobre `RoleAwareAppShell`,
   com `RequireRole` para school_admin/org_admin/platform_admin e verificação de que o
   `schoolId` pertence a uma organização que a pessoa pode ver.
2. Apontar `IMPLEMENTED_ROLE_HOME.school_admin` para `/escola/:schoolId` e remover
   `future: true` do item `org-schools`.
3. Migrar `/admin` (educator) para o shell (hoje `AdminPage.tsx` ainda usa Navbar/Footer).
4. Mover `/admin` para a rota que o contrato quer (requer atualizar `security-gate.mjs` na
   MESMA mudança — o gate exige o literal atual).
5. RPCs agregadas por escola com filtro de período e limiar de privacidade (N≥5).
6. DecisionQueue integrada na /org com ações reais (aprovar convite, escalar alerta).

## Riscos e dívidas registrados

- **`/escola/:schoolId` ainda não existe** — o mapa canônico já aponta para ela, mas quem tem só
  `school_admin` continua caindo em `/org` (comportamento correto e testado; não é 404).
- **Chunk grande** (D48) — OrgDashboardPage ~882 kB (Recharts + jsPDF inlined). Não bloqueante;
  resolver com `import()` dinâmico numa onda de performance.
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
