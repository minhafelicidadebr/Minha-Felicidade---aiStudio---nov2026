# DECISIONS — decisões (curto)

## 2026-07 · P0.0 Guardrails de marca/PI/conteúdos externos
- **D1.** Posicionamento canônico = "plataforma independente de ciência do bem-estar". Yale =
  referência acadêmica factual, nunca marca do produto/SEO/endosso.
- **D2.** SEO (`index.html`): removido "baseado na aula mais popular de Yale" e keyword "Yale";
  schema `Course` reescrito para linguagem independente. Mantido `@type: Course` (é um curso próprio).
- **D3.** Aviso de independência colocado no `Footer` (site-wide), proporcional. Não foram criadas
  páginas Sobre/Termos nesta etapa (economia de créditos; backlog P2).
- **D4.** Removido badge "WCAG 2.2" do Footer (claim de conformidade sem auditoria).
- **D5.** Domínio público contém "yale": correção é ação manual no Lovable; **não** alteramos a
  `canonical`/`og:url` no código para não apontar para domínio inexistente. Registrado como P0-infra.
- **D6.** Prompts de IA e protocolo de crise **não** foram tocados (doutrina §4). Auditoria da
  base de conhecimento contra reprodução verbatim → backlog P1.
- **D7.** Player de vídeo: rótulo "Recurso externo" não implementado agora (é um corte de UI);
  proveniência foi inventariada em `CONTENT_PROVENANCE.md`. → NEXT_ACTION.
- **D8.** P0.0 classificado como **parcialmente aprovado** (honestidade > overclaim).

## 2026-07 · Fechamento do P0.0 (D7)
- **D9.** Criado `ExternalResourceNotice` (componente reutilizável) e aplicado nos dois players de
  vídeo do `ModulePage` (painel persistente + modal). Mostra título, plataforma (YouTube) e link
  "Abrir na fonte". Não inclui nome do canal/titular por vídeo — esse dado não existe hoje em
  `courseData.ts` (`VideoLesson` não tem campo `channel`/`author`). Adicionar esse campo é P1
  (exigiria popular ~32 registros; fora do escopo deste corte pontual).
- Gate P0.0 reclassificado de "parcialmente aprovado" para **aprovado**.

## 2026-07 · ONDA 1 Corte 1.1 — Entitlement canônico
- **D10.** `get_my_plan()` já era a fonte única correta (SECURITY DEFINER, REVOKE/GRANT ok). O
  problema não era o RPC, era a ausência de enforcement nas rotas. Decisão: não recriar o RPC,
  só consumir com um novo guard de rota.
- **D11.** Criado `RequireFeature` (não reescrevi `FeatureGate`) porque `FeatureGate` é um padrão
  de blur/upsell inline dentro de uma página, enquanto o problema era proteger a ROTA inteira
  antes de montar o componente da ferramenta. São usos complementares, não duplicados.
- **D12.** Preservei o literal exato exigido por `scripts/security-gate.mjs` para
  `RequireRole` (`<RequireRole allowedRoles={route.roles}>{route.element}</RequireRole>`) —
  primeira tentativa de refatorar com variável intermediária quebrou o gate; corrigido com
  ternário aninhado em vez de reassignment.
- **D13.** Não toquei no gate inline de `ModulePage` (`moduleAllowed`) nesta rodada — mesmo bug de
  fail-open, mas é local e de menor risco (módulo gratuito real é só 1 de 5); registrado no
  backlog para não ampliar o escopo do corte.

## 2026-07 · ONDA 1 Corte 1.2 — Integridade da assinatura
- **D14.** `user_subscriptions` confirmada limpa: policies de INSERT/UPDATE para `authenticated`
  foram removidas na migration `20260613144818`. Nenhuma migration posterior as recriou.
- **D15.** `organization_subscriptions` tinha uma policy de UPDATE para `authenticated`
  (`"Owners can update own org subscriptions"`, criada em `20260709164308`) que permitia ao
  owner_id alterar QUALQUER coluna (plan_id, status, max_seats, current_period_end) diretamente
  via PostgREST. Decisão: remover (migration `20260722190000`). Nenhuma funcionalidade do app
  exige UPDATE direto pelo client — todas as escritas legítimas passam por RPCs SECURITY DEFINER.
- **D16.** Não toquei em `request_subscription_cancellation` (é SECURITY DEFINER, self-scoped,
  só altera `cancel_at_period_end` — campo diferente de plan/status/vigência/seats). É legítima.

## 2026-07 · ONDA 1 Corte 1.3 — Limites de IA centralizados
- **D17.** `enforce_ai_usage_limit` tinha limites hardcoded (80 para aledria-chat, 30/20/20
  para demais). Plano gratuito no schema e na landing promete 9/dia; premium promete ilimitado.
  Inconsistência = violação do critério "todos exibem a mesma regra".
- **D18.** Correção: aledria-chat agora lê `get_my_plan()->'limits'->'alegria_daily'` (fonte
  canônica única = tabela subscription_plans.limits). Se -1, retorna allowed=true sem contar.
  Se null, fallback conservador = 9.
- **D19.** Demais funções de IA (cognitive-mirror, future-self, signature-strengths) mantêm
  limites fixos porque não são feature comercializada com diferenciação por plano na landing.
  Se um dia forem, migrar para o mesmo padrão.
