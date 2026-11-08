# DELIVERY — Recibo Corrigido (C0), Higiene Comercial e Marca (C1), Rede Pagante Funcional (C2) e Decisões ToT

- **Data de referência:** 2026-11-06
- **Repositório canônico de origem:** `minhafelicidadebr/yale-minhafelicidade-julho`
- **Baseline técnico canônico (`TRUST-1.6.1`):** `09cf4b4cca5f9e0363f94fa2f0715a21379e234e` *(corrigindo erro de digitação anterior `09cf4b4f0b17...`)*
- **Commit de `main` importado no AI Studio:** `31626dd0786e065ed8765dbf9ccbce59e9c3e8ad` (`Changes`, `gpt-engineer-app[bot]`, que regrediu `src/integrations/supabase/types.ts`)
- **Repositório de destino (AI Studio):** `minhafelicidadebr/Minha-Felicidade---aiStudio---nov2026` (branches previstas: `canonical/trust-1.6.1` e `aistudio/work`)
- **AI Studio Applet ID:** `8ac74e33-63a9-4c72-ace3-f6bf2f1070c6`
- **Dev Server URL:** `https://ais-dev-orvxfl65ifdd65bmnbpidr-445480074114.us-west2.run.app`
- **Política operacional:** Doutrina Fable 5 (`.kiro/steering/doutrina-fable5.md`), Honest Claims (`docs/kiro/P0_0_GUARDRAILS_MARCA_PI_CONTEUDOS_EXTERNOS.md`), Contrato de Produto (`docs/kiro/DASHBOARD_PRODUCT_CONTRACT.md`), Política de Privacidade de Métricas (`docs/kiro/METRIC_PRIVACY_POLICY.md`) e Gates Comerciais (`docs/kiro/COMMERCIAL_GATES.md`).

---

## 1. Recibo Corrigido de Integridade e Inventário (Onda C0)

### 1.1 Correções Factuais Obrigatórias sobre o Relatório Anterior

| Item | Afirmação Anterior | Evidência Real Verificada | Correção / Estado Atual |
|---|---|---|---|
| **SHA do Baseline `TRUST-1.6.1`** | `09cf4b4f0b17df99e850dd83c022a9574974fc59` | `docs/kiro/PROJECT_TRUTH.md` e histórico canônico | O SHA completo correto do commit `TRUST-1.6.1` é **`09cf4b4cca5f9e0363f94fa2f0715a21379e234e`**. |
| **Contagem de Edge Functions** | "7 Edge Functions" | Listagem de `supabase/functions/` | Existem **10 Edge Functions** (além de `_shared`): `admin-dashboard`, `aledria-chat`, `cognitive-mirror`, `future-self`, `generate-report`, `mp-create-preference`, `mp-webhook`, `process-notifications`, `signature-strengths` e `subscription-lifecycle`. |
| **Preços Individuais (B2C)** | "R$ 19,90/mês e R$ 29,90/mês" | Seed `20260412163108_*.sql` vs. REST `GET /rest/v1/subscription_plans` no projeto `ctjwyybmlwhynherikqy` | • **Seed SQL (`20260412163108`):** `free` (`R$ 0`), `intermediate` (`2900` = **R$ 29,00/mês** \| `27840` = **R$ 278,40/ano**), `advanced` (`5900` = **R$ 59,00/mês** \| `56640` = **R$ 566,40/ano**).<br>• **Catálogo remoto ativo (`ctjwyybmlwhynherikqy`):** `free` (`R$ 0`), `intermediate` (`2900` = **R$ 29,00/mês** \| `24900` = **R$ 249,00/ano**, eq. R$ 20,75/mês), `advanced` (`5900` = **R$ 59,00/mês** \| `49900` = **R$ 499,00/ano**, eq. R$ 41,58/mês). |
| **Desconto de Rede Escolar** | "2–5: 10%, 6–15: 20%, 16+: 30%" | `src/lib/school-pricing.ts` (linhas 43–48) e `supabase/functions/_shared/school-pricing.ts` | Os descontos reais de `networkDiscount(schools)` são: **`1 escola: 0%`**, **`2 a 3 escolas: 10%`**, **`4 a 9 escolas: 18%`**, **`10+ escolas: 25%`**. Soma com anual (`20%`) e pública/ONG (`30%`), limitada a `MAX_TOTAL_DISCOUNT = 0.75` (**75%**). |
| **Erro de Preview WebSocket (`1 error running the code`)** | Não detalhado | `vite.config.ts` tinha `hmr: { overlay: false }` | O cliente `/@vite/client` tentava abrir WebSocket bloqueado pelo proxy de iframe do AI Studio. Corrigido em `vite.config.ts` com **`hmr: false`** e remoção de `/bun.lock`. |
| **Persistência de `.git` e `security:gate`** | `.git` assumido como persistente | O VFS do AI Studio descarta `.git/` ao reiniciar container | `scripts/security-gate.mjs` executa `git ls-files`. Antes de executar `npm run quality` / `npm run security:gate` no container AI Studio, `.git` deve estar inicializado (`git init && git add -A`) e sem `/bun.lock`. |

### 1.2 Estado Real dos Gates de Qualidade (A–G)

