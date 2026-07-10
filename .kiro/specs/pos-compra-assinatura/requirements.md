# Requirements Document

## Introduction

A Onda 1 ligou o faturamento (checkout Mercado Pago + ativação via webhook). Mas
o **ciclo de vida da assinatura** e a **experiência de gestão de conta** ficaram
descobertos — lacuna identificada em produção pelo founder:

- Nenhum e-mail do próprio produto após a compra (o Mercado Pago manda o recibo
  dele; o app não manda boas-vindas nem orientação).
- Nenhum aviso antes da renovação, nem em caso de falha de pagamento.
- Gestão de assinatura self-service inexistente ("contate o suporte").

Já entregue como ganhos rápidos (fora deste spec): CTA de plano no navbar, card
de plano no dashboard, recursos por plano na página de assinatura. Este spec
cobre o que **depende de infraestrutura** (e-mail) e o ciclo de vida.

## Glossary

- **Outbox**: tabela-fila de notificações a enviar (transactional outbox),
  desacopla a ativação do envio de e-mail.
- **dedupe_key**: chave única por evento que garante idempotência de envio.
- **Dunning**: sequência de avisos em caso de pagamento não concluído.
- **Entitlements**: `features`/`limits` (JSONB) que definem o que o plano libera.
- **Resend**: provedor de e-mail transacional (padrão da constelação).

## Requirements

### Requirement 1: E-mail de boas-vindas / confirmação da assinatura

**User Story:** Como assinante recém-pago, quero receber um e-mail do Instituto
confirmando minha assinatura e orientando os próximos passos, para saber o que
foi desbloqueado e como começar.

#### Acceptance Criteria

1. WHEN o webhook confirma um pagamento aprovado e ativa a assinatura THEN o
   sistema SHALL enviar um e-mail transacional de boas-vindas ao endereço do
   assinante, disparado no servidor (nunca pelo cliente).
2. THE e-mail SHALL conter: plano contratado, intervalo (mensal/anual), data da
   próxima renovação, resumo do que foi desbloqueado, e link para o app.
3. IF o envio de e-mail falhar THEN o sistema SHALL registrar a falha sem
   reverter a ativação da assinatura (a ativação é a fonte de verdade; o e-mail
   é best-effort, não bloqueante).
4. THE e-mail SHALL ser idempotente por evento de ativação — a reentrega da
   mesma notificação do Mercado Pago NÃO SHALL disparar múltiplos e-mails.

### Requirement 2: Lembrete de renovação

**User Story:** Como assinante, quero ser avisado antes da minha assinatura
vencer, para decidir se quero renovar sem perder acesso por esquecimento.

#### Acceptance Criteria

1. WHEN faltarem N dias (config., ex.: 3) para `current_period_end` de uma
   assinatura ativa THEN o sistema SHALL enviar um e-mail lembrando a renovação
   (v1: cobrança única por ciclo — o lembrete orienta a renovar via novo
   checkout, coerente com o "fora de escopo" da Onda 1).
2. THE lembrete SHALL ser enviado no máximo uma vez por ciclo por assinatura.

### Requirement 3: Falha/expiração de pagamento (dunning leve)

**User Story:** Como assinante cujo pagamento não concluiu, quero ser informado
do que aconteceu e de como tentar de novo, para não ficar sem entender o estado.

#### Acceptance Criteria

1. WHEN o webhook recebe um pagamento `rejected` para uma intent THEN o sistema
   SHALL (opcional, se houver e-mail de contato) enviar um e-mail informando que
   o pagamento não foi concluído e como tentar novamente, sem afirmar cobrança.
2. WHEN uma assinatura ativa ultrapassa `current_period_end` sem renovação THEN
   o sistema SHALL marcar o estado como `expired` e refletir isso no app
   (via `get_my_plan`), rebaixando o acesso ao plano gratuito.

### Requirement 4: Gestão de assinatura self-service

