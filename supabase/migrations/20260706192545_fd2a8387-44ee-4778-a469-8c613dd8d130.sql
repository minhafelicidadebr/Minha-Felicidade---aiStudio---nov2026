
INSERT INTO public.user_roles (user_id, role) VALUES
  ('c74e2d81-c558-4f37-9039-c6a868439934', 'student'),
  ('5b7cd28c-18cb-4892-9c96-b13376d39ef5', 'teacher'),
  ('d4cd7f45-7e14-431a-b6da-8d8896ce8c2d', 'manager')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.profiles (user_id, full_name)
SELECT u.id, split_part(u.email, '@', 1)
FROM auth.users u
WHERE u.email IN ('student@test.local','teacher@test.local','manager@test.local')
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);
