# Requirements Document

## Introduction

A ONDA UX-3 fecha as duas lacunas de papel que sobraram do redesenho dos
dashboards: **não existe painel escolar autenticado** e o **painel docente**
ainda roda fora da casca compartilhada, com `Navbar`/`Footer` antigos e um
`return null` silencioso.

A UX-1 entregou a infraestrutura (`RoleAwareAppShell`, `MetricCard`,
`ChartFrame`, `DecisionQueue`, estados canônicos, `role-home.ts`,
`dashboard-navigation.ts`, `dashboard-filters.ts`). A UX-2 montou `/org` sobre
essa casca, eliminou os `return null`, migrou os cards para `MetricCard` com
fórmula/fonte/limitação e reescreveu o gráfico de engajamento em Recharts.

Esta onda entrega:

1. o painel escolar autenticado em `/escola/:schoolId`, com autorização por
   organização verificada no servidor;
2. a promoção da home de `school_admin` para esse painel e a remoção da
   marcação `future` do item de navegação `org-schools`;
3. a migração do painel docente para a casca compartilhada e a **mudança da
   sua rota** para o caminho previsto no contrato (o contrato reserva `/admin`
   para operação de plataforma), junto com a atualização do
   `scripts/security-gate.mjs` na mesma mudança, sem enfraquecer o gate;
4. leituras agregadas por escola com filtro de período (`7d`/`30d`/`90d`) e
   **supressão de agregados com menos de 5 pessoas, aplicada na RPC**;
5. a `DecisionQueue` em `/org` deixando de ser lista decorativa e passando a
   executar mutações reais, com sucesso, falha e permissão negada explícitos;
6. uma **landing administrativa mínima** para `platform_admin` (§D3/D51), que
   ampliou o escopo desta onda: a proposta de redirecionar provisoriamente esse
   papel para `/org` foi reprovada pelo humano.

As oito decisões de contrato de produto desta onda estão **fechadas e
versionadas** em `docs/kiro/DASHBOARD_PRODUCT_CONTRACT.md` (§D1–§D8), em
`docs/kiro/METRIC_PRIVACY_POLICY.md` (privacidade das métricas) e em
`docs/kiro/DECISIONS.md` (D49–D57). Elas são vinculantes e não se reabrem no
design.

Decisões já tomadas e respeitadas aqui, sem reabertura: `/escolas` continua
sendo a landing pública de aquisição e não é home de papel algum (D33/D43); o
painel autenticado é `/escola/:schoolId`, no singular (D43); o dashboard opera
sobre o `DashboardRole` derivado e `guardian` não é papel de dashboard
(D29/D30); quando uma fonte falha, a interface diz que o dado **não pôde ser
carregado** em vez de renderizar zero (D45).

Nada nesta onda promete conformidade legal. Os textos descrevem o que o código
tecnicamente faz — por exemplo, "agregado com limiar mínimo de 5 pessoas por
grupo" — e a interpretação jurídica permanece com humanos.

## Glossary

- **Onda**: o conjunto de mudanças entregues por esta especificação (UX-3).
- **Painel_Escola**: página autenticada do painel de uma escola, servida em
  `/escola/:schoolId`.
- **Painel_Docente**: página autenticada de indicadores pedagógicos hoje
  implementada em `src/pages/AdminPage.tsx` e servida em `/admin`.
- **Roteador_App**: tabela de rotas privadas e sua composição de guardas em
  `src/App.tsx`. A composição verificada é
  `RequireAuth` → `RequireGuardianConsent` → `RequireRole`.
- **Guarda_De_Papel**: componente `RequireRole`
  (`src/components/routing/RequireRole.tsx`).
- **Resolvedor_De_Home**: módulo `src/lib/role-home.ts`, incluindo
  `CANONICAL_ROLE_HOME`, `IMPLEMENTED_ROLE_HOME` e as funções de resolução.
- **Gabarito_De_Home**: `CANONICAL_ROLE_HOME`, mapa de contrato cujas entradas
  podem conter segmento `:` e que **não** é usado como destino de navegação.
- **Destino_Navegavel**: qualquer caminho efetivamente usado para navegar, ou
  seja, os valores de `IMPLEMENTED_ROLE_HOME`, o retorno das funções de
  resolução do Resolvedor_De_Home e o `href` de item renderizado da
  Navegacao_Dashboard.
- **Navegacao_Dashboard**: configuração única de navegação por papel em
  `src/config/dashboard-navigation.ts`.
- **Casca_Dashboard**: `RoleAwareAppShell` e seus componentes de navegação
  (`RoleSidebar`, `MobileRoleNavigation`, `DashboardHeader`, `ContextSwitcher`,
  `GlobalFilterBar`). A casca já provê o landmark `main` único (o próprio
  `SidebarInset`) e o skip link como primeiro elemento tabulável.
- **RPC_Escola**: função `SECURITY DEFINER` nova que devolve os indicadores
  agregados de uma escola para um período.
- **Fila_De_Decisoes**: componente `DecisionQueue` integrado a `/org` com ações
  que alteram dados.
- **Registro_De_Decisoes**: ledger somente-INSERT `institutional_decision_events`
  (alternativa aceita: `governance_events`) que guarda cada ação executada pela
  Fila_De_Decisoes (§D2/D50). Campos mínimos: organização; escola ou turma
  relacionada; tipo do evento; entidade de origem; severidade; motivo; ator;
  data; metadados mínimos; identificador de idempotência quando aplicável. O
  estado da fila é derivado desses eventos, nunca por edição retroativa.
  **Não** reusa `notification_outbox`.
- **Landing_Administrativa**: página de entrada do `platform_admin` (§D3/D51),
  servida em `/admin/operacao` ou em `/admin`, nunca em `/org`.
- **Universo_Elegivel**: quantidade de participantes distintos elegíveis a um
  indicador dentro de um escopo (escola ou turma), base de comparação com o
  Limiar_Minimo.
- **Gate_De_Seguranca**: `scripts/security-gate.mjs`, executado por
  `npm run quality`.
- **Gate_De_Qualidade**: `npm run quality`, composto pelas seis etapas
  `audit:security`, `lint --max-warnings 0`, `typecheck`, `test`, `build` e
  `security:gate`.
- **Suite_Vitest**: conjunto de testes automatizados executados pela etapa
  `test` do Gate_De_Qualidade.
- **Periodo_Dashboard**: um dos valores `7d`, `30d` ou `90d` definidos em
  `src/config/dashboard-filters.ts`, cujo padrão é
  `DEFAULT_DASHBOARD_PERIOD` (`30d`).
- **Limiar_Minimo**: número mínimo de pessoas em um grupo para que um valor
  agregado seja divulgado. Nesta onda o valor é 5, a mesma constante já usada
  por `get_learning_progress_overview` e `get_funnel_overview`. Por §D5/D53 o
  valor vive em **uma** configuração canônica server-side e não é repetido em
  componentes; o cliente pode exibir o limiar que o servidor informou, mas
  nunca o define nem o aplica sozinho.
- **Amostra_Insuficiente**: resultado em que o grupo tem entre 1 e 4 pessoas
  distintas com registro no Periodo_Dashboard; a RPC_Escola omite o valor
  agregado **e a contagem exata de pessoas** desse grupo, devolvendo apenas o
  marcador com o Limiar_Minimo aplicado.
- **Grupo_Vazio**: grupo com zero pessoas com registro no Periodo_Dashboard;
  não expõe pessoa alguma, e por isso recebe contagem zero e valor zero.
- **Supressao_Complementar**: supressão adicional do menor grupo restante de um
  conjunto, aplicada quando um único grupo do conjunto está suprimido e o total
  do conjunto é divulgado, para impedir recuperação do valor suprimido por
  subtração.
