# NEXT_ACTION

## Estado: ondas UX-2, UX-3 e UX-4 mergeadas em main

| Onda | PR | Entregas principais |
|---|---|---|
| UX-2 | #37 ✅ | /org sobre a casca, MetricCards, Recharts, multi-org |
| UX-3 | #38 ✅ | /escola/:schoolId, limiar canônico N=5, ledger append-only, DecisionQueue com ações reais |
| UX-4 | #39 ✅ | /alunos como home do estudante, code-split (882→49 kB) |

`npm run quality` verde: 276 testes em 24 arquivos, 0 lint warnings, build sem
warning de chunk >500 kB, security gate.

## Ações manuais bloqueantes

1. **Aplicar a migration** `20260727120000_ux3_school_metrics_and_governance.sql`
   no SQL Editor do Lovable.
2. Rodar as queries de verificação de privilégio registradas no runbook.

## Dívidas técnicas priorizadas

### Alta (afetam a experiência ou o contrato)

- **`DashboardPage` (estudante) ainda usa `Navbar`/`Footer`.** É o único painel
  que não está na casca compartilhada. A migração é viável, mas muda a
  experiência visual do estudante.
- **Escalonamento na primeira leitura em vez da segunda (D65).** Falta onde
  guardar a leitura anterior.
- **`canResend` sempre `true` no cliente (D65).** Quem não pode vê o botão.

### Média (correção de arquitetura)

- `platform_admin` não é expressável em `RequireRole` — checagem dentro da
  página. Guard de papéis institucionais é candidato a onda própria.
- `/admin/operacao` não existe como rota separada; a Landing Administrativa vive
  em `/admin`. `CANONICAL_ROLE_HOME.platform_admin` aponta para a futura.
- `org-schools` segue `future` (precisa href dinâmico).
- Duplicação `org-home`/`org-people` → `/org` (decisão de produto sobre onde
  "Pessoas e convites" mora).
- `useOrganization` ainda existe (outros consumidores).
- Dois vocabulários de papel no banco (D29).

### Baixa (backlog operacional)

- Configurar `RESEND_API_KEY` + `PUBLIC_SITE_URL` nos secrets (e-mails).
- Domínio: migrar para minhafelicidade.com.br.
- Migrar react-router v6→v7 (advisory de audit; não bloqueia com critical).
- Instrumentar mais ações de engajamento (debate, poesia, co-design).
- Cron para `enqueue_engagement_reminders`.
- Testes de banco executados em Postgres real (hoje são estruturais).

## Próxima ação sugerida

Migrar `DashboardPage` para a casca compartilhada (`RoleAwareAppShell`), fechando
o último painel que ainda usa `Navbar`/`Footer`. Isso dá ao estudante a mesma
navegação lateral, bottom nav e skip link que todos os outros papéis já têm.
