# TRUST-1 — REGISTRO DE RISCOS

## P0 — Bloqueantes para piloto

| # | Risco | Evidência | Status |
|---|---|---|---|
| R01 | **Migration defeituosa aplicada (`20260727120000`):** `get_school_metrics` referenciava `e.school_id` inexistente em `engagement_events`. Migration corretiva (`20260731100000`) criada e aplicada, mas ambas coexistem no histórico. | Comprovado no ambiente (erro em produção) + corrigido com PR #44. | Corrigido parcialmente — a migration original permanece com código defeituoso no histórico. Reconciliação necessária na TRUST-1.1. |
| R02 | **engagement_events aceita INSERT direto com `organization_id` arbitrário.** A policy `"Users can log own engagement"` valida apenas `user_id = auth.uid()`. O usuário pode gravar evento em organização alheia. | Comprovado no código (migration `20260725100000`). | Aberto. Tratar na TRUST-1.4. |
| R03 | **Typecheck era vazio.** `tsc --noEmit` sobre um `tsconfig.json` com `files: []` e só `references` compilava **zero arquivo**. | **Comprovado no ambiente** — prova negativa: erro deliberado em `src/` e exit 0. | ✅ **FECHADO (TRUST-1.5).** `typecheck` passou a verificar `tsconfig.app.json` e `tsconfig.node.json` explicitamente. Prova negativa nos dois sentidos: exit 2 com erro, exit 0 sem. Ver `TRUST_1_5_TYPECHECK_RECEIPT.md`. |
| R04 | **Tipos Supabase desatualizados.** Seis pontos usavam `as never` para chamar RPCs e gravar colunas. `as never` não é cast estreito: desliga a verificação por completo. | Comprovado no código; **verificado contra o schema homologado**. | ✅ **FECHADO (TRUST-1.5).** Tipos regerados do banco local homologado. Os casts estavam **obsoletos** — as RPCs já constavam nos tipos. 0 casts de máscara restantes no código. Ver `TRUST_1_5_SCHEMA_TYPE_CONTRACT.md`. |
| R05 | **Sem ambiente de staging.** Toda migration é aplicada diretamente em produção. Não há como ensaiar rollback nem validar schema sem afetar dados reais. | Comprovado (docs e operação). | Bloqueio aceito — piloto com mitigação. |
| R06 | **Consentimento parental é auto-declarado pelo adolescente.** `record_guardian_consent` é chamado na sessão do próprio estudante. Não existe verificação independente pelo responsável (token, página separada, email de confirmação). | Comprovado no código (`GuardianConsentPage.tsx`, `AuthPage.tsx`). | Aberto. Tratar na TRUST-1.6. |

## P1 — Importantes mas não bloqueantes imediatos

| # | Risco | Evidência | Status |
|---|---|---|---|
| R07 | **41 migrations acumuladas sem reconciliação.** Inclui migrations auto-geradas pelo Lovable (UUIDs), migrations defeituosas corrigidas por outras, e duplicação de objetos (CREATE + DROP + CREATE). | Comprovado no código (listagem). | Aberto. Tratar na TRUST-1.1. |
| R08 | **Duas migrations com UUID auto-gerado (`20260728*`)** — provavelmente geradas pelo Lovable, conteúdo não classificado. Podem conter alterações não previstas pelo código. | Registrado; conteúdo não verificado. | Verificar na TRUST-1.1. |
| R09 | **Secrets `PUBLIC_SITE_URL` e `RESEND_API_KEY` não configurados.** O reenvio de convite grava o evento no ledger mas o e-mail não sai. A interface informa "Convite reenviado" baseada no ledger, mas nenhum e-mail chega. | Comprovado em documentação (NEXT_ACTION, .env.example). | Aberto. Decisão: o que dizer na interface quando o e-mail não pode sair? |
| R10 | **`eligible_universe` trafega no payload de `get_school_metrics`.** Quando `analytics_suppressed = true`, a contagem exata de alunos elegíveis aparece na resposta, o que pode violar o espírito da supressão para n < 5. | Comprovado no código da RPC. | Aberto. Tratar na TRUST-1.2. |
| R11 | **NPS aceita INSERT direto.** `nps_responses` tem policy de INSERT para authenticated, permitindo score arbitrário e `organization_id` não validado no servidor. | Comprovado no código (migration `20260725100000`). | Aberto. Tratar na TRUST-1.4. |
| R12 | **Dois vocabulários de papel no banco sem verificação cruzada.** Uma rota pode ser alcançada pelo papel de `profiles.roles` (manager/teacher) enquanto a operação institucional exige membership (org_admin). Combinações inconsistentes podem existir. | Comprovado no código (D29, RequireRole vs RequireInstitutionalRole). | Aberto. Mapear na TRUST-1.3/1.4. |