- **D20.** Não alterei a edge function em si — ela já chama `enforceAiUsageLimit()` antes do
  gateway. A mudança é só no RPC que ela invoca (banco); o deploy das functions não precisa ser
  refeito para este corte.

## 2026-07 · ONDA 1 Corte 1.4 — Idade e consentimento
- **D21.** `set_my_birth_date` confirmada single-fill: lança exceção se `birth_date IS NOT NULL`.
- **D22.** `guardian_consent_events` confirmado como ledger imutável (sem UPDATE/DELETE para
  authenticated). Estado derivado via RPC `get_my_guardian_consent_status` (SECURITY DEFINER,
  self-scoped). Tudo ok.
- **D23.** **GAP P0 real encontrado:** `profiles` tem policy "Users can update own profile"
  FOR UPDATE sem restrição de colunas. Um adolescente podia alterar `birth_date` diretamente
  via PostgREST para uma data de adulto, contornando o gate. Correção: trigger
  `trg_protect_birth_date` (BEFORE UPDATE) que impede qualquer alteração de `birth_date` quando
  ela já estiver preenchida. Defesa em profundidade (funciona mesmo com service_role).
- **D24.** Não alterei a policy de UPDATE de profiles para não quebrar edição de nome/avatar.
  O trigger é mais cirúrgico e protege a coluna específica.

## 2026-07 · ONDA 2 — RPCs institucionais
- **D25.** Decidi NÃO criar RPCs de "criar escola" e "criar turma" como RPCs dedicadas nesta
  rodada. A policy de `schools`/`classes` já permite INSERT/UPDATE/DELETE para org_admin via RLS.
  O org_admin pode usar diretamente `supabase.from('schools').insert(...)`. RPCs mais elaboradas
  (com validação de max_schools_per_org, etc.) ficam pra quando houver regra de negócio real.
- **D26.** `accept_invitation` exige `email_confirmed_at IS NOT NULL` — segue o mesmo padrão do
  `claim_escolar_subscription` (segurança por construção). Não cria conta automaticamente.
- **D27.** Idempotência em todas as RPCs: `create_organization` retorna a org existente se
  o mesmo owner+name já existe; `invite_member` retorna o convite existente se pendente;
  `accept_invitation` usa ON CONFLICT DO UPDATE (reativa se status=removed).
- **D28.** notification_outbox: enqueue best-effort (EXCEPTION handler silencia se a tabela não
  existir em ambiente de teste ou se o dedupe violar unique). Não bloqueia o fluxo principal.

## 2026-07 · ONDA UX-1 — App Shell adaptativo e Design System

- **D29.** O projeto tem DOIS vocabulários de papel (`profiles.roles` = student|teacher|manager e
  `institutional_memberships.role` = platform_admin|org_admin|school_admin|educator|student|
  guardian). Decidi NÃO unificar no banco nesta onda (seria migration de dados com risco alto e
  fora do escopo UX-1). Em vez disso criei um terceiro vocabulário **derivado** e puro em
  `src/lib/role-home.ts` (`DashboardRole`), com precedência explícita
  (platform_admin > org_admin > school_admin > educator > student). Nenhuma tela precisa conhecer
  as duas origens; a unificação no banco pode acontecer depois sem tocar na UI.
- **D30.** `guardian` **não** virou papel de dashboard. Mapear responsável para a home do
  estudante daria a um adulto a interface (e as expectativas) de um adolescente. Responsável
  continua no fluxo de consentimento. Coberto por teste.
- **D31.** Criada a entrada canônica `/inicio` (`RoleHomeRedirect`) em vez de espalhar
  `if (role === ...) navigate(...)`. `/dashboard` **permanece funcionando** (e-mails, bookmarks,
  testes, security-gate) — a migração para `/alunos` é da UX-4.
- **D32.** `/alunos`, `/professores`, `/escolas/:schoolId` e `/admin/operacao` são criadas nas
  ondas UX-2/3/4. Para não gerar 404 nem link morto agora, `role-home.ts` mantém DOIS mapas:
  `CANONICAL_ROLE_HOME` (destino do contrato) e `IMPLEMENTED_ROLE_HOME` (destino navegável hoje).
  Na navegação, itens da arquitetura-alvo estão marcados `future: true` e **não são renderizados**
  (há teste que falha se um link `future` aparecer).
- **D33. DÍVIDA/AMBIGUIDADE DO CONTRATO (precisa decisão na UX-2):** o DASHBOARD-ROUTE-MAP manda
  `school_admin → /escolas`, mas `/escolas` é a landing **pública** de aquisição e o próprio
  contrato diz que o dashboard escolar autenticado vive em `/escolas/:schoolId`. Não inventei a
  resolução: `CANONICAL_ROLE_HOME` segue o literal do contrato, `IMPLEMENTED_ROLE_HOME` manda
  school_admin para `/org` hoje, e o conflito está documentado no código e aqui.
- **D34.** `RequireRole`: destino de acesso negado passou a ser coerente com o papel (um gestor
  negado em `/admin` vai para `/org`, não para o painel do estudante). O literal `to="/dashboard"`
  foi preservado como fallback porque `scripts/security-gate.mjs` o exige e ele continua sendo o
  destino correto para quem é estudante.
