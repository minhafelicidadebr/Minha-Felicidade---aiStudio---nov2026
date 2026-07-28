# NEXT_ACTION

## Estado: ONDA UX-3 parcialmente entregue — gate verde, um item de escopo aberto

`npm run quality` verde: 21 arquivos de teste, **245 testes** (eram 171), lint 0
warnings, typecheck, build, security gate. Nenhuma biblioteca nova.

Branch: `ux-3-escola-docente` (empilhada sobre `ux-2-org-dashboard`, cujo PR #37
ainda não foi mergeado).

As oito decisões de contrato (D49–D57) foram fechadas **antes** do design e estão
versionadas em `DASHBOARD_PRODUCT_CONTRACT.md` e `METRIC_PRIVACY_POLICY.md`.

## Pendência de escopo desta onda

**`DecisionQueue` com ações reais (Requirement 9) não foi ligada à interface.**

O que existe: `resend_invitation` e `escalate_indicator` no banco, com limite de
3 reenvios / 24 h contados por organização + destinatário, negação de alvo fora da
organização, e tudo gravado no ledger append-only. A política de reenvio também
está no cliente (`src/lib/invitation-resend.ts`), testada.

O que falta: `/org` renderizar a fila com os botões, chamar as RPCs e tratar os
três desfechos (sucesso, falha técnica, permissão negada) com textos distintos.
É fiação de UI sobre peças que já existem e estão testadas.

## Ações manuais bloqueantes

1. **Aplicar a migration** `20260727120000_ux3_school_metrics_and_governance.sql`
   no SQL Editor do Lovable. Enquanto não for aplicada, `/escola/:schoolId` mostra
   o estado de erro explícito (por design — não um zero fabricado).
2. Rodar as queries de verificação de privilégio que estão comentadas na
   migration e registradas no runbook.

## Riscos e dívidas registrados

- **Testes de banco são estruturais.** `ux3-migration-invariants.test.ts` lê o SQL
  e verifica que as proteções **estão escritas**; não executa Postgres, então não
  prova que funcionam em tempo de execução. Pegam o modo de falha realista aqui
  (regressão por edição futura), não semântica sutil do Postgres. Fechar isso
  exige um banco de teste, que o projeto não tem.
- **`platform_admin` não é expressável em `RequireRole`.** O guard conhece só os
  papéis de aplicação (`student`/`teacher`/`manager`); `platform_admin` existe
  apenas em `institutional_memberships`. Por isso `/admin` é protegida por
  `RequireAuth` e a checagem de papel acontece **dentro** da página, sobre o papel
  derivado no servidor. Um guard que entenda papéis institucionais seria mais
  limpo e é candidato a onda própria.
- **`/admin/operacao` ainda não existe.** A Landing Administrativa foi entregue em
  `/admin` (opção 2 de §D3). `CANONICAL_ROLE_HOME.platform_admin` já aponta para
  `/admin/operacao`; o item de navegação `platform-home` segue `future`.
- **Item de navegação de escolas segue `future`.** `org-schools` precisaria de um
  uuid no `href`, e a configuração de navegação é estática. O painel escolar é
  alcançável pela lista de escolas de `/org`. Resolver exige navegação com href
  dinâmico por papel.
- **Duplicação de destino na navegação:** `org-home` e `org-people` apontam ambos
  para `/org`, o que deixa o estado "ativo" da sidebar ambíguo. É a mesma classe
  de problema que §D4/D52 eliminou em `org-reports`, mas resolver exige decidir
  onde "Pessoas e convites" passa a morar — decisão de produto. Há teste fixando
  o tamanho atual da dívida (3) para que ela não cresça.
- **`useOrganization` ainda existe** (outros consumidores).
- **Chunk grande** (D48) — `OrgDashboardPage` com Recharts + jsPDF.
- Dois vocabulários de papel no banco (D29).

## Próxima ação sugerida

1. Fiar a `DecisionQueue` em `/org` (fecha o Requirement 9 e a onda).
2. Aplicar a migration e conferir os privilégios.
3. Mergear PR #37 (UX-2) antes de abrir o PR da UX-3, ou rebasear.

## Backlog anterior (mantido)

- Configurar `RESEND_API_KEY` + `PUBLIC_SITE_URL` nos secrets. Sem isso o
  reenvio de convite grava o evento e enfileira, mas o e-mail não sai.
- Domínio: migrar para minhafelicidade.com.br.
- Migrar react-router v6→v7 (advisory de audit; não bloqueia com
  `--audit-level=critical`).
- Instrumentar mais ações de engajamento (debate, poesia, co-design).
- Cron para `enqueue_engagement_reminders`.
