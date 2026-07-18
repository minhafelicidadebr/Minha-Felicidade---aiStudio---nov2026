# Implementation Plan: Consentimento de contas legadas (data de nascimento ausente)

## Overview

Trabalhar em branch nova (`fix/consent-legacy-birthdate`), nunca direto na
`main`. Ao fim de cada tarefa: `npm run quality` verde (inclui `security:gate`).
Fecha o efeito colateral do Delta 1: contas legadas com `birth_date` nula ganham
um caminho self-service para informar a data, sem reabrir o fail-open.

Referência: `design.md` (decisão da rota dedicada, estado `needs_birth_date`,
RPC `set_my_birth_date` de preenchimento único) e `requirements.md`.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1], "description": "Decisão pura: novo estado needs_birth_date" },
    { "wave": 2, "tasks": [2, 3], "description": "Migration da RPC + tipos gerados (stub)" },
    { "wave": 3, "tasks": [4, 5], "description": "Página de captura + fio no guard/roteador" },
    { "wave": 4, "tasks": [6], "description": "Gate final e docs" }
  ]
}
```

## Tasks

- [x] 1. Decisão pura: estado `needs_birth_date`
  - Em `src/lib/guardian-consent.ts`: adicionar `"needs_birth_date"` ao tipo
    `ConsentGateDecision` e, em `decideGuardianConsentGate`, retornar
    `needs_birth_date` quando o payload for confiável e
    `reason === "unknown_birth_date"` — mantendo `error_locked` ANTES disso
    para `error`, payload nulo/malformado e `requires_consent` não-booleano.
  - Atualizar `src/lib/guardian-consent.test.ts`: o caso `unknown_birth_date`
    passa a esperar `needs_birth_date`; manter todos os demais casos.
  - _Requirements: 1.1, 2.1, 2.2, 2.3 · Properties 1, 2_

- [x] 2. Migration: RPC `set_my_birth_date`
  - Novo arquivo `supabase/migrations/<timestamp>_set_my_birth_date.sql` com a
    função do `design.md`: `SECURITY DEFINER`, `SET search_path = public`,
    valida data plausível (passada, < 120 anos), grava apenas quando
    `birth_date` atual é nula (preenchimento único), loga em
    `data_access_logs`. `REVOKE EXECUTE ... FROM PUBLIC, anon` +
    `GRANT EXECUTE ... TO authenticated`, com a query de verificação
    (`has_function_privilege`) comentada no fim.
  - Adicionar a migration ao fim de `docs/security-invariants-runbook.md`
    (numeração/ordem) com uma linha do que faz.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.2, 5.3 · Properties 4, 5_

- [x] 3. Tipos gerados: assinatura de `set_my_birth_date`
  - Em `src/integrations/supabase/types.ts`, adicionar manualmente a assinatura
    da função em `Database["public"]["Functions"]` (Args `{ _birth_date: string }`,
    Returns `Json`), com comentário sinalizando que é stub até a plataforma
    regenerar os tipos. Sem `as any` no call site.
  - _Requirements: (viabiliza typecheck) · Design §"Tipagem gerada"_

- [x] 4. Página `BirthDateCompletionPage` + rota
  - `src/pages/BirthDateCompletionPage.tsx`: `input type="date"` (max hoje),
    valida com `isValidPastDate`, chama `supabase.rpc("set_my_birth_date", ...)`,
    ao sucesso navega ao `getSafeRedirectPath(redirect)`; ao erro, toast e
    permanece. Heading focável, label associada, loading no botão, cópia não
    alarmista (LGPD art. 14).
  - Registrar `/completar-cadastro` em `src/App.tsx` atrás de `RequireAuth` e
    FORA de `RequireGuardianConsent` (mesmo padrão de `/consentimento-responsavel`).
  - Testes `BirthDateCompletionPage.test.tsx`: data inválida não chama a RPC;
    data válida chama e navega ao redirect; erro da RPC mantém na página.
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3 · Properties 3, 6_

- [x] 5. Fiar `needs_birth_date` no guard
  - Em `src/components/routing/RequireGuardianConsent.tsx`: mapear
    `status === "needs_birth_date"` para `<Navigate to="/completar-cadastro?redirect=...">`
    (preservando o path de origem), sem tocar em `checking`/`blocked`/`clear`/
    `error_locked`.
  - Atualizar `RequireGuardianConsent.test.tsx`: `unknown_birth_date` passa a
    redirecionar para `/completar-cadastro` (não mais a tela de erro); erro/
    rejeição continuam em `error_locked`.
  - _Requirements: 1.1, 2.1 · Properties 2, 3_

- [x] 6. Gate final e docs
  - `npm run quality` completo verde (audit, lint, typecheck, testes, build,
    security:gate).
  - Confirmar no runbook a nota de fail-closed do Delta 1 atualizada: o caso
    `unknown_birth_date` agora resolve via `/completar-cadastro` + RPC
    `set_my_birth_date`, e deixa de ser "pendência/risco residual".
  - PENDENTE (humano, fora do `npm run quality`): aplicar a migration no Lovable
    (SQL editor), rodar `NOTIFY pgrst, 'reload schema';`, e validar manualmente:
    conta legada adulta → informa data → acessa; conta legada menor → informa
    data → cai no consentimento do responsável; segunda chamada da RPC falha.
  - _Requirements: 5.1, 5.4_

## Notes

- Não altera `guardian_consent_events` (ledger imutável), `_shared/crisis.ts`,
  pagamento nem `ai_usage_limits` (Requirement 5.1).
- Gotchas do Lovable (CLAUDE.md §3): a migration NÃO é aplicada por push; sem
  ela, a RPC não existe e o gate segue fail-closed (degrada com segurança).
- Fora de escopo: alteração de `birth_date` já preenchida, age assurance forte,
  backfill administrativo em massa (ver `requirements.md`).