- **D35.** `getSafeRedirectPath` ganhou um segundo parâmetro `fallback` para permitir destino
  role-aware. O fallback é **validado** por `isInternalPath` e, se inseguro, volta para
  `/dashboard`: o fallback é escolhido pela aplicação, nunca pelo usuário — sem abrir open redirect.
  Comportamento anterior preservado (testes originais seguem passando sem alteração).
- **D36.** `useOrganization.ts` **não** foi alterado. O `.limit(1).maybeSingle()` continua lá
  servindo `/org` intacto; o shell usa o novo `useDashboardContext` (React Query, múltiplas
  organizações, contexto ativo persistido e validado). Migrar `/org` para o novo hook é UX-2 —
  trocar os dois ao mesmo tempo misturaria refactor de dados com refactor de navegação.
- **D37.** `useDashboardContext` usa `retry: false`. Resolver papel é pré-requisito do shell;
  retry silencioso deixa a pessoa esperando sem explicação. Preferimos falhar rápido e oferecer
  botão explícito de "tentar novamente" (contrato §4).
- **D38.** O shell **não foi montado em nenhuma página existente** nesta onda, por instrução
  explícita ("não redesenhe o conteúdo de /org, /admin ou /dashboard"). Consequência honesta:
  a UX-1 entrega a infraestrutura testada, mas a verificação **visual** do shell só acontece
  quando a UX-2 montar `/org` sobre ele. Registrado em NEXT_ACTION como primeiro passo da UX-2.
- **D39.** `Navbar.tsx` recebeu apenas um cabeçalho de STATUS documentando que deixou de ser o
  shell canônico do app autenticado. Zero mudança de comportamento — remover o Navbar das páginas
  é o ato de migração de cada onda seguinte, não da UX-1.
- **D40.** Nenhuma biblioteca nova. Sidebar/Sheet/Popover/Command(cmdk)/Skeleton do Radix+Shadcn,
  React Query e Lucide já instalados. `ChartFrame` é uma **moldura** (título, descrição acessível,
  freshness, privacidade e tabela alternativa) e não um componente de gráfico: cada dashboard passa
  seu gráfico Recharts como `children`, evitando engessar a visualização.
- **D41.** Tokens semânticos de dashboard (`--dashboard-*`, `--metric-*`, `--chart-1..5`) foram
  adicionados como **papéis de cor para dado**, não como cores novas de marca. Os tokens de
  `sidebar` foram realinhados do cinza genérico do template para a paleta do produto.
- **D42.** Correções de causa raiz feitas durante a execução (encontradas pelos próprios testes,
  não por inspeção): (a) `SidebarInset` já é o landmark `<main>` — o `<main>` extra criava dois
  landmarks, agora `id`/`tabIndex` vão no próprio Inset; (b) o `ContextSwitcher` estava
  renderizado duas vezes (uma por breakpoint), criando dois tab stops para a mesma ação — agora é
  uma instância única que reflui; (c) `formatFreshness` e os rótulos de período saíram dos módulos
  de componente para `src/lib/dashboard-format.ts` e `src/config/dashboard-filters.ts`.

## 2026-07 · ONDA UX-2 — /org sobre o App Shell

- **D43. D33 RESOLVIDA (decisão do humano, 2026-07):** `/escolas` **permanece** a landing pública
  de aquisição e deixa de figurar como home de qualquer papel. O painel escolar autenticado será
  `/escola/:schoolId` — **singular**, escolhido justamente para não colidir com a landing no
  plural nem depender de precedência de rota. `CANONICAL_ROLE_HOME.school_admin` passou de
  `/escolas` para `/escola/:schoolId`; `IMPLEMENTED_ROLE_HOME.school_admin` continua `/org` porque
  a rota ainda não existe (criá-la é UX-3). O item de navegação `org-schools` aponta para o novo
  caminho e segue `future: true` — não renderiza link morto.
- **D44.** `OrgDashboardPage` migrou de `useOrganization` para `useDashboardContext` +
  novo `useOrganizationDetail(organizationId)`. Motivo: `useOrganization` fixa a organização em
  `.limit(1).maybeSingle()`, o que tornava o ContextSwitcher do shell decorativo (trocava o rótulo
  no cabeçalho sem trocar os dados). Agora o `organizationId` vem do contexto ativo e a query é
  keyed por ele, então trocar de rede refaz a leitura. `useOrganization.ts` foi **preservado**
  (não quebrar outros consumidores); remover é limpeza de uma onda futura.
- **D45.** Os quatro `return null` de `EngagementMetrics`/`EngagementChart`/`NpsEvolution`/
  `OperationalMetrics` viraram `DashboardSkeleton` (carregando) e `DashboardEmptyState` (sem dado).
  Honestidade: quando a RPC falha, o texto diz que o dado **não pôde ser carregado** — não finge
  que o valor é zero. Um zero inventado num painel de gestor é pior que um estado vazio explícito.
- **D46.** `EngagementChart` saiu de SVG escrito à mão para Recharts dentro de `ChartFrame`.
  Ganho real: tabela alternativa, descrição acessível, tooltip e indicador de privacidade vêm da
  moldura canônica em vez de serem reimplementados (ou esquecidos) por gráfico.
- **D47.** Os cards de Escolas/Membros/Convites/Turmas passaram a informar `formula`, `source` e
  `limitation` no `MetricCard`. As limitações são declaradas de propósito (ex.: convites expirados
  ainda contam até a limpeza; turmas não distinguem ativas de encerradas) — sem isso o número
  parece mais preciso do que é.
