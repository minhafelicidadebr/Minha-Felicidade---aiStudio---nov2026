# Requirements Document

Consentimento de contas legadas (data de nascimento ausente)

## Introduction

O Delta 1 (`fix(consent): fail closed when guardian status is unverifiable`,
PR #1, já em `main`) fechou uma falha P0: o gate de consentimento parental
(`RequireGuardianConsent`) agora falha FECHADO quando não consegue estabelecer
com segurança o estado de consentimento. Uma das situações que passou a falhar
fechado é `reason = "unknown_birth_date"` — contas cuja `profiles.birth_date`
é `NULL`.

Essas contas existem porque `birth_date` só passou a ser capturada na migration
`20260706194000_guardian_consent_ledger.sql`. Toda conta criada **antes** dessa
migration tem `birth_date` nula. Hoje não há nenhum caminho self-service para
preencher essa data depois do cadastro (o `AuthPage` só a coleta no signup; o
`ProfilePage` não a edita; não existe RPC self-scoped para gravá-la).

Consequência: essas contas legadas — que podem incluir **adultos e staff**
(teacher/manager) — ficam presas na tela de recuperação `error_locked`, sem
saída, porque "tentar novamente" não muda uma data que continua ausente.

Esta spec resolve a lacuna **sem reabrir o fail-open**: em vez de liberar
acesso a uma idade indeterminada, o sistema oferece um caminho honesto e
self-service para a pessoa informar sua data de nascimento uma única vez,
roteando em seguida para o estado correto (adulto liberado; menor para o fluxo
de consentimento do responsável já existente).

## Glossary

- **Conta legada**: conta cuja `profiles.birth_date` é `NULL` (criada antes da
  captura de data de nascimento).
- **`unknown_birth_date`**: `reason` retornado por
  `get_my_guardian_consent_status` quando `birth_date` é nula.
- **Fail-closed**: postura de segurança em que a incerteza nunca libera acesso
  privado (invariante estabelecido no Delta 1).
- **Backfill self-service**: a própria pessoa autenticada informa sua data de
  nascimento uma vez, para uma conta que ainda não a tem.

## Requirements

### Requirement 1: Contas legadas não podem ficar permanentemente presas

**User Story:** Como usuário de uma conta antiga (criada antes da captura de
data de nascimento), quero um caminho claro para regularizar minha conta,
para não ficar travado numa tela de erro sem saída.

#### Acceptance Criteria

1. WHEN um usuário autenticado com `birth_date` nula acessa uma rota privada
   THEN o sistema SHALL apresentar um caminho de ação para informar a data de
   nascimento, em vez de uma tela de erro terminal (`error_locked`).
2. THE caminho de regularização SHALL ser self-service (sem depender de
   suporte manual) para o caso padrão.
3. WHEN o usuário informa uma data de nascimento válida THEN o sistema SHALL
   reavaliar o estado de consentimento e rotear conforme o Requirement 3.

### Requirement 2: Não reabrir o fail-open

**User Story:** Como responsável pela segurança da plataforma, quero que a
regularização de contas legadas não recrie a brecha que o Delta 1 fechou,
para que nenhuma idade indeterminada resulte em acesso liberado.

#### Acceptance Criteria

1. WHILE a `birth_date` de uma conta permanecer nula THE sistema SHALL NOT
   renderizar conteúdo de rota privada para essa conta.
2. THE erro/timeout/sessão inválida/payload indeterminado SHALL continuar
   caindo em fail-closed exatamente como no Delta 1 — esta spec só trata o
   caso especificamente identificável `unknown_birth_date`, não relaxa os
   demais.
3. THE decisão do gate SHALL permanecer centralizada na função pura
   `decideGuardianConsentGate` (ou evolução dela), mantida testável.

### Requirement 3: Roteamento correto após informar a data

**User Story:** Como usuário que acabou de informar minha data de nascimento,
quero ser encaminhado ao lugar certo conforme minha idade, para acessar o
produto (adulto) ou concluir a autorização do responsável (menor).

#### Acceptance Criteria

1. WHEN a data informada indica 18 anos ou mais THEN o sistema SHALL passar a
   liberar as rotas privadas normalmente (estado `clear`).
2. WHEN a data informada indica menor de 18 anos THEN o sistema SHALL
   encaminhar ao fluxo de consentimento do responsável já existente
   (`/consentimento-responsavel`), sem duplicar esse fluxo.
3. THE data de nascimento informada SHALL ser validada (data passada
   plausível, < 120 anos) com as mesmas regras já usadas no cadastro
   (`isValidPastDate`).

### Requirement 4: Escrita segura da data de nascimento (nunca confiar no cliente além do inevitável)

**User Story:** Como responsável pela plataforma, quero que a gravação da data
de nascimento respeite os invariantes de segurança, para não abrir uma porta
de escrita arbitrária no perfil.

#### Acceptance Criteria

1. THE gravação da `birth_date` SHALL ocorrer via RPC `SECURITY DEFINER`
   self-scoped (apenas o `auth.uid()` do chamador), nunca por escrita direta
   do cliente na tabela `profiles`.
2. THE RPC SHALL permitir gravar a data apenas quando a `birth_date` atual for
   nula (preenchimento único), evitando reescritas repetidas para burlar o
   gate; alteração de uma data já existente fica fora deste fluxo.
3. THE RPC SHALL seguir a doutrina de funções `SECURITY DEFINER`:
   `SET search_path = public`, `REVOKE EXECUTE ... FROM PUBLIC, anon`,
   `GRANT EXECUTE ... TO authenticated`, com a query de verificação
   (`has_function_privilege`) comentada.
4. THE ação SHALL ser registrada em `data_access_logs`, seguindo o padrão de
   auditoria já usado pelas demais RPCs de consentimento.

_Observação de honestidade (não overclaim):_ a data de nascimento é, por
natureza, auto-declarada — já era assim no cadastro (`raw_user_meta_data`).
Esta spec não promete verificação de idade forte; apenas fecha o buraco de
contas sem nenhuma data, mantendo o mesmo nível de confiança do signup.

### Requirement 5: Preservar invariantes e sistemas existentes

**User Story:** Como responsável pela plataforma, quero que esta correção não
toque nos sistemas críticos já estabilizados, para não introduzir regressão.

#### Acceptance Criteria

1. THE spec SHALL NOT alterar `_shared/crisis.ts`, o ledger
   `guardian_consent_events` (permanece INSERT-only, sem UPDATE/DELETE), o
   fluxo de pagamento/checkout, nem `ai_usage_limits`.
2. THE ledger de consentimento SHALL continuar imutável: nenhum UPDATE/DELETE
   é introduzido; a data de nascimento vive em `profiles`, não no ledger.
3. IF uma migration nova for necessária THEN ela SHALL seguir a numeração e a
   ordem do `docs/security-invariants-runbook.md`, ser idempotente quando
   possível, e ser adicionada ao fim do runbook.
4. THE `npm run quality` SHALL permanecer verde ao fim de cada tarefa da
   implementação, incluindo o `security:gate`.

## Fora de escopo

- Verificação de idade forte (age assurance) ou confirmação independente do
  responsável por canal externo — é uma trilha maior (ver Onda 0 do plano
  estratégico), não este follow-up.
- Edição livre de `birth_date` já preenchida (correção de erro de digitação) —
  este fluxo trata apenas o preenchimento único de contas sem data; alteração
  posterior fica para um fluxo de perfil dedicado.
- Backfill em massa por script administrativo — pode ser um complemento
  futuro; o foco aqui é o caminho self-service que desbloqueia o usuário.

## Questão em aberto para decisão no design

- **Onde apresentar o pedido da data**: (a) transformar o estado
  `unknown_birth_date` numa rota dedicada de "complete seu cadastro" (análoga a
  `/consentimento-responsavel`), ou (b) reaproveitar a página de consentimento
  existente adicionando um passo de data quando ela estiver ausente. A decisão
  fica para o `design.md`, ponderando reaproveitamento vs. clareza de fluxo.
