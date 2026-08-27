import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `supabase/.temp` guarda artefatos gerados pelo Supabase CLI ao subir o
  // stack local (inclusive bundles minificados do edge runtime). Não é código
  // do projeto e não deve derrubar o gate de qualidade de quem roda o ambiente
  // local — TRUST-1.1B.
  // `.trust1-*` são diretórios de trabalho e evidência das ondas TRUST (também
  // no .gitignore). Guardam snapshots de schema e tipos gerados para comparação
  // — não são código do projeto — TRUST-1.5.
  { ignores: ["dist", "supabase/.temp", ".trust1-*"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      // shadcn/ui intentionally colocates variant helpers and primitives.
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: [
      "src/components/learning/LearningFX.tsx",
      "src/components/learning/NarrativeJourney.tsx",
      "src/components/learning/NeonConfettiFX.tsx",
    ],
    rules: {
      // These learning kits intentionally colocate visual primitives, hooks, and reusable content definitions.
      "react-refresh/only-export-components": "off",
    },
  },
);