- **D48. Dívida assumida:** o chunk de `OrgDashboardPage` ficou em ~882 kB porque Recharts e jsPDF
  entram nele. Não é regressão de segurança nem quebra o gate (é warning de tamanho do Vite), mas
  está registrado: resolver com `import()` dinâmico do gráfico e do gerador de PDF é candidato a
  uma onda de performance, não a um remendo agora.

## 2026-07 · ONDA UX-3 — contrato de produto decidido pelo humano ANTES do design

As oito decisões abaixo foram tomadas pelo humano em resposta aos pontos que a
fase de requisitos levantou em vez de resolver sozinha. Estão registradas em
`DASHBOARD_PRODUCT_CONTRACT.md` (§D1–§D8) e, no que toca privacidade, em
`METRIC_PRIVACY_POLICY.md`. São **vinculantes** para a UX-3.

- **D49. Fluxo de convite: só reenvio e escalonamento.** A fila de decisões
  oferece nesta onda apenas *reenviar convite* e *escalar pendência*. O fluxo de
  "solicitar entrada e aguardar aprovação" **não** é implementado agora, porque
  criaria outra jornada, com tabelas, RPCs, estados e telas novos. Poderá virar
  onda própria somente se o piloto demonstrar necessidade concreta.
  Obrigação adicional: **remover qualquer rótulo "Aprovar convite" da
  interface** — a ação não existe no produto, e rótulo de ação inexistente é
  overclaim (doutrina §1).
- **D50. Escalonamento em ledger próprio, append-only.** Reutilizar
  `notification_outbox` foi **reprovado**: envio de comunicação e histórico de
  decisões têm responsabilidades diferentes, e misturá-los deixaria o histórico
  de governança sujeito à limpeza da fila de e-mails. Criar
  `institutional_decision_events` (alternativa aceita: `governance_events`) com,
  no mínimo: organização; escola ou turma; tipo do evento; entidade de origem;
  severidade; motivo; ator; data; metadados mínimos; identificador de
  idempotência quando aplicável. Somente inserção, auditável, protegido por
  RLS/RPC, estado derivado dos eventos — nunca edição retroativa. Sem texto
  livre sensível e sem dado pessoal desnecessário.
- **D51. `platform_admin` NÃO vai para `/org`.** Minha proposta de redirecionar
  provisoriamente foi **reprovada**, com motivo: confunde papel, pode mascarar
  falha de autorização e cria dívida que tende a durar mais que o previsto.
  Solução mínima obrigatória nesta onda: criar `/admin/operacao` como landing
  provisória do administrador **ou** manter `/admin` como landing
  administrativa até `/admin/operacao` existir. A página pode ser simples, mas
  identifica "Administração da Plataforma", mostra estado operacional básico,
  linka as áreas administrativas existentes e avisa o que está em construção.
  Aceite: zero loop, zero 404, zero administrador de plataforma caindo em
  painel de organização.
- **D52. Item "Indicadores agregados" removido do menu do gestor.** O item
  `org-reports` (hoje `href: "/admin"`) sai da navegação de `org_admin`: os
  indicadores agregados já estão em `/org`, e um segundo item apontando para
  outro painel gera duplicidade e carga cognitiva. O item **não** é
  reaproveitado para `platform_admin`; a navegação administrativa terá itens
  próprios em onda futura (Operação, Tenants, Segurança, IA e custos, Conteúdos
  e claims).
- **D53. Escola com `n < 5` continua visível; só o analytics é suprimido.**
  Esconder a escola inteira foi **reprovado**. A escola permanece como entidade
  operacional (nome, situação da implantação, gestor responsável, turmas
  configuradas, convites e pendências, ações administrativas permitidas), e o
  que se suprime são os indicadores derivados da atividade dos estudantes,
  substituídos por "Amostra insuficiente para exibição segura". Racional: dado
  de implantação é sobre a escola, não sobre o comportamento de um adolescente;
  esconder tudo quebraria a operação do piloto sem ganho de privacidade.
  Regra: `n < 5` sem métricas de estudante; `n ≥ 5` agregados no nível da
  escola; subdivisões por turma sob o mesmo limiar; nunca expor a contagem
  exata do grupo suprimido. O valor 5 vive em **configuração canônica
  server-side**, não repetido em componentes.
- **D54. Supressão complementar contra inferência por subtração.** Aprovada.
  Quando uma única turma está suprimida e o total da escola permite deduzir seu
  valor, suprimir também a **segunda menor turma** ou o **total agregado**,
  escolhendo a alternativa que preserva mais utilidade, por regra
  **determinística e documentada**. A proteção vale igualmente em API, RPC,
  cards, gráficos, tooltips, labels de acessibilidade, PDF, CSV e exports —
  esconder só o número na interface não cumpre a política, porque o valor real
  continuaria no payload.
- **D55. Privacidade prevalece sobre uniformidade do formato.** Para grupo
  abaixo do limiar, a resposta não devolve valor, contagem, porcentagem,
  intervalo que permita inferência, tooltip, campo oculto no payload nem
  metadado acessível por exportação. Devolve apenas: dado suprimido; motivo da
  supressão; limiar aplicado. Consequência aceita: um grupo suprimido tem menos
  campos que um grupo divulgado, e os consumidores tratam campo ausente como
  suprimido, nunca como zero.
