# WORKLOG (curto)

## 2026-07 · P0.0 — Guardrails marca/PI/conteúdos externos
- Inventário por buscas direcionadas: `Yale`, `Coursera|Laurie Santos|Science of Well-Being`,
  `oficial|parceria|licenciad|endossad|certificad`.
- Ocorrências públicas críticas corrigidas (P0):
  - `index.html`: description/keywords/schema/og/twitter → linguagem independente, sem "baseado
    em Yale"; keyword "Yale" removida.
  - `src/components/landing/CourseStructure.tsx`: "Da Dra. Laurie Santos para você" → framing
    independente.
  - `src/pages/ConstellationPage.tsx`: "Da sala de Yale para sua tela" / "O conteúdo vem de Yale"
    / "o que alunos de Yale fazem" → material autoral com referência, sem alegação de origem/endosso.
  - `src/components/Footer.tsx`: adicionado aviso de independência institucional (site-wide);
    removido badge "WCAG 2.2".
- Docs criados: `P0_0_GUARDRAILS_MARCA_PI_CONTEUDOS_EXTERNOS.md`, `CONTENT_PROVENANCE.md`,
  `PROJECT_TRUTH.md`, `COMMERCIAL_GATES.md`, `DECISIONS.md`, `WORKLOG.md`, `NEXT_ACTION.md`.
- NÃO tocado: prompts de IA, protocolo de crise, consentimento, planos, edge functions.
- Gate: `npm run quality` (resultado registrado na entrega).

## 2026-07 · Fechamento do P0.0 — rótulo "Recurso externo"
- Criado `src/components/learning/ExternalResourceNotice.tsx`.
- Aplicado em `src/pages/ModulePage.tsx`: painel persistente de vídeo + modal de fallback.
- `CONTENT_PROVENANCE.md` e `COMMERCIAL_GATES.md` atualizados: pendência resolvida, gate P0.0 → **aprovado**.
- `npm run quality`: 80 testes, lint, typecheck, build, security gate — verde.

## 2026-07 · ONDA 1 Corte 1.1 — Entitlement canônico
- Criado `src/components/routing/RequireFeature.tsx` + teste (3 casos).
- `src/App.tsx`: campo `feature` em `PrivateRoute`; 9 rotas de ferramenta premium passam a exigir
  a feature canônica (evidence, simulator, debate, poetry, codesign, mindmap, challenge21,
  hypothesis, missions) antes de renderizar.
- `src/components/FeatureGate.tsx`: corrigido fail-open durante loading (mostrava conteúdo antes
  de resolver o plano).
- Ajuste de segurança: primeira versão do App.tsx quebrou `scripts/security-gate.mjs` (checa
  literal de `RequireRole`); corrigido preservando o literal exato.
- `npm run quality`: 83 testes, lint, typecheck, build, security gate — verde.

## 2026-07 · ONDA 1 Corte 1.2 — Integridade da assinatura
- Auditoria por buscas direcionadas: `user_subscriptions` ok (sem policy de INSERT/UPDATE para
  authenticated). `organization_subscriptions` **tinha** policy de UPDATE para `authenticated`
  (owner_id podia alterar plan/status/seats/vigência pelo client).
- Migration `20260722190000_drop_org_subscriptions_update_policy.sql`: remove essa policy.
- Runbook atualizado (item 21).
- `npm run quality`: 83 testes, lint, typecheck, build, security gate — verde.

## 2026-07 · ONDA 1 Corte 1.3 — Limites de IA centralizados
- Achado: `enforce_ai_usage_limit` aplicava 80/dia pra TODOS (hardcoded), independente do plano.
  Plano gratuito promete 9/dia; premium promete ilimitado. Inconsistência.
- Migration `20260722200000_ai_limits_from_plan.sql`: aledria-chat agora lê
  `get_my_plan()->'limits'->'alegria_daily'`. Se -1 = ilimitado (sem contar). Fallback = 9.
- Runbook atualizado (item 22).
- `npm run quality`: verificar.

## 2026-07 · ONDA 1 Corte 1.4 — Idade e consentimento
- `set_my_birth_date`: confirmada single-fill (ok).
- `guardian_consent_events`: ledger imutável confirmado (ok).
- `get_my_guardian_consent_status`: SECURITY DEFINER, self-scoped (ok).
- **GAP:** policy "Users can update own profile" permitia alterar `birth_date` diretamente.
- Migration `20260722210000_protect_birth_date_immutable.sql`: trigger que impede alteração de
  `birth_date` uma vez preenchida. Runbook item 23.