## P2 — Dívidas técnicas registradas

| # | Risco | Evidência | Status |
|---|---|---|---|
| R13 | Testes de banco são estruturais (leem SQL) e não executam em Postgres real. | Comprovado no código (`ux3-migration-invariants.test.ts`). | Aceito para este ciclo. |
| R14 | `/admin/operacao` não existe como rota separada. Landing provisória vive em `/admin`. | Comprovado no código (D58). | Aceito. |
| R15 | `school_admin` com múltiplas escolas não tem item de menu para escola (omitido por design). | Comprovado no código (D70). | Aceito. |
| R16 | Build não verifica edge functions (Deno) — só o frontend (Vite/TSC). | Comprovado (CI só roda `npm run quality`). | Aceito para este ciclo. |
| R17 | **Credencial em claro no repositório.** Migration `20260706192738` continha senha em texto claro (valor omitido). Repo público no GitHub. | Comprovado no código. | ✅ **SANEADO (TRUST-1.1B).** Conta não existia em produção — risco era documental. Arquivo saneado com no-op. Ver `TRUST_1_R17_INCIDENT_RECEIPT.md`. |

## Descobertos e tratados na TRUST-1.1B

| # | Risco | Severidade | Evidência | Status |
|---|---|---|---|---|
| R18 | **A sequência histórica nunca foi testada desde zero.** `20260706192545` inseria em `user_roles` com `user_id` literais que referenciam `auth.users`. Em banco vazio a FK falhava (SQLSTATE 23503) na 11ª de 42 migrations. Consequência: banco não reconstruível, staging por replay impossível, onboarding de dev novo quebrado. | P0 | **Comprovado no ambiente** — falha real do reset local. | ✅ **RESOLVIDO.** `user_id` passou a ser derivado de `auth.users` por e-mail. Nome e timestamp do arquivo preservados. 43 migrations aplicam desde zero. |
| R19 | **Docker Engine não operacional no host.** | P0 | Comprovado no ambiente. | ✅ **RESOLVIDO.** Server 29.6.2, context `desktop-linux`. |
| R20 | **`resend_invitation` nunca funcionou.** Chamava `digest()` sem qualificar schema. pgcrypto vive em `extensions` e a função é pinada em `SET search_path = public` por exigência da doutrina — a chamada nunca resolveu. Abortava em toda invocação, antes de escrever. Consumidor ativo: botão "Reenviar convite" da `DecisionQueue`. **Vale para produção também**, não é artefato local. | P0 | **Comprovado no ambiente** — execução real da RPC (teste T15). | ✅ **CORRIGIDO** na migration reconciliada (`extensions.digest`), com `search_path` pinado preservado. Verificado em execução: 1º reenvio passa, 2º imediato é bloqueado pelo cooldown de 24h. Travado por teste de invariante. |
| R21 | **Policy de leitura do ledger era inerte.** `"Org admins read decision events"` existia em `institutional_decision_events` sem `GRANT SELECT` para `authenticated`. RLS restringe um privilégio existente; não concede. A policy declarava no schema um acesso que nunca acontecia. | P1 | **Comprovado no ambiente** — privilégios de tabela consultados. | ✅ **FECHADO (TRUST-1.5).** Decisão canônica: sem `GRANT SELECT` bruto. Policy inerte removida; leitura por `get_institutional_decision_events()` — escopo por `is_org_admin`, teto de 100, período máximo de 180 dias, ordenação determinística, projeção fechada sem `recipient_hash`. 15 testes de execução real + 26 contratos de runtime. Ver `TRUST_1_5_R21_RUNTIME_RECEIPT.md`. |
| R22 | **Schema remoto continua inferido, não consultado.** Todas as afirmações sobre o lado C do schema diff derivam de comportamento em runtime e leitura de migrations, não de consulta ao catálogo do Postgres remoto. | P1 | Registrado em documentação. | **Aberto.** Exige credencial de leitura do remoto, não usada nesta onda (produção intocada). |

