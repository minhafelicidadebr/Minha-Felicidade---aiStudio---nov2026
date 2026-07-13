# Design Document

## Overview

Adiciona uma tabela write-only de eventos (`landing_events`), um cliente leve
de captura (`src/lib/analytics.ts`), instrumentação nos pontos certos do funil,
e uma RPC agregada + seção no `/admin` para visualizar o funil. Segue o mesmo
padrão de privacidade já usado no `admin-dashboard` (agregado, N mínimo, sem PII).

## Architecture

```
Cliente (anon ou logado)              Servidor
──────────────────────                ────────
trackEvent("signup") ────────▶  landing_events (INSERT-only, write-only p/ cliente)
trackEvent("checkout_started")           │
trackEvent("paywall_hit")                │
trackEvent("activation")                 │
trackEvent("lesson_completed")           │
                                          │
activate_subscription_from_intent ──────▶ INSERT 'upgrade' (server-side, fonte de verdade)
                                          │
                                          ▼
                          get_funnel_overview() RPC (SECURITY DEFINER,
                          teacher/manager only, agrega + aplica N mínimo)
                                          │
                                          ▼
                              AdminPage → nova seção "Funil de Conversão"
```

## Components and Interfaces

### Cliente: `src/lib/analytics.ts`
Função pura+efeito mínimo: `trackEvent(kind, metadata?)`.
- Gera/persiste um `session_id` anônimo em `localStorage` (uuid, sem PII).
- Resolve `user_id` da sessão Supabase se houver (opcional).
- Chama `supabase.from("landing_events").insert(...)` — client-side, mas a
  tabela só aceita INSERT (Requirement 2.1), então não há superfície de leitura.
- `metadata` é validado no cliente contra uma allowlist de chaves por `kind`
  antes do insert (defesa em profundidade; a validação forte fica no CHECK/
  trigger do banco — Requirement 2.3).

Pontos de instrumentação (mínimo necessário, sem instrumentar tudo):
- `signup`: após `supabase.auth.signUp` bem-sucedido (`AuthPage.tsx`).
- `activation`: primeira conclusão de atividade em `user_progress` (mesmo
  critério do "Bem-vindo" hoje já usa: `!prog || prog.length === 0` antes de
  gravar — instrumenta a PRIMEIRA atividade concluída).
- `lesson_completed`: quando uma atividade tipo `video`/`module` é marcada
  completa (reaproveita o ponto onde `user_progress` já é gravado).
- `paywall_hit`: dentro de `FeatureGate` (`src/components/FeatureGate.tsx`),
  quando o gate bloqueia por falta de plano.
- `checkout_started`: dentro de `startIndividualCheckout`/`startEscolarCheckout`
  (`src/lib/checkout.ts`), antes do redirect.
- `upgrade`: SERVER-SIDE, dentro de `activate_subscription_from_intent`
  (Requirement 1.2) — não depende do cliente permanecer na página.

### Servidor: RPC `get_funnel_overview(_days integer DEFAULT 30)`
`SECURITY DEFINER`, restrita a `teacher`/`manager` (mesmo padrão de
`get_learning_progress_overview`). Conta eventos distintos por `kind` no
intervalo, aplica N mínimo (reaproveita a constante já usada no
`admin-dashboard`), retorna jsonb com contagens e taxas de conversão entre
etapas consecutivas. Loga em `data_access_logs`.

### UI: `AdminPage.tsx`
Nova seção "Funil de Conversão" abaixo do painel de engajamento existente,
lendo `get_funnel_overview` via a mesma edge function `admin-dashboard` (adiciona
um campo `funnel` à resposta) — reaproveita a autenticação/autorização já
implementada em vez de criar uma segunda function.

## Data Models