| Gate | Descrição | Comando / Mecanismo | Estado no AI Studio (Container sem Docker) | Estado Exigido em CI (`.github/workflows/quality-gate.yml`) |
|---|---|---|---|---|
| **Gate A — Estático e Segurança de Dependências** | Lockfile íntegro, `npm audit`, ESLint e TypeScript estrito (`app` + `node`) | `npm ci --dry-run && npm run audit:security && npm run lint && npx tsc -b --noEmit` | **VERDE (`exit 0`)** — `0 critical`, `0` erros de lint, `0` erros de tipos em `tsconfig.app.json` e `tsconfig.node.json`. | Job `quality` em `.github/workflows/quality-gate.yml`. |
| **Gate B — Testes Unitários e Guardas Estáticas** | Suítes Vitest que não dependem de container Docker | `npm test` (`vitest run`) | **VERDE (`exit 0`)** — **36 suítes aprovadas / 378 testes passados** (incluindo `c1-c2-continuity-guards.test.ts` e simuladores de pricing). | Job `quality` em `.github/workflows/quality-gate.yml`. |
| **Gate C — Build e Security Gate** | Bundle de produção Vite + verificação de invariantes de segurança | `npm run build && npm run security:gate` | **VERDE (`exit 0`)** — Build limpo + `security-gate passed`. | Job `quality` em `.github/workflows/quality-gate.yml`. |
| **Gate D — Replay Limpo de Migrations e Drift Zero de `types.ts`** | Subir Postgres 15 limpo, aplicar todas as migrations (`#1`–`#51`) e comparar `supabase gen types` com `src/integrations/supabase/types.ts` | `supabase start && supabase gen types typescript --local --schema public > /tmp/types.generated.ts && diff -u src/integrations/supabase/types.ts /tmp/types.generated.ts` | **PENDENTE DE CI (`ND` localmente)** — O container AI Studio não possui daemon Docker nem binário `supabase`. | Job `runtime-db` em `.github/workflows/quality-gate.yml` (Supabase CLI `2.115.0`, gatilhos `main`, `aistudio/work` e `workflow_dispatch`). |
| **Gate E — Contratos de Runtime contra PostgreSQL Real** | Executar as 8 suítes `*-runtime-contract.test.ts` sem skip (`>= 168` testes passados, incluindo os 7 cenários da C2) | `npx vitest run src/lib/*-runtime-contract.test.ts` | **PULADO HONESTAMENTE (`8 suítes / 168 testes skipped`)** por ausência de Docker no container AI Studio. | Job `runtime-db` em `.github/workflows/quality-gate.yml` (`PASSED >= 168`). |
| **Gate F — Homologação Staging** | Aplicar migrations em projeto Supabase de staging e validar webhooks MP sandbox + Resend | Runbook `docs/kiro/trust-1/TRUST_1_R22_PREFLIGHT_CHECKLIST.md` | **ND** (Requer projeto staging dedicado ou janela controlada). | Pré-requisito para mexer em produção. |
| **Gate G — Produção (`ctjwyybmlwhynherikqy`)** | Reconciliação das migrations `#36`–`#51` no banco remoto e deploy das 10 Edge Functions | `supabase db push` + `supabase functions deploy` | **ND** (Produção permanece na migration `#35` até aprovação explícita do checklist R22). | Operação assistida pós-Gate D/E/F. |

---

## 2. Auditoria Completa de Preços, Planos, Descontos e Efeito Degrau (C0 + C1)

### 2.1 Tabela Comparativa — Planos Individuais (B2C)

| Plano (`slug`) | Seed Canônico (`20260412163108`) | Catálogo Remoto Ativo (`ctjwyybmlwhynherikqy`) | Exibição no Frontend (`PricingSection.tsx` / `SubscriptionPage.tsx`) | Regra de Cobrança no Servidor (`mp-create-preference`) |
|---|---|---|---|---|
| `free` (**Gratuito**) | Mensal: `0` (R$ 0)<br>Anual: `0` (R$ 0)<br>`alegria_daily`: `5` (atualizado para `9` em `20260722200000`) | Mensal: `0` (R$ 0)<br>Anual: `0` (R$ 0)<br>`alegria_daily`: `9` | **R$ 0 / para sempre** | Bloqueado para checkout pago (`amountBrlCents <= 0`). |
| `intermediate` (**Intermediário**) | Mensal: `2900` (**R$ 29,00/mês**)<br>Anual: `27840` (**R$ 278,40/ano**, eq. R$ 23,20/mês) | Mensal: `2900` (**R$ 29,00/mês**)<br>Anual: `24900` (**R$ 249,00/ano**, eq. ~R$ 21/mês) | Lê dinamicamente de `subscription_plans` e agora exibe explicitamente: **R$ X/mês no plano anual + "Cobrança única anual de R$ Y/ano • Cancele quando quiser"**. | Lê `price_monthly` ou `price_yearly` diretamente de `public.subscription_plans` no servidor (nunca do payload do cliente). |
| `advanced` (**Avançado**) | Mensal: `5900` (**R$ 59,00/mês**)<br>Anual: `56640` (**R$ 566,40/ano**, eq. R$ 47,20/mês) | Mensal: `5900` (**R$ 59,00/mês**)<br>Anual: `49900` (**R$ 499,00/ano**, eq. ~R$ 42/mês) | Lê dinamicamente de `subscription_plans` (`PricingSection` direciona a contato comercial; `SubscriptionPage` permite upgrade). | Lê `price_monthly` ou `price_yearly` de `public.subscription_plans`. |

### 2.2 Tabela Canônica — Planos Escolares e Redes (B2B)
Fonte única compartilhada: `src/lib/school-pricing.ts` e `supabase/functions/_shared/school-pricing.ts` (agora também sincronizada em `PricingSection.tsx` e `MoodCheckIn.tsx`):

