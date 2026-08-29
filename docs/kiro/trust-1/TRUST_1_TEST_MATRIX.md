# TRUST-1 — MATRIZ DE TESTES

**320 testes em 25 arquivos.** Todos passando após a TRUST-1.1B.
(Baseline da TRUST-1.0: 301 em 24 arquivos, commit `7e09493`.)

## Cobertura por domínio

| Domínio | Arquivo | Testes | O que cobre |
|---|---|---|---|
| Privacidade | `metric-privacy.test.ts` | 17 | Supressão N≥5, subtração, export, limiar canônico |
| Navegação | `dashboard-navigation.test.ts` | 24 | Dedupe, href dinâmico, future, papéis |
| Papéis/Home | `role-home.test.ts` | 27 | Resolução, anti-laço, school path, precedência |
| Shell | `RoleAwareAppShell.test.tsx` | 15 | Redirect, contexto, skeleton, error |
| Viewports | `shell-viewports.test.tsx` | 20 | Responsividade 320-1440 |
| Estados | `dashboard-states.test.tsx` | 23 | Skeleton, empty, error, denied, demo |
| Decisões | `DecisionQueue.test.tsx` | 11 | Mutação, dupla submissão, desfechos |
| Itens da fila | `decision-queue-items.test.ts` | 29 | Derivação, privacidade de e-mail, 2 leituras, canResend |
| Reenvio | `invitation-resend.test.ts` | 14 | Limite 3, janela 24h, estados terminais |
| Ações | `useDecisionActions.test.ts` | 7 | Tradução 42501/22023, três desfechos |
| Migration SQL | `ux3-migration-invariants.test.ts` | 26 | Estrutura do SQL, append-only, privilégios |
| **Reconciliação TRUST-1** | `trust1-reconciliation-invariants.test.ts` | **19** | Qualificação de schema do pgcrypto, imutabilidade do histórico, seed sem UUID literal, reconciliada forward-only |
| Redirect | `redirect.test.ts` | 8 | Open redirect, /auth loop |
| Auth profile | `auth-profile.test.ts` | 5 | Parse de roles |
| Analytics | `analytics.test.ts` | 3 | Sanitize metadata |
| Consentimento | `guardian-consent.test.ts` | 5 | Fluxo, timeout |
| RequireFeature | `RequireFeature.test.tsx` | 3 | Rota feature-gated |
| RequireConsent | `RequireGuardianConsent.test.tsx` | 6 | Gate de consentimento |
| Claims | `claims.test.ts` | 4 | Claim parsing |
| Claim escolar | `claim-escolar.test.ts` | 3 | Fluxo de claim |
| E-mail templates | `email-templates.test.ts` | 2 | Template rendering |
| Pricing | `school-pricing.test.ts` | 4 | Calculadora B2B |
| Supabase key | `supabase-key.test.ts` | 1 | Key validation |
| Timeout | `with-timeout.test.ts` | 3 | Timeout utility |
| Birth date | `BirthDateCompletionPage.test.tsx` | 3 | Fluxo de nascimento |

## Lacunas identificadas para TRUST-1

| Lacuna | Relevância | Corte |
|---|---|---|
| Zero teste de isolamento cross-tenant (usuário A vê dados de org B) | P0 | TRUST-1.4 |
| Zero teste de spoofing de engagement_event (org_id arbitrário) | P0 | TRUST-1.4 |
| Zero teste de NPS com org_id arbitrário | P1 | TRUST-1.4 |
| Typecheck pode não verificar código real | P0 | TRUST-1.5 |
| Zero teste do consentimento com responsável independente | P0 | TRUST-1.6 |
| Testes de banco são parsing de SQL, não execução em Postgres | P2 | Aceito |
| Zero teste de contexto (troca de org durante query em andamento) | P1 | TRUST-1.3 |
| Zero teste de `eligible_universe` no payload quando suprimido | P1 | TRUST-1.2 |
| Edge functions (Deno) sem qualquer teste automatizado | P2 | Fora de escopo TRUST-1 |
| ~~Sequência de migrations nunca testada desde zero (R18)~~ | ~~P0~~ | ✅ **Fechada na TRUST-1.1B** |
| ~~Grants/RLS nunca verificados em banco reconstruído~~ | ~~P0~~ | ✅ **Fechada na TRUST-1.1B** |
| Testes SQL/RLS não rodam no CI (exigiriam Docker no runner) | P1 novo | Aberto |

## Testes SQL/RLS executados na TRUST-1.1B

17 testes contra Postgres real (Supabase local, 43 migrations desde zero), com
dados 100% sintéticos removidos no teardown. Resultado integral no receipt.

