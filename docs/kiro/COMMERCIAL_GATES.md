# COMMERCIAL_GATES — gates comerciais e checklist P0.0

## Checklist de aceite P0.0
- [x] ocorrências críticas de marca/PI/conteúdo externo inventariadas (buscas direcionadas).
- [x] nenhuma tela **pública** sugere parceria/certificação/produto oficial Yale (SEO, landing,
      footer corrigidos).
- [~] nenhum certificado sugere emissão por terceiros — nenhum template de certificado com "Yale"
      encontrado; verificação do gerador de certificado fica no backlog (P1).
- [~] conteúdos externos identificados — manifesto criado; **falta** rótulo "Recurso externo" no
      player de vídeo (`ModulePage`). → parcial.
- [x] posicionamento comercial remunera valor próprio (planos/upgrade promovem funcionalidades
      próprias; sem venda de "acesso a vídeos de terceiros").
- [x] aviso de independência institucional presente (Footer, site-wide).
- [x] estrutura inicial de proveniência existe (`CONTENT_PROVENANCE.md`).
- [~] novos conteúdos externos dependem de classificação — regra documentada; **não** há bloqueio
      técnico automatizado ainda (P1).
- [~] IA não usa corpus protegido não autorizado — prompts citam o currículo como referência;
      auditoria de reprodução verbatim na `KNOWLEDGE_BASE` fica no backlog (P1).
- [x] riscos não críticos registrados no backlog (abaixo).
- [x] P0 original pode continuar sem nova auditoria integral.

## Estado do gate P0.0
**PARCIALMENTE APROVADO.** Riscos de linguagem pública (aparência de oficial/endosso) corrigidos;
aviso de independência publicado; proveniência inventariada. Pendências que impedem "aprovado
pleno": (a) identificação "Recurso externo" no player de vídeo; (b) renomear domínio público com
"yale"; (c) auditoria verbatim da base da IA; (d) bloqueio técnico de novo conteúdo externo.

## Backlog priorizado (marca/PI/conteúdo externo)
### P0 (infra/manual — fora de código)
- Renomear domínio público `...-yale.lovable.app` para domínio sem marca de terceiro (Lovable).

### P1
- Rótulo "Recurso externo" (autor/plataforma/link oficial) no player de vídeo em `ModulePage`.
- Auditar `KNOWLEDGE_BASE` da AlegrIA contra reprodução verbatim de material protegido.
- Confirmar, por vídeo, titular e player oficial no inventário de proveniência.
- Verificar template do certificado digital (não sugerir credencial de terceiros).
- Qualificar citação/quote de L. Santos em `WellbeingScrollStory` com nota de independência.
- Bloqueio técnico: impedir adição de conteúdo externo sem linha de proveniência.

### P2
- Renomear repositório GitHub (contém "yale") — baixo risco de exposição pública.
- Páginas dedicadas Sobre / Metodologia / Termos com aviso de independência ampliado.
