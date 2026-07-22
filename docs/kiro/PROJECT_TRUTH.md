# PROJECT_TRUTH — verdade técnica (curta, factual)

> Fonte de verdade = código, migrations, RLS, edge functions, testes. Doc atualizado ao fim de cada onda.

## Identidade
- Repo: `minhafelicidadebr/yale-minhafelicidade-julho` · branch `main`.
- Supabase project ref (de `supabase/config.toml`): `ctjwyybmlwhynherikqy`.
- Produto: plataforma independente de ciência do bem-estar para adolescentes (B2C + B2B escolar).
- Stack: React 18 + Vite + TS + npm + shadcn/ui + Tailwind 3 + Supabase (Lovable Cloud) + Deno edge functions. Testes: Vitest. Gate: `npm run quality`.

## Estado por domínio (verificado nesta sessão apenas para o P0.0)
- **Marca/PI/independência (P0.0):** ver COMMERCIAL_GATES. Correções P0 aplicadas em SEO
  (`index.html`), `CourseStructure`, `ConstellationPage`, `Footer` (aviso de independência).
  Manifesto de proveniência criado (`CONTENT_PROVENANCE.md`).
- **Domínio público atual:** `curso-felicidade-adolescentes-yale.lovable.app` — contém "yale"
  no domínio (risco de naming §8). Renomear é ação manual no Lovable → backlog P0-infra.
- **Entitlement / assinatura / limites de IA / idade-consentimento / testes de autorização:**
  NÃO reauditados nesta sessão (fora do escopo P0.0). Ver plano master (ONDA 1).

## O que NÃO foi verificado nesta sessão
Autorização server-side de features, proteção de assinatura, centralização de limites de IA,
fluxo de consentimento, acesso admin. Continuam pendentes de verificação na ONDA 1.
