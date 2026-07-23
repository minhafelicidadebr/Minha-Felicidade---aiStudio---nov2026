# DECISIONS — decisões (curto)

## 2026-07 · P0.0 Guardrails de marca/PI/conteúdos externos
- **D1.** Posicionamento canônico = "plataforma independente de ciência do bem-estar". Yale =
  referência acadêmica factual, nunca marca do produto/SEO/endosso.
- **D2.** SEO (`index.html`): removido "baseado na aula mais popular de Yale" e keyword "Yale";
  schema `Course` reescrito para linguagem independente. Mantido `@type: Course` (é um curso próprio).
- **D3.** Aviso de independência colocado no `Footer` (site-wide), proporcional. Não foram criadas
  páginas Sobre/Termos nesta etapa (economia de créditos; backlog P2).
- **D4.** Removido badge "WCAG 2.2" do Footer (claim de conformidade sem auditoria).
- **D5.** Domínio público contém "yale": correção é ação manual no Lovable; **não** alteramos a
  `canonical`/`og:url` no código para não apontar para domínio inexistente. Registrado como P0-infra.
- **D6.** Prompts de IA e protocolo de crise **não** foram tocados (doutrina §4). Auditoria da
  base de conhecimento contra reprodução verbatim → backlog P1.
- **D7.** Player de vídeo: rótulo "Recurso externo" não implementado agora (é um corte de UI);
  proveniência foi inventariada em `CONTENT_PROVENANCE.md`. → NEXT_ACTION.
- **D8.** P0.0 classificado como **parcialmente aprovado** (honestidade > overclaim).

## 2026-07 · Fechamento do P0.0 (D7)
- **D9.** Criado `ExternalResourceNotice` (componente reutilizável) e aplicado nos dois players de
  vídeo do `ModulePage` (painel persistente + modal). Mostra título, plataforma (YouTube) e link
  "Abrir na fonte". Não inclui nome do canal/titular por vídeo — esse dado não existe hoje em
  `courseData.ts` (`VideoLesson` não tem campo `channel`/`author`). Adicionar esse campo é P1
  (exigiria popular ~32 registros; fora do escopo deste corte pontual).
- Gate P0.0 reclassificado de "parcialmente aprovado" para **aprovado**.

## 2026-07 · ONDA 1 Corte 1.1 — Entitlement canônico
- **D10.** `get_my_plan()` já era a fonte única correta (SECURITY DEFINER, REVOKE/GRANT ok). O
  problema não era o RPC, era a ausência de enforcement nas rotas. Decisão: não recriar o RPC,
  só consumir com um novo guard de rota.
- **D11.** Criado `RequireFeature` (não reescrevi `FeatureGate`) porque `FeatureGate` é um padrão
  de blur/upsell inline dentro de uma página, enquanto o problema era proteger a ROTA inteira
  antes de montar o componente da ferramenta. São usos complementares, não duplicados.
- **D12.** Preservei o literal exato exigido por `scripts/security-gate.mjs` para
  `RequireRole` (`<RequireRole allowedRoles={route.roles}>{route.element}</RequireRole>`) —
  primeira tentativa de refatorar com variável intermediária quebrou o gate; corrigido com
  ternário aninhado em vez de reassignment.
- **D13.** Não toquei no gate inline de `ModulePage` (`moduleAllowed`) nesta rodada — mesmo bug de
  fail-open, mas é local e de menor risco (módulo gratuito real é só 1 de 5); registrado no
  backlog para não ampliar o escopo do corte.

## 2026-07 · ONDA 1 Corte 1.2 — Integridade da assinatura
- **D14.** `user_subscriptions` confirmada limpa: policies de INSERT/UPDATE para `authenticated`
  foram removidas na migration `20260613144818`. Nenhuma migration posterior as recriou.