- `npm run quality`: verificar.

## 2026-07 · ONDA 2 (início) — Mapeamento do estado atual de multitenancy
- **organization_subscriptions** (existente): funciona como "a organização" de fato — tem
  `organization_name`, `owner_id`, `plan_id`, `max_seats`, status. É a tabela "contrato escolar".
- **organization_members** (existente): membros (user_id, invited_email, status), referenciados à
  assinatura. Policy "Org owners can manage members" (FOR ALL) permite ao owner CRUD.
- **NÃO existe** (precisa ser criado para piloto): `organizations` (entidade independente da
  assinatura), `schools`, `classes`, `invitations` (convites com token/expiração/papel),
  `enrollments` (matrícula aluno↔turma), papéis formais (platform_admin, org_admin,
  school_admin, educator, student, guardian).
- Decisão: o plano master pede essas tabelas na ONDA 2. Preparar uma migration única (CREATE
  TABLE IF NOT EXISTS) com RLS, policies e grants mínimos para piloto.

## 2026-07 · ONDA 2 — RPCs institucionais (criação/convite/aceite)
- Migration `20260722230000_institutional_rpcs.sql`:
  - `create_organization(name, slug)`: cria org + membership org_admin, idempotente.
  - `invite_member(org_id, email, role, school_id, class_id)`: cria convite com token, valida
    is_org_admin, enfileira notificação (best-effort), idempotente.
  - `accept_invitation(token)`: valida token + email confirmado + expiração, cria membership
    ON CONFLICT, marca convite aceito.
- Todas: SECURITY DEFINER, search_path=public, auditadas, REVOKE/GRANT corretos.
- Estende notification_outbox kind CHECK.
- Runbook item 25.

## 2026-07 · Vender pilotos — #7 tenant demo, #6 relatório, aprimoramento /escolas
- **#7 Tenant demonstrativo** (`supabase/migrations/20260722250000_demo_tenant_seed.sql`):
  org "Rede Exemplo de Bem-Estar (DEMONSTRAÇÃO)" (id `...d0`), 2 escolas, 3 turmas, 27 membros
  (1 org_admin = conta demo + 2 educadores + 24 alunos fictícios) + 3 convites pendentes. Tudo
  `metadata.is_demo=true`, IDs fixos, idempotente. Permite demonstrar o painel `/org` cheio sem
  piloto real e sem PII verdadeira. **PENDENTE: aplicar no SQL Editor do Lovable.**
- **#6 Relatório do piloto** (`src/pages/OrgDashboardPage.tsx`): botão "Relatório" no header gera
  .txt client-side com estrutura (escolas/turmas), adesão AGREGADA (membros por papel, taxa de
  ativação) e nota de privacidade. Sem PII, sem conversas de IA, sem relatos individuais. Fecha o
  ciclo comercial (demonstração → proposta → devolutiva). Commit `30ce2a3`.
- **/escolas aprimorada** (`src/pages/EscolasLandingPage.tsx`, commit `80471fb`): hero com foto
  real (`hero-youth-2026.jpg`), headline de conversão, trust row honesto, seção problema com
  `teacher-exhausted.jpg`, banda de transformação com `youth-connection.jpg`. Marca própria na nav.
- Honestidade: NÃO gero imagens; usei fotos hiperrealistas já existentes em `src/assets/`.
- `npm run quality`: 83 testes, lint, typecheck, build, security gate — verde (Exit 0).

## 2026-07 · ONDA UX-1 — App Shell adaptativo e Design System

Escopo executado (só infraestrutura; nenhum dashboard redesenhado):

- **Papel → home (puro/testável):** `src/lib/role-home.ts` unifica `profiles.roles` +
  `institutional_memberships.role` em `DashboardRole` com precedência explícita; dois mapas de
  destino (`CANONICAL_ROLE_HOME` do contrato e `IMPLEMENTED_ROLE_HOME` navegável hoje).
- **Navegação por papel (fonte única):** `src/config/dashboard-navigation.ts` — itens agrupados,
  bottom nav limitada a 5 destinos sem duplicar href, e flag `future` para a arquitetura-alvo que
  ainda não tem rota (não renderiza link morto).
