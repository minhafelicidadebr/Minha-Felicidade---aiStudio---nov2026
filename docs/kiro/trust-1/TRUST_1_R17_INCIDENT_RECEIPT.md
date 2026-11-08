# TRUST-1 — R17 INCIDENT RECEIPT

**Este documento não contém secrets.**

## Identificação

| Campo | Valor |
|---|---|
| Risco | R17 |
| Classificação original | P0 |
| Classificação final | P2 (documental) |
| Detectado em | TRUST-1.1A (2026-08-04) |
| Saneado em | TRUST-1.1B (2026-08-04) |
| Arquivo afetado | `supabase/migrations/20260706192738_1fe643e7-e344-4a5c-af85-b38ad7c2e04d.sql` |

## Natureza do incidente

A migration executava `UPDATE auth.users SET encrypted_password = crypt(<literal>)`
para uma conta de teste, com o valor da senha **em texto claro** dentro do arquivo
versionado.

O repositório é público no GitHub. Qualquer pessoa com acesso de leitura obtinha
a credencial.

## Verificação do impacto real

Consulta ao painel de Users do projeto de produção (`ctjwyybmlwhynherikqy`) em
2026-08-04:

| Item | Resultado |
|---|---|
| Total de contas | 4 |
| Conta `teacher@test.local` | **NÃO EXISTE** |
| Contas encontradas | 4 contas reais (domínio @gmail.com) |
| Exposição explorável | **NENHUMA** |

**Conclusão:** a credencial nunca foi aplicada a uma conta existente no ambiente
remoto. O risco era **documental**, não explorável.

## Ação de saneamento

| Ação | Executada |
|---|---|
| Arquivo preservado com mesmo nome e timestamp | ✅ |
| Operação insegura removida | ✅ |
| Substituída por no-op documentado | ✅ |
| Conta de teste NÃO recriada | ✅ |
| Credencial NÃO movida para seed | ✅ |
| Credencial NÃO movida para documentação | ✅ |
| Credencial NÃO movida para teste | ✅ |
| Credencial NÃO movida para log ou snapshot | ✅ |
| Valor da senha NÃO reproduzido em nenhum arquivo | ✅ |

### Saneamento secundário

Durante a TRUST-1.1A, a própria documentação de classificação reproduziu o valor
da credencial em dois arquivos. Ambos foram saneados na mesma passagem:

- `TRUST_1_MIGRATION_RECONCILIATION_PLAN.md` — valor removido
- `TRUST_1_RISK_REGISTER.md` — valor removido

Isso é registrado porque é exatamente o modo de falha que o saneamento pretende
evitar: mover o segredo de um arquivo para outro em nome de "documentar".

## Estado do histórico Git

A credencial permanece acessível no histórico de commits do Git (commits
anteriores a este saneamento). Reescrever o histórico com `git filter-repo`
exigiria force-push em `main` e invalidaria clones existentes.

**Decisão:** não reescrever o histórico. A credencial é considerada
**permanentemente comprometida** e não deve ser reutilizada em nenhum ambiente,
por nenhuma pessoa, em nenhum momento.

## Política derivada deste incidente

1. Nenhuma migration define credencial.
2. Contas de teste são criadas manualmente no painel de Auth, com senha gerada
   fora do controle de versão.
3. Documentação de incidente de segredo **não reproduz o segredo**.

## Riscos residuais

| Risco | Severidade | Mitigação |
|---|---|---|
| Credencial no histórico Git | P2 | Considerada comprometida; nunca reutilizar |
| Alguém já leu e reutilizou o valor em outro sistema | P2 | Fora do controle deste repositório |
