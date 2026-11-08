
# Roadmap Tree-of-Thoughts — Felicidade.lab v2

Comitê interdisciplinar definiu **3 frentes** com ordem ótima de execução para máximo ROI por crédito Lovable.

---

## 🎯 Decisões do Comitê (consenso ToT)

| Frente | Decisão | Justificativa |
|---|---|---|
| Pagamento | **Stripe nativo Lovable** | Zero fricção, PIX+Cartão Brasil, 1 clique. MP exigiria edge function custom + webhooks manuais (3-4x mais créditos). |
| Calculadora | **Modelo híbrido por faixa + rede** | Detalhado abaixo. |
| Motores MTE | **5 módulos novos** substituem o pedido genérico de "3 funcionalidades por módulo" — entrega muito maior valor B2B (compliance NR-1 / Lei 14.831). |

---

## FASE 1 — Conversão & Pagamento *(execução imediata)*

### 1.1 Hero vivo
- Substituir background estático por **cena cinematográfica viva** (vídeo loop sutil ou Canvas com partículas auroras + parallax)
- Camada de leitura: tipografia editorial Playfair com **kinetic text** revelando proposta de valor
- Glassmorphism reforçado, contraste WCAG AAA garantido
- **1 imagem hero nova** (golden hour, jovem brasileira lendo no celular, expressão de descoberta)

### 1.2 FAQ corrigido
- Adicionar/atualizar item: *"Existe versão gratuita?"* → resposta clara dos planos Free vs Premium vs Escolar
- Remover qualquer afirmação ambígua sobre gratuidade

### 1.3 Stripe nativo + Produtos
- Ativar `enable_stripe_payments`
- Criar produtos: **Free (R$0)**, **Premium Individual (R$29/mês ou R$279/ano)**, **Escolar (sob calculadora)**
- Edge function `create-checkout` + webhook `stripe-webhook` para atualizar `user_subscriptions`
- Página de sucesso/cancelamento

### 1.4 Calculadora B2B Inteligente
Lógica recomendada pelo comitê (economia comportamental + ancoragem):

```text
Por aluno (mensal):
  1 – 50 alunos     R$ 19/aluno
  51 – 200          R$ 14/aluno   (-26%)
  201 – 500         R$ 10/aluno   (-47%)
  501 – 2000        R$ 7/aluno    (-63%)
  2000+             Sob consulta

Gestor/Coordenador: GRÁTIS (1 a cada 50 alunos)
Professor extra: R$ 39/mês cada

Multiplicadores de rede:
  2-3 escolas    -10%
  4-9 escolas    -18%
  10+ escolas    -25%

Anual: -20% adicional
ONG/Pública: -30% adicional (mediante comprovação)
```

UI da calculadora: slider de alunos + input de escolas + toggles → preview animado de preço/aluno e total mensal/anual, com badge "economia vs concorrente" e CTA duplo:
- **"Iniciar Trial 14 dias"** (auto-provisão)
- **"Agendar Apresentação"** (form → tabela `leads` com campos novos: estimated_students, schools_count, calculated_price)

---

## FASE 2 — 5 Motores MTE *(diferencial B2B único no Brasil)*

Ecossistema "Evidências Vivas" para Lei 14.831 (Empresa Promotora da Saúde Mental) + NR-1 (riscos psicossociais 2025).

| # | Motor | Função |
|---|---|---|
| 1 | **Evidence Forge** | Captura automática de toda interação do aluno/colaborador (módulos, dinâmicas, AlegrIA) → gera evidências assinadas digitalmente com hash + timestamp |
| 2 | **Compliance Radar** | Dashboard NR-1: mapeia riscos psicossociais por turma/setor, gera alertas, sugere intervenções baseadas em evidência |
| 3 | **Audit Vault** | Repositório imutável (append-only) de evidências, exportável em PDF assinado para fiscalização do MTE |
| 4 | **Wellbeing Index** | Índice composto (engajamento + sentimento + frequência) por unidade/turma, com benchmarking |
| 5 | **Auto-Report MTE** | Gerador de relatório oficial pronto para protocolo, com narrativa, gráficos e anexos de evidências |

**Tabelas novas:** `evidence_log`, `compliance_alerts`, `audit_exports`, `wellbeing_snapshots`
**Edge functions:** `evidence-capture` (trigger), `compliance-analyze` (Lovable AI), `generate-mte-report` (PDF)

---

## FASE 3 — 3 funcionalidades por módulo *(45 mini-features, faseado)*

Após Fases 1 e 2, entregar em **5 lotes de 3 módulos** (cada lote = 1 mensagem). Cada funcionalidade aplicada com:
- **Ciência da Aprendizagem**: spaced repetition, retrieval practice, interleaving
- **Narrativa criativa**: micro-stories, personagens, escolhas
- **Interatividade**: drag-drop, voz, gestos, AR-lite quando aplicável

(Detalhamento por módulo virá após Fases 1-2 aprovadas, para não inflar este plano)

---

## 📐 Estimativa de Créditos

| Fase | Mensagens | Justificativa |
|---|---|---|
| Fase 1 | 3-4 | Hero+FAQ (1), Stripe enable+products (1), Calculadora+Leads (1), QA (1) |
| Fase 2 | 5-6 | 1 migration grande + 5 motores (1 por motor + edge functions) |
| Fase 3 | 5 | 1 lote por mensagem |
| **Total** | **~13-15** | vs ~30+ se executássemos tudo paralelo sem ordem |

---

## ✅ Próximo passo

Aprove este plano para eu **executar Fase 1 agora** (Hero + FAQ + Stripe + Calculadora) numa única passada otimizada. Fase 2 (Motores MTE) e Fase 3 (mini-features) virão em mensagens subsequentes sob seu comando.

Quer ajustar alguma coisa antes? Ex: valores da calculadora, ordem das fases, ou trocar Stripe por edge function custom Mercado Pago?