- **Escopo_Visivel**: conjunto de escolas que o solicitante pode ler, derivado
  no servidor a partir de `auth.uid()` e dos vínculos com `status = 'active'`
  em `institutional_memberships`.
- **Faixa_Esperada**: intervalo de valores declarado no próprio indicador,
  usado para decidir se uma leitura está fora do esperado.
- **Dado_Nominal**: nome, e-mail, `user_id` ou qualquer campo que identifique
  uma pessoa específica.

## Requirements

### Requirement 1: Rota e casca do painel escolar

**User Story:** Como coordenação de escola, quero um painel autenticado da
minha escola, para acompanhar adesão e engajamento sem depender do painel da
rede inteira.

#### Acceptance Criteria

1. WHEN uma pessoa autenticada e autorizada abre `/escola/:schoolId`, THE
   Painel_Escola SHALL renderizar seu conteúdo dentro da Casca_Dashboard.
2. THE Painel_Escola SHALL reusar o landmark `main` e o skip link já providos
   pela Casca_Dashboard, mantendo exatamente 1 landmark `main` na página
   renderizada, o skip link como primeiro elemento tabulável da página e zero
   landmark `main` criado pela própria página.
3. WHILE a leitura dos indicadores da escola está em andamento, THE
   Painel_Escola SHALL exibir `DashboardSkeleton` com rótulo acessível que
   nomeia os indicadores em carregamento e o Periodo_Dashboard aplicado.
4. IF a leitura dos indicadores da escola falha, THEN THE Painel_Escola SHALL
   exibir `DashboardErrorState` declarando que os dados não puderam ser
   carregados, com o detalhe técnico da falha disponível na própria página e um
   controle de nova tentativa.
5. IF a leitura falha, THEN THE Painel_Escola SHALL manter zero número
   renderizado em cada campo de valor de métrica, exibindo em seu lugar um
   marcador textual de indisponibilidade e mantendo zero ocorrência de `0` como
   valor exibido.
6. IF a escola existe no Escopo_Visivel e não possui registro algum no
   Periodo_Dashboard selecionado, THEN THE Painel_Escola SHALL exibir
   `DashboardEmptyState` na variante `empty`, com texto que declara ausência de
   dado no período e que não reusa o texto de falha de leitura.
7. THE Painel_Escola SHALL renderizar, em cada bloco assíncrono, exatamente 1
   dos 5 estados (carregando, vazio, negado, erro, dado disponível), com zero
   retorno `null` e zero árvore de renderização vazia.
8. THE Painel_Escola SHALL exibir o nome da escola, o município e a
   organização à qual a escola pertence no cabeçalho da página.
9. IF o nome da escola, o município ou a organização não podem ser lidos, THEN
   THE Painel_Escola SHALL declarar textualmente a indisponibilidade do campo,
   mantendo zero campo em branco e zero exibição do identificador da URL como
   substituto do nome.
10. WHERE nenhum Periodo_Dashboard é indicado na abertura da página, THE
    Painel_Escola SHALL aplicar `DEFAULT_DASHBOARD_PERIOD` (`30d`) e SHALL
    exibir textualmente o período aplicado.
11. WHEN a pessoa troca o Periodo_Dashboard, THE Painel_Escola SHALL reexecutar
    a leitura, exibir `DashboardSkeleton` e manter zero valor do período
    anterior renderizado durante a nova leitura.
12. IF a leitura dos indicadores da escola não devolve resposta em até 10
    segundos, THEN THE Painel_Escola SHALL tratar a leitura como falha,
    exibindo `DashboardErrorState` com controle de nova tentativa e zero número
    renderizado nos campos de valor.

### Requirement 2: Autorização do painel escolar por organização

**User Story:** Como responsável pela plataforma, quero que o `schoolId` da URL
seja validado contra o vínculo real do solicitante no servidor, para que editar
a URL não dê acesso à escola de outra rede.

#### Acceptance Criteria

1. THE Roteador_App SHALL proteger `/escola/:schoolId` com a composição
   `RequireAuth` → `RequireGuardianConsent` → `RequireRole`, com a
   Guarda_De_Papel aceitando exatamente os papéis `school_admin`, `org_admin` e
   `platform_admin`, e zero papel adicional.
2. THE RPC_Escola SHALL derivar o solicitante de `auth.uid()` e o
   Escopo_Visivel dos vínculos com `status = 'active'` em
   `institutional_memberships`, ignorando qualquer identificador de
   organização, de escola ou de papel enviado pelo cliente como parâmetro de
   autorização.
3. IF a RPC_Escola é chamada com um `schoolId` que não pertence a organização
   alguma do Escopo_Visivel do solicitante, THEN THE RPC_Escola SHALL retornar
   erro de autorização e SHALL omitir todo campo de indicador da resposta.
4. IF a RPC_Escola é chamada com um `schoolId` inexistente, com um `schoolId`
   fora do Escopo_Visivel ou sem sessão autenticada, THEN THE RPC_Escola SHALL
   retornar respostas de erro indistinguíveis entre si, com o mesmo código, a
   mesma mensagem e o mesmo conjunto de campos, para que a resposta não permita
   descobrir quais identificadores existem.
5. WHEN a RPC_Escola retorna erro de autorização, THE Painel_Escola SHALL
   exibir um estado de acesso negado que declara que a escola solicitada não
   está no escopo da conta e oferece exatamente 1 ação de navegação, com
   destino igual à home resolvida do papel efetivo.
6. WHEN a RPC_Escola retorna erro de autorização, THE Painel_Escola SHALL
   substituir integralmente a área de indicadores pelo estado de acesso
   negado, mantendo zero valor agregado renderizado.
7. IF o `schoolId` da URL não é um UUID válido, THEN THE Painel_Escola SHALL
   exibir o mesmo estado de acesso negado, com zero chamada de rede e zero erro
   não tratado de renderização.
8. WHERE o vínculo `school_admin` do solicitante declara `school_id` não nulo,
   THE RPC_Escola SHALL autorizar somente os `schoolId` declarados nesses
   vínculos.
9. WHERE o solicitante tem vínculo `org_admin` ativo em uma organização, THE
   RPC_Escola SHALL autorizar qualquer escola dessa organização.
10. IF a Guarda_De_Papel nega o acesso a `/escola/:schoolId`, THEN THE
    Painel_Escola SHALL renderizar o estado de acesso negado, mantendo zero
    chamada à RPC_Escola e zero conteúdo protegido renderizado.
11. WHEN a RPC_Escola é chamada com um `schoolId` pertencente ao Escopo_Visivel
    do solicitante, THE RPC_Escola SHALL retornar os indicadores agregados
    apenas dessa escola, mantendo zero campo de indicador de outra escola na
    resposta.
12. WHEN a RPC_Escola é chamada com parâmetros válidos, THE RPC_Escola SHALL
    devolver a resposta em até 3 segundos.
13. WHEN a RPC_Escola retorna erro de autorização, THE Painel_Escola SHALL
    renderizar o estado de acesso negado em até 1 segundo após a resposta.
14. WHERE o vínculo `school_admin` do solicitante declara `school_id` nulo, THE
    RPC_Escola SHALL autorizar zero escola por esse vínculo.
15. WHERE o solicitante tem vínculo `platform_admin` ativo, THE RPC_Escola
    SHALL autorizar qualquer escola existente e SHALL registrar o acesso com o
    mesmo evento de auditoria dos demais papéis.

### Requirement 3: Home do papel school_admin e navegação sem link morto

**User Story:** Como coordenação de escola, quero cair no painel da minha
escola ao entrar na plataforma, para não precisar navegar pela visão da rede.

#### Acceptance Criteria