- **D15.** `organization_subscriptions` tinha uma policy de UPDATE para `authenticated`
  (`"Owners can update own org subscriptions"`, criada em `20260709164308`) que permitia ao
  owner_id alterar QUALQUER coluna (plan_id, status, max_seats, current_period_end) diretamente
  via PostgREST. Decisão: remover (migration `20260722190000`). Nenhuma funcionalidade do app
  exige UPDATE direto pelo client — todas as escritas legítimas passam por RPCs SECURITY DEFINER.
- **D16.** Não toquei em `request_subscription_cancellation` (é SECURITY DEFINER, self-scoped,
  só altera `cancel_at_period_end` — campo diferente de plan/status/vigência/seats). É legítima.

## 2026-07 · ONDA 1 Corte 1.3 — Limites de IA centralizados
- **D17.** `enforce_ai_usage_limit` tinha limites hardcoded (80 para aledria-chat, 30/20/20
  para demais). Plano gratuito no schema e na landing promete 9/dia; premium promete ilimitado.
  Inconsistência = violação do critério "todos exibem a mesma regra".
- **D18.** Correção: aledria-chat agora lê `get_my_plan()->'limits'->'alegria_daily'` (fonte
  canônica única = tabela subscription_plans.limits). Se -1, retorna allowed=true sem contar.
  Se null, fallback conservador = 9.
- **D19.** Demais funções de IA (cognitive-mirror, future-self, signature-strengths) mantêm
  limites fixos porque não são feature comercializada com diferenciação por plano na landing.
  Se um dia forem, migrar para o mesmo padrão.
- **D20.** Não alterei a edge function em si — ela já chama `enforceAiUsageLimit()` antes do
  gateway. A mudança é só no RPC que ela invoca (banco); o deploy das functions não precisa ser
  refeito para este corte.

## 2026-07 · ONDA 1 Corte 1.4 — Idade e consentimento
- **D21.** `set_my_birth_date` confirmada single-fill: lança exceção se `birth_date IS NOT NULL`.
- **D22.** `guardian_consent_events` confirmado como ledger imutável (sem UPDATE/DELETE para
  authenticated). Estado derivado via RPC `get_my_guardian_consent_status` (SECURITY DEFINER,
  self-scoped). Tudo ok.
- **D23.** **GAP P0 real encontrado:** `profiles` tem policy "Users can update own profile"
  FOR UPDATE sem restrição de colunas. Um adolescente podia alterar `birth_date` diretamente
  via PostgREST para uma data de adulto, contornando o gate. Correção: trigger
  `trg_protect_birth_date` (BEFORE UPDATE) que impede qualquer alteração de `birth_date` quando
  ela já estiver preenchida. Defesa em profundidade (funciona mesmo com service_role).
- **D24.** Não alterei a policy de UPDATE de profiles para não quebrar edição de nome/avatar.
  O trigger é mais cirúrgico e protege a coluna específica.

## 2026-07 · ONDA 2 — RPCs institucionais
- **D25.** Decidi NÃO criar RPCs de "criar escola" e "criar turma" como RPCs dedicadas nesta
  rodada. A policy de `schools`/`classes` já permite INSERT/UPDATE/DELETE para org_admin via RLS.
  O org_admin pode usar diretamente `supabase.from('schools').insert(...)`. RPCs mais elaboradas
  (com validação de max_schools_per_org, etc.) ficam pra quando houver regra de negócio real.
- **D26.** `accept_invitation` exige `email_confirmed_at IS NOT NULL` — segue o mesmo padrão do
  `claim_escolar_subscription` (segurança por construção). Não cria conta automaticamente.
- **D27.** Idempotência em todas as RPCs: `create_organization` retorna a org existente se
  o mesmo owner+name já existe; `invite_member` retorna o convite existente se pendente;
  `accept_invitation` usa ON CONFLICT DO UPDATE (reativa se status=removed).
- **D28.** notification_outbox: enqueue best-effort (EXCEPTION handler silencia se a tabela não
  existir em ambiente de teste ou se o dedupe violar unique). Não bloqueia o fluxo principal.
