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
