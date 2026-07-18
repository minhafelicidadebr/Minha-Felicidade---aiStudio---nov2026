# Design Document

Consentimento de contas legadas (data de nascimento ausente)

## Overview

O Delta 1 fechou o fail-open do gate de consentimento. Como efeito colateral
declarado, contas legadas com `profiles.birth_date = NULL` (reason
`unknown_birth_date`) passaram a cair em `error_locked` — uma tela terminal
sem saída. Este design adiciona um caminho self-service para essas contas
informarem a data de nascimento uma única vez e, em seguida, serem roteadas
corretamente (adulto → acesso liberado; menor → fluxo de consentimento do
responsável já existente), **sem reabrir o fail-open**.

Princípio central: `unknown_birth_date` é um estado *identificável e
resolvível* — diferente de erro/timeout/payload malformado, que permanecem
`error_locked`. Portanto ele merece um estado de gate próprio (`needs_birth_date`)
com um destino de ação, em vez da tela de erro terminal.

## Decisão da questão em aberto (rota dedicada vs. reaproveitar consentimento)

**Escolhido: rota dedicada `/completar-cadastro`.**

A página `/consentimento-responsavel` (`GuardianConsentPage`) pressupõe que o
usuário é menor: seu texto e formulário coletam **nome e e-mail do
responsável** e afirmam "como você tem menos de 18 anos…". Para uma conta
legada de **adulto/staff**, isso é factualmente errado e confuso. Uma rota
dedicada que pede apenas a data de nascimento é correta para os dois desfechos
(adulto e menor) e mantém o fluxo de responsável intacto e sem duplicação.

Rejeitada a alternativa de embutir um passo de data na página de consentimento:
misturaria dois propósitos (estabelecer idade × autorizar responsável) e
poluiria um fluxo hoje limpo.

## Architecture

```text
Rota privada
  → RequireAuth (sessão válida?)                     [inalterado]
    → RequireGuardianConsent
        chama get_my_guardian_consent_status()
        decideGuardianConsentGate(...) →
          • "clear"            → renderiza conteúdo privado
          • "blocked"          → <Navigate /consentimento-responsavel>   [inalterado]
          • "needs_birth_date" → <Navigate /completar-cadastro>          [NOVO]
          • "error_locked"     → tela de recuperação (erro/timeout/malformado) [inalterado]

/completar-cadastro  (RequireAuth, FORA do gate de consentimento — evita loop)
  → BirthDateCompletionPage
      valida data (isValidPastDate)
      chama RPC set_my_birth_date(_birth_date)         [NOVO, self-scoped]
      ao sucesso → navigate(redirect original)
        → RequireGuardianConsent reavalia:
             adulto → "clear"; menor → "blocked" → /consentimento-responsavel
```

O roteamento pós-data **não duplica** a lógica de idade no cliente: após gravar
a data, navegamos ao `redirect` original e deixamos o próprio
`RequireGuardianConsent` reavaliar via RPC (fonte de verdade no servidor).

## Components and Interfaces

### 1. Função pura de decisão (`src/lib/guardian-consent.ts`)

Adicionar o valor `"needs_birth_date"` ao tipo `ConsentGateDecision` e tratar
o caso identificável:

```ts
export type ConsentGateDecision =
  | "clear" | "blocked" | "needs_birth_date" | "error_locked";

// ...dentro de decideGuardianConsentGate, ANTES do tratamento genérico:
// (mantém error_locked para erro/timeout/payload malformado)
if (p.reason === "unknown_birth_date") return "needs_birth_date";
```

Invariante preservado: `error` (RPC/sessão), `payload == null`,
`typeof requires_consent !== "boolean"` continuam retornando `error_locked`
ANTES desta linha. Só a `reason` explícita e confiável `unknown_birth_date`
vira `needs_birth_date`.

### 2. Guard (`src/components/routing/RequireGuardianConsent.tsx`)

Mapear o novo estado para um redirect (análogo ao `blocked`), preservando o
`redirect` da rota de origem:

```tsx
if (status === "needs_birth_date") {
  return (
    <Navigate
      to={`/completar-cadastro?redirect=${encodeURIComponent(location.pathname + location.search)}`}
      replace
    />
  );
}
```

`error_locked`, `checking`, `blocked` e `clear` permanecem exatamente como no
Delta 1.

### 3. Nova página `BirthDateCompletionPage` (`src/pages/BirthDateCompletionPage.tsx`)