1. THE Resolvedor_De_Home SHALL manter no Gabarito_De_Home a entrada de
   `school_admin` como o padrão `/escola/:schoolId`, contendo 1 segmento `:` e
   sendo usada como contrato de rota, com zero uso como Destino_Navegavel.
2. THE Resolvedor_De_Home SHALL devolver, em cada Destino_Navegavel, zero
   segmento `:` não resolvido, sendo o destino de `school_admin` o caminho
   `/escola/{uuid}` com UUID canônico de 36 caracteres, invariante já coberta
   por teste desde a UX-2.
3. THE Resolvedor_De_Home SHALL manter zero ocorrência de `/escolas` e de
   `/escolas/` em `CANONICAL_ROLE_HOME` e em `IMPLEMENTED_ROLE_HOME`.
4. WHEN o Escopo_Visivel do solicitante contém exatamente uma escola, THE
   Resolvedor_De_Home SHALL resolver a home de `school_admin` para essa escola,
   com zero etapa de seleção apresentada.
5. WHEN o Escopo_Visivel do solicitante contém duas ou mais escolas, THE
   Painel_Escola SHALL exibir uma seleção explícita listando as escolas
   acessíveis em ordem alfabética de nome, com nome e município de cada escola
   e com texto de indisponibilidade de município quando o município é nulo,
   mantendo zero escolha automática de escola.
6. IF o Escopo_Visivel do solicitante `school_admin` contém zero escola, THEN
   THE Painel_Escola SHALL exibir estado vazio explicando que nenhuma escola
   está vinculada à conta e oferecer contato com a gestão da rede, com zero
   navegação para `/escolas` e zero navegação para `/escola` sem uuid.
7. WHERE o Escopo_Visivel do papel efetivo contém ao menos uma escola, THE
   Navegacao_Dashboard SHALL apresentar o item `org-schools` sem a marcação
   `future` e com destino resolvido para um caminho concreto.
8. THE Navegacao_Dashboard SHALL manter zero item renderizado com destino
   `/escolas` e zero item renderizado com destino `/escolas/`.
9. THE Navegacao_Dashboard SHALL manter zero item renderizado marcado como
   `future` e zero Destino_Navegavel contendo segmento `:` não resolvido,
   invariante já coberta por teste desde a UX-1.
10. THE Resolvedor_De_Home SHALL derivar o uuid de escola usado na home de
    `school_admin` no servidor, a partir dos vínculos com `status = 'active'`
    em `institutional_memberships`, com zero uso de identificador de escola
    enviado pelo cliente.
11. WHEN a pessoa escolhe uma escola na seleção explícita, THE Painel_Escola
    SHALL navegar para `/escola/{uuid}` da escola escolhida.
12. WHILE a resolução da home de `school_admin` está em andamento, THE
    Painel_Escola SHALL exibir indicador de carregamento em até 400
    milissegundos após o início da resolução.
13. IF a resolução da home de `school_admin` falha ou não devolve resposta em
    até 10 segundos, THEN THE Painel_Escola SHALL exibir estado de falha com
    controle de nova tentativa, mantendo zero navegação executada.

### Requirement 4: Indicadores agregados por escola com filtro de período

**User Story:** Como coordenação de escola, quero indicadores agregados da
escola por período, para comparar as últimas semanas e decidir onde intervir.

#### Acceptance Criteria

1. THE RPC_Escola SHALL aceitar um `schoolId` e um Periodo_Dashboard.
2. IF a RPC_Escola recebe um período fora do conjunto `7d`, `30d`, `90d`, THEN
   THE RPC_Escola SHALL retornar erro de parâmetro inválido, com texto que não
   reusa o texto do erro de autorização do Requirement 2, e SHALL omitir todo
   campo de indicador da resposta.
3. THE RPC_Escola SHALL retornar, para cada indicador: o valor agregado como
   inteiro maior ou igual a zero; o período aplicado, pertencente ao conjunto
   `7d`, `30d`, `90d`; o Limiar_Minimo aplicado, igual a 5; o instante de
   geração da resposta em UTC; a janela considerada, igual aos N dias
   anteriores ao instante de geração, com N igual a 7, 30 ou 90 conforme o
   período; e a quantidade de pessoas do grupo considerado **somente quando o
   grupo atinge o Limiar_Minimo**, conforme o Requirement 5.
4. WHEN a pessoa altera o período no `GlobalFilterBar`, THE Painel_Escola SHALL
   refazer a leitura da RPC_Escola com o novo período.
5. THE Painel_Escola SHALL exibir `DASHBOARD_PERIOD_LABEL` nos controles e
   chips de período e `DASHBOARD_PERIOD_DESCRIPTION` no card, no gráfico e no
   texto de contexto da página, mantendo zero literal de período escrito na
   página.
6. THE Painel_Escola SHALL exibir cada indicador em `MetricCard` com os sete
   campos preenchidos com texto não vazio — valor, período, fórmula, fonte,
   instante de atualização, limitação conhecida e ação associada — e com a ação
   apontando para destino já resolvido, sem segmento `:`.
7. THE Painel_Escola SHALL exibir a série temporal do período dentro de
   `ChartFrame` com 7, 30 ou 90 pontos conforme o período aplicado, descrição
   acessível que declara o indicador, o período e a granularidade de 1 ponto
   por dia, tooltip que declara a data e o valor do ponto, e tabela alternativa
   com exatamente 1 linha por ponto da série e os mesmos valores da série.
8. THE Painel_Escola SHALL exibir apenas agregados de escola e de turma, com
   zero Dado_Nominal de estudante em texto visível, em tooltip, na tabela
   alternativa e em atributo de acessibilidade.
9. THE RPC_Escola SHALL omitir todo Dado_Nominal de estudante da resposta.
10. IF a RPC_Escola é chamada sem período ou com período nulo, THEN THE
    RPC_Escola SHALL aplicar `DEFAULT_DASHBOARD_PERIOD` de
    `src/config/dashboard-filters.ts` e SHALL devolver na resposta o período
    aplicado.
11. IF a resposta recebida declara período diferente do Periodo_Dashboard
    selecionado no momento da entrega, THEN THE Painel_Escola SHALL descartar
    essa resposta, mantendo zero valor dela renderizado.
12. IF a RPC_Escola não devolve resposta em até 10 segundos, THEN THE
    Painel_Escola SHALL tratar a leitura como falha e SHALL manter zero número
    renderizado nos campos de valor.

### Requirement 5: Supressão de agregados abaixo do limiar mínimo

**User Story:** Como responsável pela privacidade dos adolescentes, quero que
agregados de grupos pequenos sejam suprimidos no servidor, para que ninguém
reidentifique um estudante a partir do número de uma turma pequena.

#### Acceptance Criteria

1. THE RPC_Escola SHALL aplicar Limiar_Minimo igual a 5 pessoas por grupo
   agregado.
2. IF o grupo agregado tem entre 1 e 4 pessoas distintas com registro no
   Periodo_Dashboard, THEN THE RPC_Escola SHALL omitir o campo de valor e o
   campo de contagem exata de pessoas desse grupo e SHALL retornar o marcador
   de Amostra_Insuficiente com o Limiar_Minimo aplicado.
3. WHEN a RPC_Escola retorna Amostra_Insuficiente para um grupo, THE
   Painel_Escola SHALL exibir, no lugar do valor, texto que declara amostra
   insuficiente e informa o Limiar_Minimo de 5 pessoas.
4. WHEN a RPC_Escola retorna Amostra_Insuficiente para um grupo, THE
   Painel_Escola SHALL manter visíveis a fonte, o período e a limitação do
   indicador.
