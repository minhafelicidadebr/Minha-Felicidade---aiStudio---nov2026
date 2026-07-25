# NEXT_ACTION (uma única próxima ação)

## Concluído (recente)
- P0.0 (marca/PI/independência) + ONDA 1..5 mergeados (PRs #20–#35).
- Ajustes UX pós-publicação: dark mode padrão, logo só no menu com slogan.
- Vender pilotos: #7 tenant demo (migration criada), #6 relatório do piloto (commit `30ce2a3`),
  /escolas aprimorada (commit `80471fb`). Gate verde.

## Próxima ação (usuário, no painel do Lovable)
1. **Aplicar a migration do tenant demo** no SQL Editor do Lovable:
   colar o conteúdo de `supabase/migrations/20260722250000_demo_tenant_seed.sql` e rodar.
   (É INSERT direto como service_role — NÃO precisa do wrapper `SET LOCAL role/jwt`.)
   Depois, entrar em `/org` com a conta demo → o painel aparece cheio para demonstrações.
2. **Publish no Lovable** para o site atualizar (#6 relatório + /escolas). Se o botão estiver
   inativo, forçar detecção com um commit trivial (ex.: editar `public/version.txt`).

## Backlog conhecido (não urgente)
- Migrar react-router v6→v7 (advisory de audit, não bloqueia com `--audit-level=high`).
- Auditar KNOWLEDGE_BASE da AlegrIA (reprodução verbatim).
- Renomear domínio público que contém "yale".
- Alertas operacionais por e-mail (ONDA 5).
- ONDA 6: métricas de piloto real / NPS.