- **D56. Reenvio de convite: 3 além do envio inicial, 24 h de intervalo.**
  Aplicável só quando o convite está pendente, não aceito, não revogado e
  dentro da validade. Esgotado o limite, o gestor aguarda a expiração, cancela
  e emite novo convite quando permitido, ou usa outro canal institucional. Cada
  tentativa é registrada com ator, data, convite, resultado e motivo de bloqueio
  quando houver. **Antiburla:** a proteção vale por **organização e
  destinatário**, não apenas por registro de convite — recriar convites
  idênticos em curto intervalo para o mesmo destinatário não contorna o limite.
  Motivo do rigor: o reenvio dispara e-mail que pode chegar a adolescente.
- **D57. `DASHBOARD_PRODUCT_CONTRACT.md` passa a ser versionado.** Achado
  incidental desta rodada: os documentos de contrato citados pelas ondas UX-1 e
  UX-2 (`DASHBOARD-PRODUCT-CONTRACT.md`, `DASHBOARD-METRIC-REGISTRY.md`,
  `DASHBOARD-ROUTE-MAP.md`, `DASHBOARD-COMPONENT-INVENTORY.md`,
  `DASHBOARD-MASTER-PLAN.md`) **nunca existiram no repositório** — circularam
  apenas no chat. Duas ondas foram executadas contra um contrato não auditável.
  Criados agora `docs/kiro/DASHBOARD_PRODUCT_CONTRACT.md` e
  `docs/kiro/METRIC_PRIVACY_POLICY.md` como fonte versionada. Os demais
  documentos originais seguem ausentes e são reconstruídos sob demanda.

## 2026-07 · ONDA UX-3 — decisões de implementação

- **D58. `/admin` foi escolhido como Landing Administrativa em vez de criar
  `/admin/operacao`.** §D3/D51 permitia as duas opções. Escolhi manter `/admin`
  porque entregava o mesmo resultado com uma rota a menos, e porque
  `/admin/operacao` como rota provisória seria renomeada depois — churn sem
  ganho. `CANONICAL_ROLE_HOME.platform_admin` já aponta para `/admin/operacao`
  como alvo; o item de navegação `platform-home` segue `future`.
- **D59. A checagem de papel da Landing Administrativa ficou DENTRO da página,
  não em `RequireRole`.** Achado durante a implementação: `RequireRole` conhece
  só os papéis de aplicação (`student`/`teacher`/`manager`), e `platform_admin`
  existe apenas em `institutional_memberships` — não há como expressá-lo em
  `allowedRoles`. A rota fica sob `RequireAuth` e a página decide sobre o papel
  derivado no servidor. Funciona e é auditável, mas um guard que entenda papéis
  institucionais seria mais limpo; registrado como dívida.
- **D60. Convite de estudante é agregado sem e-mail; convite de adulto da equipe
  aparece individual.** R9 item 3 exigia agregação para estudante. Estendi o
  raciocínio: estudante é adolescente e o e-mail dele numa fila lida por qualquer
  gestor da rede é exposição desnecessária. Já o convite de educador ou
  coordenação é trabalho institucional, e o e-mail é o identificador natural da
  pendência — esconder atrapalharia sem proteger ninguém.
- **D61. Recusa por regra de negócio (`22023`) é apresentada como "negado", não
  como "falhou".** Limite de 3 reenvios, janela de 24 h e convite expirado não são
  falhas técnicas: repetir não resolve. Só erro fora de `42501`/`22023` vira
  "falha técnica", que é o único caso em que "tentar de novo" é conselho honesto.
- **D62. Reenvio em lote relata resultado parcial.** Como o limite vale por
  destinatário, um lote pode ter parte aceita e parte recusada. A fila diz
  "N reenviados; M recusados pelo limite ou pela janela" em vez de um "ok"
  genérico que esconderia as recusas.
- **D63. Convite expirado não oferece reenvio.** O botão fica desabilitado com o
  motivo, em vez de chamar o servidor para ouvir "não". A ação correta é reemitir,
  e a interface diz isso.
- **D64. `@testing-library/user-event` NÃO foi instalado.** Os testes de interação
  da fila usam `fireEvent`, que já vem em `@testing-library/react`. A doutrina
  proíbe biblioteca nova, e a cobertura pretendida (clique, dupla submissão,
  estado desabilitado) é alcançável sem ela.
- **D65. Dois requisitos ficaram PARCIAIS e estão declarados:** (a) o
  escalonamento dispara na primeira leitura fora da faixa, não na segunda como
  R9 item 16 pede, porque não existe histórico de leituras do indicador onde
  guardar a anterior; (b) `canResend` é sempre `true` no cliente, então quem não
  tem permissão vê o botão e recebe "permissão negada" ao clicar, em vez de o
  controle não ser renderizado (R9 item 15). Ambos em NEXT_ACTION.

## 2026-07 · Limpeza pós-ondas (UX-5, UX-6)

- **D66. `DashboardPage` migrado para a casca (UX-5).** Último painel que usava
  `Navbar`/`Footer`. O header inline (botão de admin, badge de XP, logout,
  settings) foi removido porque a casca já entrega tudo isso pela navegação por
  papel — manter duplicado significaria dois lugares para a mesma ação, com
  risco de divergirem. A asserção do gate que exigia `hasAnyRole` no
  `DashboardPage` foi **substituída** por uma que exige `RoleAwareAppShell`: a
  antiga verificava um botão de admin que agora vive no `RoleSidebar`.
