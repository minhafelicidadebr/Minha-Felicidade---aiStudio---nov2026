-- ─────────────────────────────────────────────────────────────────────────────
-- SEED de papéis para contas de teste.
--
-- CORREÇÃO TRUST-1.1B (2026-08-04) — R18
-- Nome e timestamp do arquivo PRESERVADOS (histórico de migrations é imutável).
--
-- Forma original: INSERT em public.user_roles com três UUIDs literais.
-- Falha: public.user_roles.user_id tem FK para auth.users(id). Os UUIDs
-- literais correspondiam a contas criadas MANUALMENTE no painel de Auth do
-- ambiente original — não existem em banco novo. Em `db reset` a migration
-- abortava com SQLSTATE 23503, impedindo a reconstrução do banco desde zero.
-- O `ON CONFLICT DO NOTHING` não protege: a FK é avaliada antes do conflito.
--
-- Correção: os user_id passam a ser DERIVADOS de auth.users por e-mail.
--   • banco vazio  → nenhuma linha selecionada, nenhuma linha inserida, passa;
--   • banco com as contas → mesmo resultado da forma original.
--
-- Esta migration NÃO cria contas de autenticação e NÃO define credenciais.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, seed.role
FROM (VALUES
  ('student@test.local', 'student'::public.app_role),
  ('teacher@test.local', 'teacher'::public.app_role),
  ('manager@test.local', 'manager'::public.app_role)
) AS seed(email, role)
JOIN auth.users u ON u.email = seed.email
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.profiles (user_id, full_name)
SELECT u.id, split_part(u.email, '@', 1)
FROM auth.users u
WHERE u.email IN ('student@test.local','teacher@test.local','manager@test.local')
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

-- Verificação:
--   SELECT count(*) FROM public.user_roles ur
--     JOIN auth.users u ON u.id = ur.user_id
--    WHERE u.email LIKE '%@test.local';   -- 0 em banco limpo
