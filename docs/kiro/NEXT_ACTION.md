# NEXT_ACTION

## Estado: todas as ondas UX mergeadas — main corrente

| Onda | PR | Entregas principais |
|---|---|---|
| UX-2 | #37 ✅ | /org sobre a casca, MetricCards, Recharts, multi-org |
| UX-3 | #38 ✅ | /escola/:schoolId, limiar canônico N=5, ledger append-only, DecisionQueue |
| UX-4 | #39 ✅ | /alunos como home do estudante, code-split (882→49 kB) |
| UX-5 | #40 ✅ | Estudante na casca compartilhada |

**Todos os cinco papéis agora rodam dentro do `RoleAwareAppShell`.** Nenhum
painel usa `Navbar`/`Footer` como shell. O redesenho de dashboards por papel
está concluído.

`npm run quality` verde: 276 testes em 24 arquivos, 0 lint warnings, build sem
warning de chunk >500 kB, security gate.

## Ações manuais bloqueantes

1. **Aplicar a migration** `20260727120000_ux3_school_metrics_and_governance.sql`
   no SQL Editor do Lovable.
2. Rodar as queries de verificação de privilégio registradas no runbook.

## Dívidas técnicas priorizadas

### Alta (contrato parcial — precisam decisão de produto)

- **Escalonamento na primeira leitura em vez da segunda (D65).** Falta onde
  guardar a leitura anterior. Opções: snapshots periódicos do indicador, ou
  derivar a segunda leitura do ledger de decisões.
- **`canResend` sempre `true` no cliente (D65).** Quem não pode vê o botão.
  Fechar exige o cliente distinguir `org_admin` de `school_admin`.

### Média (correção de arquitetura — executáveis sem decisão de produto)

- `platform_admin` não é expressável em `RequireRole` — checagem ad hoc dentro
  da página. Criar um guard que entenda papéis institucionais.
- `useOrganization` ainda existe — o único consumidor era `/org`, que agora usa
  `useOrganizationDetail`. Candidato a remoção.
- `/admin/operacao` não existe como rota separada; a Landing está em `/admin`.
- `org-schools` segue `future` (precisa href dinâmico).
- Duplicação `org-home`/`org-people` → `/org` (decisão de produto).

### Baixa (backlog operacional)

- Configurar `RESEND_API_KEY` + `PUBLIC_SITE_URL` nos secrets (e-mails).
- Domínio: migrar para minhafelicidade.com.br.
- Migrar react-router v6→v7 (advisory de audit; não bloqueia com critical).
- Instrumentar mais ações de engajamento (debate, poesia, co-design).
- Cron para `enqueue_engagement_reminders`.
- Testes de banco executados em Postgres real (hoje são estruturais).

## Próxima ação sugerida

Limpeza técnica: remover `useOrganization` (hook morto) e criar
`RequireInstitutionalRole` (guard que entende papéis de membership), eliminando
a checagem ad hoc dentro de `AdminOperacaoPage`.
