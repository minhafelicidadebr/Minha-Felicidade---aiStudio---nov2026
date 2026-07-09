# Tasks — Onda 1: Monetização (Mercado Pago)

Convenção: trabalhe em uma branch nova (`feat/onda-1-monetizacao`), nunca
direto na `main`. Ao final de cada tarefa, o código deve compilar e os testes
existentes devem continuar verdes — não deixe a árvore quebrada entre tarefas.

- [x] 1. Migration: tabela `purchase_intents`
  - Criar `supabase/migrations/<timestamp>_purchase_intents.sql` com o schema
    do `design.md` (RLS ativado, sem policy de cliente, `REVOKE ALL FROM
    anon, authenticated`, índice único parcial em `mp_payment_id`).
  - Adicionar a migration na lista de `docs/security-invariants-runbook.md`.
  - _Requirements: 6.1, 6.3_

- [x] 2. Migration: RPC `activate_subscription_from_intent`
  - Implementar exatamente a lógica descrita em `design.md` (lock FOR UPDATE,
    idempotência por `mp_payment_id`, branch individual/escolar/pré-cadastro,
    log em `data_access_logs`).
  - `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` +
    `GRANT EXECUTE ... TO service_role`, com o comentário de verificação
    (`has_function_privilege`) no final do arquivo.
  - _Requirements: 1.3, 2.2, 3.3, 3.4, 6.1, 6.3_

- [x] 3. Função pura de precificação escolar
  - Ler `src/components/landing/SchoolCalculator.tsx` e `.lovable/plan.md`
    §1.4 antes de escrever qualquer número.
  - Implementar a tabela de faixas + descontos (volume/rede/anual/ONG) como
    função pura testável, com testes Vitest cobrindo cada faixa e cada
    combinação de desconto.
  - _Requirements: 2.1_

- [x] 4. Edge function `mp-create-preference`
  - Fluxo individual: exige JWT, resolve `user_id` do token, valida
    `plan_slug` contra `subscription_plans` ativo, preço lido do banco.
  - Fluxo escolar: aceita chamada sem JWT com `contact_email`/`contact_name`,
    preço calculado pela função da Task 3.
  - Cria `purchase_intents`, chama a API de preferências do Mercado Pago,
    grava `mp_preference_id`, retorna `checkout_url`.
  - Tratar erro de credencial do MP com mensagem clara (ver padrão do
    produto irmão descrito no `design.md`).
  - _Requirements: 1.1, 1.2, 2.1, 2.3, 4.1_

- [x] 5. Edge function `mp-webhook`
  - Verificação HMAC (`x-signature`/`x-request-id` contra
    `MERCADO_PAGO_WEBHOOK_SECRET`); 401 se ausente/inválida, sem escrever
    nada no banco antes de validar.
  - Busca o pagamento na API do MP pelo id recebido.
  - Chama `activate_subscription_from_intent`; ignora (200) notificações que
    não sejam de pagamento.
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. Cliente: `src/lib/checkout.ts`
  - `startIndividualCheckout(planSlug, billingInterval)`: se não houver
    sessão, redireciona para `/auth` preservando a intenção; senão invoca a
    edge function e navega para `checkout_url`.
  - `startEscolarCheckout(payload)`: invoca a edge function diretamente
    (sem exigir sessão).
  - _Requirements: 1.1, 1.2, 2.1, 2.3_

- [x] 7. Conectar UI existente ao checkout
  - `PricingSection.tsx` e `SubscriptionPage.tsx`: botão "Assinar Agora"
    chama `startIndividualCheckout` com o plano/intervalo selecionado em vez
    de só navegar.
  - `SchoolCalculator.tsx`: CTA de contratação chama `startEscolarCheckout`
    com os valores atuais da calculadora.
  - _Requirements: 1.1, 2.1_

- [x] 8. Páginas de retorno
  - `src/pages/SubscriptionSuccessPage.tsx` (rota `/assinatura/sucesso`) e
    `SubscriptionPendingPage.tsx` (rota `/assinatura/pendente`, cobre também
    `failure`): nunca afirmam "ativado" só pelo parâmetro de URL — chamam
    `get_my_plan()` e mostram estado "processando" com poucas tentativas de
    poll se o plano ainda não refletir a mudança.
  - Registrar as duas rotas em `App.tsx` (atrás de `RequireAuth`, como as
    demais rotas privadas).
  - _Requirements: 5.1, 5.2_

- [ ] 9. Documentação e secrets
  - Anotar em `docs/security-invariants-runbook.md` os dois secrets novos
    (`MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`) e o passo
    de configurá-los no painel do Supabase/Lovable Cloud (nunca commitados).
  - Anotar explicitamente no mesmo runbook que a v1 é cobrança única por
    ciclo (não recorrência automática) — ver "fora de escopo" em
    `requirements.md`.
  - _Requirements: (documentação — sem requirement numérico)_

- [ ] 10. Gate final
  - Rodar `npm run quality` completo.
  - Testar manualmente em sandbox (`MERCADO_PAGO_ACCESS_TOKEN` do tipo
    `TEST-...`): checkout individual mensal, checkout individual anual,
    checkout escolar, um pagamento aprovado e um recusado no simulador do MP,
    reenviar a mesma notificação de webhook duas vezes e confirmar que a
    assinatura não duplica (Requirement 3.3).
  - _Requirements: todas_