5. THE Painel_Escola SHALL exibir, para Amostra_Insuficiente, texto que declara
   grupo abaixo do Limiar_Minimo de 5 pessoas; para Grupo_Vazio, texto que
   declara ausência de pessoas com registro no período; e para falha de
   leitura, texto que declara que o dado não pôde ser carregado, mantendo zero
   reuso de texto entre esses três estados.
6. THE Painel_Escola SHALL exibir `PrivacyIndicator` com escopo de limiar e
   Limiar_Minimo igual a 5 em cada seção de indicadores agregados.
7. THE RPC_Escola SHALL aplicar a supressão antes de compor a resposta, de modo
   que o total do conjunto, a variação entre períodos, cada ponto da série e
   cada campo auxiliar da resposta mantenham zero ocorrência do valor real e da
   contagem real do grupo suprimido.
8. THE RPC_Escola SHALL aplicar a mesma supressão por ponto do Periodo_Dashboard
   na série temporal, marcando cada ponto suprimido como Amostra_Insuficiente.
9. WHEN o grupo agregado tem zero pessoas com registro no Periodo_Dashboard,
   THE RPC_Escola SHALL retornar valor zero e contagem zero com o marcador de
   Grupo_Vazio, em vez do marcador de Amostra_Insuficiente, porque um grupo
   vazio não expõe pessoa alguma.
10. THE Painel_Escola SHALL descrever, no texto de privacidade, o comportamento
    técnico aplicado, incluindo o Limiar_Minimo de 5 pessoas por grupo,
    mantendo zero afirmação de conformidade legal na interface.
11. IF exatamente 1 grupo de um conjunto está suprimido e o total desse
    conjunto é divulgado, THEN THE RPC_Escola SHALL aplicar Supressao_Complementar
    ao menor grupo restante do conjunto, mantendo no mínimo 2 grupos suprimidos
    nesse conjunto, para que o valor suprimido não seja recuperável por
    subtração.
12. WHEN a resposta marca um ponto da série como Amostra_Insuficiente, THE
    Painel_Escola SHALL renderizar lacuna marcada nesse ponto do gráfico e na
    linha correspondente da tabela alternativa, com zero valor interpolado e
    zero exibição de `0` para esse ponto.
13. WHEN a resposta marca um grupo como Grupo_Vazio, THE Painel_Escola SHALL
    renderizar o valor `0` acompanhado do texto de Grupo_Vazio, preservando a
    distinção entre grupo vazio e grupo suprimido que a RPC_Escola já faz.
14. WHERE o Universo_Elegivel da escola é menor que 5, THE Painel_Escola SHALL
    manter a escola visível como entidade operacional, exibindo nome, situação
    da implantação, gestor responsável, turmas configuradas, convites e
    pendências operacionais e as ações administrativas permitidas ao papel
    efetivo (§D5/D53).
15. WHERE o Universo_Elegivel da escola é menor que 5, THE Painel_Escola SHALL
    suprimir todo indicador derivado de atividade de estudante e SHALL exibir em
    seu lugar o texto `Amostra insuficiente para exibição segura.`, mantendo
    zero métrica de estudante renderizada.
16. WHERE o Universo_Elegivel da escola é 5 ou maior, THE RPC_Escola SHALL
    divulgar agregados no nível da escola, mantendo cada subdivisão por turma
    sujeita ao mesmo Limiar_Minimo avaliado por subdivisão.
17. THE RPC_Escola SHALL ler o Limiar_Minimo de uma única configuração canônica
    no servidor, mantendo zero repetição do valor 5 como literal em componente
    de interface; e THE Painel_Escola SHALL exibir o limiar recebido do
    servidor, mantendo zero aplicação de limiar decidida no cliente.
18. THE RPC_Escola SHALL aplicar a Supressao_Complementar por regra
    determinística e documentada, suprimindo a segunda menor turma ou o total
    agregado conforme a alternativa que preserva mais utilidade, mantendo zero
    decisão por heurística opaca em tempo de execução (§D6/D54).
19. THE Onda SHALL aplicar a supressão em cada superfície de saída — resposta de
    API, resposta de RPC, card de métrica, gráfico, tooltip, label de
    acessibilidade, PDF do relatório do piloto gerado por
    `src/lib/generate-pilot-report-pdf.ts`, CSV e qualquer export — mantendo
    zero ocorrência do valor real do grupo suprimido em cada uma delas.
20. THE Onda SHALL manter zero caso em que o valor de um grupo suprimido esteja
    ausente apenas da interface e presente no payload da resposta, porque
    esconder o número na tela deixaria o valor legível em ferramenta de rede e
    em export.
21. WHEN a RPC_Escola responde para um grupo abaixo do Limiar_Minimo, THE
    RPC_Escola SHALL devolver exatamente três informações — indicação de dado
    suprimido, motivo da supressão e Limiar_Minimo aplicado — mantendo zero
    valor, zero contagem, zero porcentagem, zero intervalo que permita
    inferência, zero campo oculto no payload e zero metadado acessível por
    exportação (§D7/D55).
22. THE Painel_Escola SHALL tratar campo ausente na resposta de grupo suprimido
    como dado suprimido, mantendo zero interpretação desse campo como valor
    zero.

### Requirement 6: Segurança e rastreabilidade da RPC agregada

**User Story:** Como responsável pela segurança, quero que a nova RPC siga os
invariantes já estabelecidos, para que a superfície de leitura institucional
não seja ampliada silenciosamente.

#### Acceptance Criteria

1. THE RPC_Escola SHALL ser declarada `SECURITY DEFINER` com
   `SET search_path = public` fixado na própria função, mantendo zero
   dependência do `search_path` da sessão que a chama.
2. THE migração da RPC_Escola SHALL terminar com
   `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon, authenticated` seguido de
   `GRANT EXECUTE ON FUNCTION ... TO authenticated` como único `GRANT EXECUTE`,
   mantendo zero `GRANT EXECUTE` para `anon` e para `PUBLIC`, porque a leitura é
   self-service feita pelo Painel_Escola.
3. THE migração da RPC_Escola SHALL conter comentário com a query de
   verificação `has_function_privilege` para `anon` e para `authenticated`,
   declarando o resultado esperado de cada uma (`false` para `anon`, `true`
   para `authenticated`), a ser executada após a aplicação.
4. THE migração da RPC_Escola SHALL ser idempotente, de modo que aplicá-la duas
   vezes seguidas no mesmo banco produza o mesmo estado final e zero erro,
   usando `CREATE OR REPLACE FUNCTION`, `IF NOT EXISTS` em cada objeto novo e
   `ON CONFLICT DO NOTHING` em qualquer carga de dados.
5. WHEN a RPC_Escola autoriza uma leitura, THE RPC_Escola SHALL registrar
   exatamente um evento em `data_access_logs` contendo o `school_id` lido, o
   Periodo_Dashboard aplicado, o Limiar_Minimo aplicado e o identificador do
   solicitante derivado de `auth.uid()`, mantendo zero Dado_Nominal de
   estudante no evento.
6. IF a RPC_Escola nega uma leitura por autorização, por escola inexistente ou
   por período inválido, THEN THE RPC_Escola SHALL registrar em
   `data_access_logs` um evento de tentativa negada com o `school_id`
   solicitado, o motivo da negação e contagem zero de linhas lidas, preservado
   após a resposta de erro.
7. IF a gravação do evento de auditoria em `data_access_logs` falha, THEN THE
   RPC_Escola SHALL retornar erro ao chamador com zero campo de indicador na
   resposta, em vez de devolver dado sem registro de acesso.
8. THE migração da RPC_Escola SHALL ser adicionada ao final de
   `docs/security-invariants-runbook.md`, na posição correspondente à sua ordem
   de aplicação, com o nome do arquivo da migração e a query de verificação de
   privilégio.