### Atualização de riscos anteriores pela TRUST-1.1B

| # | Mudança |
|---|---|
| R01 | **Contido.** O estado final de `get_school_metrics` é o correto e a migration reconciliada **aborta** se a versão defeituosa estiver aplicada. A original permanece no histórico, por imutabilidade. |
| R05 | **Mitigado, não resolvido.** Existe agora um staging local reproduzível e documentado (`supabase db reset --local`, portas 55321-55329). Continua não existindo staging **remoto**. |
| R07 | **Compreendido.** As 42 migrations foram provadas reconstruíveis; as duplicações (D5, D6) são inócuas por idempotência. |
| R08 | **Classificado.** `20260728194005`/`20260728194702` são contaminantes de outro produto. Estado final limpo: nenhum resíduo. |
| R13 | **Parcialmente pago.** Além dos testes estruturais, esta onda executou 17 testes SQL/RLS contra Postgres real. Eles ainda não rodam no CI (exigiriam Docker no runner) — dívida remanescente. |

## Descobertos na TRUST-1.5

Todos comprovados em **execução real** contra PostgreSQL, não por leitura.

| # | Risco | Severidade | Evidência | Status |
|---|---|---|---|---|
| R23 | **O ledger torna organizações, escolas e turmas indeletáveis.** As FKs do ledger (`organization_id ON DELETE CASCADE`, `school_id`/`class_id ON DELETE SET NULL`) disparam escrita na tabela, e os gatilhos append-only rejeitam escrita. Assim que existe uma decisão de governança registrada, o tenant deixa de poder ser removido por qualquer caminho — inclusive como `service_role`. Escola sem evento continua deletável. | P1 | **Comprovado no ambiente**: `DELETE FROM schools` e `DELETE FROM organizations` falham com `institutional_decision_events is append-only`, via `UPDATE ... SET school_id = NULL` e `DELETE FROM ... WHERE organization_id = $1` gerados pela FK. | 🟡 **ABERTO POR DECISÃO.** Três saídas não equivalentes: (A) manter — auditoria fixa seus referentes, tenant não removível; (B) FKs para `NO ACTION` — falha explícita, exige tratamento na aplicação; (C) gatilhos ignorarem ação de FK — enfraquece o append-only. Escolher entre imutabilidade da auditoria e capacidade de remover tenant é decisão de produto e retenção. Ver `TRUST_1_5_R21_RUNTIME_RECEIPT.md` §R23. |
| R24 | **A auditoria da negativa nunca persiste.** `get_school_metrics` (desde a UX-3) e `get_institutional_decision_events` gravam uma linha em `data_access_logs` antes de negar acesso, e o `RAISE EXCEPTION` seguinte desfaz o INSERT. `data_access_logs` **não é** registro de tentativas negadas: só de acessos que deram certo. Qualquer análise de "quem tentou o que não podia" sobre essa tabela está vazia por construção. | P1 | **Comprovado no ambiente**: negativa → 0 linhas persistidas (nas duas RPCs); sucesso → 1 linha. | 🟡 **ABERTO POR DECISÃO.** Resolver exige abandonar a exceção (muda o contrato de segurança) ou escrita autônoma fora da transação. O INSERT foi mantido de propósito, com comentário no corpo da função dizendo que não persiste — é o ponto de captura correto quando houver mecanismo. Decisão de arquitetura. |
| R25 | **Contratos de runtime não rodam no CI.** Os 26 testes de `RPC_RUNTIME_CONTRACT` exigem Docker e o stack Supabase local. No GitHub Actions são **pulados** (não falsamente aprovados — o skip é explícito e avisa). O gate do CI continua sendo texto + unidade. | P1 | Comprovado no ambiente: com o container parado, 26 pulados. | **Aberto.** Exige Docker no runner ou um serviço Postgres no workflow. |
| R26 | **Typecheck real, mas não strict.** `strict: false` e `strictNullChecks: false` continuam nos dois tsconfigs. O gate agora verifica os arquivos reais, com o rigor configurado hoje. | P2 | Comprovado no código. | **Aberto.** Endurecer o modo strict tem diff grande e é trabalho separado. |