- **Contexto compartilhado:** `src/hooks/useDashboardContext.ts` (React Query) resolve papéis,
  organizações visíveis, organização ativa (persistida e validada contra o que a pessoa pode ver),
  e `fetchedAt` para freshness. Resolve o `.limit(1)` que impedia context switcher.
- **Shell:** `RoleAwareAppShell` + `RoleSidebar` + `RoleNavigation` + `MobileRoleNavigation` +
  `DashboardHeader` + `ContextSwitcher` + `GlobalFilterBar`.
- **Componentes-base:** `MetricCard` (contrato de métrica completo), `InsightCard`, `DecisionQueue`,
  `ChartFrame` (com tabela alternativa real), `DashboardSkeleton`, `DashboardEmptyState`
  (empty/denied/demo), `DashboardErrorState`, `PrivacyIndicator`.
- **Rota canônica:** `/inicio` → `RoleHomeRedirect`. `/dashboard` preservado.
- **Modificados:** `App.tsx` (rota `/inicio`), `redirect.ts` (fallback role-aware validado),
  `RequireRole.tsx` (negação coerente com o papel), `index.css` + `tailwind.config.ts` (tokens),
  `Navbar.tsx` (só cabeçalho de STATUS).
- **Zero dependência nova.**

Testes reais adicionados: **83** (`npm run quality`: 83 → **166** testes, 15 → 18 arquivos).
- `role-home.test.ts` (12) · `dashboard-navigation.test.ts` (9) · `dashboard-states.test.tsx` (23)
- `RoleAwareAppShell.test.tsx` (15) · `shell-viewports.test.tsx` (20) · `redirect.test.ts` (+4)

Três defeitos encontrados pelos próprios testes e corrigidos na causa: landmark `main` duplicado
(SidebarInset já é `main`), `ContextSwitcher` duplicado por breakpoint (dois tab stops para a mesma
ação) e retry silencioso mascarando o estado de erro do contexto.

Gate UX-1: `npm run quality` verde — audit, lint (0 warnings), typecheck, 146 testes, build,
security gate.

**Não homologado visualmente:** o shell ainda não está montado em nenhuma página (instrução da
onda). A verificação de pixel/screenshot acontece quando a UX-2 montar `/org` sobre o shell.

## 2026-07 · ONDA UX-2 — /org sobre o App Shell

Escopo executado:

- **Passo 1 — Shell verificável:** `OrgDashboardPage.tsx` envolvido com `<RoleAwareAppShell
  title="Visão da rede" subtitle="Implantação, adesão e decisões">`. Removidos `<Navbar>` e
  `<Footer>` locais. Loading usa `DashboardSkeleton variant=page`, erro usa
  `DashboardErrorState` com retry, org não encontrada usa `DashboardEmptyState`.
- **Passo 2 — return null eliminados (contrato §4):** `EngagementMetrics`, `EngagementChart`,
  `NpsEvolution`, `OperationalMetrics` agora usam `DashboardSkeleton`/`DashboardEmptyState` em
  vez de retornar `null` silenciosamente.
- **Passo 3 — MetricCard canônico:** cards de Escolas/Membros/Convites/Turmas migrados para
  `MetricCard` com formula, source, limitation, updatedAt.
- **Passo 4 — Recharts + ChartFrame:** `EngagementChart.tsx` reescrito de SVG manual para
  `ChartContainer` (Recharts) + `ChartFrame` (tabela alternativa acessível, PrivacyIndicator,
  descrição).
- **Multi-organização:** criado `useOrganizationDetail` (React Query, keyed por orgId). A página
  agora lê `activeOrganization` de `useDashboardContext` e reage à troca no ContextSwitcher.
  `useOrganization` preservado (outros consumidores).

Arquivos alterados/criados:
- `src/pages/OrgDashboardPage.tsx` (reescrito)
- `src/hooks/useOrganizationDetail.ts` (novo)
- `src/components/org/EngagementChart.tsx` (reescrito: SVG → Recharts)
- `src/components/org/EngagementMetrics.tsx` (fix return null)
- `src/components/org/NpsEvolution.tsx` (fix return null)
- `src/components/org/OperationalMetrics.tsx` (fix return null)

Gate UX-2: `npm run quality` verde — audit, lint (0 warnings), typecheck, 166 testes, build,
security gate.

Decisão pendente D33: school_admin → /escolas (landing) vs /escolas/:schoolId (dashboard
autenticado). Mantido comportamento atual (school_admin → /org via IMPLEMENTED_ROLE_HOME).

