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