9. THE migração da RPC_Escola SHALL manter as tabelas de ledger existentes,
   incluindo `guardian_consent_events` e `data_access_logs`, somente-INSERT,
   com zero coluna mutável de estado adicionada e zero policy de `UPDATE` ou
   `DELETE` para `authenticated`.
10. THE migração da RPC_Escola SHALL manter zero `GRANT` novo de `SELECT` para
    `anon` ou `authenticated` em tabela de progresso de estudante e zero policy
    nova que amplie a leitura dessas tabelas além do escopo do próprio usuário.
11. THE Painel_Escola SHALL obter todo indicador de escola por chamada à
    RPC_Escola, mantendo zero consulta direta do navegador a tabela de
    progresso de estudante.

### Requirement 7: Painel docente sobre a casca compartilhada

**User Story:** Como docente, quero o painel pedagógico na mesma casca dos
outros painéis, para ter a mesma navegação, os mesmos filtros e explicações em
vez de uma tela solta.

#### Acceptance Criteria

1. THE Painel_Docente SHALL renderizar seu conteúdo dentro da Casca_Dashboard,
   com zero uso de `Navbar` e de `Footer`.
2. THE Painel_Docente SHALL reusar o landmark `main` provido pela
   Casca_Dashboard, mantendo exatamente 1 landmark `main` na página renderizada
   e zero landmark `main` criado pela própria página.
3. WHILE a leitura dos indicadores pedagógicos está em andamento, THE
   Painel_Docente SHALL exibir `DashboardSkeleton` com rótulo acessível que
   nomeia os indicadores em carregamento e o Periodo_Dashboard aplicado.
4. IF a função `admin-dashboard` responde 403, THEN THE Painel_Docente SHALL
   exibir estado de acesso negado que declara qual papel é exigido e oferece
   navegação para a home do papel efetivo.
5. IF a função `admin-dashboard` responde com falha diferente de 401 e 403,
   THEN THE Painel_Docente SHALL exibir `DashboardErrorState` declarando que os
   dados não puderam ser carregados, com controle de nova tentativa.
6. IF a resposta de `admin-dashboard` chega sem dados de indicador, THEN THE
   Painel_Docente SHALL exibir `DashboardEmptyState` explicando a ausência de
   dado, mantendo zero ocorrência de retorno vazio sem explicação.
7. WHEN a resposta de `admin-dashboard` indica amostra insuficiente, THE
   Painel_Docente SHALL exibir o texto de Amostra_Insuficiente com o limiar
   recebido, em vez de exibir `0`.
8. THE Painel_Docente SHALL exibir cada indicador em `MetricCard` com os sete
   campos preenchidos com texto não vazio — valor, período, fórmula, fonte,
   instante de atualização, limitação conhecida e ação associada — e SHALL
   declarar textualmente "não informado" em cada campo que o servidor não
   envia.
9. THE Painel_Docente SHALL exibir cada gráfico dentro de `ChartFrame` com
   descrição acessível, tooltip e tabela alternativa contendo as mesmas linhas
   e os mesmos valores da série, com alternância de exibição da tabela operável
   por teclado.
10. THE Painel_Docente SHALL manter zero Dado_Nominal de estudante e zero ação
    de relatório individual, invariante já asseverada pelo Gate_De_Seguranca.
11. IF a função `admin-dashboard` responde 401, THEN THE Painel_Docente SHALL
    exibir estado de sessão não autenticada com ação para autenticar, com texto
    que não reusa o texto do estado de acesso negado por papel.
12. IF a função `admin-dashboard` não devolve resposta em até 10 segundos, THEN
    THE Painel_Docente SHALL tratar a leitura como falha, oferecer controle de
    nova tentativa operável por teclado e preservar os filtros selecionados.
13. IF o Painel_Docente está em estado de falha, de acesso negado, de sessão não
    autenticada ou de ausência de dado, THEN THE Painel_Docente SHALL manter
    zero valor numérico renderizado nos campos de indicador, com zero
    ocorrência de `0`, zero valor estimado e zero traço sem explicação,
    declarando o Limiar_Minimo de 5 pessoas quando a ausência do valor decorre
    de supressão.
14. THE Painel_Docente SHALL renderizar, em cada bloco assíncrono, exatamente 1
    dos 5 estados (carregando, vazio, negado, erro, dado disponível), com zero
    retorno `null` e zero bloco renderizado sem texto.
15. WHEN a pessoa aciona o skip link da Casca_Dashboard no Painel_Docente, THE
    Casca_Dashboard SHALL mover o foco para o landmark `main` da página.

### Requirement 8: Mudança de rota do painel docente com gate equivalente

**User Story:** Como responsável pela arquitetura, quero o painel docente na
rota prevista pelo contrato e o gate de segurança atualizado na mesma mudança,
para que `/admin` fique reservado à operação de plataforma sem afrouxar a
proteção de papel.

#### Acceptance Criteria

1. THE Roteador_App SHALL servir o Painel_Docente em `/professores` com a
   composição `RequireAuth` → `RequireGuardianConsent` → `RequireRole`, com a
   Guarda_De_Papel exigindo exatamente os papéis `teacher` e `manager`, sem
   papel adicional.
2. WHEN uma pessoa autenticada sem papel administrativo de plataforma abre
   `/admin`, THE Roteador_App SHALL levá-la à home do papel efetivo com no
   máximo 1 redirecionamento, substituindo a entrada no histórico com `replace`
   e mantendo zero renderização do Painel_Docente.
3. THE Resolvedor_De_Home SHALL mapear `educator` para `/professores`, SHALL
   mapear `platform_admin` para a Landing_Administrativa e SHALL mapear cada um
   dos 5 papéis para um caminho registrado na tabela de rotas privadas do
   Roteador_App, mantendo zero mapeamento de papel não administrativo para
   `/admin`.
4. THE Navegacao_Dashboard SHALL apontar o item de home do papel `educator` para
   `/professores` e SHALL manter esse item e o item `teacher-classes` sem a
   flag de rota futura.
5. THE Navegacao_Dashboard SHALL manter zero item com destino `/admin` nas
   listas renderizadas, agrupada e mobile, para cada um dos 5 papéis, incluindo
   o item `org-reports`.
6. IF o Painel_Docente está registrado no Roteador_App sem a Guarda_De_Papel
   exigindo `teacher` e `manager`, THEN THE Gate_De_Seguranca SHALL encerrar com
   código de saída diferente de zero e mensagem que identifica a asserção
   violada.
7. IF `/professores` ou `/escola/:schoolId` estão ausentes da lista de rotas
   privadas protegidas por `RequireAuth`, THEN THE Gate_De_Seguranca SHALL
   encerrar com código de saída diferente de zero e mensagem que identifica a
   asserção violada.
8. THE Gate_De_Seguranca SHALL manter, após esta onda, as três asserções que
   hoje incidem sobre o painel docente: proteção por papel do painel docente,
   com o literal de rota `/admin` **substituído** pelo literal `/professores` e
   não removido; presença do painel docente na lista de rotas privadas
   obrigatórias; e ausência de campo nominal de estudante na página do painel
   docente.
9. THE Gate_De_Seguranca SHALL manter, após esta onda, contagem total de
   asserções igual ou maior que a contagem do início da onda, sem remoção nem
   relaxamento de literal.
10. WHEN a mudança que move a rota é entregue, THE Gate_De_Qualidade SHALL
    concluir as seis etapas (`audit:security`, `lint --max-warnings 0`,
    `typecheck`, `test`, `build`, `security:gate`) com código de saída zero na
    mesma mudança, como guarda contra o incidente D12.
11. THE Roteador_App SHALL manter `/admin` como rota privada sob `RequireAuth`,
    servindo a Landing_Administrativa ou o redirecionador conforme o papel, com
    zero conteúdo do Painel_Docente renderizado nessa rota.