**User Story:** Como assinante, quero ver e gerenciar minha assinatura dentro do
app, para entender meu plano e cancelar/mudar sem depender de e-mail ao suporte.

#### Acceptance Criteria

1. THE página de assinatura SHALL exibir de forma clara: plano atual, status,
   intervalo, data de renovação e o que está incluído.
2. THE sistema SHALL permitir ao assinante solicitar cancelamento
   (v1 aceitável: marca `cancel_at_period_end = true` via RPC self-scoped, sem
   novo débito no fim do ciclo; NÃO exige reembolso automático).
3. THE ação de cancelamento SHALL passar por uma RPC `SECURITY DEFINER`
   self-scoped (o usuário só altera a própria assinatura) — nunca por escrita
   direta do cliente na tabela.

### Requirement 5: Descoberta de recursos pós-compra (feature discovery)

**User Story:** Como assinante que acabou de pagar, quero ver o que desbloqueei,
para chegar rápido ao valor que motivou a compra.

#### Acceptance Criteria

1. WHEN um usuário passa a ser premium THEN o app SHALL destacar, ao menos uma
   vez, os recursos recém-desbloqueados (ex.: banner/tour no dashboard),
   levando o usuário ao valor que acabou de pagar.

### Requirement 6: Preservar invariantes de segurança e honestidade

**User Story:** Como responsável pela plataforma, quero que o pós-compra respeite
os mesmos invariantes de segurança e honestidade das ondas anteriores, para não
introduzir riscos nem promessas falsas.

#### Acceptance Criteria

1. THE envio de e-mail e a marcação de estado SHALL ocorrer no servidor
   (edge functions / RPCs `SECURITY DEFINER`), nunca no cliente.
2. THE segredo do provedor de e-mail (Resend) SHALL ser secret de servidor,
   nunca commitado nem exposto ao cliente.
3. THE cópia dos e-mails NÃO SHALL prometer conformidade legal nem cobrança
   recorrente automática (v1 é cobrança única por ciclo — doutrina §1).

### Requirement 7: Histórico de faturas e pagamentos

**User Story:** Como assinante, quero ver meu histórico de pagamentos dentro do
app, para acompanhar o que paguei, quando e com que status, sem depender do
suporte ou do painel do provedor.

#### Acceptance Criteria

1. THE página de assinatura SHALL exibir uma seção "Faturas e pagamentos" que
   lista os pagamentos do próprio usuário (data, plano, valor, intervalo,
   status).
2. THE leitura SHALL ocorrer via RPC `SECURITY DEFINER` self-scoped, que retorna
   apenas os pagamentos do `auth.uid()` — o cliente NUNCA SHALL ler
   `purchase_intents` diretamente (a tabela é service_role-only por design).
3. THE lista SHALL expor somente os campos necessários (data, plano, valor,
   intervalo, status e um identificador de referência do pagamento), sem dados
   de terceiros nem campos internos desnecessários.
4. IF o usuário não tiver pagamentos THEN o sistema SHALL exibir um estado vazio
   claro ("nenhum pagamento ainda").

### Requirement 8: Escopo e alinhamento (fora de escopo declarado)

**User Story:** Como founder, quero que esta onda tenha escopo enxuto e alinhado
ao roadmap, para não inflar entregas nem antecipar o que ainda não tem demanda.

#### Acceptance Criteria

1. THE onda NÃO SHALL implementar recorrência automática nativa (preapproval do
   Mercado Pago), reembolso self-service automatizado, portal de notas fiscais,
   nem SSO/identidade única multi-app ("Conta Felicidade" — Parte C do roadmap).
2. THE implementação SHALL reaproveitar a infra de e-mail Resend prevista na
   Onda 3 e o schema de entitlements `features`/`limits` já existente, e SHALL
   alimentar os eventos de funil da Onda 2 (`upgrade`, `renewal`, `churn`).