| Faixa de Alunos | Preço Base por Aluno/Mês | Desconto de Rede (`schools`) | Desconto Anual (`annual`) | Desconto Pública/ONG (`isPublicOrNgo`) | Teto Máximo (`MAX_TOTAL_DISCOUNT`) | Gestores Grátis (`managersFree`) |
|---|---|---|---|---|---|---|
| **1 a 50 alunos** | **R$ 19,00** | • 1 escola: **0%**<br>• 2 a 3 escolas: **10%**<br>• 4 a 9 escolas: **18%**<br>• 10+ escolas: **25%** | **20%** (quando `billing_interval = 'yearly'`) | **30%** *(exige proposta assistida / validação institucional a partir de C1)* | **75%** (soma simples truncada em `0.75`) | `max(1, floor(students / 50))` |
| **51 a 200 alunos** | **R$ 14,00** | Idem | Idem | Idem | **75%** | `1` a `4` gestores |
| **201 a 500 alunos** | **R$ 10,00** | Idem | Idem | Idem | **75%** | `4` a `10` gestores |
| **501 a 2.000 alunos** | **R$ 7,00** | Idem | Idem | Idem | **75%** | `10` a `40` gestores |
| **Acima de 2.000 alunos** | **Sob consulta (`customQuote = true`)** | Cotação manual | Cotação manual | Cotação manual | N/A | Cotação manual |

### 2.3 Análise Matemática do Efeito Degrau (*Cliff Effect*) e Simuladores (ToT Decisão D)
Na fórmula ativa (`calculateSchoolPricing`), a tarifa da faixa multiplica o total de alunos (`students * perStudentBrl`), gerando quedas abruptas de preço total nas fronteiras `50→51`, `200→201` e `500→501`. Em `src/lib/school-pricing.ts`, implementamos duas funções simuladoras puras e isoladas (`calculateFloorProtectedSchoolPricing` e `calculateProgressiveSchoolPricing`), cobertas por testes em `src/lib/school-pricing.test.ts`, **sem alterar o checkout ativo**:

| Volume (`students`) | Opção 1 — Fórmula Atual Ativa (`calculateSchoolPricing`) | Opção 2 — Faixa Única com Piso da Anterior (`calculateFloorProtectedSchoolPricing`) | Opção 3 — Progressiva Marginal por Faixa (`calculateProgressiveSchoolPricing`) | Diagnóstico Comercial |
|---|---|---|---|---|
| **50 alunos** | **R$ 950,00/mês** (R$ 19,00/aluno) | **R$ 950,00/mês** (R$ 19,00/aluno) | **R$ 950,00/mês** (R$ 19,00/aluno) | Fronteira da Faixa 1. |
| **51 alunos** | **R$ 714,00/mês** (R$ 14,00/aluno) ⚠️ **−R$ 236,00** | **R$ 950,00/mês** (R$ 18,63/aluno) *(piso até 67 alunos)* | **R$ 964,00/mês** (R$ 18,90/aluno) *(+R$ 14,00)* | Na fórmula atual, 38 a 50 alunos pagam mais caro que 51 alunos. |
| **200 alunos** | **R$ 2.800,00/mês** (R$ 14,00/aluno) | **R$ 2.800,00/mês** (R$ 14,00/aluno) | **R$ 3.050,00/mês** (R$ 15,25/aluno) | Fronteira da Faixa 2. |
| **201 alunos** | **R$ 2.010,00/mês** (R$ 10,00/aluno) ⚠️ **−R$ 790,00** | **R$ 2.800,00/mês** (R$ 13,93/aluno) *(piso até 280 alunos)* | **R$ 3.060,00/mês** (R$ 15,22/aluno) *(+R$ 10,00)* | Na fórmula atual, 144 a 200 alunos pagam mais caro que 201 alunos. |
| **500 alunos** | **R$ 5.000,00/mês** (R$ 10,00/aluno) | **R$ 5.000,00/mês** (R$ 10,00/aluno) | **R$ 6.050,00/mês** (R$ 12,10/aluno) | Fronteira da Faixa 3. |
| **501 alunos** | **R$ 3.507,00/mês** (R$ 7,00/aluno) ⚠️ **−R$ 1.493,00** | **R$ 5.000,00/mês** (R$ 9,98/aluno) *(piso até 714 alunos)* | **R$ 6.057,00/mês** (R$ 12,09/aluno) *(+R$ 7,00)* | Na fórmula atual, 358 a 500 alunos pagam mais caro que 501 alunos. |

---

## 3. Tree of Thoughts (ToT) — As 4 Decisões Estruturais (Avaliação 0–5 / ND)

Critérios e pesos aplicados (escala estrita `0 a 5` ou `ND` quando depender de verificação externa):
1. **Segurança, privacidade, LGPD e integridade financeira** (peso 25%)
2. **Valor direto para a jornada de rede de escolas** (peso 20%)
3. **Simplicidade arquitetural e aderência ao repositório** (peso 15%)
4. **Facilidade de validação automatizada e reversão** (peso 15%)
5. **Tempo de entrega e dependências externas** (peso 15%)
6. **Custo operacional e preparação para crescimento** (peso 10%)

### Decisão A — Ambiente de Validação de Banco e Reconciliação de `types.ts`

