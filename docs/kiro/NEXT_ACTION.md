# NEXT_ACTION (uma única próxima ação)

## Concluído
- P0.0 (marca/PI/independência): **APROVADO**.
- ONDA 1 · Corte 1.1 (entitlement canônico): rotas premium exigem feature server-side.
- ONDA 1 · Corte 1.2 (integridade da assinatura): policy UPDATE removida de org_subscriptions.
- ONDA 1 · Corte 1.3 (limites de IA centralizados): `enforce_ai_usage_limit` lê do plano.
- ONDA 1 · Corte 1.4 (idade e consentimento): trigger protege `birth_date` como imutável;
  `guardian_consent_events` e RPCs de consentimento confirmados ok.

## Próxima ação recomendada: Gate final da ONDA 1
Todos os 4 cortes técnicos foram implementados:
1. Entitlement canônico (rotas protegidas) ✅
2. Integridade da assinatura (policy removida) ✅
3. Limites de IA centralizados (lê do plano) ✅
4. Idade e consentimento protegidos (trigger imutável) ✅

Restam os itens do gate final que o plano master define:
- "Testes de autorização verdes" → 3 testes de RequireFeature já passam; considerar escrever
  1 teste para o cenário "tentativa de UPDATE direto em profiles.birth_date" (pgTAP ou
  integração). Isso requer um ambiente com banco local, fora do escopo desta sessão.
- "Correção do acesso administrativo" → AdminPage já está protegida por `RequireRole
  (['teacher','manager'])`. Confirmar se há algum endpoint de admin sem gate (buscas rápidas).

Após confirmar esses dois itens, classificar o **gate final da ONDA 1 como aprovado** e
avançar para a ONDA 2 (SaaS escolar piloto) na próxima sessão.
