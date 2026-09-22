# TRUST-1.6 — GATE: VERIFIABLE GUARDIAN CONSENT EVIDENCE CHAIN

**Status:** ✅ gate local aprovado. Produção intocada.

Sem secrets, credenciais ou dados pessoais.

## R06 — consentimento parental auto-declarado

**Before.** A única forma de conceder consentimento parental era
`record_guardian_consent(guardian_name, guardian_email, ...)`, chamada na
própria sessão do estudante, com `guardian_name`/`guardian_email` digitados
livremente pelo chamador. Não existia canal separado de verificação, não
existia página distinta para o responsável, não existia versionamento de
política aplicado no servidor, não existia revogação.

**Attack (RED).** Reproduzido manualmente contra Postgres local, antes de
qualquer correção: um estudante autenticado chamou `record_guardian_consent`
com um responsável inteiramente fabricado (`'Fake Guardian'`,
`'fake@example.invalid'`) e a RPC devolveu `granted = true`. Nenhuma
verificação de posse de e-mail, nenhuma confirmação independente, nenhum
registro de que o "responsável" nunca recebeu nem viu nada.

**Fix.** Modelo de request/token/decisão de canal separado (detalhado nas
seções abaixo): o estudante só pode **solicitar** consentimento
(`create_guardian_consent_request`); a **decisão** (`decide_guardian_consent`)
só pode ser tomada por quem possui o token entregue ao e-mail declarado,
numa página sem sessão de estudante (`GuardianDecisionPage`, rota
`/autorizacao-responsavel`, fora de `RequireAuth`). `record_guardian_consent`
permanece intocada no banco (linhas antigas, imutáveis) mas nenhum código de
aplicação a chama mais — confirmado por guard estático.

**Evidence.** `src/lib/guardian-consent-runtime-contract.test.ts` (35 testes)
+ `src/lib/trust1-6-static-guards.test.ts` (7 testes).

**Status.** ✅ **CLOSED.**

## Baseline

- Branch: `trust-1.6-verifiable-guardian-consent`, criada a partir de
  `origin/main` (`991211ca3b31e3050b34d885b1f9bf2e7db4001` — merge da
  PR TRUST-1.4).
- Nenhuma sincronização adicional necessária no início da onda (verificação
  final de drift a ser repetida antes do push, ver seção Git).

## Assurance — o que é verificado, o que é declarado, o que NÃO é verificado

Esta é a decisão central da onda e o ponto que a doutrina do projeto exige
declarar sem overclaim.

| Nível | Nome | O que é verdade quando este nível é atingido | O que NÃO é provado |
|---|---|---|---|
| 0 | `self_declared` | O próprio estudante digitou um nome e e-mail e clicou em "concordo". | Nada sobre quem controla aquele e-mail, nem sobre relação de responsabilidade legal. É o estado anterior a esta onda; linhas antigas do ledger permanecem classificadas assim. |
| 1 | `channel_verified` | Uma pessoa com acesso à caixa de entrada do e-mail declarado recebeu um link de uso único, abriu a página de decisão e clicou explicitamente em "Autorizar" ou "Não autorizar". | Que essa pessoa é de fato mãe, pai ou tutor legal do estudante. **Verificar posse de canal de comunicação não é o mesmo que verificar vínculo de responsabilidade legal.** |
| 2 (não implementado) | `institution_confirmed` | Um vínculo estudante↔responsável confirmado por fonte institucional (ex.: matrícula escolar cruzando CPF/registro do responsável). | — |

**Decisão explícita: esta onda entrega Level 1, não Level 2.** Não existe
hoje, neste produto, nenhuma fonte institucional de vínculo
estudante-responsável (nenhum campo, nenhuma tabela, nenhum import de escola
alimenta isso). Construir essa fonte é expansão de produto, não correção de
segurança — está fora do escopo de R06 e não foi feita aqui.

**Level 3 (KYC/verificação de identidade documental) foi avaliado e
rejeitado** como desproporcional: custo de PII adicional, fricção e
complexidade não justificados pelo risco tratado, por instrução explícita de
não usar KYC como padrão default.

`assurance_level` é uma coluna explícita em `guardian_consent_events`
(`self_declared` | `channel_verified`), nunca inferida de outro campo. Em
particular: **`email_confirmed_at` do estudante nunca é tratado como prova de
consentimento do responsável** — são identidades e canais diferentes;
confirmado por guard estático.

