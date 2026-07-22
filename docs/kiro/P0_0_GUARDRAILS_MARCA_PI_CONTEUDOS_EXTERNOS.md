# P0.0 — Guardrails de Marca, Propriedade Intelectual, Conteúdos Externos e Independência Institucional

> **Classificação:** guardrail transversal obrigatório de produto, engenharia, conteúdo,
> comunicação e comercialização. Este documento **não substitui revisão jurídica**.

## 1. Decisão institucional canônica

A plataforma é apresentada como **solução educacional brasileira e independente** que
desenvolve experiências autorais (aprendizagem, prática, reflexão, gamificação, IA,
implementação escolar) em ciência do bem-estar.

**Pode:** mencionar referências acadêmicas; indicar cursos externos; disponibilizar links;
incorporar players oficiais autorizados pela plataforma de origem; criar atividades próprias
sobre conhecimentos científicos gerais.

**Não pode aparentar** (sem autorização documental): app oficial da Yale; versão brasileira
de curso da Yale; curso Yale gamificado; extensão/parceria/licença/certificação Yale; produto
oficial do Coursera; proprietária dos vídeos externos.

## 2. Posicionamento comercial

A contratação remunera **valor próprio**: tecnologia, metodologia autoral, atividades,
gamificação, IA, progressão, acompanhamento, dashboards, suporte, implantação escolar,
relatórios, formação. **Nunca** apresentar como pagamento pelo acesso a vídeos públicos ou
cursos de terceiros.

## 3. Conteúdo público ≠ livre

Conteúdo publicamente acessível **não** é automaticamente domínio público / livre para
adaptar, traduzir, reproduzir ou explorar comercialmente. Antes de usar recurso externo,
determinar: titular, fonte, licença, permissão de incorporação, uso comercial, atribuição,
tradução/adaptação/reprodução e autorização adicional.

## 4. Uso permitido por padrão (sem análise específica)

Permitido: link para a fonte oficial; player oficial da origem; citação factual e limitada;
referência bibliográfica; identificação de autor/instituição; atividades autorais sobre
conceitos gerais; sínteses próprias; indicação de leitura/curso complementar.

**Proibido por padrão:** download, reupload, hospedagem própria, edição de vídeo, extração de
áudio, reprodução de transcrição, tradução integral, legendagem própria, cópia de
quizzes/exercícios/roteiros, versões derivadas por IA, uso de conteúdo protegido em RAG/fine-tuning.

## 5. Aviso de independência institucional

Texto equivalente a: *"Esta plataforma é desenvolvida e operada de forma independente. Não é
afiliada, patrocinada, certificada, licenciada ou endossada por Yale University, Coursera,
YouTube ou por outras instituições eventualmente mencionadas, salvo relação expressamente
identificada e documentalmente autorizada. Marcas e conteúdos de terceiros pertencem aos seus
respectivos titulares."* Deve aparecer em Sobre, metodologia, termos, referências, materiais
comerciais, propostas/contratos e páginas com risco de confusão. Claro e proporcional, sem
excesso visual.

## 6. Aviso para recursos externos

Ao exibir vídeo/artigo/curso externo, identificar como **"Recurso externo"** com título,
autor/instituição, plataforma de origem, link "Abrir na fonte" e nota de que direitos e
condições permanecem dos titulares.

## 7. Content Provenance Registry

Registro canônico de proveniência (ver `CONTENT_PROVENANCE.md`). Estados: `OWNED`, `LICENSED`,
`OPEN_LICENSE`, `OFFICIAL_EMBED`, `EXTERNAL_LINK`, `PERMISSION_PENDING`, `RESTRICTED`, `REMOVED`.
Recursos `PERMISSION_PENDING`/`RESTRICTED`/`REMOVED` não aparecem em produção. Novos conteúdos
externos exigem proveniência mínima.

## 8. Proteção da marca própria

O termo "Yale" não deve funcionar como nome de produto/app/curso, selo, badge, plano, domínio
principal, título de certificado, elemento dominante de SEO ou promessa de autoridade. Menções
factuais só em páginas de referência: necessárias, proporcionais, sem sugerir parceria, sem
logotipo não autorizado, acompanhadas do aviso de independência.

## 9. Claims proibidos sem autorização

"aplicativo oficial do curso", "parceria com Yale", "certificação Yale", "conteúdo licenciado
por Yale", "metodologia Yale", "adaptação oficial", "versão brasileira", "curso de Yale com
IA", "aprovado/endossado por Yale", "plataforma que aprimora o curso de Yale".

**Preferir:** "plataforma independente", "ciência do bem-estar", "informada por evidências",
"referências acadêmicas selecionadas", "atividades autorais", "experiências interativas
próprias", "implementação escolar", "contextualização brasileira", "recursos externos
indicados de forma complementar".

## 10. Guardrails de IA

Nenhum modelo recebe conteúdo protegido integral para resumo/tradução/material
substitutivo/quizzes derivados/reprodução de aula/roteiro equivalente/RAG/fine-tuning/
reconstrução de módulos. Preferir: conteúdos próprios, fontes licenciadas, referências
permitidas, conceitos gerais, materiais com proveniência registrada, claims aprovados. Toda
geração com recuperação documental registra a origem das fontes.

## Integração com o P0 principal

Este guardrail se aplica **durante** todos os cortes do P0 (entitlement, assinatura, limites de
IA, idade/consentimento, acesso admin, testes de autorização): catálogo de planos não vende
acesso a conteúdo externo como ativo próprio; upgrade promove funcionalidades próprias; prompts
não reproduzem material externo; certificados/dashboards não sugerem credencial de terceiros;
claims de landing/checkout respeitam a independência institucional.