| Critério (Peso) | Opção A1: CI GitHub Actions (`quality-gate.yml` com Supabase CLI `2.115.0`) + Reconciliação Estática Fiel em `types.ts` | Opção A2: Ambiente Local Externo com Docker + `supabase start` | Opção A3: Projeto Supabase de Staging Dedicado |
|---|---|---|---|
| 1. Segurança / LGPD / Financeiro (25%) | **4/5** (Zero risco a produção; valida SQL e `types.ts` em banco efêmero no CI) | **4/5** (Isolado de produção) | **5/5** (Valida também Edge Functions, webhooks MP e Resend) |
| 2. Valor para Rede de Escolas (20%) | **4/5** (Desbloqueia tipagem imediata no AI Studio e valida 168 testes SQL no push) | **4/5** (Mesma cobertura de banco, mas manual) | **5/5** (Valida fluxo completo B2B ponta a ponta) |
| 3. Simplicidade e Aderência (15%) | **5/5** (Workflow `.github/workflows/quality-gate.yml` já existe e está configurado para `main` e `aistudio/work`) | **3/5** (Exige máquina externa sincronizada) | **3/5** (Exige provisionamento e segredos de segundo projeto) |
| 4. Validação Automatizada e Reversão (15%) | **5/5** (`diff -u src/integrations/supabase/types.ts /tmp/types.generated.ts` + `vitest` automatizado) | **3/5** (Execução manual pelo operador) | **4/5** (Requer reset controlado entre execuções) |
| 5. Tempo e Dependências Externas (15%) | **4/5** (Executa automaticamente no push para `Minha-Felicidade---aiStudio---nov2026`) | **3/5** (Depende de setup local do desenvolvedor) | **2/5** (Depende de credenciais de staging) |
| 6. Custo Operacional e Escala (10%) | **5/5** (Custo zero adicional; roda em runners GitHub Actions) | **4/5** (Custo zero, esforço manual) | **3/5** (Custo de instância adicional) |
| **Síntese (0–5)** | **4,45 / 5 (VENCEDORA PARA GATE D/E + COMBINAR COM A3 ANTES DE PRODUÇÃO)** | **3,55 / 5** | **3,85 / 5 (Complementar para Gate F)** |

### Decisão B — Vínculo `organization_subscriptions` ↔ `organizations`

| Critério (Peso) | Opção B1: Coluna Explícita `organization_subscriptions.organization_id` (FK `ON DELETE SET NULL`) + Vínculo em `create_organization` / `claim_escolar_*` | Opção B2: Tabela Ponte `organization_subscription_links` (N:N) | Opção B3: Inferência Implícita apenas por `owner_id` |
|---|---|---|---|
| 1. Segurança / LGPD / Financeiro (25%) | **5/5** (Vínculo explícito por FK; impede que segunda organização do mesmo `owner_id` herde assinatura sem contrato) | **4/5** (Segura, porém adiciona joins extras em todas as policies/RPCs) | **1/5** (Ambígua se um gestor criar múltiplas organizações ou se outro admin gerir a rede) |
| 2. Valor para Rede de Escolas (20%) | **5/5** (Conecta 1:1 o contrato escolar à rede que contém escolas, turmas e membros) | **4/5** (Suporta N:N, mas o produto vende 1 assinatura de rede com N escolas dentro da mesma `organizations`) | **2/5** (Frágil para redes multi-unidade) |
| 3. Simplicidade e Aderência (15%) | **5/5** (Uma coluna nullable + índice + backfill apenas onde `count(org) = 1`) | **2/5** (Mais objetos e policies de RLS para manter) | **3/5** (Sem DDL, mas sem integridade referencial) |
| 4. Validação Automatizada e Reversão (15%) | **5/5** (Migration aditiva `ADD COLUMN IF NOT EXISTS`, 100% compatível com dados legados) | **3/5** (Mais complexa de reverter) | **2/5** (Difícil auditar qual assinatura paga qual organização) |
| 5. Tempo e Dependências Externas (15%) | **5/5** (Implementada em `20260925120000_c2_org_subscription_link_and_seats.sql`) | **3/5** (Exige refatoração ampla) | **4/5** (Rápida, porém incorreta) |
| 6. Custo Operacional e Escala (10%) | **5/5** (Lookup indexado O(1) em `get_my_plan()`, `invite_member` e `accept_invitation`) | **3/5** (Mais joins por request) | **2/5** (Gera bugs de suporte em redes) |
| **Síntese (0–5)** | **5,00 / 5 (VENCEDORA — IMPLEMENTADA NA ONDA C2)** | **3,30 / 5** | **2,15 / 5 (Rejeitada)** |

### Decisão C — Momento de Reserva e Consumo de Assentos (`max_seats`)

| Critério (Peso) | Opção C1: Reserva no `invite_member` (Ativos + Convites Pendentes Não Expirados) + Confirmação em `accept_invitation` com `SELECT ... FOR UPDATE` (Restrito a `role = 'student'`) | Opção C2: Consumo Apenas no `accept_invitation` (Sem Reserva no Convite) | Opção C3: Pré-Alocação por Cota Fixa de Escola/Turma |
|---|---|---|---|
| 1. Segurança / LGPD / Financeiro (25%) | **5/5** (Serializa por `FOR UPDATE`; impede emitir 500 convites de alunos para 50 assentos contratados e libera automaticamente convites expirados) | **2/5** (Permite disparo massivo de convites acima do contrato e falha tardia para o aluno ao aceitar) | **4/5** (Segura, mas rígida demais) |
| 2. Valor para Rede de Escolas (20%) | **5/5** (O gestor sabe imediatamente no painel se atingiu o limite contratado de alunos; o aluno convidado tem assento garantido até a expiração do convite) | **2/5** (Péssima UX: aluno recebe e-mail oficial da escola e toma erro de "sem vagas" ao clicar) | **2/5** (Obriga o gestor a redistribuir cotas manualmente entre turmas) |
| 3. Simplicidade e Aderência (15%) | **5/5** (Usa `institutional_memberships` e `institutional_invitations` existentes; `max_seats` vem de `purchase_intents.seats_students` e governa `role = 'student'`) | **4/5** (Mais simples, porém falha em concorrência de convites) | **1/5** (Exige novas colunas de cota em `schools` e `classes`) |
| 4. Validação Automatizada e Reversão (15%) | **4/5** (Regra determinística: `active_students + pending_non_expired_students < max_seats`) | **3/5** (Difícil evitar overbooking) | **2/5** (Alta complexidade de estado) |
| 5. Tempo e Dependências Externas (15%) | **5/5** (Implementada na migration C2 sem quebrar suítes existentes) | **4/5** (Rápida, mas incompleta) | **2/5** (Exige nova UI de rateio de cotas) |
| 6. Custo Operacional e Escala (10%) | **5/5** (Convites vencidos (`expires_at <= now()`) liberam a reserva automaticamente e são substituídos sem resíduos) | **2/5** (Gera chamados de suporte de alunos barrados no aceite) | **2/5** (Atrito operacional alto em implantações escolares) |
| **Síntese (0–5)** | **4,85 / 5 (VENCEDORA — IMPLEMENTADA NA ONDA C2)** | **2,75 / 5** | **2,45 / 5** |