## Arquitetura — decisão (Tree of Thoughts)

Quatro alternativas avaliadas:

- **A. Checkbox client-side reforçado** — rejeitada: não resolve nada, o
  cliente nunca é boundary de segurança (mesma doutrina do R02/R11).
- **B. Guardian magic link (request/token/decision de canal separado)** —
  **escolhida**. Reusa o padrão de token já homologado no projeto
  (`institutional_invitations.token`, `purchase_intents.claim_token`):
  pgcrypto (`gen_random_bytes` + `digest`), hash armazenado, bruto só no
  canal de entrega, one-time.
- **C. Vínculo institucional confirmado (Level 2)** — rejeitada nesta onda:
  exigiria construir uma fonte de dados de relacionamento
  estudante-responsável que não existe hoje; expansão de produto, fora do
  escopo de uma correção de segurança.
- **D. KYC/verificação documental (Level 3)** — rejeitada: desproporcional
  para o risco, custo de PII e fricção não justificados.

Escolhida: **B**, por ser a forma que efetivamente fecha o RED (o
responsável decide num contexto que o estudante não controla) sem inventar
primitivas novas de segurança nem expandir o produto além do necessário.

## DB

- Migration: `supabase/migrations/20260916120000_trust1_6_verifiable_guardian_consent.sql`.
- Tabelas novas:
  - `guardian_consent_policies` — versão vigente do termo + hash do texto
    apresentado (`statement_sha256`) + `requires_reconsent`. Uma linha ativa
    por vez; SELECT público para `authenticated`; nenhum INSERT/UPDATE/DELETE
    fora de `service_role`.
  - `guardian_consent_requests` — request ≠ receipt. Só `token_hash`
    (SHA-256), nunca o token bruto. `status` em
    `pending`/`consumed`/`expired`/`superseded`. Nenhuma policy de
    INSERT/UPDATE/DELETE — escrita só via RPC.
- Tabela estendida: `guardian_consent_events` — reaproveitada (não
  duplicada), por doutrina de ledger. `decision` passa a aceitar
  `granted`/`declined`/`revoked` (antes só `granted`); novas colunas
  `request_id` e `assurance_level`; removida a `UNIQUE(user_id,
  policy_version)` original (incompatível com múltiplos eventos por
  usuário/versão ao longo do tempo). Linhas antigas preservadas sem edição.
- Nenhuma policy de `UPDATE`/`DELETE` para `authenticated` em nenhuma das três
  tabelas de consentimento — mudança de estado é sempre um evento novo,
  nunca edição da linha antiga (doutrina §3).
- Toda função `SECURITY DEFINER` nova tem `SET search_path = public` e
  `REVOKE ... FROM PUBLIC, anon` explícito, com a query de verificação
  (`has_function_privilege`) documentada no fim da migration.

## Token

- Geração: `encode(extensions.gen_random_bytes(32), 'hex')` — 32 bytes de
  entropia, mesma primitiva já homologada (`pgcrypto`), não uma nova.
- Armazenamento: só `encode(extensions.digest(_raw_token, 'sha256'), 'hex')`
  em `token_hash` (`UNIQUE`). O token bruto nunca é persistido — existe
  apenas, transitoriamente, dentro de `notification_outbox.payload` (fila de
  entrega), pelo tempo em que a fila existir.
- Ciclo de vida: `pending` → `consumed` (decisão tomada) | `expired` (7 dias)
  | `superseded` (novo request do mesmo estudante invalida o anterior — nunca
  mais de um token vivo por vez).
- Consumo atômico: `UPDATE ... WHERE status = 'pending' AND expires_at >=
  now() RETURNING *` — a instrução única decide a corrida entre duas
  consumições simultâneas do mesmo token no MVCC do Postgres; a segunda
  tentativa encontra `status <> 'pending'` e é negada. Testado com duas
  chamadas concorrentes reais.
- Réplica/reuso do mesmo token consumido, token expirado e token inexistente
  devolvem **a mesma mensagem genérica** (`Invalid or expired consent
  token`) — não serve de sonda para distinguir qual condição falhou.

## Consent — request / grant / decline / revoke / versão / escopo