PR: #37 (ux-2-org-dashboard → main).

## 2026-07 · ONDA UX-3 — Painel escolar, limiar canônico e governança

Antes do código, as oito decisões de contrato foram fechadas pelo humano e
versionadas (D49–D57). Duas **reprovaram** propostas minhas, e o motivo importa:

- **D51** — eu propus redirecionar `platform_admin` para `/org` provisoriamente.
  Reprovado: confunde papel, pode mascarar falha de autorização e cria dívida
  que tende a durar. **Ampliou o escopo da onda**: passou a exigir uma landing
  administrativa mínima.
- **D53** — eu tratei "esconder a escola inteira" como opção defensável. O
  ajuste separou dado de **implantação** (turmas, convites — sobre a escola) de
  dado de **atividade de estudante** (sobre um adolescente). Só o segundo é
  suprimido; esconder o primeiro quebraria a operação do piloto sem ganho de
  privacidade.

### Documentos criados (achado D57)

Os contratos `DASHBOARD-*.md` citados por UX-1 e UX-2 **nunca existiram no
repositório** — circularam apenas no chat. Duas ondas rodaram contra um contrato
não auditável. Criados agora, versionados:
`docs/kiro/DASHBOARD_PRODUCT_CONTRACT.md` e `docs/kiro/METRIC_PRIVACY_POLICY.md`.

### Servidor (`20260727120000_ux3_school_metrics_and_governance.sql`)

- `metric_minimum_group_size()` — limiar canônico N=5, fonte única. Antes o 5
  estava repetido em duas RPCs.
- `institutional_decision_events` — ledger append-only. `REVOKE UPDATE, DELETE`
  **mais** triggers que barram mutação até para `service_role` (o REVOKE não
  alcança `service_role` nem função DEFINER com bug). `reason` é vocabulário
  fechado; destinatário entra como hash sha256, porque o ledger é lido por
  qualquer `org_admin`.
- `can_read_school()` — escopo de `auth.uid()` + vínculos ativos. `school_admin`
  com `school_id` nulo autoriza zero escolas.
- `get_school_metrics()` — supressão no servidor. Grupo de 1 a 4 devolve só o
  marcador, sem valor e sem contagem. Negação é indistinguível de escola
  inexistente (anti-enumeração). Registra leitura autorizada **e** negada.
- Supressão complementar determinística contra subtração.
- `resend_invitation()` — 3 reenvios / 24 h, contados por organização +
  destinatário. Contar na linha do convite seria derrotado cancelando e
  recriando, porque `invite_member` é idempotente por (email, org, role).
- `escalate_indicator()` — alvo fora da organização negado e registrado.

### Cliente

- `/escola/:schoolId` novo, sobre a casca, alcançável pela lista de escolas de
  `/org` (que é a seleção explícita, com nome e município).
- `/admin` virou Landing Administrativa; `/professores` recebeu o painel docente
  migrado para a casca, com 401 e 403 agora distintos.
- `src/lib/metric-privacy.ts` — regras puras, sem limiar hardcoded no cliente.
- `SuppressedValue` — três estados textualmente distintos (suprimido, vazio,
  falha), nunca `0` fabricado.

### Gate

`npm run quality` verde. Testes: **171 → 245** (21 arquivos). A asserção do
literal de rota no gate foi **substituída**, não removida, e o gate ganhou
asserções novas: anti-laço do `platform_admin`, ledger append-only, privilégio
mínimo das RPCs e proibição de limiar hardcoded no cliente.

Um falso positivo próprio: a asserção nova de "limiar hardcoded" pegou um
comentário que citava o padrão proibido. Corrigido o comentário, não a asserção.

### Fiação da DecisionQueue (fecha o Requirement 9)

- `DecisionQueue` deixou de ser lista decorativa: ganhou `mutation` por item, com
  execução única por vez em toda a fila, controle desabilitado durante a ação e
  os **três desfechos textualmente distintos** — sucesso, permissão negada e
  falha técnica. Falha declara explicitamente que **nada foi alterado** e mantém
  o item na fila.
- `useDecisionActions` traduz o erro do Postgres nos três desfechos. O detalhe
  que importa: `42501` (sem privilégio) e `22023` (regra recusou — limite,
  janela, convite expirado) viram **"negado"**, não "falhou". Colapsar os dois
  faria o gestor repetir um reenvio que nunca vai passar.