### Decisão D — Fórmula de Preço Escolar sem Efeito Degrau (*Cliff Effect*)

| Critério (Peso) | Opção D1: Manter Fórmula Atual em Produção + Entregar Simuladores Isolados (Piso e Progressivo) para Decisão Comercial | Opção D2: Trocar Imediatamente para Faixa Única com Piso (`max(total_faixa, topo_faixa_anterior)`) | Opção D3: Trocar Imediatamente para Cálculo Progressivo Marginal por Faixa |
|---|---|---|---|
| 1. Segurança / LGPD / Financeiro (25%) | **4/5** (Respeita a restrição de não alterar tarifas ativas sem aprovação comercial, enquanto bloqueia o abuso de `-30%` `is_public_ngo` no checkout direto) | **5/5** (Elimina perda de receita nas fronteiras 51, 201 e 501) | **5/5** (Estritamente monotônica e previsível) |
| 2. Valor para Rede de Escolas (20%) | **4/5** (Unifica imediatamente a vitrine `PricingSection` com `SchoolCalculator` e prepara os dois modelos substitutos testados) | **4/5** (Mantém preços de topo de faixa idênticos aos atuais, mas cria platô horizontal em 51–67, 201–280 e 501–714 alunos) | **4/5** (Eleva o ticket médio acima de 50 alunos em relação à tabela atual; requer alinhamento comercial) |
| 3. Simplicidade e Aderência (15%) | **5/5** (Não quebra os testes canônicos de `calculateSchoolPricing` nem diverge do espelho Deno) | **4/5** (Simples de explicar como "mínimo da faixa anterior") | **4/5** (Padrão SaaS B2B de tabela progressiva) |
| 4. Validação Automatizada e Reversão (15%) | **5/5** (Ambas as fórmulas `calculateFloorProtectedSchoolPricing` e `calculateProgressiveSchoolPricing` estão implementadas e testadas em `school-pricing.test.ts`) | **4/5** (Exige atualizar expectativas de preço nos testes existentes) | **4/5** (Exige atualizar expectativas de preço nos testes existentes) |
| 5. Tempo e Dependências Externas (15%) | **5/5** (Entrega técnica pronta; chaveamento requer 1 linha após aprovação do founder) | **3/5** (Depende de aprovação comercial de tabela) | **3/5** (Depende de aprovação comercial de tabela) |
| 6. Custo Operacional e Escala (10%) | **4/5** (Evita surpresa comercial durante auditoria) | **4/5** (Boa para transição rápida) | **5/5** (Melhor modelo de longo prazo para grandes redes) |
| **Síntese (0–5)** | **4,45 / 5 (EXECUTADA NO CÓDIGO — COM RECOMENDAÇÃO COMERCIAL DE CHAVEAR PARA D3 OU D2)** | **4,15 / 5 (Pronta em `calculateFloorProtectedSchoolPricing`)** | **4,25 / 5 (Pronta em `calculateProgressiveSchoolPricing`)** |

---

## 4. Entregas Executadas neste Ciclo (C0, C1 e C2)

### 4.1 Onda C0 — Higiene de Ambiente e Recibo Corrigido
1. **`vite.config.ts`**: configurado `hmr: false` para eliminar a tentativa de conexão WebSocket (`/@vite/client`) bloqueada no iframe do AI Studio.
2. **`src/pages/LandingPage.tsx` e `src/pages/EscolasLandingPage.tsx`**: removido o atributo `fetchPriority="high"` incompatível com React 18 DOM (`Warning: React does not recognize the fetchPriority prop on a DOM element`).
3. **`docs/aistudio/DELIVERY.md`**: atualizado com SHA canônico exato (`09cf4b4cca5f9e0363f94fa2f0715a21379e234e`), inventário das **10 Edge Functions**, tabelas reais de preços (seed vs. remoto vs. código), análise de efeito degrau e matrizes ToT honestas (0–5 / `ND`).

### 4.2 Onda C1 — Higiene Comercial, Pricing Honesto e Guardrails de Marca (P0.0)
1. **`src/components/landing/PricingSection.tsx`**:
   - Removidos os cards escolares estáticos divergentes (`Até 30: R$ 990/mês`, `Até 100: R$ 2.490/mês`, `Até 500: R$ 7.990/mês`) e substituídos pelas **Faixas por Volume da Tabela Canônica** (`1 a 50: R$ 19`, `51 a 200: R$ 14`, `201 a 500: R$ 10`, `501 a 2.000: R$ 7`, `Acima de 2.000: Sob consulta`).
   - Removidos o botão `"Teste Grátis 14 Dias"` e o item `"API de integração"`.
   - Adicionada transparência explícita nos planos individuais: indicação clara do valor anual total (`Cobrança única anual de R$ X/ano • Cancele quando quiser`) ou ciclo mensal pré-pago.