12. IF o Resolvedor_De_Home mapeia um papel para um caminho ausente da tabela de
    rotas privadas do Roteador_App, THEN THE Gate_De_Seguranca SHALL encerrar com
    código de saída diferente de zero e mensagem que identifica o papel e o
    mapeamento violado.
13. WHEN uma pessoa não autenticada abre `/admin`, THE Roteador_App SHALL
    redirecionar essa pessoa para `/auth` preservando o caminho original para
    retorno após a autenticação.
14. THE Onda SHALL entregar a Landing_Administrativa como página existente e
    navegável, servida em `/admin/operacao` ou em `/admin`, contendo
    identificação textual "Administração da Plataforma", estado operacional
    básico, links para as áreas administrativas já existentes e aviso do que
    permanece em construção (§D3/D51).
15. WHEN uma pessoa com papel `platform_admin` entra na plataforma, THE
    Roteador_App SHALL levá-la à Landing_Administrativa, mantendo zero
    navegação para `/org` e zero renderização do painel de gestor de
    organização para esse papel.
16. THE Onda SHALL manter, para cada um dos 5 papéis, zero laço de
    redirecionamento e zero resposta 404 ao seguir a home resolvida do papel.
17. THE Navegacao_Dashboard SHALL manter zero item `org-reports` renderizado para
    `org_admin`, porque os indicadores agregados já estão em `/org` e um segundo
    item apontando para outro painel duplicaria a informação (§D4/D52); e SHALL
    manter zero reaproveitamento desse item para `platform_admin`.

### Requirement 9: Fila de decisões com ações que alteram dados

**User Story:** Como gestor da rede, quero resolver pendências direto da fila
de decisões, para que o painel produza ação em vez de só mostrar números.

#### Acceptance Criteria

1. THE Fila_De_Decisoes SHALL derivar cada item de um dado observado e SHALL
   informar, no item, a evidência que o gerou.
2. THE Fila_De_Decisoes SHALL gerar um item de convite pendente para cada
   convite sem `accepted_at` cuja criação tenha 168 horas ou mais, ou cujo
   `expires_at` esteja no passado.
3. WHERE o convite pendente tem papel `student`, THE Fila_De_Decisoes SHALL
   identificar o item por papel e contagem, mantendo o e-mail do convidado fora
   do item da fila.
4. THE Fila_De_Decisoes SHALL identificar o responsável de cada item por papel
   ou função, com zero Dado_Nominal de estudante.
5. WHERE o item da fila representa um convite ainda sem `accepted_at`, THE
   Fila_De_Decisoes SHALL oferecer a ação de reenvio desse convite; e THE
   Fila_De_Decisoes SHALL oferecer a ação de escalonamento nos itens gerados por
   indicador fora da Faixa_Esperada.
6. WHEN um convite passa a ter `accepted_at`, THE Fila_De_Decisoes SHALL retirar
   da fila o item correspondente e a sua ação de reenvio na próxima leitura.
7. WHEN a pessoa confirma uma ação da Fila_De_Decisoes, THE servidor SHALL
   resolver o papel e a organização do solicitante a partir da identidade
   autenticada em `auth.uid()` e dos vínculos ativos, negar a ação cujo alvo
   esteja fora dessa organização e ignorar qualquer papel, organização ou
   escola informados pelo cliente.
8. WHILE uma ação da Fila_De_Decisoes está em execução, THE Fila_De_Decisoes
   SHALL desabilitar o controle acionado e indicar o progresso, mantendo uma
   execução por acionamento.
9. WHEN uma ação da Fila_De_Decisoes conclui com sucesso, THE Fila_De_Decisoes
   SHALL exibir confirmação declarando o efeito ocorrido e SHALL recarregar a
   fila a partir do servidor.
10. IF uma ação da Fila_De_Decisoes falha, THEN THE Fila_De_Decisoes SHALL
    exibir mensagem de falha declarando que nada foi alterado e SHALL manter o
    item na fila.
11. IF o servidor nega uma ação por permissão insuficiente, THEN THE
    Fila_De_Decisoes SHALL exibir mensagem específica de permissão negada,
    textualmente distinta da mensagem de falha técnica.
12. WHEN uma ação da Fila_De_Decisoes é executada, THE Registro_De_Decisoes
    SHALL receber, por INSERT, um evento com tipo de ação, escola ou
    organização alvo, motivo, papel responsável, instante e resultado da
    execução (sucesso ou negado), com zero UPDATE e zero DELETE para
    `authenticated` e zero Dado_Nominal de estudante.
13. WHEN a mesma ação é executada novamente para o mesmo item já resolvido, THE
    servidor SHALL manter o estado derivado equivalente ao da primeira execução
    e SHALL informar que o item já estava resolvido.
14. THE estado de cada item da Fila_De_Decisoes SHALL ser derivado dos eventos
    do Registro_De_Decisoes somados aos dados observados, sem coluna mutável de
    estado.
15. WHERE o papel efetivo não pode executar uma ação, THE Fila_De_Decisoes
    SHALL apresentar o item sem o controle dessa ação.
16. THE Fila_De_Decisoes SHALL classificar um indicador como fora do esperado
    quando o indicador declara a sua Faixa_Esperada e apresenta 2 leituras
    consecutivas com valor fora dessa faixa.
17. IF um convite já recebeu 3 reenvios, ou se o reenvio anterior desse convite
    ocorreu há menos de 24 horas, THEN THE servidor SHALL negar o reenvio e THE
    Fila_De_Decisoes SHALL declarar o limite aplicado, porque o reenvio dispara
    e-mail que pode chegar a adolescentes.
18. IF uma ação da Fila_De_Decisoes não devolve resposta em até 10 segundos,
    THEN THE Fila_De_Decisoes SHALL declarar que a conclusão da ação não foi
    confirmada e SHALL manter zero retentativa automática.
19. THE Fila_De_Decisoes SHALL apresentar no máximo 50 itens por leitura,
    ordenados por prioridade declarada e, em caso de empate, pelo instante de
    origem do dado observado, do mais antigo para o mais recente.
20. THE Fila_De_Decisoes SHALL agregar os convites pendentes por escola e por
    papel, exibindo a contagem de convites de cada agrupamento com zero e-mail
    de convidado renderizado.
21. THE Onda SHALL manter zero rótulo "Aprovar convite" e zero rótulo
    equivalente que sugira uma ação de aprovação de entrada em qualquer
    superfície de interface, porque essa ação não existe no produto (§D1/D49 e
    doutrina §1 — honestidade acima de overclaim).
22. THE Fila_De_Decisoes SHALL oferecer a ação de reenvio somente quando o
    convite está pendente, não aceito, não revogado e dentro da validade
    (§D8/D56).
23. THE servidor SHALL contar os reenvios por organização e por destinatário, de
    modo que cancelar e recriar convites idênticos para o mesmo destinatário na
    mesma organização mantenha o mesmo limite de 3 reenvios e a mesma janela
    mínima de 24 horas, mantendo zero contorno do limite por recriação de
    convite.
24. WHEN o limite de reenvios de um convite é atingido, THE Fila_De_Decisoes
    SHALL declarar as alternativas disponíveis — aguardar a expiração, cancelar
    e emitir novo convite quando permitido, ou usar outro canal institucional de
    contato.
25. WHEN uma tentativa de reenvio é executada ou negada, THE Registro_De_Decisoes
    SHALL receber, por INSERT, um evento com ator, data, convite alvo, resultado
    e motivo do bloqueio quando houver.
26. WHEN uma ação da Fila_De_Decisoes tem alvo em organização diferente da
    organização resolvida do solicitante, THE servidor SHALL negar a ação e THE
    Registro_De_Decisoes SHALL registrar a negação, mantendo zero alteração de
    dado da organização alvo.

