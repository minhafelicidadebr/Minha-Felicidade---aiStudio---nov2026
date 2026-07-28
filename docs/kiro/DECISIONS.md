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
