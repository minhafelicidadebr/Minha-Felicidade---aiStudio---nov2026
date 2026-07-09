# Mercado Pago — Runbook de Validação em Sandbox (Onda 1)

Passo-a-passo para validar o checkout antes do merge da `feat/onda-1-monetizacao`.
Cobre a Task 10 do spec (`.kiro/specs/onda-1-monetizacao/tasks.md`). Nada aqui é
verificável só com `npm run quality` — exige credenciais de teste e deploy.

## 0. Pré-requisitos

- Conta de **teste** do Mercado Pago (vendedor de teste + comprador de teste):
  https://www.mercadopago.com.br/developers/panel/test-users
- Credenciais de teste do app (`TEST-...`).
- Supabase CLI autenticado e projeto linkado.

## 1. Configurar secrets (painel Supabase/Lovable — nunca commitar)

```bash
# Access token de TESTE (começa com TEST-)
supabase secrets set MERCADO_PAGO_ACCESS_TOKEN=TEST-xxxxxxxx
# Segredo de assinatura do webhook (Painel MP > Webhooks > Assinatura secreta)
supabase secrets set MERCADO_PAGO_WEBHOOK_SECRET=xxxxxxxx
# URL pública do app (sem barra no final)
supabase secrets set PUBLIC_SITE_URL=https://SEU-DOMINIO
```

## 2. Deploy das edge functions

```bash
supabase functions deploy mp-create-preference
supabase functions deploy mp-webhook
```

Registre o `notification_url` no painel do MP apontando para:
`https://<PROJECT_REF>.supabase.co/functions/v1/mp-webhook`

## 3. Cenários de teste

Use os cartões de teste do MP (aprovado vs recusado):
https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/cards

### 3.1 Individual mensal (aprovado)
1. Logado como aluno free, em `/#planos` (aba Individual, Mensal) → "Assinar Agora" no Intermediário.
2. Pague com cartão **aprovado**.
3. Retorno em `/assinatura/sucesso` deve mostrar "processando" e virar "ativada" em segundos.
4. Verificar no banco:
```sql
select status, billing_interval, current_period_end, external_subscription_id
from user_subscriptions where user_id = '<UID>';
-- status='active', period ~ +1 mês
```

### 3.2 Individual anual (aprovado)
Igual ao 3.1 com o toggle **Anual**. Esperado: `billing_interval='yearly'`,
`current_period_end` ~ +1 ano, e o valor cobrado = `price_yearly` do plano.

### 3.3 Escolar (aprovado)
1. Na calculadora (`#calculadora`), ajuste alunos/escolas → "Contratar agora".
2. Preencha nome/e-mail → "Ir para pagamento" → cartão **aprovado**.
3. Se logado como gestor: verificar `organization_subscriptions` (plan advanced,
   `max_seats` = alunos). Se pré-cadastro (sem conta): `purchase_intents` com
   `status='approved'` e `user_id` nulo (associação é follow-up — ver runbook de segurança).

### 3.4 Pagamento recusado
Refaça 3.1 com cartão **recusado**. Esperado: retorno em `/assinatura/pendente`
(ou com `?status=rejected`) informando que nada foi cobrado; **nenhuma** alteração
em `user_subscriptions`. Confirmar:
```sql
select status, mp_payment_id from purchase_intents order by created_at desc limit 1;
-- status='rejected', nenhuma assinatura ativada
```

### 3.5 Idempotência (o teste que NÃO pode falhar — Requirement 3.3)
1. Após um pagamento aprovado (3.1), no painel do MP reenvie a MESMA notificação
   de webhook (ou dispare duas entregas do mesmo `payment_id`).
2. Esperado: a segunda chamada retorna `{ ok: true, reason: "already_processed" }`
   e **não** cria uma segunda linha nem estende o período de novo.
3. Confirmar que só existe uma ativação:
```sql
select count(*) from user_subscriptions where external_subscription_id = '<PAYMENT_ID>';
-- deve ser 1
select action, purpose, scope from data_access_logs
where purpose = 'mp_webhook_activation' order by created_at desc limit 5;
-- uma única entrada 'activated' para esse pagamento
```

## 4. Assinatura inválida (fail-closed)
Envie um POST ao `mp-webhook` sem header `x-signature` válido → deve responder
**401** e não escrever nada no banco.

## 5. Critério de aprovação
Todos os 5 cenários acima passam. Só então mergear o PR na `main`.
