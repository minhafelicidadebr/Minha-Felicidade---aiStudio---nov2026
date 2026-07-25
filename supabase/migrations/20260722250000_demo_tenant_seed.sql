-- ONDA 3.2 — Tenant demonstrativo (dados sintéticos para apresentações comerciais)
-- Popula uma organização de DEMONSTRAÇÃO com escolas, turmas, membros e convites
-- fictícios, para que a equipe comercial mostre o painel institucional cheio
-- SEM depender de um piloto real e SEM nenhum dado pessoal verdadeiro.
--
-- Tudo é claramente identificado como demonstração (metadata.is_demo = true,
-- nomes com "(DEMONSTRAÇÃO)"). Idempotente (IDs fixos + ON CONFLICT DO NOTHING).
--
-- O org_admin da demo é a conta demo (ajuste o UUID abaixo se a sua conta demo
-- tiver outro id). Ao entrar em /org com a conta demo, o painel aparece cheio.

DO $$
DECLARE
  _demo_admin uuid := '2f44f897-2531-481b-a7f5-be9e5c9a522d'; -- conta demo (minhafelicidadebr@gmail.com)
  _org_id uuid := '00000000-0000-4000-8000-0000000000d0';
  _school_a uuid := '00000000-0000-4000-8000-0000000000d1';
  _school_b uuid := '00000000-0000-4000-8000-0000000000d2';
  _class_a1 uuid := '00000000-0000-4000-8000-0000000000e1';
  _class_a2 uuid := '00000000-0000-4000-8000-0000000000e2';
  _class_b1 uuid := '00000000-0000-4000-8000-0000000000e3';
  i integer;
BEGIN
  -- Organização de demonstração
  INSERT INTO public.organizations (id, name, slug, owner_id, status, metadata)
  VALUES (_org_id, 'Rede Exemplo de Bem-Estar (DEMONSTRAÇÃO)', 'demo-rede-exemplo', _demo_admin, 'active',
          jsonb_build_object('is_demo', true))
  ON CONFLICT (id) DO NOTHING;

  -- Escolas
  INSERT INTO public.schools (id, organization_id, name, municipality, state_code, metadata) VALUES
    (_school_a, _org_id, 'EMEF Girassol (exemplo)', 'São Paulo', 'SP', jsonb_build_object('is_demo', true)),
    (_school_b, _org_id, 'Colégio Aurora (exemplo)', 'Belo Horizonte', 'MG', jsonb_build_object('is_demo', true))
  ON CONFLICT (id) DO NOTHING;

  -- Turmas
  INSERT INTO public.classes (id, school_id, name, year, semester, metadata) VALUES
    (_class_a1, _school_a, '9º Ano A', 2026, 1, jsonb_build_object('is_demo', true)),
    (_class_a2, _school_a, '9º Ano B', 2026, 1, jsonb_build_object('is_demo', true)),
    (_class_b1, _school_b, '1º Médio', 2026, 1, jsonb_build_object('is_demo', true))
  ON CONFLICT (id) DO NOTHING;

  -- org_admin (conta demo)
  INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
  VALUES (_org_id, _demo_admin, 'org_admin', 'active')
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  -- 2 educadores fictícios
  INSERT INTO public.institutional_memberships (organization_id, user_id, role, school_id, status) VALUES
    (_org_id, '00000000-0000-4000-8000-0000000000f1', 'educator', _school_a, 'active'),
    (_org_id, '00000000-0000-4000-8000-0000000000f2', 'educator', _school_b, 'active')
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  -- 24 estudantes fictícios distribuídos nas turmas (UUIDs determinísticos)
  FOR i IN 1..24 LOOP
    INSERT INTO public.institutional_memberships (organization_id, user_id, role, school_id, class_id, status)
    VALUES (
      _org_id,
      ('00000000-0000-4000-8000-' || lpad((100 + i)::text, 12, '0'))::uuid,
      'student',
      CASE WHEN i <= 16 THEN _school_a ELSE _school_b END,
      CASE WHEN i <= 8 THEN _class_a1 WHEN i <= 16 THEN _class_a2 ELSE _class_b1 END,
      'active'
    )
    ON CONFLICT (organization_id, user_id, role) DO NOTHING;
  END LOOP;

  -- Convites pendentes (mostra "adesão em andamento")
  INSERT INTO public.institutional_invitations (organization_id, invited_email, role, school_id, invited_by, expires_at) VALUES
    (_org_id, 'novo.professor@exemplo.com', 'educator', _school_a, _demo_admin, now() + interval '20 days'),
    (_org_id, 'aluno.pendente1@exemplo.com', 'student', _school_a, _demo_admin, now() + interval '20 days'),
    (_org_id, 'aluno.pendente2@exemplo.com', 'student', _school_b, _demo_admin, now() + interval '20 days')
  ON CONFLICT (organization_id, invited_email, role) DO NOTHING;
END;
$$;

-- Verificação:
-- SELECT name, metadata->>'is_demo' AS demo FROM public.organizations WHERE slug = 'demo-rede-exemplo';
-- SELECT count(*) FROM public.institutional_memberships WHERE organization_id = '00000000-0000-4000-8000-0000000000d0'; -- 27 (1 admin + 2 edu + 24 alunos)