| # | Teste | Resultado |
|---|---|---|
| T1 | RLS cross-tenant em `organizations` | ✅ |
| T2 | RLS cross-tenant em `schools` | ✅ |
| T3 | `can_read_school` própria vs alheia | ✅ |
| T4 | `get_school_metrics` cross-tenant nega 42501 | ✅ |
| T5 | `get_school_metrics` sem membership nega (mesma mensagem, não serve de sonda) | ✅ |
| T6 | `get_school_metrics` como `anon` nega por privilégio | ✅ |
| T7 | Supressão por limiar (2 alunos < 5) | ✅ |
| T8 | Período inválido nega 22023 | ✅ |
| T9 | `escalate_indicator` fora do escopo nega | ✅ |
| T10 | `escalate_indicator` legítimo grava no ledger | ✅ |
| T11 | UPDATE no ledger rejeitado pelo trigger | ✅ |
| T12 | DELETE no ledger rejeitado pelo trigger | ✅ |
| T13 | Leitura cross-tenant do ledger | ✅ (revelou R21) |
| T14 | `resend_invitation` por não-membro nega | ✅ |
| T15 | Antiburla de reenvio (limite + cooldown 24h) | ✅ **revelou o R20 (P0)** |
| T16 | INSERT direto em `user_subscriptions` por `authenticated` nega | ✅ |
| T17 | `activate_subscription_from_intent` por `authenticated` nega | ✅ |

**Estes testes não estão no CI.** Foram executados uma vez, em staging local, e
o resultado está registrado no receipt. O que entrou no repositório e roda em
todo `npm run quality` são os 19 testes de invariante de
`trust1-reconciliation-invariants.test.ts`, que protegem contra regressão por
edição — não substituem a execução.

### Verificações de schema executadas (além dos 17 testes)

| Verificação | Resultado |
|---|---|
| Funções `SECURITY DEFINER` sem `search_path` | 0 de 36 |
| Tabelas em `public` sem RLS | 0 de 22 |
| Policies de UPDATE/DELETE em tabela append-only | 0 |
| RPCs executáveis por `anon` | 0 (só 2 funções de trigger) |
| `auth.users` após reset | 0 linhas |
| Objetos residuais de migration contaminante | 0 |
| Limiar canônico de privacidade | 5 |

---

## Atualização TRUST-1.5 — 346 testes em 26 arquivos

| Domínio | Arquivo | Testes | O que cobre |
|---|---|---|---|
| **Contrato de runtime** | `rpc-runtime-contract.test.ts` | **26** | Execução real contra PostgreSQL: resolução de função, `search_path`, autorização, negativa, cross-tenant, privilégios |

### A categoria `RPC_RUNTIME_CONTRACT`

Criada porque o R20 provou que invariante de texto não basta:
`resend_invitation` passava em todos os testes que **liam** o SQL e falhava em
toda invocação real.

**Regra permanente:** toda RPC P0/P1 tem pelo menos um contrato de runtime
executado contra PostgreSQL real.

Cobertura atual:

| RPC | Contratos |
|---|---|
| `resend_invitation` | existência, `SECURITY DEFINER`, `search_path`, recompilação de corpo, resolução de `digest`, negativa de escopo, `anon` negado |
| `get_school_metrics` | idem + período inválido, ausência de `e.school_id`/`e.class_id` |
| `escalate_indicator` | idem + organização fora de escopo |
| `get_institutional_decision_events` | idem + ledger sem `SELECT` para a API, policy inerte ausente, gatilhos append-only de pé, sonda de tenant, `NULL` negado, projeção fechada, tetos de paginação |

O teste central é a **recompilação**: cada função é reexecutada com
`check_function_bodies = on`, o que força o Postgres a resolver todos os objetos
que o corpo referencia sob o `search_path` pinado. É o teste que teria pegado o
R20 no dia em que nasceu.

### Honestidade sobre o alcance

Estes 26 testes exigem Docker e o stack Supabase local. Onde não há Docker — o
runner do GitHub Actions, por exemplo — eles são **pulados**, não falsamente
aprovados: o `describe.skip` imprime o motivo. Verificado na prática: com o
container parado, o resultado é `26 skipped`.

Dívida registrada: **R25 — o gate do CI não executa contrato de runtime.**

### Lacunas fechadas nesta onda

| Lacuna | Status |
|---|---|
| ~~Typecheck pode não verificar código real (R03)~~ | ✅ **Fechada** — prova negativa nos dois sentidos |
| ~~Tipos Supabase desatualizados / casts de máscara (R04)~~ | ✅ **Fechada** — 0 casts de máscara |
| ~~Ledger sem caminho de leitura auditado (R21)~~ | ✅ **Fechada** — RPC dedicada, 15 casos em execução real |
| Testes de banco eram parsing de SQL, não execução | ✅ **Substancialmente fechada** — resta o CI (R25) |

### Lacunas remanescentes

