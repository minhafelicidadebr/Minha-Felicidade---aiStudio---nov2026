---
inclusion: always
---

# Doutrina do projeto (não negociável)

Este projeto é uma plataforma de bem-estar emocional para **adolescentes**
brasileiros (Ciência do Bem-Estar / Yale, Instituto Felicidade Para Todos).
Qualquer trabalho aqui — inclusive o seu — segue estas regras antes de
qualquer preferência de estilo ou produtividade.

## 1. Honestidade > overclaim

Nunca fingir que algo está pronto quando não está. Se uma funcionalidade cobre
80% de um caso e falta 20%, documente os 20% que faltam explicitamente (no
código ou no commit) em vez de deixar implícito que está completo. Nunca
prometa conformidade legal ("isto resolve a LGPD") — descreva o que o código
faz tecnicamente e deixe a interpretação jurídica para humanos.

## 2. Segurança em camadas, nunca confiar no cliente

- Preço, plano, `org_id`, `user_id` — **sempre resolvidos no servidor**,
  nunca aceitos como valor enviado pelo cliente sem cruzar com o banco.
- Toda função `SECURITY DEFINER` nova termina com:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.minha_funcao(...) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.minha_funcao(...) TO service_role; -- ou authenticated, se for self-service
  ```
  e um comentário com a query de verificação (`has_function_privilege`/
  `has_table_privilege`) para conferir depois de aplicar.
- `SET search_path = public` obrigatório em toda função `SECURITY DEFINER`.
- Tabelas sensíveis (pagamento, consentimento, auditoria) não têm policy de
  `UPDATE`/`DELETE` para `authenticated` — se o dado precisa mudar de estado,
  isso é um novo evento inserido, nunca um UPDATE na linha antiga.

## 3. Ledger imutável, estado é sempre derivado

Onde já existe um padrão de ledger (INSERT-only, estado = leitura da última
linha ou fold de eventos), continue nesse padrão em vez de inventar uma coluna
mutável solta. Veja `guardian_consent_events` como referência: escrita só via
RPC, sem policy de UPDATE/DELETE, estado lido por uma RPC de leitura separada.

## 4. Já existe — não duplicar, não tocar sem necessidade

Dois sistemas críticos já estão implementados e testados. Preserve-os:

- **Protocolo de crise** (`supabase/functions/_shared/crisis.ts`): injetado no
  system prompt das 4 funções de IA. Não remova, não reordene para depois de
  outras instruções, não crie um segundo protocolo divergente.
- **Consentimento parental LGPD art. 14** (`guardian_consent_events`,
  `record_guardian_consent`, `get_my_guardian_consent_status`,
  `RequireGuardianConsent`): toda rota privada nova cai automaticamente sob
  esse gate via `App.tsx` — não precisa (e não deve) recriar a checagem.

## 5. Gate de qualidade é a definição de "pronto"

Antes de considerar qualquer tarefa concluída:

```bash
npm run quality
# = audit:security && lint && typecheck && test && build && security:gate
```

Se algo falhar, corrija a causa — nunca use `--no-verify`, nunca pule hooks,
nunca comente um teste que passou a falhar para "fazer passar".

## 6. Migrations seguem numeração e ordem do runbook

Toda migration nova é adicionada ao final de
`docs/security-invariants-runbook.md` na ordem de aplicação. Migrations são
idempotentes quando possível (`CREATE TABLE IF NOT EXISTS`,
`ON CONFLICT DO NOTHING`) porque este projeto roda em Lovable Cloud e às
vezes é aplicado manualmente via SQL Editor.