- `create_guardian_consent_request(guardian_name, guardian_email)` —
  chamada pelo estudante autenticado. Não grava consentimento; supersede
  qualquer request pendente anterior do mesmo estudante; valida e-mail
  minimamente (formato) e que a conta é de menor (idade < 18 pelo
  `birth_date` do perfil); resolve a política vigente no servidor
  (`get_current_guardian_consent_policy`), nunca aceita `policy_version` do
  cliente.
- `resolve_guardian_consent_token(token)` — leitura pública (sem sessão) do
  que o responsável vai decidir: nome do responsável (o que ele próprio
  declarou), **só o primeiro nome** do estudante (minimização, nunca e-mail
  ou perfil completo), versão da política e seu hash, prazo de expiração.
- `decide_guardian_consent(token, decision)` — `decision` em
  `granted`/`declined`. Única forma de gravar um evento com
  `assurance_level = 'channel_verified'`. Ação positiva explícita: a UI
  (`GuardianDecisionPage`) apresenta dois botões, "Autorizar" e "Não
  autorizar", sem checkbox pré-marcada.
- `revoke_guardian_consent(policy_version)` — chamada pelo próprio
  estudante autenticado; exige um `granted` anterior para aquela versão;
  grava um evento novo `revoked` (não edita o grant anterior — o grant
  permanece visível no ledger para auditoria).
- Versionamento: `guardian_consent_policies.requires_reconsent` decide se um
  `granted` de versão antiga ainda cobre a versão vigente. Mudança material
  (proposta/produto, não inferência automática) invalida grants anteriores;
  o estado passa a `reconsent_required` em vez de `minor_consented`.
- Estado é **sempre derivado** por leitura da última linha do ledger
  (`ORDER BY occurred_at DESC LIMIT 1`), nunca de coluna mutável —
  decline/revoked mais recentes superam um grant anterior, por design.

## Server gating

- `has_valid_guardian_consent(_user_id)` — `SECURITY DEFINER`,
  `service_role` apenas (não é RPC de cliente; é boundary interno). Fail
  closed: `birth_date` desconhecido devolve `false`.
- `enforce_ai_usage_limit` reescrito preservando **integralmente** a lógica
  original de limite por plano (`20260722200000`); adiciona apenas a
  checagem de `has_valid_guardian_consent` no topo, **antes** de qualquer
  contagem/consumo de cota — uma negativa por falta de consentimento não
  gasta limite diário. As 4 edge functions de IA (`aledria-chat`,
  `cognitive-mirror`, `future-self`, `signature-strengths`) chamam essa RPC
  sem alteração de contrato.
- Confirmado em execução: menor sem consentimento válido é negado pela RPC
  mesmo que o gate de rota client-side (`RequireGuardianConsent`) seja
  contornado — o frontend nunca é a autoridade real.

## Tenant

Não aplicável diretamente — consentimento é por `user_id`, não por
organização. Verificado que nenhuma das RPCs novas aceita `organization_id`
nem cruza tabelas institucionais; escopo confirmado por RLS
(`auth.uid() = student_user_id`) em `guardian_consent_requests` e ausência de
qualquer policy que permita leitura cross-user.

## Privacidade / minimização

- `resolve_guardian_consent_token` devolve só o primeiro nome do estudante
  (`split_part(trim(full_name), ' ', 1)`), nunca e-mail, nunca perfil
  completo.
- Token bruto nunca é persistido em tabela — só hash. Existe em claro apenas
  dentro de `notification_outbox.payload`, mesma superfície de exposição já
  aceita para outros tokens do projeto (convite institucional, claim
  escolar).
- `data_access_logs` recebe entrada em cada request/decisão/revogação
  (propósito `lgpd_art14_consent_request` /
  `lgpd_art14_consent_decision` / `lgpd_art14_consent_revocation`), seguindo
  o padrão já existente de auditoria de acesso a dado sensível.

## Tests

- Runtime contracts novos: `src/lib/guardian-consent-runtime-contract.test.ts`
  — **35/35**, 0 skips. Cobre: request≠receipt, token one-time/replay/
  expiração/superseded/aleatório/nulo/vocabulário de decisão, corrida
  atômica, grant/decline/revoke, versionamento/reconsent_required,
  autoridade do servidor (`has_valid_guardian_consent` +
  `enforce_ai_usage_limit` nega sem consumir cota), isolamento RLS
  cross-user, disciplina `SECURITY DEFINER` (search_path + grants mínimos).
