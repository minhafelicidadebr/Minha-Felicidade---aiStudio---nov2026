# Design Document

Associação organização↔conta no fluxo escolar pré-cadastro — abordagem A (match por e-mail confirmado)

## Overview

Uma RPC `SECURITY DEFINER` self-scoped (`claim_escolar_subscription`) permite ao
gestor autenticado reivindicar uma intent escolar paga (`approved`, `user_id`
nulo) cujo `contact_email` corresponde ao **e-mail confirmado** da sua conta.
Ao reivindicar, a RPC cria a `organization_subscriptions`, concede o papel
`manager` e marca a intent como associada. Segurança por construção: o e-mail é
lido de `auth.users` (nunca do cliente) e precisa estar confirmado.

## Architecture

```text
Gestor autenticado (SubscriptionPage)
  └─ botão "Associar assinatura escolar paga"
       └─ supabase.rpc("claim_escolar_subscription")   [self-service]
            └─ RPC SECURITY DEFINER (roda como owner):
               1. auth.uid() obrigatório
               2. lê email + email_confirmed_at de auth.users (do próprio uid)
               3. exige email_confirmed_at IS NOT NULL
               4. acha intent escolar approved, user_id NULL,
                  lower(contact_email) = lower(email)
               5. se nenhuma -> {ok:false, reason:'no_claimable_intent'}
               6. cria organization_subscriptions (owner=uid, seats, intervalo)
               7. concede role 'manager' (ON CONFLICT DO NOTHING)
               8. marca intent.user_id = uid (idempotência)
               9. loga em data_access_logs
  └─ ao ok: refetch get_my_plan (o plano passa a 'organization')
```

## Components and Interfaces

### RPC `claim_escolar_subscription()` (migration nova)
- `SECURITY DEFINER`, `SET search_path = public`, `EXECUTE` só `authenticated`.
- Retorna `jsonb`: `{ok:true, reason:'associated', org_name}` ou
  `{ok:false, reason:'no_claimable_intent'|'email_unconfirmed'}`.
- Idempotência: se o usuário já tem `organization_subscriptions`, não duplica;
  se a intent já foi associada (`user_id` preenchido), não é reencontrada.

### Cliente `src/lib/claim-escolar.ts`
- `claimEscolarSubscription(): Promise<{ ok: boolean; reason: string; org_name?: string }>`
  — invoca a RPC (cast `as never`, mesmo padrão de `get_my_payment_history`),
  nunca envia e-mail no corpo. Best-effort de UX (trata erro sem quebrar).

### UI `SubscriptionPage.tsx`
- Card "Assinatura escolar paga antes do cadastro?" com botão "Associar agora".
  Ao sucesso: toast + `refetch()` do plano. Ao `no_claimable_intent`: mensagem
  clara "nenhuma assinatura escolar encontrada para o seu e-mail". Ao
  `email_unconfirmed`: instrui a confirmar o e-mail primeiro.

## Data Models

Sem tabela nova. Usa `purchase_intents` (lida/escrita só dentro da RPC),
`organization_subscriptions` (criada só pela RPC), `user_roles` (grant manager
via `ON CONFLICT (user_id, role) DO NOTHING`), `auth.users` (e-mail confirmado).

Contrato da RPC: `claim_escolar_subscription() RETURNS jsonb`. Sem argumentos —
tudo é resolvido do `auth.uid()`.

## Correctness Properties

### Property 1: E-mail confirmado obrigatório
A RPC não associa nada se `email_confirmed_at IS NULL` para o `auth.uid()`.
**Validates: Requirements 2.1, 2.2**

### Property 2: Match só do próprio e-mail
O `contact_email` é comparado apenas com o e-mail do `auth.uid()` lido de
`auth.users`; nenhum e-mail vindo do cliente participa da decisão.
**Validates: Requirements 2.1, 2.2**

### Property 3: Só intents escolares aprovadas e não associadas
Só associa `kind='escolar'` + `status='approved'` + `user_id IS NULL`; nunca
individuais, pendentes, rejeitadas ou já associadas.
**Validates: Requirements 2.3**

### Property 4: Idempotência
Chamar de novo após associar não cria segunda `organization_subscriptions` nem
duplica assentos nem concede o papel duas vezes.
**Validates: Requirements 2.4**

### Property 5: Papel concedido só no servidor
O papel `manager` é concedido dentro da RPC `SECURITY DEFINER`, nunca por
escrita do cliente em `user_roles`.
**Validates: Requirements 3.1, 3.2**

## Error Handling

- Sem sessão → a RPC levanta `Authentication required` (28000); a UI mostra
  necessidade de login.
- E-mail não confirmado → `{ok:false, reason:'email_unconfirmed'}`; UI instrui.
- Nenhuma intent elegível → `{ok:false, reason:'no_claimable_intent'}`; UI
  informa sem erro assustador.
- Migration não aplicada no Lovable → a RPC não existe → a chamada falha; a UI
  trata como "não foi possível associar agora" (nada é ativado — fail-safe).

## Testing Strategy

- Client (Vitest): `claim-escolar.ts` mapeia a resposta da RPC para
  `{ok, reason, org_name}` e nunca lança (mock do client Supabase).
- Manual (pós-migration no Lovable): pagar escolar pré-cadastro (sandbox) →
  cadastrar com o mesmo e-mail (confirmado) → associar → plano vira
  'organization'; repetir o claim não duplica; e-mail não confirmado bloqueia.
- `npm run quality` verde a cada tarefa.

## Abordagem B (implementada) — claim por token

Complementa A para o caso de e-mail diferente do checkout. `purchase_intents`
ganha `claim_token` (uuid); a RPC `claim_escolar_with_token(_token)` associa a
intent paga a quem apresenta o código (o token é a prova de compra, entregue ao
`contact_email`). O `mp-webhook` enfileira o e-mail `escolar_claim` com o token
após a ativação pré-cadastro (idempotente por dedupe). Templates em ambos os
`email-templates.ts` (espelho 1:1). **Entrega depende do Resend** (secret
pendente): sem ele o e-mail fica enfileirado (degradação graciosa). A RPC de
pagamento NÃO é tocada — o enqueue vive no webhook.

## Fora de escopo / follow-up

- Endurecimento por IP/captcha; convite/gestão de assentos de alunos.