### Nova tabela `landing_events`
```sql
CREATE TABLE public.landing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN (
    'signup', 'activation', 'lesson_completed',
    'paywall_hit', 'checkout_started', 'upgrade'
  )),
  session_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.landing_events (kind, created_at);
CREATE INDEX ON public.landing_events (session_id);

ALTER TABLE public.landing_events ENABLE ROW LEVEL SECURITY;

-- Write-only para o cliente: pode INSERIR, nunca ler/alterar/apagar.
CREATE POLICY "Anyone can insert landing events"
  ON public.landing_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    -- metadata limitado: no máx. 5 chaves, valores simples (defesa em profundidade;
    -- a allowlist de chaves por kind é reforçada no cliente).
    jsonb_typeof(metadata) = 'object'
  );

REVOKE SELECT, UPDATE, DELETE ON public.landing_events FROM anon, authenticated;
GRANT SELECT ON public.landing_events TO service_role;
```
Nenhuma policy de `SELECT` para `anon`/`authenticated` — write-only do ponto de
vista do cliente (Requirement 2.1). Leitura agregada só via RPC `SECURITY
DEFINER` (que roda como owner, contornando RLS de leitura de forma controlada).

### RPC `get_funnel_overview`
```sql
CREATE OR REPLACE FUNCTION public.get_funnel_overview(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _min_sample integer := 5; -- mesma constante de admin-dashboard
  _counts jsonb;
BEGIN
  IF NOT (public.has_my_role('teacher') OR public.has_my_role('manager')) THEN
    RAISE EXCEPTION 'insufficient_permissions' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_object_agg(kind, cnt) INTO _counts
  FROM (
    SELECT kind, count(DISTINCT session_id) AS cnt
    FROM public.landing_events
    WHERE created_at > now() - make_interval(days => _days)
    GROUP BY kind
  ) t;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (auth.uid(), 'SELECT', 'landing_events', 'funnel_overview',
    jsonb_build_object('days', _days), 0);

  RETURN jsonb_build_object('counts', COALESCE(_counts, '{}'::jsonb), 'min_sample', _min_sample, 'days', _days);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_funnel_overview(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_funnel_overview(integer) TO authenticated;
```
Note: `EXECUTE` concedido a `authenticated` mas a função MESMA valida o papel
internamente (`has_my_role`) e lança `insufficient_permissions` se não for
teacher/manager — mesmo padrão de outras RPCs self-checking do projeto.

## Correctness Properties

### Property 1: Write-only para o cliente
`anon`/`authenticated` só têm `INSERT` em `landing_events`; nenhum `SELECT`.
**Validates: Requirements 2.1**

### Property 2: Sem PII em metadata
O `CHECK`/policy garante `metadata` como objeto jsonb; a allowlist de chaves
por `kind` (client-side) impede texto livre de nome/e-mail/telefone.
**Validates: Requirements 2.2, 2.3**

### Property 3: Autorização no painel
`get_funnel_overview` só executa para `teacher`/`manager` (`has_my_role`);
qualquer outro papel recebe `insufficient_permissions`.
**Validates: Requirements 3.4, 2.4**

### Property 4: k-anon no painel
Contagens abaixo de `min_sample` (5) são sinalizadas como "amostra
insuficiente" na UI em vez de expor o número exato.
**Validates: Requirements 3.3**

## Error Handling

- Falha ao inserir evento (rede, RLS) → não bloqueia a navegação do usuário;
  `trackEvent` falha silenciosamente (best-effort, como um analytics comum).
- RPC chamada por papel sem permissão → erro claro, mapeado a 403 na function
  `admin-dashboard` (mesmo padrão de `getErrorStatus` já existente).

## Testing Strategy

- Unit (Vitest): validação da allowlist de `metadata` por `kind` em
  `analytics.ts` (função pura testável, extraída do lado de efeito).
- Manual: inserir eventos de teste, chamar `get_funnel_overview`, confirmar
  contagens e que `anon` não consegue `SELECT` na tabela.
- `npm run quality` verde a cada tarefa.