### Atualização de riscos anteriores pela TRUST-1.5

| # | Mudança |
|---|---|
| R13 | **Substancialmente pago.** Existe agora a categoria `RPC_RUNTIME_CONTRACT` com 26 testes que executam Postgres real, incluindo recompilação de corpo de função com `check_function_bodies = on` — o teste que teria pegado o R20 no dia em que nasceu. A dívida remanescente é o CI (R25), não a ausência de testes. |
| R22 | **Reforçado, não resolvido.** O diff entre os tipos gerados do local e os tipos anteriores (gerados do remoto) é de duas linhas, o que é indício forte de convergência. Indício não é consulta ao catálogo. Continua **obrigatório como preflight read-only antes de promover qualquer migration TRUST para produção.** |
| R09 | **Inalterado e agora mais visível.** O R20 consertou a RPC de reenvio, mas `PUBLIC_SITE_URL` e `RESEND_API_KEY` continuam ausentes: o ledger registra a decisão e o e-mail não sai. |

## Atualização da MACRO-ONDA D (TRUST-1.2 + fechamento da 1.5)

| # | Risco | Severidade | Status |
|---|---|---|---|
| R10 | **`eligible_universe` transportava o tamanho exato do grupo.** Escola com 4 estudantes devolvia `"eligible_universe": 4` junto de `analytics_suppressed: true` — a supressão escondia os valores e revelava o tamanho do grupo. Segundo canal, descoberto nesta onda: escola de 20 com turma de 17 (divulgada, `count: 17`) e turma de 3 (suprimida) permitia `20 − 17 = 3`. A supressão complementar da UX-3 protegia o `value` e deixava o `count` aberto. | P1 | ✅ **FECHADO.** `eligible_universe` passou a ser um `MetricGroup`; o canal de headcount recebeu supressão complementar determinística. 23 contratos de execução real, escritos vermelhos antes da correção. Ver `TRUST_1_2_PRIVACY_TEST_RECEIPT.md`. |
| R23 | O ledger tornava organizações, escolas e turmas indeletáveis, com mensagem obscura de append-only. | P1 | ✅ **FECHADO / ARCHIVE_CONTRACT.** `schools` e `classes` ganharam `status` espelhando `organizations`; gatilho `BEFORE DELETE` devolve erro de domínio (`ERRCODE 23001`) apontando o arquivamento. 13 contratos. Ver `TRUST_1_5_R23_DECISION.md`. |
| R24 | A auditoria da negativa nunca persiste: o `RAISE EXCEPTION` desfaz o INSERT. | P1 | 🟡 **ACCEPTED_ARCHITECTURAL_LIMITATION / FAIL_CLOSED_PRESERVED.** `data_access_logs` formalizado como registro de acessos **concedidos**. Negativas pertencem a `security_denied_access_events`, canal externo à transação, ainda inexistente. Fail-closed preservado; não se troca segurança por completude de log. Ver `TRUST_1_5_R24_DECISION.md`. |
| R25 | Contratos de runtime não rodavam no CI; skip aparecia como verde. | P1 | ✅ **FECHADO.** Job `runtime-db` sobe o stack Supabase efêmero no runner, aplica as migrations desde zero e **falha** diante de skip ou de menos de 75 contratos executados (baseline TRUST-1.2.1: 78). Ver `TRUST_1_5_R25_CI_RECEIPT.md`. |
| R22 | Schema remoto inferido, não consultado. | P1 | 🔴 **OPEN / REQUIRED_BEFORE_PRODUCTION.** Checklist read-only de 10 seções criado em `TRUST_1_R22_PREFLIGHT_CHECKLIST.md`. Nada executado; nenhuma credencial remota usada; nenhum `db push` em nenhuma onda. |