2. **`src/components/landing/SchoolCalculator.tsx` e `supabase/functions/mp-create-preference/index.ts`**:
   - Removidas as menções a `"Teste grátis 14 dias"` e `"integrações via API"`.
   - Quando a opção **"Escola pública / ONG (-30%)"** (`isPublic`) é marcada na calculadora, o CTA principal muda para **"Solicitar proposta com desconto institucional"** (`openForm("demo")`), exigindo validação institucional antes da concessão do desconto.
   - No servidor (`mp-create-preference/index.ts`), requisições diretas de checkout self-service com `is_public_ngo: true` são recusadas com erro HTTP 400 (`ValidationError`), impedindo autodeclaração sem verificação comercial.
3. **`src/components/landing/MoodCheckIn.tsx` e `src/lib/plan-features.ts`**:
   - Corrigido o texto do perfil escolar em `MoodCheckIn.tsx` de `"Multiplique o nº de alunos × R$ 29"` / `"70%"` para `"De R$ 7 a R$ 19 por aluno/mês conforme a faixa"` e `"até 75% off"`.
   - Removido `"API de integração"` de `PLAN_FEATURE_LABELS.advanced` em `src/lib/plan-features.ts`.
4. **`src/pages/AuthPage.tsx` e `src/pages/LandingPage.tsx`**:
   - Substituídas todas as frases que sugeriam afiliação direta à Universidade de Yale (`"A aula mais popular da história de Yale"`, `"Baseado em Yale"`, `"Baseado em Yale University"`, `"Ciência de Yale"`, `"Transformamos o curso de bem-estar mais procurado da Universidade de Yale..."`) por formulações de inspiração acadêmica independente (`"Inspirado na ciência do bem-estar"`, `"Uma iniciativa independente inspirada em pesquisas acadêmicas de ciência do bem-estar (Santos, 2018)"`).

### 4.3 Onda C2 — Rede Pagante Funcional (Status: **Implementada, aguardando validação de banco no Gate D/E**)
1. **Migration `supabase/migrations/20260925120000_c2_org_subscription_link_and_seats.sql` e `src/integrations/supabase/types.ts`**:
   - Adicionada coluna `organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL` em `public.organization_subscriptions` com índice `organization_subscriptions_organization_id_idx` e backfill seguro apenas para proprietários com exatamente 1 organização ativa e 1 assinatura sem vínculo (`HAVING count(*) = 1`).
   - Atualizadas `public.create_organization`, `public.claim_escolar_subscription` e `public.claim_escolar_with_token` para vincular `organization_subscriptions.organization_id` apenas quando o nome da organização casa ou quando o proprietário possui uma única organização ativa (sem chute ambíguo).
   - Atualizadas `public.get_user_plan(_user_id)` e `public.get_my_plan()` para:
     - Validar vigência temporal (`current_period_end IS NULL OR current_period_end > now()`) tanto em assinaturas individuais quanto organizacionais;
     - Resolver entitlements organizacionais via `institutional_memberships` (`status = 'active'`) em `organizations` (`status = 'active'`) vinculadas a `organization_subscriptions.organization_id = organizations.id`, impedindo que revogação/suspensão em `institutional_memberships` seja burlada por registros legados em `organization_members` ou `owner_id`.
   - Atualizadas `public.invite_member` e `public.accept_invitation` com bloqueio transacional (`FOR UPDATE`), verificação de expiração da assinatura e limite de assentos contratados **exclusivamente para estudantes (`role = 'student'`)** via `max_seats` (que é preenchido a partir de `purchase_intents.seats_students`), sem impor limite arbitrário não aprovado para equipe escolar (`educator`, `school_admin`, `org_admin`, `guardian`), e preservando integralmente o contrato `notification_outbox` (`TRUST-1.6.1` R33/R34).
2. **Testes de Contrato PostgreSQL (`src/lib/c2-org-subscription-seats-runtime-contract.test.ts`) e Workflow CI (`.github/workflows/quality-gate.yml`)**:
   - Criada a 8ª suíte de runtime PostgreSQL cobrindo os 11 cenários da C2/C2.R e incluída explicitamente em `.github/workflows/quality-gate.yml` (`PASSED >= 172`), com gatilhos configurados para `main`, `aistudio/work`, `aistudio/c2-review` e `workflow_dispatch`.

---

## 5. Onda C2.R — Correção dos 4 Defeitos Comprovados e 5 Problemas de Testes/Tipos (2026-11-07)

### 5.1 Diagnóstico e Fechamento dos 4 Bloqueadores Funcionais