### Requirement 10: Responsividade e acessibilidade das telas desta onda

**User Story:** Como usuário em celular, quero as mesmas ações essenciais
disponíveis no telefone e no computador, para não precisar trocar de aparelho
para decidir algo.

#### Acceptance Criteria

1. WHILE a largura da viewport é 768, 1024, 1280 ou 1440 pixels, THE
   Casca_Dashboard SHALL exibir navegação persistente e os filtros de período em
   linha no Painel_Escola e no Painel_Docente, com zero rolagem horizontal da
   página.
2. WHILE a largura da viewport é 320, 375 ou 390 pixels, THE Casca_Dashboard
   SHALL exibir a mesma navegação em drawer, uma navegação inferior e os mesmos
   filtros de período em sheet, com zero rolagem horizontal da página e zero
   elemento interativo coberto pela navegação inferior.
3. THE Casca_Dashboard SHALL disponibilizar, nas viewports de 320, 375 e 390
   pixels, o mesmo conjunto disponível nas viewports de 768 pixels ou mais para
   cada uma das duas telas, composto por: destinos de navegação do papel
   efetivo, opções de Periodo_Dashboard, controle de nova tentativa, acesso à
   tabela alternativa de cada gráfico e ações da Fila_De_Decisoes permitidas ao
   papel efetivo.
4. THE Painel_Escola e THE Painel_Docente SHALL exibir indicador de foco em
   cada elemento alcançado por tabulação, com a distinção do foco preservada
   quando a cor é removida da renderização.
5. THE Painel_Escola e THE Painel_Docente SHALL indicar prioridade,
   Amostra_Insuficiente e erro com texto ou ícone junto da cor, mantendo a
   distinção identificável quando a cor é removida da renderização.
6. THE Painel_Escola e THE Painel_Docente SHALL oferecer, para a tabela
   alternativa de cada gráfico, um controle nomeado que declara o estado
   exibido ou oculto da tabela e é operável por teclado, sem uso de ponteiro.
7. THE Casca_Dashboard SHALL limitar a navegação inferior a no máximo 5
   destinos, com zero `href` duplicado, e SHALL manter esses destinos como
   subconjunto dos destinos do drawer do mesmo papel efetivo.
8. WHEN o drawer de navegação ou o sheet de filtros é aberto, THE
   Casca_Dashboard SHALL mover o foco para o primeiro elemento interativo do
   componente aberto; e WHEN esse componente é fechado, THE Casca_Dashboard
   SHALL devolver o foco ao controle que o abriu.
9. THE textos entregues nesta onda SHALL manter zero selo e zero afirmação de
   conformidade de acessibilidade sem auditoria, alinhados a D4, que removeu o
   badge "WCAG 2.2" do `Footer` por ser afirmação sem auditoria.

### Requirement 11: Não regressão e registro honesto do que ficou de fora

**User Story:** Como responsável pelo projeto, quero que a onda não reabra
superfícies já fechadas e que o que ficou incompleto esteja escrito, para
manter a rastreabilidade das decisões.

#### Acceptance Criteria

1. THE onda SHALL manter `supabase/functions/_shared/crisis.ts` e o sistema de
   consentimento parental (`guardian_consent_events`,
   `record_guardian_consent`, `get_my_guardian_consent_status`,
   `RequireGuardianConsent`) com o mesmo comportamento observável do início da
   onda: nenhuma dessas superfícies removida, renomeada ou substituída, nenhum
   segundo protocolo de crise nem segunda checagem de consentimento criados, e
   o bloco de crise permanecendo a primeira instrução do system prompt das 4
   funções de IA.
2. WHEN a onda é declarada concluída, THE suíte Vitest SHALL executar no mínimo
   os 171 testes em 18 arquivos existentes no início da onda, com 100% deles
   passando, incluindo os cinco testes que fixam D33/D43 — `/escolas` não é home
   de papel algum e nenhum destino navegável carrega parâmetro de rota não
   resolvido no momento da navegação.
3. WHEN a onda é declarada concluída, THE `npm run quality` SHALL concluir com
   sucesso as seis etapas (`audit:security`, `lint --max-warnings 0`,
   `typecheck`, `test`, `build`, `security:gate`), com zero teste comentado,
   marcado como `skip`/`todo` ou excluído da execução, e zero execução de git
   com verificação de hook desabilitada.
4. WHEN a onda é declarada concluída, THE documentação do projeto SHALL conter,
   registrado antes dessa declaração: em `docs/kiro/DECISIONS.md`, cada decisão
   nova como item numerado que continua a sequência existente a partir de D48;
   em `docs/kiro/WORKLOG.md`, o que foi entregue e cada dívida assumida com a
   descrição do que falta para fechá-la; em `docs/kiro/NEXT_ACTION.md`, cada
   item de escopo não entregue com a descrição do que ficou de fora e o próximo
   passo correspondente.
5. THE textos de interface entregues nesta onda SHALL descrever o mecanismo
   técnico observável do sistema, incluindo o limiar mínimo de 5 pessoas por
   grupo onde um agregado é suprimido.
6. IF qualquer uma das seis etapas de `npm run quality` falha, THEN THE onda
   SHALL corrigir a causa da falha e reexecutar as seis etapas, sem
   desabilitar, pular, afrouxar ou remover a etapa que falhou nem a asserção
   que falhou.
7. IF um teste existente passa a falhar por mudança deliberada de comportamento
   decidida nesta onda, THEN THE onda SHALL registrar a decisão numerada em
   `docs/kiro/DECISIONS.md` e atualizar a asserção para o novo comportamento na
   mesma mudança, preservando a cobertura do invariante original em pelo menos
   um teste.
8. IF um texto de interface desta onda afirma conformidade, adequação ou
   atendimento a lei, norma ou artigo legal, THEN THE onda SHALL substituí-lo
   por descrição do comportamento técnico antes de declarar a onda concluída.

### Requirement 12: Testes exigidos como condição de aceite da onda

**User Story:** Como responsável pelo projeto, quero que os riscos que
identificamos ao decidir o contrato estejam cobertos por teste, para que uma onda
futura não os reintroduza sem ninguém perceber.

#### Acceptance Criteria

O humano exigiu explicitamente estes nove casos. Cada um é condição de aceite,
não sugestão.

1. THE Suite_Vitest SHALL cobrir o caso de laço de redirecionamento do
   `platform_admin`, falhando se a home resolvida desse papel apontar para uma
   rota que redirecione de volta para a origem.
2. THE Suite_Vitest SHALL cobrir, para cada um dos 5 papéis, a chegada ao destino
   correto, falhando se um papel resolver para destino de outro papel ou para
   caminho ausente da tabela de rotas privadas.
3. THE Suite_Vitest SHALL cobrir grupo com 1 a 4 participantes, falhando se a
   resposta trouxer valor ou contagem desse grupo.
4. THE Suite_Vitest SHALL cobrir inferência por subtração, falhando se um
   conjunto divulgado permitir isolar o valor de um único grupo suprimido.
5. THE Suite_Vitest SHALL cobrir o payload e a exportação de grupo suprimido,
   falhando se o valor real aparecer na resposta bruta, no PDF ou no CSV, mesmo
   quando ausente da interface.
6. THE Suite_Vitest SHALL cobrir a quarta tentativa de reenvio de um convite,
   falhando se ela for aceita.
7. THE Suite_Vitest SHALL cobrir a tentativa de reenvio antes de completadas 24
   horas do reenvio anterior, falhando se ela for aceita.
8. THE Suite_Vitest SHALL cobrir a tentativa de alterar evento já gravado no
   Registro_De_Decisoes, falhando se o UPDATE ou o DELETE for aceito.