### Novos desta onda

| # | Risco | Severidade | Evidência | Status |
|---|---|---|---|---|
| R27 | **`get_org_engagement_summary` não aplicava limiar nenhum.** Devolvia contagens cruas de atividade e o bloco inteiro de NPS — `nps_avg`, `nps_count`, `nps_promoters`, `nps_detractors`. Alimenta o painel institucional **e** o PDF do relatório piloto. Uma rede com 2 estudantes exportava média e distribuição de um grupo de duas pessoas, num arquivo que sai por e-mail. Agravante: o cliente fazia `|| 0`, que converteria supressão em zero fabricado. | P1 | **Comprovado no corpo aplicado e em execução.** | ✅ **CORRIGIDO.** Universo elegível da organização passou a ser o gate, com a mesma regra do nível da escola. Chaves derivadas vêm `null` com `analytics_suppressed` e `minimum_group_size`. Propagado até o PDF. Ver `TRUST_1_2_EXPORT_SURFACE_RECEIPT.md`. |
| R28 | **Universo zero era tratado como amostra insuficiente.** No nível da escola, 0 estudantes produzia `analytics_suppressed: true` e totais `below_threshold` — contradizendo o nível da turma, que já distinguia `isEmpty`. O gestor lia "sem dados" onde a resposta correta era "ninguém participou". | P2 | **Comprovado em execução.** | ✅ **CORRIGIDO.** Zero é divulgável: `value: 0`, `count: 0`, `isEmpty: true`, `analytics_suppressed: false`. |
| R29 | **Arquivamento não é filtrado em nenhuma leitura.** `schools.status` e `classes.status` existem, mas nada define `archived` e nenhuma query o exclui. Hoje é inócuo; quando o arquivamento virar operação real, entidade arquivada continuará aparecendo no painel e nas métricas. | P2 | Comprovado no código. | **Aberto.** É o principal débito que a decisão do R23 deixa. Trabalho da onda que expuser o arquivamento. |
| R30 | **Roster administrativo fora do limiar, por decisão.** `totalMembers`, `totalStudents`, `totalEducators`, `totalInvitations` e `classCount` por escola continuam saindo exatos no PDF do piloto. São contagens de cadastro que o org_admin gerencia diretamente, não analytics derivadas de comportamento. | P2 | Comprovado no código. | **Aberto por decisão.** Estender o limiar a essas contagens é decisão de produto, não ajuste técnico. Registrado explicitamente em `TRUST_1_2_PRIVACY_CONTRACT.md`. |

### Atualização de riscos anteriores

| # | Mudança |
|---|---|
| R13 | **Pago.** 62 contratos de runtime contra PostgreSQL real, e agora **no CI**. A dívida que restava era o runner (R25), fechada nesta onda. |
| R05 | **Mitigado com mais força.** O staging local reproduzível agora é exercitado pelo CI em cada PR, não só na máquina de quem lembra de rodar. |
| R02 / R11 | **Inalterados.** `engagement_events` e `nps_responses` continuam aceitando INSERT direto com `organization_id` arbitrário. A supressão desta onda protege a **leitura**; a integridade da **escrita** é TRUST-1.4. Vale registrar a interação: um atacante pode inflar contagens de uma organização alheia e, com isso, tirar um grupo do limiar. |

## Atualização da MACRO-ONDA E — TRUST-1.2.1

| # | Risco | Severidade | Evidência | Status |
|---|---|---|---|---|
| R31 | **`org_admin` lia linhas brutas de NPS e engajamento.** As policies administrativas permitiam projetar `user_id`, feedback, contexto e metadata; o navegador fazia a agregação. | P1 | Comprovado em PostgreSQL real: teste vermelho inicial conseguia selecionar as linhas completas. | ✅ **FECHADO.** Policies raw removidas por qualificador semântico; self-read e `service_role` preservados; analytics institucional somente por RPC. |
| R32 | **Roster elegível era usado como proxy de contribuição.** Uma organização com cinco cadastrados podia divulgar métrica produzida por uma pessoa; múltiplas respostas/eventos da mesma pessoa inflavam o valor sem aumentar anonimato. | P1 | Comprovado em PostgreSQL real nos casos n=1, n=4 e respostas repetidas. | ✅ **FECHADO.** Gate independente por métrica/bucket com `count(DISTINCT user_id)` e limiar canônico. |

