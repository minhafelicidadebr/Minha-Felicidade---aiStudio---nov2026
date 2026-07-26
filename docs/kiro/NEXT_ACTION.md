# NEXT_ACTION (uma única próxima ação)

## Concluído nesta sessão
- **(C) Auditoria PI da AlegrIA** ✓ — KNOWLEDGE_BASE é referências bibliográficas autorais,
  sem reprodução verbatim. 2 menções diretas a Yale removidas dos system prompts.
- **(A) ONDA 6 — NPS + Engajamento** ✓ — migration `20260725100000` (nps_responses,
  engagement_events, get_org_engagement_summary RPC), NpsSurvey micro-survey in-app,
  useNpsTrigger (cooldown 14d), EngagementMetrics no painel /org.
- **(B) Gamificação/Retenção** ✓ — StreakCalendar (heatmap 28 dias + frases motivacionais),
  DailyChallenge (14 microações rotativas com citação científica + botão "Feito").
- Gate verde em todos os commits (83 testes, lint, typecheck, build, security).

## Próxima ação (usuário, no painel do Lovable)
1. **Aplicar migration `20260725100000_nps_and_engagement_metrics.sql`** no SQL Editor
   do Lovable (colar e rodar — é CREATE TABLE + RPC, idempotente).
2. **Publish** no Lovable para o site atualizar com NPS, StreakCalendar, DailyChallenge
   e EngagementMetrics.
3. user_id real da conta demo = `de0ccab6-27cb-4288-b5f6-3b3f3f5297d6`.

## Backlog conhecido
- Domínio: migrar para minhafelicidade.com.br (usuário fará depois).
- Migrar react-router v6→v7 (advisory de audit, não bloqueia).
- Alertas operacionais por e-mail (ONDA 5 complementar).
- Enriquecer relatório do piloto (#6) com dados de engajamento real quando piloto iniciar.
- Tracking real de engagement_events (instrumentar chamadas no frontend a cada ação).
- ONDA 7: certificado digital de conclusão.
