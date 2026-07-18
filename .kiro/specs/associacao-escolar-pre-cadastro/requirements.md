# Requirements Document

Associação organização↔conta no fluxo escolar pré-cadastro (Req 2.3 da Onda 1)

## Introduction

Na Onda 1, o gestor escolar pode iniciar e pagar um checkout **sem ter conta**
(`kind='escolar'`, `contact_email`/`contact_name` preenchidos). Quando o
pagamento é aprovado, `activate_subscription_from_intent` marca a
`purchase_intents` como `approved` mas **não cria** `organization_subscriptions`
(não há `owner_id`). Hoje a associação organização↔conta, depois que o gestor
se cadastra, **não está implementada** — o pagamento fica rastreável em
`purchase_intents` (status `approved`, `user_id` nulo) apenas para
reconciliação manual (documentado como pendência, não como recurso).

Esta spec fecha essa lacuna com um caminho de **reivindicação (claim)**
seguro: depois que o gestor cria conta (ou faz login) com o mesmo e-mail do
checkout, ele pode associar a assinatura escolar paga à sua conta, ativando a
`organization_subscriptions` correspondente — sem reabrir nenhum invariante de
segurança (preço/estado sempre resolvidos no servidor; nunca confiar no cliente).

**Decisão de segurança (resolvida): abordagem A — match por e-mail, seguro por
construção.** Em vez de depender da configuração global de confirmação de
e-mail do projeto, a RPC de claim exige que o e-mail do próprio chamador esteja
confirmado (`auth.users.email_confirmed_at IS NOT NULL`) antes de casar com o
`contact_email` da intent. Assim, mesmo que o projeto permita sessão sem
confirmação, o claim só ocorre para quem comprovadamente controla o e-mail. A
abordagem B (token enviado ao `contact_email` no checkout) fica registrada como
hardening futuro — útil quando o gestor quiser reivindicar com um e-mail
diferente do usado no checkout.

## Glossary

- **Intent escolar pré-cadastro**: linha em `purchase_intents` com
  `kind='escolar'`, `status='approved'`, `user_id IS NULL`, `contact_email`
  preenchido.
- **Claim (reivindicação)**: ato de o gestor autenticado associar essa intent
  paga à sua conta, criando a `organization_subscriptions`.
- **E-mail verificado**: e-mail do `auth.users` do chamador — o Supabase Auth
  só entrega sessão a quem controla o e-mail (login/confirmação), logo é a base
  de confiança para o match.

## Requirements

### Requirement 1: Reivindicar assinatura escolar paga após o cadastro

**User Story:** Como gestor escolar que pagou antes de ter conta, quero associar
a assinatura paga à minha conta recém-criada, para que minha organização fique
ativa sem depender de suporte manual.

#### Acceptance Criteria

1. WHEN um usuário autenticado tem uma intent escolar `approved` com
   `user_id IS NULL` e `contact_email` igual ao e-mail verificado da sua conta
   THEN o sistema SHALL permitir associar essa intent à conta, criando a
   `organization_subscriptions` com os assentos (`max_seats`) e o intervalo da
   intent.
2. WHEN a associação é concluída THEN o sistema SHALL marcar a intent como
   associada (preencher `user_id`) para não ser reivindicada novamente.
3. IF não houver nenhuma intent escolar elegível para o e-mail do usuário THEN
   o sistema SHALL informar isso claramente, sem erro assustador e sem criar
   nada.

### Requirement 2: Segurança do match (nunca confiar no cliente)

**User Story:** Como responsável pela plataforma, quero que a reivindicação não
permita a ninguém assumir uma organização que não é sua, para manter os
invariantes de segurança.

#### Acceptance Criteria

1. THE associação SHALL ocorrer exclusivamente via RPC `SECURITY DEFINER`
   self-scoped, que resolve o e-mail do chamador a partir de `auth.users`
   (nunca de um parâmetro enviado pelo cliente).
2. THE match entre intent e conta SHALL ser feito por igualdade
   (case-insensitive) entre `purchase_intents.contact_email` e o e-mail
   verificado do `auth.uid()` — nunca por `contact_email` vindo do corpo da
   requisição.
2a. THE RPC SHALL exigir que o e-mail do chamador esteja confirmado
   (`auth.users.email_confirmed_at IS NOT NULL`) antes de qualquer associação;
   caso contrário, não associa (segurança por construção, independente da
   configuração global de confirmação de e-mail).
3. THE RPC SHALL associar somente intents `kind='escolar'`, `status='approved'`
   e `user_id IS NULL`; nunca tocar intents individuais, pendentes, rejeitadas
   ou já associadas.
4. THE RPC SHALL ser idempotente: chamada novamente após uma associação
   bem-sucedida não cria uma segunda `organization_subscriptions` nem duplica
   assentos.
5. THE ação SHALL ser registrada em `data_access_logs`.

### Requirement 3: Papel e acesso do gestor

**User Story:** Como gestor que associou a organização, quero poder acessar as
funções de organização, para gerir a assinatura da escola.

#### Acceptance Criteria

1. WHEN a associação cria a `organization_subscriptions` THEN o sistema SHALL
   garantir que o usuário tenha o papel adequado para gerir a organização
   (decisão do design: conceder `manager` ao `owner_id`), **sem** conceder
   papéis a partir de entrada do cliente.
2. THE concessão de papel SHALL ocorrer dentro da mesma RPC `SECURITY DEFINER`
   (servidor), nunca por escrita direta do cliente em `user_roles`.

### Requirement 4: Preservar invariantes existentes

**User Story:** Como responsável pela plataforma, quero que fechar a lacuna de
associação não reabra nenhuma superfície já protegida, para não introduzir
regressão de segurança.

#### Acceptance Criteria

1. THE spec SHALL manter `purchase_intents` service_role-only (a leitura/escrita
   para o claim acontece dentro da RPC `SECURITY DEFINER`, não por policy de
   cliente).
2. THE spec SHALL NOT alterar `activate_subscription_from_intent`,
   `_shared/crisis.ts`, `guardian_consent_events`, `ai_usage_limits` nem o preço
   (que já foi resolvido e cobrado na Onda 1).
3. THE `organization_subscriptions` SHALL continuar sem policy de INSERT/UPDATE
   para `authenticated` — a criação passa só pela RPC do claim.
4. `npm run quality` SHALL permanecer verde; migration nova entra no runbook.

## Fora de escopo

- Transferência de propriedade da organização entre contas.
- Reconciliação em massa de intents antigas (script administrativo).
- Fluxo de convite de membros/assentos para alunos (é uma trilha própria).
