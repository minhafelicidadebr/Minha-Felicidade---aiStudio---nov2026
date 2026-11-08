# Evidência — Falha #1 do reset integral

## Identificação

| Campo | Valor |
|---|---|
| Data | 2026-08-04 |
| Ambiente | Supabase local (Docker), portas 55321-55329 |
| Comando | `npx supabase start` (aplica migrations em banco vazio) |
| Migration que falhou | `20260706192545_fd2a8387-44ee-4778-a469-8c613dd8d130.sql` |
| Posição na sequência | 11ª de 42 |
| Migrations aplicadas com sucesso antes | 10 |

## Erro exato

```
ERROR: insert or update on table "user_roles" violates foreign key constraint
       "user_roles_user_id_fkey" (SQLSTATE 23503)
Key (user_id)=(c74e2d81-c558-4f37-9039-c6a868439934) is not present in table "users".

At statement: 0
INSERT INTO public.user_roles (user_id, role) VALUES
  ('c74e2d81-c558-4f37-9039-c6a868439934', 'student'),
  ('5b7cd28c-18cb-4892-9c96-b13376d39ef5', 'teacher'),
  ('d4cd7f45-7e14-431a-b6da-8d8896ce8c2d', 'manager')
ON CONFLICT (user_id, role) DO NOTHING
```

## Causa raiz

A migration insere registros em `public.user_roles` usando **UUIDs literais** que
referenciam `auth.users(id)` via foreign key.

Esses UUIDs correspondem a contas de teste que foram criadas **manualmente** no
painel de Auth do ambiente de produção original. Elas não existem em banco novo.

O `ON CONFLICT (user_id, role) DO NOTHING` protege contra duplicidade, mas **não**
protege contra violação de FK — o conflito só é avaliado depois que a FK passa.

## Classificação

| Campo | Valor |
|---|---|
| Tipo | Erro histórico — seed acoplado a dados criados fora de migration |
| Risco associado | R18 (registrado na sessão anterior como suspeita) |
| Status da suspeita | **CONFIRMADA** |
| Natureza | Não destrutiva; impede reconstrução do banco desde zero |
| Domínio | Seed / Teste |

## Por que isso importa

Enquanto essa migration existe nesta forma:

- o banco **não pode ser reconstruído** do zero;
- não é possível criar ambiente de staging por replay de migrations;
- não é possível provar que a sequência histórica é coerente;
- qualquer onboarding de dev novo falha no passo 11.

## Menor correção defensável

Tornar o seed **condicional à existência das contas**. O INSERT passa a derivar os
`user_id` de `auth.users` por e-mail, em vez de assumir UUIDs literais.

Em banco vazio: nenhuma linha é inserida (as contas não existem), a migration passa.
Em banco com as contas: o comportamento é o mesmo de antes.

Isso preserva a intenção original (semear papéis para contas de teste) sem acoplar
a migration a UUIDs que ela não controla.

## O que NÃO fazer

- Criar as contas de teste na migration (exigiria inserir em `auth.users`, que é
  schema gerenciado pelo Supabase, e recriaria o problema do R17)
- Remover a migration do histórico (histórico é imutável)
- Desabilitar a FK
