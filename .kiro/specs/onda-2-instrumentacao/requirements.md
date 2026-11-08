# Requirements Document

## Introduction

As Ondas 0/1/1.5 deram segurança, faturamento e ciclo de vida da assinatura.
Mas o negócio está "cego": não há dados sobre onde os visitantes desistem, o
que ativa um aluno, nem a taxa de conversão do funil de vendas. A Onda 2
adiciona instrumentação — captura de eventos canônicos do funil e um painel
agregado — para decisões de produto/CRO baseadas em dado, não em achismo.

Alinhamento com o roadmap (Anexo §Onda 2): tabela `landing_events` + 6 eventos
canônicos (signup, ativação, aula completa, hit de paywall, checkout iniciado,
upgrade) + mini-dashboard de funil em `/admin`.

## Glossary

- **Funil**: sequência de etapas que um visitante percorre até se tornar
  assinante pagante (visita → signup → ativação → paywall → checkout → upgrade).
- **Evento canônico**: um dos 6 tipos de evento padronizados desta onda.
- **Session ID**: identificador anônimo gerado no cliente (não é PII), usado
  para agrupar eventos do mesmo visitante antes/depois do login.
- **k-anon / N mínimo**: regra já usada em `admin-dashboard` — não exibir
  métricas agregadas com menos de N ocorrências, para reduzir reidentificação.

## Requirements

### Requirement 1: Captura de eventos canônicos

**User Story:** Como responsável pelo produto, quero que o app registre os 6
eventos canônicos do funil automaticamente, para ter visibilidade de onde os
usuários avançam ou desistem.

#### Acceptance Criteria

1. THE sistema SHALL registrar os eventos: `signup`, `activation` (primeira
   aula), `lesson_completed` (aula completa), `paywall_hit` (tentativa de
   acessar recurso premium sem plano), `checkout_started` (clique em
   assinar/ir ao checkout) e `upgrade` (assinatura ativada).
2. THE captura de `upgrade` SHALL ocorrer no servidor, na própria
   `activate_subscription_from_intent` (fonte de verdade), não no cliente.
3. THE captura dos demais eventos (client-side) SHALL funcionar tanto para
   visitantes anônimos (antes do login) quanto para usuários autenticados.
4. WHEN um visitante anônimo depois se cadastra THEN o sistema SHALL permitir
   associar os eventos anteriores ao `user_id` pelo mesmo `session_id`
   (correlação), sem exigir isso como bloqueador desta onda se for complexo
   (pode ficar como consulta manual via `session_id`, declarado no design).

### Requirement 2: Escrita de eventos sem exposição de dados sensíveis

**User Story:** Como responsável pela plataforma, quero que a captura de
eventos não vaze dados pessoais nem vire uma porta de escrita arbitrária, para
manter os invariantes de segurança já estabelecidos.

#### Acceptance Criteria

1. THE tabela de eventos SHALL aceitar apenas INSERT de `anon`/`authenticated`
   (nunca SELECT/UPDATE/DELETE) — é uma caixa de entrada write-only do ponto
   de vista do cliente.
2. THE evento SHALL conter apenas: tipo (de uma lista fechada/CHECK),
   `session_id` (anônimo), `user_id` (nullable), `metadata` jsonb limitado
   (sem texto livre arbitrário de PII) e timestamp.
3. THE sistema NÃO SHALL aceitar nome, e-mail, telefone ou qualquer campo de
   texto livre não estruturado dentro de `metadata` — apenas chaves
   conhecidas e valores de tipos simples (string curta/enum, número, boolean).
4. THE leitura agregada (painel) SHALL ocorrer somente via RPC/edge function
   `SECURITY DEFINER` restrita a `teacher`/`manager`, nunca por leitura direta
   da tabela pelo cliente.

### Requirement 3: Painel de funil agregado em `/admin`

**User Story:** Como gestor/professor, quero ver um funil agregado de
conversão no painel administrativo, para entender a saúde do funil de vendas
sem acessar dados individuais de nenhum aluno.

#### Acceptance Criteria

1. THE painel SHALL exibir a contagem de cada etapa do funil num intervalo de
   tempo (ex.: últimos 30 dias) e a taxa de conversão entre etapas
   consecutivas.
2. THE painel NÃO SHALL exibir nome, e-mail, `user_id` ou qualquer dado
   nominal de nenhum visitante/aluno — apenas contagens agregadas.
3. THE painel SHALL aplicar a mesma regra de N mínimo (k-anon) já usada em
   `admin-dashboard`: se uma etapa tiver menos que o mínimo de ocorrências,
   o painel indica "amostra insuficiente" em vez do número exato.
4. THE acesso ao painel de funil SHALL ser restrito a `teacher`/`manager`
   (mesma proteção de `RequireRole` já usada na rota `/admin`).

### Requirement 4: Não regressão dos invariantes existentes

**User Story:** Como responsável pela plataforma, quero que a Onda 2 não
reabra nenhuma superfície já fechada nas ondas anteriores.

#### Acceptance Criteria

1. THE onda NÃO SHALL alterar `purchase_intents`, `notification_outbox`,
   `guardian_consent_events`, `_shared/crisis.ts`, nem o fluxo de pagamento.
2. THE onda SHALL seguir o padrão de auditoria já existente
   (`data_access_logs`) para o acesso ao painel agregado de funil.

## Fora de escopo nesta onda

- Correlação automática 100% confiável entre visitante anônimo e conta
  cadastrada (fingerprinting) — fora de escopo por privacidade; usa apenas
  `session_id` gerado no cliente, sem técnicas de fingerprinting.
- Dashboards de BI externos (Amplitude/Mixpanel/PostHog) — pode vir depois;
  esta onda é o alicerce interno (tabela + captura + painel simples).
- Segmentação por campanha/UTM avançada — pode ser adicionada depois como
  campos extras em `metadata`, mas não é objetivo desta onda.
