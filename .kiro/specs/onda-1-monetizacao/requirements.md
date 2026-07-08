# Requirements — Onda 1: Monetização (Mercado Pago)

## Contexto

Hoje nenhum botão de "Assinar" no produto liga a faturamento real — todos
apenas navegam para outra tela. Esta onda conecta o funil de preços já
desenhado na UI (`PricingSection.tsx`, `SchoolCalculator.tsx`,
`SubscriptionPage.tsx`) a um checkout real via Mercado Pago, ativando
`user_subscriptions`/`organization_subscriptions` de forma segura.

## Requirement 1 — Checkout individual (Intermediário/Avançado, mensal/anual)

**User story:** Como aluno no plano gratuito, quero assinar um plano pago
mensal ou anual, para desbloquear os recursos premium.

**Acceptance criteria:**
1. WHEN um aluno autenticado escolhe um plano pago e um intervalo (mensal ou
   anual) THEN o sistema SHALL calcular o preço lendo `subscription_plans`
   no servidor (nunca aceitar preço vindo do cliente) e criar uma preferência
   de checkout no Mercado Pago.
2. WHEN o aluno não está autenticado e tenta assinar THEN o sistema SHALL
   redirecionar para `/auth` preservando a intenção (plano + intervalo) para
   retomar o checkout após o login/cadastro.
3. WHEN o pagamento é confirmado como aprovado pelo webhook do Mercado Pago
   (nunca pelo simples retorno de navegador) THEN o sistema SHALL ativar ou
   atualizar `user_subscriptions` do usuário com o plano, intervalo e
   `current_period_end` corretos.
4. IF o aluno fechar o checkout sem concluir o pagamento THEN o sistema
   SHALL manter o plano atual sem nenhuma alteração de estado.

## Requirement 2 — Checkout escolar/B2B via calculadora

**User story:** Como gestor escolar, quero contratar o Plano Escolar
calculado pela calculadora (alunos, escolas da rede, mensal/anual), para meus
alunos acessarem o plano Avançado via `organization_subscriptions`.

**Acceptance criteria:**
1. WHEN um gestor preenche a calculadora e escolhe contratar THEN o sistema
   SHALL recalcular o preço no servidor usando a MESMA tabela de faixas e
   descontos que a calculadora exibe no cliente (nunca aceitar o total
   mostrado no cliente como valor de cobrança).
2. WHEN o pagamento escolar é aprovado THEN o sistema SHALL criar ou
   atualizar `organization_subscriptions` com `max_seats` correspondente ao
   número de alunos contratado.
3. IF o gestor ainda não tem conta THEN o sistema SHALL permitir iniciar o
   checkout mesmo assim (captura de e-mail/nome da escola), associando a
   organização à conta assim que o gestor completar o cadastro.

## Requirement 3 — Webhook verificado e idempotente

**Acceptance criteria:**
1. WHEN o Mercado Pago envia uma notificação THEN o sistema SHALL verificar
   a assinatura HMAC (`x-signature` + `x-request-id` contra
   `MERCADO_PAGO_WEBHOOK_SECRET`) antes de processar qualquer dado.
2. IF a assinatura for inválida ou o segredo não estiver configurado THEN o
   sistema SHALL responder 401 e não escrever nada no banco.
3. WHEN a mesma notificação de pagamento for entregue mais de uma vez
   (reentrega padrão do Mercado Pago) THEN o sistema SHALL processá-la de
   forma idempotente — nunca ativar a assinatura duas vezes nem sobrescrever
   um estado mais novo com um evento mais antigo.
4. WHEN o pagamento é `rejected` ou permanece `pending`/`in_process` THEN o
   sistema SHALL registrar o estado sem ativar nenhuma assinatura.

## Requirement 4 — Nunca confiar no cliente

**Acceptance criteria:**
1. THE SYSTEM SHALL sempre derivar preço, `plan_slug`, `org_id` e `user_id`
   a partir de dados já persistidos no servidor (banco de dados ou sessão
   autenticada) — nunca aceitar esses valores diretamente de um payload do
   cliente sem cruzar com uma fonte de verdade no servidor.

## Requirement 5 — Páginas de retorno honestas

**Acceptance criteria:**
1. WHEN o Mercado Pago redireciona o navegador de volta (aprovado, pendente
   ou recusado) THEN o sistema SHALL exibir uma página de retorno que NUNCA
   afirma "assinatura ativada" apenas com base no parâmetro de URL — a
   confirmação definitiva vem do webhook (Requirement 1.3), que pode chegar
   alguns segundos depois do redirecionamento.
2. A página de retorno de sucesso SHALL orientar o usuário a continuar
   (ex.: ir para o dashboard) e indicar que o plano será refletido em
   instantes, com um estado de "processando" caso `get_my_plan()` ainda não
   reflita o novo plano no primeiro carregamento.

## Requirement 6 — Preservar invariantes de segurança existentes

**Acceptance criteria:**
1. THE SYSTEM SHALL manter `user_subscriptions` e `organization_subscriptions`
   sem policy de `INSERT`/`UPDATE` para `authenticated` — toda ativação
   passa exclusivamente pela RPC `SECURITY DEFINER` desta onda, chamada pela
   edge function do webhook com a service role key.
2. THE SYSTEM SHALL NOT modificar `guardian_consent_events`,
   `supabase/functions/_shared/crisis.ts`, `ai_usage_limits`, ou qualquer
   RPC `get_my_*` existente.
3. Toda função `SECURITY DEFINER` nova SHALL revogar `EXECUTE` de `PUBLIC`,
   `anon` e `authenticated`, concedendo apenas ao papel estritamente
   necessário (`service_role` para a RPC de ativação).

## Fora de escopo nesta onda (documentar, não fingir)

- Cobrança recorrente automática nativa (API de "preapproval" do Mercado
  Pago). V1 é cobrança única por ciclo contratado; renovação é um novo
  checkout. Documentar isso explicitamente no código/README, não implicar
  que é recorrente.
- Cupom/desconto promocional avulso.
- Reembolso/cancelamento self-service (hoje já é "contate o suporte" em
  `SubscriptionPage.tsx` — permanece assim).