### Resultado e riscos preservados

Antes da correção, os 12 contratos específicos tiveram **3 verdes e 9
vermelhos**; depois, **12/12 verdes**. O conjunto runtime completo ficou
**78/78**, o replay em **46/46 migrations** e o quality em **405 testes**.

R02/R11 permanecem abertos para TRUST-1.4: esta onda fecha a fronteira de
**leitura**, não a integridade de escrita. R22 permanece
`OPEN / REQUIRED_BEFORE_PRODUCTION`; nenhum catálogo remoto foi consultado.

## Atualização da MACRO-ONDA F — TRUST-1.4

RED comprovado contra PostgreSQL local antes da correção: um usuário
autenticado, membro apenas de `ORG_A`, conseguia inserir com sucesso
`engagement_events`/`nps_responses` com `organization_id = ORG_B` (linha
persistida e devolvida por `RETURNING`, revertida só porque o teste manual
usou `ROLLBACK`). `user_id` spoof já estava bloqueado desde a migration
original (`WITH CHECK (user_id = auth.uid())`); só `organization_id` era
vulnerável.

| # | Risco | Severidade | Evidência | Status |
|---|---|---|---|---|
| R02 | `engagement_events` aceitava INSERT direto com `organization_id` arbitrário, sem validar membership. | P0 | **RED comprovado em execução** contra Postgres local (ver acima) antes da correção; **GREEN comprovado** depois — 28 contratos de runtime em `input-integrity-runtime-contract.test.ts`. | ✅ **FECHADO.** Escrita passou a ser exclusivamente pela RPC `record_engagement_event` (`SECURITY DEFINER`, resolve `auth.uid()`, valida `is_org_member(_organization_id)` — que já nega membership inativa e organização archived/suspended via R29). `INSERT` direto revogado de `authenticated` (`REVOKE INSERT`, policy de INSERT removida). |
| R11 | `nps_responses` aceitava INSERT direto com `organization_id` arbitrário, sem validar membership. | P0 | **RED comprovado em execução** contra Postgres local antes da correção; **GREEN comprovado** depois — mesmos 28 contratos. | ✅ **FECHADO.** Mesma forma: RPC `submit_nps_response`, `INSERT` direto revogado. |

**Ataques de data poisoning provados bloqueados, todos em execução real:**

| Ataque | Resultado |
|---|---|
| Cross-tenant engagement write (membro de A grava em B) | `Organization not available for this account` (42501) |
| Cross-tenant NPS write (membro de A grava em B) | `Organization not available for this account` (42501) |
| `organization_id` de organização `archived` | Negado — integra R29, sem duplicar a checagem |
| `organization_id` inexistente | Negado, mesma mensagem — não serve de sonda |
| Usuário sem nenhuma membership | Negado |
| INSERT direto client-side com `organization_id` arbitrário | `permission denied for table` — bloqueado por `GRANT`, não só por RLS |
| Threshold poisoning (4→5 contribuidores via organização alheia) | Bloqueado antes de qualquer linha ser gravada; organização permanece com 4 contribuidores e a métrica continua suprimida |

Preservado sem regressão: usuário legítimo com múltiplas memberships continua
gravando em qualquer organização de que seja membro ativo; `organization_id`
nulo (uso individual sem organização) continua aceito nas duas RPCs;
`user_id` nunca é parâmetro aceito pelo chamador (confirmado por guard
estático); `score`/`event_type`/`context` continuam validados pelos `CHECK`
constraints existentes, sem duplicação de vocabulário na RPC.

R22 continua `OPEN / REQUIRED_BEFORE_PRODUCTION`; nenhuma migration TRUST foi
promovida remotamente nesta onda.