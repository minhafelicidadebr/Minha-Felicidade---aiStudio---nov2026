# NEXT_ACTION

## Estado: redesenho de dashboards concluído — main corrente

| Onda | PR | Entregas principais |
|---|---|---|
| UX-2 | #37 ✅ | /org sobre a casca, MetricCards, Recharts, multi-org |
| UX-3 | #38 ✅ | /escola/:schoolId, limiar N=5, ledger append-only, DecisionQueue |
| UX-4 | #39 ✅ | /alunos como home do estudante, code-split (882→49 kB) |
| UX-5 | #40 ✅ | Estudante na casca compartilhada |
| — | #41 ✅ | Remoção de `useOrganization`, `RequireInstitutionalRole` |
| UX-6 | #42 | Dedupe de navegação, item de escola com href dinâmico |

`npm run quality` verde: **285 testes** em 24 arquivos, 0 lint warnings, build sem
warning de chunk, security gate.

Todos os cinco papéis rodam no `RoleAwareAppShell`. Nenhum painel usa
`Navbar`/`Footer`. Nenhum item de navegação é link morto ou destino duplicado.

## Ações manuais bloqueantes

1. **Aplicar a migration** `20260727120000_ux3_school_metrics_and_governance.sql`
   no SQL Editor do Lovable.
2. Rodar as queries de verificação de privilégio registradas no runbook.

## Dívidas restantes

### Alta (contrato parcial — precisam decisão de produto)

- **Escalonamento na primeira leitura em vez da segunda (D65).** Falta onde
  guardar a leitura anterior. Opções: snapshots periódicos do indicador, ou
  derivar a leitura anterior do ledger de decisões.
- **`canResend` sempre `true` no cliente (D65).** Quem não pode vê o botão e só
  descobre ao clicar. Fechar exige o cliente distinguir `org_admin` de
  `school_admin`.

### Média

- `/admin/operacao` não existe como rota separada; a Landing está em `/admin`.
  `CANONICAL_ROLE_HOME.platform_admin` já aponta para a futura.
- Dois vocabulários de papel no banco (D29) — dois guards
  (`RequireRole` + `RequireInstitutionalRole`) refletem essa divisão de forma
  honesta, mas unificar no banco simplificaria.
- `school_admin` com duas ou mais escolas não tem item de menu para escola
  (omitido por design, D70). Um submenu com a lista resolveria.

### Baixa (backlog operacional)

- Configurar `RESEND_API_KEY` + `PUBLIC_SITE_URL` nos secrets (e-mails).
- Domínio: migrar para minhafelicidade.com.br.
- Migrar react-router v6→v7 (advisory de audit; não bloqueia com critical).
- Instrumentar mais ações de engajamento (debate, poesia, co-design).
- Cron para `enqueue_engagement_reminders`.
- Testes de banco executados em Postgres real (hoje são estruturais).

## Próxima ação sugerida

As duas dívidas de alta prioridade dependem de decisão de produto. Sugestão de
pergunta ao humano: onde guardar o histórico de leituras do indicador, para que o
escalonamento respeite a regra de duas leituras consecutivas?