- Formulário mínimo: um `input type="date"` (mesmo padrão do `AuthPage`), com
  `max` = hoje.
- Valida no cliente com `isValidPastDate` (reuso; mensagem clara se inválida).
- Ao submeter, chama `supabase.rpc("set_my_birth_date", { _birth_date })`.
- Sucesso → `navigate(getSafeRedirectPath(searchParams.get("redirect")), { replace: true })`.
- Erro → toast (reusa `useToast`), permanece na página (fail-closed: sem data
  gravada, o gate seguirá bloqueando).
- Acessibilidade: heading focável, label associada ao input, estado de loading
  no botão, cópia não alarmista explicando por que pedimos a data (LGPD art. 14,
  estabelecer se é necessário o consentimento do responsável).

### 4. Roteamento (`src/App.tsx`)

Registrar `/completar-cadastro` atrás de `RequireAuth` **e fora** de
`RequireGuardianConsent` — mesmo padrão de `/consentimento-responsavel` e das
páginas de retorno de assinatura, para não criar loop de redirect:

```tsx
<Route path="/completar-cadastro" element={
  <RequireAuth><BirthDateCompletionPage /></RequireAuth>
} />
```

### 5. Migration: RPC `set_my_birth_date` (novo arquivo em `supabase/migrations/`)

`SECURITY DEFINER`, self-scoped, preenchimento único:

```sql
CREATE OR REPLACE FUNCTION public.set_my_birth_date(_birth_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _current date;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF _birth_date IS NULL
     OR _birth_date >= current_date
     OR date_part('year', age(now(), _birth_date)) >= 120 THEN
    RAISE EXCEPTION 'Invalid birth_date' USING ERRCODE = '22023';
  END IF;

  SELECT birth_date INTO _current FROM public.profiles WHERE user_id = _uid;

  -- Preenchimento único: só grava quando ainda não há data (fail-closed;
  -- não permite reescrever para burlar o gate). Alteração de data existente
  -- fica fora deste fluxo.
  IF _current IS NOT NULL THEN
    RAISE EXCEPTION 'birth_date already set' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles SET birth_date = _birth_date WHERE user_id = _uid;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'UPDATE', 'profiles.birth_date', 'lgpd_art14_age_determination',
          jsonb_build_object('scope_type', 'self'), 1);

  RETURN jsonb_build_object('birth_date', _birth_date);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_my_birth_date(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_birth_date(date) TO authenticated;

-- VERIFICAÇÃO (rodar após aplicar):
-- SELECT has_function_privilege('anon',          'public.set_my_birth_date(date)', 'EXECUTE'); -- false
-- SELECT has_function_privilege('authenticated', 'public.set_my_birth_date(date)', 'EXECUTE'); -- true
```

Nota: `profiles` já é escrita apenas por caminhos controlados; esta RPC é a
única via para preencher `birth_date` pós-cadastro, e apenas para a própria
conta, apenas quando nula.

## Data Models

Sem tabela nova. `profiles.birth_date` (já existente, `date NULL`) passa a ser
preenchível uma vez via RPC. O ledger `guardian_consent_events` **não é
tocado** (permanece INSERT-only). Auditoria em `data_access_logs` (já existente).

Contrato da RPC:

- `set_my_birth_date(_birth_date date) RETURNS jsonb`
  - Entrada: uma data (`YYYY-MM-DD`).
  - Saída de sucesso: `{ "birth_date": "<data>" }`.
  - Erros: `28000` (sem sessão), `22023` (data inválida ou já preenchida).

## Tipagem gerada (`src/integrations/supabase/types.ts`)

`types.ts` é gerado pela plataforma e não é regenerável aqui (sem acesso remoto
ao Supabase). Como `.rpc("set_my_birth_date")` precisa existir em
`Database["public"]["Functions"]` para o `typecheck` passar, o design adiciona
**manualmente** a assinatura da função ao `types.ts`, com um comentário
sinalizando que é um stub até a plataforma regenerar os tipos. Mesmo princípio
já vale para as RPCs de consentimento existentes. Alternativa rejeitada: `as
any` no call site (quebraria lint `--max-warnings 0`).

## Correctness Properties

Propriedades que a implementação deve satisfazer (verificáveis por teste):

### Property 1: Fail-closed preservado

Para qualquer entrada com `error = true`, `payload` nulo/malformado, ou
`requires_consent` não-booleano, `decideGuardianConsentGate` retorna
`error_locked` (nunca `clear` nem `needs_birth_date`).

**Validates: Requirements 2.1, 2.2**