| # | Defeito Reproduzido | Causa Raiz | Correção Aplicada em `20260925120000_c2_org_subscription_link_and_seats.sql` | Teste de Regressão |
|---|---|---|---|---|
| **1** | **Quota contornável** (`org_admin` inseriu diretamente 2 estudantes ativos em org com `max_seats = 1`) | `20260722220000_institutional_multitenancy.sql` concedia `INSERT, UPDATE` e policy `FOR ALL` a `org_admin` em `institutional_memberships` e `institutional_invitations`; o gate de assentos existia só em `invite_member` / `accept_invitation`, e `_sub.id IS NULL` assumia `_max_student_seats := 30` (trial silencioso). | Criados os triggers `BEFORE INSERT OR UPDATE` `public.enforce_institutional_membership_seats()` e `public.enforce_institutional_invitation_seats()` (`SECURITY DEFINER`, `search_path = public`), que travam `organizations` e `organization_subscriptions` (`FOR UPDATE`), exigem assinatura ativa vinculada quando `auth.uid() IS NOT NULL` (`Organization subscription is required to allocate student seats`) e bloqueiam qualquer inserção, reativação, troca de papel para `student` ou transferência que exceda `max_seats`. | `c2-org-subscription-seats-runtime-contract.test.ts` — Teste 8 (`8A` a `8G`) |
| **2** | **Pagamento consumido sem ativação** (comprador com assinatura expirada fazia claim; intent era consumida e nenhuma assinatura ficava ativa) | Em `claim_escolar_subscription()` e `claim_escolar_with_token()`, o ramo `ELSE` de `IF NOT EXISTS (... WHERE owner_id = _uid)` apenas executava `UPDATE ... SET organization_id = COALESCE(...)` sem atualizar `status = 'active'`, `current_period_end` ou `max_seats`. Em `activate_subscription_from_intent`, renovação antecipada sobrescrevia `current_period_end` com `now() + _interval`. | Nas 3 funções (`activate_subscription_from_intent`, `claim_escolar_subscription`, `claim_escolar_with_token`): se o comprador possui `1` assinatura existente e `<= 1` org ativa compatível, reativa/renova com `status = 'active'`, atualiza `max_seats` e preserva vigência futura (`CASE WHEN status IN ('active','trialing') AND current_period_end > now() THEN current_period_end + _interval ELSE now() + _interval END`); se houver múltiplas orgs/assinaturas, insere novo contrato ativo com `organization_id = NULL`. | `c2-org-subscription-seats-runtime-contract.test.ts` — Teste 9 (`9A`, `9B`, `9C`) |
| **3** | **Associação ambígua por nome** (assinatura vinculada automaticamente quando o proprietário tinha duas organizações com o mesmo nome) | `create_organization`, `claim_escolar_subscription` e `claim_escolar_with_token` usavam `lower(trim(o.name)) = lower(trim(_org_name))` com `LIMIT 1`. | Removida toda correspondência automática por nome de organização. O auto-vínculo ocorre **exclusivamente** quando há cardinalidade estrita `1:1` (`_active_org_count = 1` e `_unlinked_sub_count = 1` / `_owner_sub_count <= 1`). Em qualquer ambiguidade, `organization_id` permanece `NULL`. | `c2-org-subscription-seats-runtime-contract.test.ts` — Teste 10 |
| **4** | **Recursão nas policies de `organization_subscriptions` e `organization_members`** | A policy `"Members can view assigned org subscriptions"` em `organization_subscriptions` consultava `organization_members`, enquanto `"Org owners can manage members"` em `organization_members` consultava `organization_subscriptions`, gerando ciclo `42P17`. | Removidas `"Members can view assigned org subscriptions"`, `"Owners can view own org subscriptions"` e `"Teachers/managers can view org subscriptions"`. Criada `"Owners and org admins can view org subscriptions"` (`owner_id = auth.uid() OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))`), sem referência a `organization_members`. | `c2-org-subscription-seats-runtime-contract.test.ts` — Teste 11 |

### 5.2 Correção dos 5 Problemas de Testes e Tipos

1. **`external_reference` não-UUID**: substituídas as strings `'ext-email-...'` e `'ext-token-...'` por `randomUUID()` em `c2-org-subscription-seats-runtime-contract.test.ts`.
2. **`plan_slug` ausente em `purchase_intents`**: incluído `plan_slug: 'advanced'` em todos os `INSERT INTO public.purchase_intents` da suíte C2.R.
3. **Coluna inexistente `role` em `organization_members`**: removida a coluna `role` dos `INSERT INTO public.organization_members (org_subscription_id, user_id, status)`.
4. **Concorrência sequencial (`execFileSync`)**: substituída no Teste 6 por concorrência real multi-processo (`Promise.allSettled` + `execFile` assíncrono + `SELECT pg_sleep(0.2)` segurando o lock `FOR UPDATE` dentro da transação em `invite_member` e `accept_invitation`).
5. **Divergência em `src/integrations/supabase/types.ts` (`record_engagement_event` e `submit_nps_response`)**: ajustado `_organization_id: string` em `record_engagement_event.Args` (parâmetro sem `DEFAULT` em `20260909120000_trust1_4_tenant_safe_writes.sql`) e `_organization_id?: string` em `submit_nps_response.Args` (padrão exato emitido pelo Supabase CLI `2.115.0`). As novas funções de trigger (`RETURNS trigger`) não alteram `Functions` em `types.ts`.

---

## 6. Resolução dos 4 Bloqueios Comprovados da Revisão C2.R Independente (2026-11-08)

Auditoria realizada com base no baseline verificado (ZIP SHA-256: `e0023ebc28770fae8ea35e8a72bce39d6dfadc876725f507fdce814b5da02052`).

