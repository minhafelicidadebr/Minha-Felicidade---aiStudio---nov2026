# NEXT_ACTION (uma única próxima ação)

## Concluído
- P0.0 (marca/PI/independência): **APROVADO**.
- ONDA 1 · Corte 1.1 (entitlement canônico): rotas premium exigem feature server-side.
- ONDA 1 · Corte 1.2 (integridade da assinatura): policy UPDATE removida de org_subscriptions.
- ONDA 1 · Corte 1.3 (limites de IA centralizados): `enforce_ai_usage_limit` agora lê
  `alegria_daily` do plano do usuário (9 free, ilimitado premium). Consistente entre banco,
  edge functions, frontend e landing.

## Próxima ação recomendada: ONDA 1 — Corte 1.4 (Idade e consentimento)
Verificar (buscas direcionadas):
- Confirmar que `birth_date` não pode ser alterada após o primeiro preenchimento
  (`set_my_birth_date` grava apenas quando NULL — já documentado, verificar no código).
- Confirmar que o gate de consentimento (`RequireGuardianConsent`) não pode ser contornado
  (token independente para o responsável, confirmação fora da sessão do adolescente,
  revogação, auditoria).
- Confirmar que um adolescente não consegue se declarar adulto depois do cadastro para
  escapar do consentimento.
- Critério de aceite: "o adolescente não consegue se declarar adulto depois do cadastro
  para escapar do consentimento."

**Antes de editar:** ler `src/lib/guardian-consent.ts`, `set_my_birth_date` migration,
e `guardian_consent_events` migration.
