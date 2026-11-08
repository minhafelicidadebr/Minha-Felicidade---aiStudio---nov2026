-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION SANEADA — TRUST-1.1B (R17)
--
-- Timestamp e nome do arquivo PRESERVADOS: o histórico de migrations é imutável
-- e renomear quebraria a reconciliação de quem já aplicou esta sequência.
--
-- O QUE ESTA MIGRATION FAZIA:
--   Um UPDATE em auth.users definindo a senha de uma conta de teste
--   (teacher@test.local) com o valor em TEXTO CLARO dentro do arquivo.
--
-- POR QUE FOI SANEADA:
--   O repositório é público no GitHub. Qualquer pessoa que lesse este arquivo
--   obtinha a credencial. Manter o valor aqui é vazamento permanente, mesmo que
--   a conta não exista — porque a senha pode ter sido reaproveitada em outro
--   lugar por quem a leu.
--
-- ESTADO VERIFICADO NO AMBIENTE REMOTO (2026-08-04):
--   A conta teacher@test.local NÃO EXISTE no projeto de produção. Foram
--   encontradas apenas 4 contas reais. Portanto NÃO houve exposição
--   explorável — o risco era documental.
--
-- DECISÃO:
--   Esta migration passa a ser um NO-OP documentado. Não recria conta de teste,
--   não define senha, não move o segredo para seed/doc/teste/log.
--   A credencial histórica é considerada PERMANENTEMENTE COMPROMETIDA e não
--   deve ser reutilizada em nenhum ambiente.
--
-- Receipt: docs/kiro/trust-1/TRUST_1_R17_INCIDENT_RECEIPT.md
-- ═══════════════════════════════════════════════════════════════════════════════

-- NO-OP intencional. Nenhuma operação de credencial é executada.
-- Contas de teste, quando necessárias, devem ser criadas manualmente no painel
-- de Auth, com senha gerada fora do controle de versão.
DO $$
BEGIN
  RAISE NOTICE 'TRUST-1.1B: migration 20260706192738 saneada (R17). Nenhuma credencial aplicada.';
END $$;