### Property 2: Somente `unknown_birth_date` vira `needs_birth_date`

A decisão só retorna `needs_birth_date` quando o payload é confiável e
`reason === "unknown_birth_date"`.

**Validates: Requirements 1.1, 2.3**

### Property 3: Nenhum acesso privado sem data

Enquanto `birth_date` for nula, o guard nunca renderiza `children` (redireciona
para `/completar-cadastro`).

**Validates: Requirements 2.1**

### Property 4: Preenchimento único

`set_my_birth_date` grava apenas quando a `birth_date` atual é nula; qualquer
chamada subsequente falha (`22023`).

**Validates: Requirements 4.2**

### Property 5: Auto-escopo

`set_my_birth_date` afeta exclusivamente a linha do `auth.uid()` do chamador.

**Validates: Requirements 4.1, 4.3**

### Property 6: Roteamento pós-data

Após gravar uma data de adulto o guard passa a `clear`; após gravar uma data de
menor o guard passa a `blocked` (→ `/consentimento-responsavel`), sem lógica de
idade duplicada no cliente.

**Validates: Requirements 3.1, 3.2**

## Error Handling

- **RPC de status falha / timeout / sessão inválida**: `error_locked` (tela de
  recuperação do Delta 1). Inalterado.
- **`set_my_birth_date` retorna erro** (sessão, data inválida, já preenchida):
  a página mostra toast e permanece; nada é gravado; o gate segue bloqueando —
  degrada com segurança.
- **Data inválida no cliente** (`isValidPastDate` falso): erro de formulário
  antes de chamar a RPC; a RPC revalida no servidor (defesa em profundidade).
- **Migration não aplicada no Lovable**: a RPC não existe → chamada retorna
  erro → usuário permanece bloqueado (fail-closed), nunca liberado.

## Testing Strategy

- **Função pura (`guardian-consent.test.ts`)**: novo caso — `unknown_birth_date`
  agora retorna `needs_birth_date` (atualizar o teste existente que esperava
  `error_locked` para esse reason); manter todos os demais (erro/timeout/
  malformado → `error_locked`; adulto → clear; menor pendente/desatualizado →
  blocked; menor consentido → clear).
- **Guard (`RequireGuardianConsent.test.tsx`)**: `unknown_birth_date` →
  redireciona para `/completar-cadastro` (não renderiza conteúdo privado);
  atualizar o teste que hoje espera a tela de erro para esse reason. Erro/
  rejeição continuam em `error_locked`.
- **Página nova (`BirthDateCompletionPage.test.tsx`)**: data inválida mostra
  erro e não chama a RPC; data válida chama `set_my_birth_date` e navega ao
  `redirect`; erro da RPC mantém na página sem navegar.
- **RPC**: validação manual via `supabase/verification/` (query de
  `has_function_privilege`) — não executável só com `npm run quality`; documentar
  no runbook como as demais RPCs.

## Invariantes de segurança preservados

- Fail-closed intacto para incerteza genuína (erro/timeout/malformado).
- `set_my_birth_date`: `SECURITY DEFINER` + `search_path=public` + REVOKE de
  PUBLIC/anon + GRANT authenticated + auditoria (doutrina §2).
- Preenchimento único (null → valor): não permite reescrita para burlar o gate.
- `guardian_consent_events` permanece imutável; `_shared/crisis.ts`, pagamento
  e `ai_usage_limits` intocados.
- Migration nova segue numeração/ordem e entra no fim do
  `docs/security-invariants-runbook.md`.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Usuário informa data falsa (menor se declara adulto) | Mesmo nível de confiança do signup (data sempre foi auto-declarada); fora de escopo desta correção resolver age assurance forte. Documentado, não overclaim. |
| `types.ts` stub diverge da função real | Comentário explícito; assinatura mínima e estável (`date` → `jsonb`); regen pela plataforma quando disponível. |
| Migration não aplicada no Lovable (gotcha conhecida) | Runbook lista a migration; sem ela, a RPC retorna erro e o gate segue fail-closed (não abre acesso) — degrada com segurança. |
| Loop de redirect se a página ficar atrás do gate | Página registrada apenas atrás de `RequireAuth`, fora de `RequireGuardianConsent` (mesmo padrão do consentimento). |
| Contas de adulto que digitam data errada e ficam presas (preenchimento único) | Fora de escopo aqui; alteração de data existente será um fluxo de perfil dedicado (registrado em "Fora de escopo" dos requisitos). |
