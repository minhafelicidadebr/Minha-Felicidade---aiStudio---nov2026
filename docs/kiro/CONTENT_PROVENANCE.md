# Content Provenance Registry (manifesto canônico)

Fonte de verdade de proveniência de conteúdos. Enquanto não houver tabela/registro no banco,
este manifesto é a referência. **Regra:** nenhum novo conteúdo externo entra em produção sem
uma linha aqui com estado e evidência de licença.

## Schema (campos mínimos)

`content_id`, `title`, `content_type`, `internal_or_external`, `author`, `rights_holder`,
`source_url`, `platform`, `license_type`, `license_evidence`, `use_mode`,
`commercial_use_status`, `translation_status`, `derivative_status`, `permission_status`,
`required_attribution`, `review_status`, `reviewed_at`, `fallback_content_id`.

## Estados

`OWNED` · `LICENSED` · `OPEN_LICENSE` · `OFFICIAL_EMBED` · `EXTERNAL_LINK` ·
`PERMISSION_PENDING` · `RESTRICTED` · `REMOVED`
(itens `PERMISSION_PENDING`/`RESTRICTED`/`REMOVED` **não** aparecem em produção).

## Inventário de conteúdos externos críticos (2026-07)

| grupo | localização | tipo | plataforma | titular | estado | uso permitido |
|---|---|---|---|---|---|---|
| Vídeos das aulas (≈32) | `src/data/courseData.ts` → `videoLessons[].youtubeId` | vídeo | YouTube | canais/autores originais no YouTube | `EXTERNAL_LINK` / `OFFICIAL_EMBED` (a confirmar por vídeo) | apenas embed do player oficial ou link "Abrir na fonte"; **sem** download/hospedagem/tradução/derivação |
| Citações "The Science of Well-Being" (Yale, L. Santos) | `WellbeingScrollStory`, `ConstellationPage`, `CourseStructure`, prompts de IA | texto/citação | Yale (curso público) | Yale University / L. Santos | `EXTERNAL_LINK` (referência factual) | citação factual limitada + atribuição; sem reprodução de material do curso |
| Base de conhecimento da AlegrIA | `supabase/functions/aledria-chat` (`KNOWLEDGE_BASE`) | texto | interno (síntese autoral de conceitos gerais) | Instituto Felicidade para Todos | `OWNED` (a auditar contra reprodução verbatim) | conteúdo próprio; auditar se há trechos verbatim de material protegido → P1 |

## Pendências de identificação em UI (backlog)

- [x] **Resolvido (2026-07):** player de vídeo (`ModulePage`, painel persistente + modal) agora
  exibe `ExternalResourceNotice` ("Recurso externo": título, plataforma YouTube, link "Abrir na
  fonte"). Componente: `src/components/learning/ExternalResourceNotice.tsx`.
- Confirmar, por vídeo, o titular/canal exato de cada `youtubeId` (dado ainda não capturado em
  `courseData.ts` — hoje o rótulo mostra plataforma + link, sem nome do canal). → P1.