9. THE Suite_Vitest SHALL cobrir o escalonamento com alvo em organização diferente
   da do solicitante, falhando se a ação for aceita.

## Decisões e observações registradas no refinamento

1. **Precedência da privacidade sobre o contrato de resposta (conflito R4 × R5,
   resolvido).** A versão anterior do Requirement 4 mandava a RPC_Escola
   devolver "a quantidade de pessoas do grupo considerado" em todo indicador,
   enquanto o Requirement 5 exigia suprimir o valor de grupos com 1 a 4
   pessoas. Devolver a contagem exata de um grupo suprimido derrota a própria
   supressão: "turma com 1 pessoa" é, na prática, um identificador de um
   adolescente. Regra única adotada nos dois requisitos:
   - grupo com 5 pessoas ou mais: a resposta traz o valor agregado **e** a
     contagem exata do grupo;
   - grupo com 1 a 4 pessoas: a resposta traz **apenas** o marcador de
     Amostra_Insuficiente com o Limiar_Minimo aplicado, sem valor e sem
     contagem;
   - grupo com zero pessoas: a resposta traz contagem zero e valor zero com o
     marcador de Grupo_Vazio, porque um grupo vazio não expõe pessoa alguma.
   O Requirement 4, item 3, passa a condicionar o campo de contagem a essa
   regra, e o Requirement 5, item 2, passa a omitir valor e contagem juntos.
2. **Vazamento por subtração (P0) fechado por Supressao_Complementar.** Com um
   único grupo suprimido dentro de um conjunto cujo total é divulgado, o valor
   suprimido é recuperável por aritmética. O Requirement 5, item 11, exige
   suprimir também o menor grupo restante, mantendo no mínimo 2 grupos
   suprimidos por conjunto. O custo é menos detalhe exibido em escolas
   pequenas — ponto levado à confirmação humana abaixo.
3. **Gabarito versus destino navegável.** A aparente contradição entre "a home
   de `school_admin` é `/escola/:schoolId`" e "zero destino com `:` não
   resolvido" era de vocabulário. `CANONICAL_ROLE_HOME` é gabarito de contrato e
   pode conter `:`; `IMPLEMENTED_ROLE_HOME`, o retorno das funções de resolução
   e o `href` de item renderizado são Destino_Navegavel e mantêm zero `:`.
4. **A casca já provê `main` e skip link.** Verificado em
   `RoleAwareAppShell.tsx`, onde `SidebarInset` é o próprio `main`. Os
   requisitos 1 e 7 passam a exigir **reuso** da casca, não criação de um
   segundo landmark pela página.
5. **Três asserções do gate incidem hoje sobre o painel docente**: o literal
   `path: "/admin", element: <AdminPage />, roles: ["teacher", "manager"]`, a
   presença de `/admin` em `requiredPrivateRoutes` e a checagem de campo nominal
   de estudante em `src/pages/AdminPage.tsx`. A asserção do literal é
   **substituída** pelo literal de `/professores`, nunca removida.
   `/escola/:schoolId` ainda não consta de `privateRoutes`, então a asserção que
   exige a sua presença só passa a valer depois de a rota ser criada nesta onda.
6. **Risco de laço de redirecionamento maior do que o previsto.**
   `IMPLEMENTED_ROLE_HOME` mapeia `platform_admin` e `educator` para `/admin`, e
   `CANONICAL_ROLE_HOME` também mapeia `platform_admin` para `/admin`. Além de
   `educator-home`, o item `org-reports` aponta para `/admin` para `org_admin` e
   `platform_admin`, e `teacher-classes` (`/professores`) está marcado
   `future: true`.

## Fora de escopo nesta onda

- Painel de operação da plataforma (`/admin/operacao`): o item de navegação
  `platform-home` continua marcado como `future` e não renderiza link.
- Painéis `/alunos` e `/professores` como home do estudante: a migração de
  `/dashboard` para `/alunos` permanece na UX-4. Esta onda cria `/professores`
  apenas para o painel docente.
- Remoção de `src/hooks/useOrganization.ts`: ainda tem outros consumidores.
- Divisão do chunk de `OrgDashboardPage` (D48): resolver com `import()`
  dinâmico é assunto de uma onda de performance.
- Unificação dos dois vocabulários de papel no banco (D29).
- Notificação por e-mail do escalonamento registrado pela Fila_De_Decisoes:
  depende de `RESEND_API_KEY` configurado, que segue pendente no backlog. Esta
  onda grava o evento no Registro_De_Decisoes e mostra o efeito na interface.

## Decisões de contrato de produto (fechadas pelo humano)

As oito decisões abaixo foram tomadas em 2026-07, **antes do design**, e estão
versionadas em `docs/kiro/DASHBOARD_PRODUCT_CONTRACT.md` (§D1–§D8),
`docs/kiro/METRIC_PRIVACY_POLICY.md` e `docs/kiro/DECISIONS.md` (D49–D57). São
vinculantes: o design não as reabre.

| # | Decisão | Efeito nos requisitos |
|---|---|---|
| §D1 / D49 | Só reenvio e escalonamento; aprovação de entrada fora da onda; **remover o rótulo "Aprovar convite"** da interface | R9.5, R9.21 |
| §D2 / D50 | Ledger próprio `institutional_decision_events`, append-only; **não** reusar `notification_outbox` | Glossário, R9.12, R9.25 |
| §D3 / D51 | `platform_admin` recebe **Landing_Administrativa mínima**, nunca `/org` — proposta original reprovada | R8.3, R8.14–R8.16 |
| §D4 / D52 | Remover `org-reports` do menu do gestor; não reaproveitar para `platform_admin` | R8.17 |
| §D5 / D53 | Escola com `n < 5` **permanece visível**; suprimir só o analytics de estudante; limiar em config canônica server-side | R5.14–R5.17 |
| §D6 / D54 | Supressão complementar determinística, válida em API, RPC, cards, gráficos, tooltips, a11y, PDF, CSV e exports | R5.18–R5.20 |
| §D7 / D55 | Privacidade prevalece sobre uniformidade do formato de resposta | R5.21, R5.22 |
| §D8 / D56 | 3 reenvios além do inicial, 24 h de intervalo, com antiburla por organização e destinatário | R9.22–R9.24 |

Duas dessas decisões **rejeitaram** propostas minhas, e o registro fica porque o
motivo importa mais que a escolha:

- **§D3 ampliou o escopo da onda.** Eu propus mandar `platform_admin` para `/org`
  provisoriamente. Foi reprovado por confundir papel, poder mascarar falha de
  autorização e criar dívida que tende a durar mais que o previsto. A onda passa
  a incluir uma landing administrativa mínima.
- **§D5 corrigiu o alvo da supressão.** Eu tratei "esconder a escola inteira"
  como uma opção defensável. O ajuste separa dado de **implantação** (nome,
  turmas configuradas, convites pendentes — sobre a escola) de dado de
  **atividade de estudante** (sobre um adolescente). Só o segundo é suprimido;
  esconder o primeiro quebraria a operação do piloto sem ganho de privacidade.

Um achado incidental foi registrado como **D57**: os documentos de contrato
citados pelas ondas UX-1 e UX-2 (`DASHBOARD-PRODUCT-CONTRACT.md`,
`DASHBOARD-METRIC-REGISTRY.md`, `DASHBOARD-ROUTE-MAP.md`,
`DASHBOARD-COMPONENT-INVENTORY.md`, `DASHBOARD-MASTER-PLAN.md`) **nunca
existiram no repositório** — circularam apenas no chat. Duas ondas foram
executadas contra um contrato que não podia ser auditado depois. A partir desta
onda o contrato é versionado.