| Lacuna | Relevância | Corte |
|---|---|---|
| Contratos de runtime não rodam no CI (R25) | P1 | Precisa de Docker/Postgres no workflow |
| Zero teste de spoofing de `engagement_event` (R02) | P0 | TRUST-1.4 |
| Zero teste de NPS com `organization_id` arbitrário (R11) | P1 | TRUST-1.4 |
| Zero teste do consentimento com responsável independente (R06) | P0 | TRUST-1.6 |
| Zero teste de contexto (troca de org durante query) | P1 | TRUST-1.3 |
| `eligible_universe` no payload quando suprimido (R10) | P1 | TRUST-1.2 |
| Deleção de tenant com ledger (R23) | P1 | Aguarda decisão |
| Persistência da auditoria de negativa (R24) | P1 | Aguarda decisão |
| Edge functions (Deno) sem teste | P2 | Fora de escopo TRUST-1 |

---

## Atualização da MACRO-ONDA D — 382 testes em 28 arquivos

| Domínio | Arquivo | Testes | O que cobre |
|---|---|---|---|
| **Privacidade em runtime** | `privacy-runtime-contract.test.ts` | **23** | Cardinalidade n=0/1/4/5/6, não inferência por subtração nos dois canais, filtro temporal, payload serializado, superfície da organização |
| **Arquivamento em runtime** | `archive-runtime-contract.test.ts` | **13** | Contrato de estado, erro de domínio, `service_role`, cross-tenant, entidade sem histórico |

Total de contratos de runtime contra PostgreSQL real: **62**
(26 RPC + 13 arquivamento + 23 privacidade).

### O método: vermelho antes de verde

Os testes de privacidade foram escritos **antes** da correção e executados contra
o servidor vulnerável:

```
1ª execução (vulnerável):  6 falharam | 11 passaram
2ª execução (corrigido) :  0 falharam | 17 passaram
```

As 6 falhas não foram "consertadas no teste" — o servidor foi corrigido. Cada uma
provou um vazamento concreto, com payload medido registrado em
`TRUST_1_2_PRIVACY_TEST_RECEIPT.md`.

### Nota metodológica que vale guardar

A primeira versão do varredor de payload procurava **dígitos no texto** da
resposta, e acusou falso positivo: fragmentos de UUID (`4000`, `d201`) e de
timestamp ISO contêm dígitos. Substituído por caminhada recursiva sobre os
**valores numéricos** do JSON, com o caminho de cada ocorrência, excluindo as
chaves de metadado (`days`, `minimum_group_size`) — que são públicas por design,
porque o limiar precisa ser exibido para a supressão ser honesta.

Quatro das falhas pós-correção eram defeito do teste, não vazamento. Confirmado
inspecionando o payload real **antes** de mexer no varredor — a ordem importa: o
contrário seria ajustar o teste até ficar verde.

### Os contratos agora rodam no CI

Job `runtime-db` em `.github/workflows/quality-gate.yml` (R25). Sobe o stack
Supabase efêmero no runner, aplica as migrations desde banco vazio e **falha**
diante de skip ou de menos de 50 contratos executados. Skip deixou de ser
sucesso.

Efeito colateral: o CI passou a travar o invariante da TRUST-1.1B — se a sequência
histórica deixar de reconstruir o schema desde zero, `supabase start` falha.

### Ajuste de timeout

Cada chamada ao Postgres passa por `docker exec`, que custa centenas de
milissegundos. O timeout padrão de 5s do Vitest era curto para suítes com dezenas
de round-trips. Elevado a 120s **apenas nas três suítes de runtime**; o global não
foi tocado, para que um teste de unidade que pendura continue falhando rápido.

### Lacunas fechadas nesta onda

| Lacuna | Status |
|---|---|
| ~~`eligible_universe` no payload quando suprimido (R10)~~ | ✅ **Fechada** |
| ~~Contratos de runtime não rodam no CI (R25)~~ | ✅ **Fechada** |
| ~~Deleção de tenant com ledger (R23)~~ | ✅ **Fechada** — contrato de arquivamento |
| ~~Persistência da auditoria de negativa (R24)~~ | 🟡 **Aceita** — limitação arquitetural formalizada |

### Lacunas remanescentes

| Lacuna | Relevância | Corte |
|---|---|---|
| Zero teste de spoofing de `engagement_event` (R02) | P0 | TRUST-1.4 |
| Zero teste de NPS com `organization_id` arbitrário (R11) | P1 | TRUST-1.4 |
| Zero teste do consentimento com responsável independente (R06) | P0 | TRUST-1.6 |
| Zero teste de contexto (troca de org durante query) | P1 | TRUST-1.3 |
| Arquivamento não filtrado em leitura (R29) | P2 | Onda que expuser arquivamento |
| Roster administrativo fora do limiar (R30) | P2 | Decisão de produto |
| Sem snapshot visual de PDF ou gráfico | P2 | Aceito |
| Edge functions (Deno) sem teste | P2 | Fora de escopo TRUST-1 |