- Guards estáticos novos: `src/lib/trust1-6-static-guards.test.ts` — **7/7**.
  Nenhum código chama `record_guardian_consent`; nenhum
  `.insert()`/`.upsert()`/`.update()` direto nas 3 tabelas de consentimento;
  `AuthPage`/`GuardianConsentPage` usam `create_guardian_consent_request`;
  `GuardianDecisionPage` usa `decide`/`resolve` e está fora de
  `<RequireAuth>` (verificado no JSX real, não em comentário);
  `email_confirmed_at` nunca tratado como consentimento; `ProfilePage` usa
  `revoke_guardian_consent`.
- Runtime contracts herdados (TRUST-1.2/1.2.1/1.3/1.4): **121/121**, 0 skips
  — nenhuma regressão após a migration TRUST-1.6.
- Suíte geral: **517/517** testes.

## Schema

- Replay: `npx supabase@2.115.0 db reset --local` → **49/49 migrations desde
  banco vazio**, sem `--linked`.
- Types: `src/integrations/supabase/types.ts` regenerado do schema local
  reconstruído. Confirmado que as 7 RPCs novas/reescritas aparecem tipadas.
  Nenhum `as any`/`as never`/`@ts-ignore`/`@ts-expect-error` introduzido —
  os únicos casts usados são `as unknown as X` (padrão já existente no
  projeto) para 3 payloads JSONB em `ProfilePage.tsx`/`GuardianDecisionPage.tsx`.

## CI

- `npm run quality` (audit:security, lint, typecheck, test 517/517, build,
  security:gate): verde local, exit 0.
- `runtime-db` (migrations desde zero + gate de types drift + runtime
  contracts): job existente reaproveitado, sem workflow paralelo. 121
  contratos herdados + 35 novos + 7 guards estáticos, todos acima do piso
  mínimo já configurado.

## Git

- Branch: `trust-1.6-verifiable-guardian-consent`.
- Migration: `20260916120000_trust1_6_verifiable_guardian_consent.sql` (#49).
- PR: `trust-1.6: establish verifiable guardian consent evidence chain`
  (aberta após este receipt).

## Riscos

| # | Status |
|---|---|
| R06 | ✅ **CLOSED** |
| R22 | 🔴 **OPEN / REQUIRED_BEFORE_PRODUCTION** — inalterado, nenhuma migration TRUST promovida remotamente nesta onda |
| R33 | 🟡 **NOVO** — `notification_outbox` metadata/body_html bug pré-existente, não corrigido nesta onda (ver abaixo) |

### R33 — achado novo, fora do escopo desta onda

Durante a implementação de `create_guardian_consent_request`, foi encontrado
que outras RPCs do projeto (`invite_member`, `resend_invitation`) fazem
`INSERT INTO notification_outbox` referenciando colunas `body_html` e
`metadata`, que **não existem** na tabela (as colunas reais, desde
`20260710120000_notification_outbox.sql`, são `payload` e não há
`body_html`). O `INSERT` sempre falhou nessas RPCs, mas o erro é
silenciosamente engolido por um bloco `EXCEPTION WHEN OTHERS THEN NULL` —
por isso nunca foi notado. Provável consequência: convites/reenvios
institucionais gravam o evento no ledger de decisão, mas o e-mail nunca é
enfileirado de fato.

Esta migration usa os nomes de coluna corretos (`payload`, sem `body_html`)
em `create_guardian_consent_request`. **Não corrigimos** `invite_member`/
`resend_invitation` nesta onda — são RPCs pré-existentes, não relacionadas a
R06, e corrigi-las é mudança de comportamento em superfície institucional
fora do escopo declarado. Registrado como risco novo para tratamento em onda
futura.

## O que este documento NÃO prova

- Que o schema remoto de produção recebeu a migration #49. Nenhum `db push`,
  `--linked` ou SQL Editor de produção foi usado. R22 continua exigindo o
  preflight read-only descrito em `TRUST_1_R22_PREFLIGHT_CHECKLIST.md`.
- Que a pessoa que decide no link é de fato responsável legal do estudante —
  ver seção Assurance. Verificação de canal ≠ prova de vínculo de
  responsabilidade legal. Esta é uma limitação declarada, não um defeito
  escondido.
- Que o e-mail de fato chega à caixa de entrada do responsável — depende de
  `RESEND_API_KEY`/dispatcher configurados (R09, já registrado, inalterado)
  e agora também depende do worker de `process-notifications` estar
  consistente com o schema real (ver R33).
