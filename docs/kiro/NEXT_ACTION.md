# NEXT_ACTION (uma única próxima ação)

## Concluído nesta sessão (ONDA 6+)
- **(C) Auditoria PI** ✓ — KNOWLEDGE_BASE ok, 2 menções Yale removidas dos prompts.
- **(A) NPS + Engajamento** ✓ — tabelas + RPC + NpsSurvey + EngagementMetrics no /org.
- **(B) Gamificação** ✓ — StreakCalendar + DailyChallenge.
- **#1 Instrumentação** ✓ — trackEngagement() centralizado, session_start, module_view,
  ai_interaction, exercise_complete/quiz_complete/flashcard_session automaticos.
- **#2 Certificado** ✓ — Certificate.tsx (Canvas→PNG), aparece ao completar 5 modulos.
- **#3 E-mail de convite** ✓ — template institutional_invite no process-notifications,
  botão "Aceitar convite" com link /aceitar-convite?token=X. Precisa RESEND_API_KEY.

## Próxima ação (usuário)
1. **Configurar RESEND_API_KEY** nos secrets do Supabase (Edge Functions → Secrets)
   para que os e-mails de convite sejam enviados de verdade.
   - Criar conta gratuita em resend.com (100 emails/dia grátis).
   - Adicionar: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PUBLIC_SITE_URL`.
2. **Publish** no Lovable com as novas features.
3. Aplicar migration `20260725100000` se ainda não fez (NPS + engagement).

## Backlog (próximas ondas)
- #4 Notificações/lembretes (precisa RESEND_API_KEY configurada + cron trigger).
- #5 Relatório PDF (biblioteca jsPDF ou html2canvas).
- #6 Dashboard visual de evolução temporal (gráficos de linha NPS/engajamento).
- Domínio: migrar para minhafelicidade.com.br.
- Migrar react-router v6→v7.
- Instrumentar mais ações (debate_complete, poetry_complete, etc.).