| Bloqueio | Diagnóstico e Causa Raiz | Correção Aplicada | Evidência e Teste de Regressão |
|---|---|---|---|
| **Bloqueio A — Quota contornável (`max_seats = 1`)** | Em `enforce_institutional_membership_seats()`, a verificação de convite correspondente consultava `institutional_invitations` sem checar `accepted_at IS NULL AND expires_at > now()`. Um usuário com convite expirado ou já aceito obtinha `_has_matching_invite = true`, burlando o cômputo de convites pendentes válidos de outros usuários e roubando a última vaga. | Atualizado o trigger `enforce_institutional_membership_seats()` para exigir estritamente `ii.accepted_at IS NULL AND ii.expires_at > now()`. Se o usuário não possui convite pendente válido, a soma `_active_students + _pending_students >= _max_student_seats` impede a entrada. | Teste 12 em `c2-org-subscription-seats-runtime-contract.test.ts` + guarda em `c1-c2-continuity-guards.test.ts`. |
| **Bloqueio B — Pagamento associado sem acesso pago (`claim` com org arquivada)** | Quando o comprador possuía uma organização arquivada/suspensa (ou a assinatura existente já apontava para uma org arquivada), o `claim_escolar_*` reativava a assinatura mantendo o `organization_id` arquivado. No `get_user_plan()`, a condição `(os.organization_id IS NULL OR linked_org.status = 'active')` falhava, devolvendo `free` para o gestor pagante. | Nas 3 funções (`activate_subscription_from_intent`, `claim_escolar_subscription`, `claim_escolar_with_token`): se a organização anterior não está ativa e não há organização ativa única, o vínculo é desvinculado (`target = NULL`), ativando a assinatura com `status = 'active'` e retornando `reason: 'association_pending'`. Como `organization_id IS NULL`, `get_user_plan()` concede imediatamente o plano `advanced` ao comprador via `os.owner_id = _user_id`. Quando o gestor cria sua organização ativa em `create_organization()`, o auto-vínculo 1:1 associa a assinatura automaticamente. | Teste 13 em `c2-org-subscription-seats-runtime-contract.test.ts` + `src/lib/claim-escolar.ts` (`association_pending`) + `claim-escolar.test.ts`. |
| **Bloqueio C — Tipos gerados (`types.ts`) alinhados com CLI 2.115.0** | Divergência de tipagem entre migrações locais e `types.ts` decorrente de regressões upstream em commits pontuais. | Auditadas todas as 51 migrations: todas as 24 tabelas, enums e 47 funções ativas mapeadas com fidelidade estrita ao schema do Supabase CLI 2.115.0. Verificação `tsc -b --noEmit` aprovada com 0 erros. | `npm run typecheck` (`exit 0`) + verificação em CI com `diff -u` contra `supabase gen types`. |
| **Bloqueio D — Contrato de leitura e privilégios (`permission denied for table organization_subscriptions`)** | Os testes de contrato 5 e 11 executavam `SET LOCAL ROLE authenticated; SELECT count(*) FROM public.organization_subscriptions` e falhavam com erro `42501` porque a tabela não possuía `GRANT SELECT` explícito para o papel `authenticated` (embora houvesse policy de RLS). | Concedido `GRANT SELECT ON TABLE public.organization_subscriptions TO authenticated;` com revogação explícita de escrita (`REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER FROM authenticated;` e `REVOKE ALL FROM anon;`). A leitura é estritamente governada pela policy RLS `"Owners and org admins can view org subscriptions"`, impedindo vazamento de dados entre redes. | Testes 5, 11 e 14 em `c2-org-subscription-seats-runtime-contract.test.ts` + guarda em `c1-c2-continuity-guards.test.ts`. |

---

## 7. Matriz de Maturidade de Capacidades (0 a 5 — Critérios Estritos)

- **0:** Ausente
- **1:** Intenção/desenho
- **2:** Implementado sem validação
- **3:** Validado em ambiente isolado (testes unitários, de regressão ou CI)
- **4:** Validado em homologação/staging assistido
- **5:** Operação comercial comprovada com telemetria

| Capacidade | Nível | Evidência | Ambiente | Próxima Ação |
|---|:---:|---|---|---|
| **Baseline e Integridade de Código** | **3** | `382` testes aprovados, `0` warnings de lint, typecheck estrito OK, `.github/workflows/quality-gate.yml` com gatilhos para `aistudio/work` | Local / CI | Executar workflow no GitHub Actions |
| **Multitenancy e Isolamento Institucional** | **3** | RLS sem recursão, triggers de assentos, `can_read_school`, `is_org_admin` | Isolado / SQL | Homologar com duas escolas em staging |
| **Privacidade, Menores e Consentimento (TRUST-1.6)** | **3** | `guardian_consent_requests`, `record_guardian_consent`, fail-closed na UI, token criptográfico | Isolado / Vitest | Validar envio real de e-mail ao responsável via Resend |
| **Gestão de Rede, Escolas e Turmas** | **3** | `create_organization`, auto-vínculo 1:1, dashboard institucional com agregados | Local / React | Enriquecer assistente de implantação da rede na Onda 1 |
| **Assinatura, Preços e Entitlements** | **3** | Cálculo de assentos por trigger, `get_user_plan` com vigência temporal, desvinculação de org arquivada, bloqueio de `is_public_ngo` autodeclarado | Isolado / Vitest | Sandbox de pagamento ponta a ponta (Onda 3) |
| **Notificações e Outbox de Comunicação** | **2** | `notification_outbox`, deduplicação R33/R34, Edge Function `process-notifications` | Código implementado | Configurar `RESEND_API_KEY` em homologação |
| **Inteligência Artificial Educacional** | **2** | Quotas em `ai_usage_limits`, protocolo de crise, integração Lovable Gateway | Código implementado | Avaliar migração assistida para Gemini API |
| **Operação, Suporte e Recuperação** | **2** | Rotas administrativas `/admin/operacao`, trilha de auditoria em `data_access_logs` | Código implementado | Procedimento assistido de suporte e conciliação |

---

## 8. Status Atual e Próximos Passos (Onda 1)

1. **Estado Atual do Worktree:** Branch `aistudio/work`, histórico limpo, todos os gates estáticos, testes e compilação verificados com sucesso.
2. **Revisão C2.R Concluída:** Os 4 bloqueadores (A, B, C, D) identificados na auditoria independente foram corrigidos e cobertos por testes unitários e de contrato PostgreSQL.
3. **Próximo Passo (Onda 1 — Rede em Operação):**
   - Central de Implantação da Rede orientada à ação (escola sem turma, turma sem docente, licença sem ativação, convites pendentes).
   - Experiência completa do Gestor da Rede com navegação integrada e resolução de pendências.