- **D67. `useOrganization` removido.** Zero consumidores desde a UX-2, quando
  `/org` migrou para `useOrganizationDetail`. 115 linhas de código morto que
  poderiam induzir alguém a usar o padrão antigo (`.limit(1).maybeSingle()`, que
  quebra multi-organização).
- **D68. `RequireInstitutionalRole` criado.** Remedia D59: a checagem de papel
  institucional estava dentro do `AdminOperacaoPage`, ad hoc e invisível na
  composição de guardas do `App.tsx`. Agora é um guard como os outros, e a
  proteção de `/admin` aparece no route table. `RequireRole` continua existindo
  para papéis de aplicação — os dois vocabulários seguem separados no banco
  (D29), então dois guards é honesto, não redundante.
- **D69. `org-people` absorvido por `org-home` (UX-6).** Os dois apontavam para
  `/org`, o que deixava o estado "ativo" da sidebar indeterminado — ambos
  ficavam marcados ao mesmo tempo — e sugeria duas telas onde havia uma. O
  rótulo de `org-home` passou a descrever a página inteira. Havia um teste
  fixando essa dívida em 3 duplicações; virou um teste que exige **zero**
  duplicação em qualquer papel.
- **D70. `org-schools` deixou de ser `future` e passou a ser `dynamic`.** A rota
  `/escola/:schoolId` existe desde a UX-3, mas o item de menu não podia ser
  renderizado porque o `href` precisa de um uuid que a configuração estática não
  carrega. Solução: campo `dynamic` no item e `resolveNavItemHref`, que recebe as
  escolas dos vínculos ativos (derivadas no servidor) e devolve um caminho
  concreto — ou `null`, e então o item é **omitido**.
  Cardinalidade deliberada: com **uma** escola o item aparece; com **zero** ou
  **duas ou mais** ele é omitido, porque escolher uma entre várias sem informar o
  critério seria arbitrário. A lista completa, com nome e município, está em
  `/org`. Invariante preservada e testada em todos os contextos: nenhum item
  renderizado carrega `:param` pendente.

## 2026-07 · Fechamento da D65 (as duas entregas parciais)

- **D71. Leitura anterior do indicador é RECONSTRUÍDA, não guardada.** Eu havia
  oferecido duas opções ao humano — snapshot periódico ou derivar do ledger — e
  **as duas eram ruins**: snapshot exige tabela nova mais cron e escrita a cada
  visita; o ledger só registra escalonamentos, então quando nada foi escalado não
  existe leitura anterior alguma. A terceira opção, adotada: a taxa de ativação é
  reconstruível de `created_at` e `accepted_at`, contando apenas as linhas que já
  existiam na data alvo. Zero tabela, zero cron, zero escrita.
  **Limitação declarada em `computeActivationRateAt`:** a reconstrução não vê
  remoções — quem saiu da rede desaparece também do passado. Para decidir "está
  ruim há uma semana ou caiu agora", a aproximação serve. Para série histórica
  oficial, não serve, e aí snapshot de verdade seria necessário.
- **D72. Escalonamento passou a exigir duas leituras fora da faixa (R9 item 16).**
  O caso que motiva a regra: uma rede que convidou 30 pessoas ontem tem ativação
  despencada por construção, não por problema. Com uma leitura só, o painel
  escalaria alarme falso justamente no momento de maior atividade da rede. Três
  situações não escalam e cada uma tem texto próprio: dentro da faixa; fora da
  faixa mas sem leitura anterior (rede recém-criada — julgar quem não teve chance
  seria injusto); e fora agora mas dentro antes (oscilação).
- **D73. `canResend` derivado dos vínculos, e a ausência do controle é
  EXPLICADA.** `resend_invitation` exige `is_org_admin` no banco, então
  `school_admin`, `educator` e `student` nunca conseguiriam reenviar. Antes o
  botão aparecia para todos e a pessoa descobria ao clicar. Agora o controle não
  é renderizado — e, junto da fila, aparece uma linha dizendo por que
  (`CANNOT_RESEND_HINT`). Omitir o botão sem explicar pareceria defeito da tela.
  A permissão vem dos vínculos que o servidor devolveu; o cliente não afirma
  papel, e o banco verifica de novo e nega.
- **D74. A permissão é por organização, não global.** `canResendInvitations`
  cruza o `organizationId` do vínculo com a organização ativa: gestor da rede A
  não reenvia convite da rede B. Há teste para esse vazamento.

## TRUST-1.5 — Contrato de tipos, typecheck e leitura do ledger

- **D75. O ledger de governança não tem leitura direta pela API.**
  `authenticated` não recebe `GRANT SELECT` em `institutional_decision_events`.
  A leitura passa por `get_institutional_decision_events()`, no mesmo padrão de
  `guardian_consent_events` — escrita por RPC, leitura por RPC, tabela sem DML
  para os papéis da API. A alternativa considerada e rejeitada foi conceder
  `SELECT` para tornar efetiva a policy que existia: seria alargar privilégio numa
  tabela de auditoria sem consumidor que justificasse.