- `decision-queue-items.ts` deriva os itens do dado observado, com a evidência no
  texto. Convite de **estudante** é agregado por escola, com contagem e **sem
  e-mail** — estudante é adolescente, e o e-mail dele numa fila lida por qualquer
  gestor é exposição desnecessária. Convite de adulto da equipe aparece
  individual, porque o reenvio é por convite e o e-mail institucional é o
  identificador natural do trabalho.
- Reenvio em lote relata resultado **parcial** ("3 reenviados; 2 recusados pelo
  limite ou pela janela") em vez de esconder recusas atrás de um "ok" genérico.
  Cada convite é avaliado pelo servidor separadamente, porque o limite vale por
  destinatário.
- Convite expirado não oferece reenvio: a ação correta é reemitir, e o botão
  explica isso em vez de falhar no servidor.
- Escalonamento entra na fila quando a taxa de ativação sai da faixa esperada
  (60%–100%), declarada no próprio item.
- Gate ganhou asserção proibindo o rótulo "Aprovar convite" no código de UI
  (§D1/D49 — rótulo de ação inexistente é overclaim).

Testes: **245 → 276** (24 arquivos), incluindo dupla submissão bloqueada, runner
que lança tratado como falha, e ausência do rótulo de aprovação.

### Não entregue / limitações registradas (honestidade > overclaim)

- **Migration não aplicada** no ambiente Lovable (SQL Editor manual).
- **Testes de banco são estruturais**, não de execução: `ux3-migration-invariants.test.ts`
  lê o SQL e verifica que as proteções estão escritas. Não prova comportamento em
  Postgres — falta banco de teste.
- **Escalonamento dispara na primeira leitura fora da faixa, não na segunda.** O
  contrato (R9 item 16) pede 2 leituras consecutivas fora do esperado. Isso exige
  histórico de leituras do indicador, que não existe hoje — não há onde guardar a
  leitura anterior. Entregue com uma leitura; fechar o requisito depende de
  persistir séries de indicador.
- **`canResend` é sempre `true` no cliente.** A RLS de `useOrganizationDetail` já
  restringe os dados a organizações que a pessoa administra, e o servidor nega e
  registra quem não pode. Mas o contrato (R9 item 15) prevê esconder o controle
  para papel sem permissão, e hoje o cliente não distingue `org_admin` de
  `school_admin` para essa decisão — quem não pode vê o botão e recebe "permissão
  negada" ao clicar. Funciona, mas não é o comportamento pedido.

## 2026-08-26 — Recuperação do main + TRUST-1.1B integrada + TRUST-1.5

Três frentes numa sessão, na ordem: destravar o `main`, integrar o que estava
provado, fechar o próximo corte.

### PR #48 — recuperação do `main`

O `main` estava vermelho em `aa39286`. O gate roda `eslint . --max-warnings 0` e
dois avisos de `react-hooks/exhaustive-deps` entraram por commits do Lovable em
componentes de landing. Todo PR aberto herdava a falha, inclusive o #47, que
estava tecnicamente correto.

Corrigido em branch isolada, sem `eslint-disable` e sem afrouxar configuração:

- `ToolMicroPractice` — as fases do pacer 4-4-4 eram um array literal recriado a
  cada render, e o efeito lia `phases.length`. Adicionar a dependência seria
  mecânico e errado: fases são constantes do exercício, não estado. Movidas para
  o escopo do módulo.
- `InteractiveToolsShowcase` — `prescribed` tinha um ramo `: []` que criava array
  novo a cada render, invalidando o `useMemo` de `filtered` sempre. Memoizado em
  `[lab.state]`. Efeito colateral positivo: `filtered` volta a memoizar de verdade.

Nenhum arquivo TRUST no hotfix.

### PR #47 — TRUST-1.1B integrada

Drift do Lovable classificado como `SAME_DOMAIN_OVERLAP` (tocava `types.ts`,
`metric-privacy.ts`, `tsconfig.app.json`) mas **sem** sobreposição em
migration, RLS, auth ou schema. Rebase limpo, gate verde, revalidação no Postgres
local confirmando que R17, R18 e R20 seguiam fechados. Mergeada em `b41f43c`.

Gate TRUST-1.1B: PARCIAL → **integrada**. O receipt original continua dizendo que
o R21 ficou aberto durante aquela onda, porque ficou.

### PR TRUST-1.5 — R03, R04, R21

**R03 — o gate de tipos era vazio.** `tsc --noEmit` sobre um `tsconfig.json` com
`files: []` e só `references` compilava zero arquivo. Provado por prova negativa:
erro deliberado em `src/` e exit 0. Corrigido verificando cada projeto
explicitamente; prova negativa refeita nos dois sentidos.

**R04 — os casts estavam obsoletos.** Regerados os tipos do banco local
homologado, o diff contra o `types.ts` versionado foi de duas linhas. Todas as
RPCs que estavam sendo castadas com `as never` **já constavam nos tipos**. As
muletas tinham ficado, cada uma com um comentário explicando um motivo que já não
existia. Seis removidas; zero casts de máscara no código.

**R21 — leitura do ledger por RPC dedicada.** Partiu do candidato encontrado na
árvore ao final da 1.1B, preservado com hash verificado e tratado como ponto de
partida, não como verdade. Alterado em quatro pontos, sendo o mais relevante o
determinismo: o candidato ordenava só na subquery e agregava sem `ORDER BY`, o que
deixa a ordem do resultado indefinida.

44 migrations desde banco vazio. 15 casos de execução real: cross-tenant,
educator da própria organização, sonda de tenant, tetos de paginação, ausência de
`recipient_hash`, estabilidade de página, append-only.

**Criada a categoria `RPC_RUNTIME_CONTRACT`** — 26 testes que executam Postgres
real, incluindo recompilação de corpo de função com `check_function_bodies = on`.
É o teste que teria pegado o R20 no dia em que nasceu. Sem Docker eles são
pulados com aviso, nunca aprovados por omissão.

### Dois achados novos, abertos por decisão

**R23 — o ledger torna tenants indeletáveis.** As FKs de
`institutional_decision_events` (`ON DELETE CASCADE` e `ON DELETE SET NULL`)
disparam escrita na tabela, e os gatilhos append-only rejeitam escrita — inclusive
de `service_role`. Deletar organização ou escola com qualquer decisão registrada
falha. Pode ser exatamente o desejado ou um bloqueio operacional inaceitável;
escolher envolve retenção de dados.

**R24 — a auditoria da negativa nunca persiste.** `get_school_metrics` (desde a
UX-3) e a RPC nova gravam a negativa em `data_access_logs` e o `RAISE EXCEPTION`
desfaz o INSERT. Medido: negativa → 0 linhas, sucesso → 1 linha. Ou seja, a
tabela não é registro de tentativas negadas. O INSERT ficou, com comentário no
corpo da função dizendo que não persiste — honestidade sobre o que existe.

### Contagem

301 → **346 testes**, 24 → **26 arquivos**. Gate verde nas três frentes.

## 2026-08-29 — MACRO-ONDA D: privacidade end-to-end + fechamento da TRUST-1.5

### R10 — o limiar escondia os valores e revelava o tamanho do grupo

Escrevi os testes antes de mexer no servidor, e eles ficaram vermelhos: 6 de 17.
O payload medido de uma escola com 4 estudantes dizia
`"analytics_suppressed": true` e, na linha seguinte, `"eligible_universe": 4`.

Havia um segundo canal que o mapeamento não previa. Escola de 20 estudantes, turma
de 17 divulgada com `count: 17`, turma de 3 suprimida, `eligible_universe: 20`.
`20 − 17 = 3`. A supressão complementar da UX-3 protegia o **valor** (eventos) e
deixava o **headcount** (pessoas) aberto — são dois canais de subtração, cada um
com seu total e suas partes, e só um estava coberto.

Correção: `eligible_universe` virou grupo, e o canal de headcount ganhou supressão
complementar determinística. Recontagem depois da passagem de valor; se sobrou
exatamente um grupo suprimido, o total do headcount sai de cena.

Também corrigi uma incoerência que os testes expuseram: universo **zero** era
tratado como amostra insuficiente no nível da escola, enquanto o nível da turma já
distinguia `isEmpty`. Zero não expõe ninguém; "ninguém participou" não é "sem
dados".

### R27 — o PDF do piloto exportava NPS de duas pessoas

Fui verificar a superfície de export e encontrei o pior achado da onda:
`get_org_engagement_summary` não aplicava limiar **nenhum**. Devolvia contagens
cruas e o bloco inteiro de NPS — média, promotores, detratores.

Uma rede com 2 estudantes gerava um PDF com "2 respostas · Média 9.0/10". Num
arquivo que o gestor manda para a secretaria.

Agravante: o cliente fazia `(e.nps_count as number) || 0`. Se o servidor passasse
a mandar `null`, o `|| 0` transformaria a supressão em "0 respostas" — falso. A
correção teve que atravessar as três camadas: servidor, fronteira do cliente e
gerador de PDF.

### R23 — arquivar em vez de apagar

Decisão tomada: entidade com histórico auditável não é destruída. `schools` e
`classes` ganharam o `status` que `organizations` já tinha. E o erro obscuro
(`institutional_decision_events is append-only`, que não diz nada sobre a causa)
virou erro de domínio que nomeia a entidade, conta os eventos e mostra o comando
de arquivamento.

O seed do teste quebrou contra a própria proteção: na segunda execução a turma já
tinha histórico e o `DELETE` foi corretamente recusado. Serve como evidência
independente de que o gatilho funciona, e como lição — seed de teste não pode
assumir que consegue destruir o que criou.

Não criei UI de arquivamento: não existe botão de apagar no painel, e inventar
fluxo seria feature não pedida. Fica o débito registrado (R29): nenhuma leitura
filtra `archived` ainda.

### R24 — aceito, com o código dizendo a verdade

`data_access_logs` formalizado como registro de acessos **concedidos**. A negativa
nunca persiste porque o `RAISE EXCEPTION` desfaz o INSERT, e trocar isso custaria
fail-closed. Mantive os INSERTs com comentário explícito no corpo da função
dizendo que não persistem — apagá-los faria a implementação futura redescobrir onde
instrumentar, e deixá-los sem aviso faria alguém concluir que a auditoria funciona.

### R25 — skip deixou de ser verde

Job `runtime-db` no CI: sobe o stack Supabase efêmero no runner, aplica as
migrations desde banco vazio, roda os 62 contratos e **falha** se houver skip ou se
menos de 50 executarem. Nenhum segredo, nenhum `--linked`, nenhum `db push`.

Efeito colateral que vale: o CI passou a travar o invariante da TRUST-1.1B. Se a
sequência histórica deixar de reconstruir o schema, `supabase start` falha.

### Nota sobre um erro meu

A primeira versão do varredor de payload procurava dígitos no **texto** da
resposta, e acusou vazamento onde não havia — fragmentos de UUID e de timestamp
contêm dígitos. Antes de tocar no varredor, fui olhar o payload real para
confirmar que estava seguro. A ordem importa: o contrário seria ajustar o teste até
ficar verde.

### Contagem

346 → **382 testes**, 26 → **28 arquivos**. 62 contratos de runtime contra
PostgreSQL real, agora no CI. 45 migrations aplicam desde banco vazio.

## 2026-09-02 — MACRO-ONDA E: TRUST-1.2.1 server-side analytics boundary

O teste vermelho mediu dois defeitos: `org_admin` projetava linhas completas de
NPS/engagement (R31), e o resumo usava roster elegível em vez de contribuidores
por métrica (R32). Resultado inicial: **3/12 verdes, 9/12 vermelhos**.

A arquitetura B foi adotada: `get_org_analytics_series(uuid)` agrega oito semanas
no PostgreSQL; `get_org_engagement_summary(uuid)` aplica gate independente em
cada indicador. Ambos resolvem tenant/papel no servidor, fixam `search_path`,
têm grants mínimos e usam `count(DISTINCT user_id)`. Policies raw de org_admin
foram removidas por qualificador semântico; self-read e `service_role` ficaram.

No cliente, `useOrgAnalytics` substituiu SELECTs raw, com cache por organização.
NPS, gráfico, cards, tabela acessível e PDF passaram a distinguir vazio,
supressão parcial e divulgação. Valor suprimido não aparece em DOM/ARIA/export e
nunca vira zero.

Provas finais: TRUST-1.2.1 **12/12**, UI **7/7**, runtime **78/78**, replay
**46/46**, suíte **405/405 em 30 arquivos**, `npm run quality` exit 0. O warning
de tamanho zero do Recharts ocorre apenas no jsdom e não falha o contrato.

Nenhum remoto foi acessado; nenhuma migration foi promovida. R22 continua
obrigatório. Trabalho encerrado antes da TRUST-1.3.