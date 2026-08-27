# TRUST-1.1A — Estratégia de Staging

## Situação atual

| Ambiente | Existe | Observação |
|---|---|---|
| Supabase Cloud (produção) | ✅ | Projeto `ctjwyybmlwhynherikqy` |
| Supabase Cloud (staging) | ❌ | Não existe projeto separado |
| Supabase local | ❌ | `supabase start` nunca foi executado neste projeto |
| Postgres local isolado | ❌ | Não configurado |

## Opção escolhida: Supabase local (`supabase start`)

### Motivo

1. **Isola completamente de produção.** Roda num Docker local com banco próprio.
2. **Permite aplicar e ensaiar migrations.** `supabase db reset` aplica toda a
   sequência de migrations do zero — exatamente o ensaio que a TRUST-1.1B precisa.
3. **Não exige criar projeto pago nem configurar secrets.** Edge functions não
   precisam rodar para o ensaio de schema; o que importa é que o DDL passe sem
   erro.
4. **Reproduzível.** Qualquer pessoa com Docker e o CLI pode recriar o ambiente
   com um comando.

### Pré-requisitos

- Docker Desktop instalado e rodando
- Supabase CLI (`npx supabase` ou `npm install -g supabase`)
- O arquivo `supabase/config.toml` já existe com `project_id`

### Comando de ensaio

```bash
npx supabase start        # Sobe Postgres, Auth, Storage, etc.
npx supabase db reset     # Aplica migrations do zero na ordem
```

Se qualquer migration falhar, o erro aparece com o nome do arquivo que quebrou.

### Alternativa se Docker não estiver disponível

Se o ambiente do humano não tiver Docker:

1. Criar um segundo projeto Supabase (free tier) exclusivamente para staging.
2. Configurar `supabase link --project-ref <staging-ref>` nele.
3. Aplicar migrations via `supabase db push`.

Isso não será feito nesta sessão — a decisão fica com o humano.

## Status para o gate

| Critério | Status |
|---|---|
| Ambiente de staging ou local isolado existe | ⚠️ **Identificado, não verificado** — depende de Docker no host |
| Nenhuma alteração feita em produção | ✅ |
| Produção não funciona como staging | ✅ (regra respeitada) |

### Bloqueio condicional

Se Docker não estiver disponível E o humano não quiser criar projeto de staging,
a TRUST-1.1A fica **aprovada com ressalva** e a TRUST-1.1B será bloqueada até
existir ambiente de ensaio.