- **D76. A policy inerte foi removida, não corrigida.** `"Org admins read
  decision events"` existia sem grant, então nunca foi avaliada. Em PostgreSQL a
  RLS **restringe** um privilégio existente; não o concede. Mantê-la deixaria no
  schema a afirmação falsa de que org_admin acessa a tabela diretamente.

- **D77. Auditar o ledger é atribuição de `org_admin`, não de `educator`.**
  A RPC exige `is_org_admin`, o mesmo papel que a UX-3 exige para reenviar convite
  e escalar indicador (D49, D73): quem decide pode auditar. Educator da própria
  organização recebe a mesma negativa que um estranho. Há teste de execução real
  para isso.

- **D78. Os tetos de paginação são resolvidos no servidor, não pedidos pelo
  cliente.** `_limit` máximo 100, `_days` máximo 180, `_offset` mínimo 0. Valores
  inválidos são **normalizados**, não recusados — pedir 5000 devolve 100, pedir
  -10 devolve 1. O cliente pode pedir qualquer coisa; o servidor decide.

- **D79. A projeção do ledger é fechada.** `metadata` não sai cru. Saem três
  campos derivados dele (`target_role`, `resend`, `resends`) e nunca
  `recipient_hash` nem `idempotency_key`. O hash existe para contar reenvios sem
  guardar o e-mail (D56/§D2); devolvê-lo na leitura desfaria esse cuidado.
  `actor_user_id` sai, porque auditoria de governança precisa saber quem decidiu e
  quem lê é administrador da própria organização.

- **D80. Ordenação determinística nos dois níveis.** `created_at DESC, id DESC`
  na subquery (define *quais* linhas entram na página) **e** no `jsonb_agg`
  (define a ordem *do resultado*). Sem o desempate por `id`, páginas com
  `created_at` repetido repetem ou perdem linhas. Sem a ordenação no agregado, a
  ordem do array não é garantida pelo PostgreSQL.

- **D81. `types.ts` é gerado do schema homologado, nunca editado à mão.** A fonte
  é o banco local reconstruído por replay das migrations — não o remoto e não a
  memória de quem escreveu o código. Quando o tipo não bate com o uso, a resposta
  é regerar ou corrigir o schema. `as never` está proibido para essa finalidade:
  não é cast estreito, desliga a verificação por completo. Os seis casts removidos
  nesta onda estavam **obsoletos** — as RPCs já constavam nos tipos e ninguém
  voltou para tirar as muletas.

- **D82. Toda RPC P0/P1 tem contrato de runtime contra PostgreSQL real.**
  Categoria `RPC_RUNTIME_CONTRACT`. A motivação é o R20: `resend_invitation`
  passava em todo teste que **lia** o SQL e falhava em toda invocação real. O
  teste central recompila o corpo da função com `check_function_bodies = on`, o
  que força a resolução de todos os objetos sob o `search_path` pinado. Onde não
  há Docker, esses testes são **pulados com aviso**, nunca aprovados por omissão.

- **D83. Duas decisões ficaram explicitamente em aberto.** R23 (o ledger torna
  organizações, escolas e turmas indeletáveis, porque as FKs disparam escrita e os
  gatilhos append-only rejeitam) e R24 (a auditoria da negativa nunca persiste,
  porque o `RAISE EXCEPTION` desfaz o INSERT). As duas foram descobertas por
  execução, as duas têm saídas não equivalentes que mexem em retenção de dados ou
  no contrato de segurança. Registradas, não alteradas.

## TRUST-1.2 — Privacidade end-to-end e contrato de arquivamento

- **D84. `eligible_universe` é um grupo, não um inteiro.** O tamanho do universo
  elegível é ele mesmo dado protegido. Publicá-lo exato quando os indicadores estão
  suprimidos revela o tamanho do grupo — exatamente o que o limiar esconde. E,
  mesmo acima do limiar, o total permitia reconstruir por subtração o headcount de
  uma turma suprimida. Hoje tem as mesmas três formas de qualquer grupo:
  divulgado, vazio ou suprimido.

- **D85. Existem DOIS canais de subtração, não um.** O payload carrega duas
  famílias de números: **valor** (eventos, com total em `totals`) e **headcount**
  (pessoas, com total em `eligible_universe`). A implementação da UX-3 protegia só
  o primeiro. Cada canal precisa da sua supressão complementar. Algoritmo em
  `TRUST_1_2_COMPLEMENTARY_SUPPRESSION.md`.

- **D86. Universo zero é divulgável.** Zero participantes não expõe ninguém, e
  `0` ali é resposta honesta. O nível da turma já distinguia `isEmpty`; o nível da
  escola contradizia isso e tratava zero como amostra insuficiente. Corrigido:
  "ninguém participou" e "não podemos dizer" são respostas diferentes e têm saídas
  diferentes.

- **D87. `null` e nunca `0` para valor suprimido.** Zero fabricado é afirmação
  falsa. Vale em especial no PDF, que sai da organização por e-mail: `|| 0` na
  fronteira do cliente converteria supressão em "0 respostas". O helper `cell()`
  imprime travessão.

- **D88. Exportação é superfície de dados, não detalhe visual.** Toda supressão
  vale em CSV, PDF e qualquer download. Bloco suprimido no PDF imprime texto
  explícito com o limiar, em vez de simplesmente não ser desenhado — porque não
  desenhar confunde "ninguém participou" com "não podemos dizer".

