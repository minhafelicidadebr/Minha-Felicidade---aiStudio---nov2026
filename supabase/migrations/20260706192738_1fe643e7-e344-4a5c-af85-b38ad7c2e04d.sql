
UPDATE auth.users
SET encrypted_password = crypt('Yale#BemEstar2026!', gen_salt('bf'))
WHERE email = 'teacher@test.local';