- **D89. O vocabulário de supressão não se duplica.** Continua
  `suppressed` / `reason` / `minimumGroupSize`, que é o contrato canônico (D53–D55)
  e o que `metric-privacy.ts` já lê. Não se introduziu `status`/`threshold` em
  paralelo: dois dialetos para a mesma coisa é como o limiar degrada em silêncio.
  No nível de **bloco** (organização), a supressão é sinalizada por
  `analytics_suppressed` + `minimum_group_size`, o mesmo par que a escola já
  publicava — porque ali não há grupos nomeados a suprimir.

- **D90. O limiar protege analytics de estudante, não o roster administrativo.**
  `totalMembers`, `totalStudents`, `classCount` no relatório piloto são contagens
  de cadastro que o org_admin gerencia diretamente. Não são métricas derivadas de
  comportamento. Estender o limiar a elas é decisão de produto, e está registrada
  como aberta (R30) em vez de decidida por conveniência técnica.

- **D91. `ARCHIVE_INSTEAD_OF_HARD_DELETE`.** Entidade institucional referenciada
  por histórico auditável não é fisicamente removida — é arquivada. Rejeitadas:
  FKs para `NO ACTION` (troca uma mensagem obscura por outra), gatilhos ignorarem
  ação de FK e `ON DELETE CASCADE` no ledger (as duas fazem a auditoria
  desaparecer com o auditado, o que não é auditoria). `schools` e `classes`
  ganharam o vocabulário de estado que `organizations` já tinha; nenhum sistema
  paralelo foi inventado.

- **D92. Bloqueio deve ter erro de domínio, não erro de encanamento.** A recusa do
  ledger append-only aparecia como `institutional_decision_events is append-only`,
  que não diz nada sobre a causa. Agora um gatilho `BEFORE DELETE` verifica o
  histórico e recusa com mensagem que nomeia a entidade, conta os eventos e mostra
  o comando de arquivamento. `ERRCODE 23001`.

- **D93. Nenhuma UI de arquivamento foi criada.** O painel só insere escola e
  turma; não existe botão de apagar. Formalizou-se o contrato — coluna de estado e
  erro compreensível — sem inventar feature. Nenhuma leitura passou a filtrar
  `archived`, porque nada define esse estado hoje; filtrar seria mudança sem efeito
  com risco de regressão. Registrado como R29, o débito que esta decisão deixa.

- **D94. `data_access_logs` registra acessos CONCEDIDOS.** A linha de negativa
  nunca persiste: o `RAISE EXCEPTION` desfaz o INSERT. Fail-closed é preservado —
  não se muda autorização para o log sobreviver. Tentativas negadas pertencem a
  `security_denied_access_events`, canal externo à transação e ainda inexistente.
  Até existir implementação **e** teste, não se afirma que negativas estão
  persistidas. Os INSERTs foram mantidos com comentário explícito de que não
  persistem, porque são o ponto de captura correto no futuro.

- **D95. Skip não é sucesso no CI.** O job `runtime-db` sobe Postgres real, aplica
  as migrations desde zero e falha diante de skip ou de menos de 75 contratos
  executados (piso elevado pela D102; baseline atual 78). Antes, "0 testes
  executados" aparecia verde — o que esvazia a razão de existir da categoria,
  criada justamente porque o R20 passou por todo teste que apenas lia o SQL.

## TRUST-1.2.1 — Privacy Boundary Closure & Server-Side Analytics

- **D96. Analytics institucional é RPC agregadora server-side (ramo B).** SELECT
  direto + agregação no cliente foi rejeitado porque o navegador não é fronteira
  de privacidade. View/materialized view/Edge Function teria mais operação e
  menos testabilidade para o mesmo contrato.

- **D97. Policies raw são removidas por semântica, não por nome.** A migration
  procura `is_org_admin` no qualificador de SELECT. Renomear a policy não pode
  restaurar acesso administrativo a linhas de NPS/engagement. Self-read do autor
  e `service_role` permanecem por necessidades distintas e testadas.

- **D98. Roster não é contribuição.** Cada métrica e bucket contam
  `DISTINCT user_id`. NPS, sessões, exercícios e IA têm gates independentes;
  cinco respostas da mesma pessoa continuam sendo um contribuidor.

- **D99. Zero real continua diferente de amostra insuficiente.** n=0 divulga
  grupo vazio; 1..k-1 suprime sem `value`/`count`; ≥k divulga. A regra vale por
  semana e no resumo de 30 dias.

- **D100. Supressão organizacional é parcial por padrão.** `suppressed_metrics`
  identifica somente os indicadores protegidos. UI e PDF preservam métricas
  permitidas e representam as suprimidas com texto/travessão, nunca zero. O bloco
  inteiro só é ocultado quando nenhum indicador é divulgável.

- **D101. Query key segregada não é autorização.** O cache inclui
  `organizationId` para não misturar tenants, mas o banco revalida `auth.uid()` e
  `is_org_admin()` em toda chamada. TRUST-1.3 não foi iniciada por isso.

- **D102. Baseline runtime sobe para 78 e o piso do CI para 75.** O job executa
  RPC, archive, privacy e server analytics, e falha diante de skip. R22 permanece
  obrigatório antes de produção; encerrar esta onda não autoriza promoção nem o
  início automático da TRUST-1.3.