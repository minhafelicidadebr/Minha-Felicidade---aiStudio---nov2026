# DASHBOARD_PRODUCT_CONTRACT

Contrato de produto dos dashboards por papel. Vale para toda onda UX.

> **Status deste arquivo.** Até a UX-2 este contrato circulou apenas no chat e
> **não estava versionado** — os arquivos `DASHBOARD-*.md` citados pelas ondas
> anteriores nunca existiram no repositório. Isso é uma lacuna real de
> rastreabilidade: as ondas UX-1 e UX-2 foram executadas contra um contrato que
> ninguém podia auditar depois. Este arquivo passa a ser a fonte versionada.
> As cláusulas abaixo marcadas **§D** foram decididas pelo humano em 2026-07,
> antes do design da UX-3, e são vinculantes.

## 1. Papéis e destinos

Vocabulário de dashboard derivado (`src/lib/role-home.ts`), com precedência
`platform_admin > org_admin > school_admin > educator > student`.

| Papel | Destino canônico | Observação |
|---|---|---|
| `platform_admin` | `/admin/operacao` | §D3 — landing administrativa própria |
| `org_admin` | `/org` | visão da rede |
| `school_admin` | `/escola/:schoolId` | §D — singular, D33/D43 |
| `educator` | `/professores` | painel docente |
| `student` | `/alunos` | migração de `/dashboard` na UX-4 |

Regras invariantes:

- `/escolas` é **landing pública de aquisição** e não é home de papel algum
  (D33/D43).
- Nenhum destino efetivamente navegado contém segmento `:` não resolvido.
- Um administrador de plataforma **nunca** é enviado para a experiência de
  gestor de organização (§D3).

### §D3 — Landing do administrador de plataforma (vinculante)

Redirecionar `platform_admin` para `/org` está **reprovado**. Motivo declarado:
confunde papel, pode mascarar falha de autorização e cria dívida que tende a
permanecer além do previsto.

Solução mínima obrigatória nesta onda — uma das duas:

1. criar `/admin/operacao` como landing provisória do administrador; **ou**
2. manter `/admin` como landing administrativa até `/admin/operacao` existir.

A página pode ser simples, mas deve conter: identificação clara
"Administração da Plataforma"; estado operacional básico; links para as áreas
administrativas já existentes; aviso do que ainda está em construção.

Requisito de aceite: zero loop de redirecionamento, zero 404, zero envio de
administrador de plataforma para painel de organização.

## 2. Contrato de métrica

Toda métrica exibida apresenta, sem exceção: valor, período, fórmula/explicação,
fonte, atualização (freshness), limitação conhecida e ação associada.

A fórmula e a limitação não são decorativas: são o que impede um gestor de ler
engajamento como prova de impacto psicológico.

## 3. Estados

Nenhum bloco assíncrono retorna `null` silenciosamente. Em cada bloco, exatamente
um de cinco estados: carregando, vazio, negado, erro, dado disponível.

Quando uma leitura falha, a interface declara que **o dado não pôde ser
carregado**. Nunca renderiza `0` fabricado (D45). Um zero inventado num painel de
gestor é pior que um estado vazio explícito.

## 4. Privacidade das métricas

O limiar mínimo e as regras de supressão estão em
[`METRIC_PRIVACY_POLICY.md`](./METRIC_PRIVACY_POLICY.md), que é normativo e
prevalece sobre qualquer conveniência de formato de resposta.

Resumo vinculante:

- Limiar mínimo **N = 5** participantes por grupo agregado, em configuração
  canônica **server-side**, não repetida em componentes (§D5).
- Escola com universo elegível `n < 5` **permanece visível como entidade
  operacional**; apenas os indicadores derivados de atividade de estudante são
  suprimidos (§D5).
- Supressão complementar obrigatória contra reconstrução por subtração (§D6).
- Privacidade prevalece sobre uniformidade do formato de resposta (§D7).

## 5. Navegação

Fonte única em `src/config/dashboard-navigation.ts`. Um item só aparece se o
papel efetivo estiver em `roles`. Item sem rota implementada usa `future: true`
e **não é renderizado** (proíbe link morto).

### §D4 — Item "Indicadores agregados" (vinculante)

O item `org-reports`, que hoje aponta para `/admin`, é **removido do menu do
gestor de organização**. Os indicadores agregados já estão integrados à
experiência de `/org`; um segundo item apontando para outro painel gera
duplicidade e carga cognitiva.

Esse item **não** é reaproveitado para `platform_admin`. A navegação
administrativa terá itens próprios em onda futura: Operação, Tenants, Segurança,
IA e custos, Conteúdos e claims.

## 6. Ações de governança

### §D1 — Fluxo de convite (vinculante)

Nesta onda a fila de decisões oferece **apenas** duas ações:

- **Reenviar convite**
- **Escalar pendência**

Não se implementa fluxo de "solicitar entrada e aguardar aprovação": seria outra
jornada, com tabelas, RPCs, estados e telas novos. Pode virar onda própria
**somente** se o piloto demonstrar necessidade concreta.

Obrigação adicional: **remover qualquer rótulo "Aprovar convite" da interface**,
porque a ação não existe no produto atual (doutrina §1 — honestidade).

### §D2 — Registro de escalonamento (vinculante)

Criar ledger novo e **append-only**. Reutilizar `notification_outbox` está
reprovado: envio de comunicação e histórico de decisões têm responsabilidades
diferentes.

Nome: `institutional_decision_events` (alternativa aceita: `governance_events`).

Campos mínimos: organização; escola ou turma relacionada; tipo do evento;
entidade de origem; severidade; motivo; ator; data; metadados mínimos;
identificador de idempotência quando aplicável.

Garantias: somente inserção; auditável; protegido por RLS/RPC; estado derivado
dos eventos, nunca por edição retroativa. **Não** armazenar texto livre sensível
nem dado pessoal desnecessário.

### §D8 — Reenvio de convite (vinculante)

Até **3 reenvios** além do envio inicial, com intervalo mínimo de **24 horas**
entre reenvios.

Aplicável somente quando o convite está: pendente; não aceito; não revogado;
dentro da validade.

Atingido o limite, o gestor deve aguardar a expiração, cancelar e emitir novo
convite quando permitido, ou usar outro canal institucional.

Cada tentativa é registrada com: ator; data; convite; resultado; e motivo de
bloqueio quando houver.

Antiburla: não é permitido contornar o limite recriando convites idênticos para o
mesmo destinatário em curto intervalo. A proteção vale **por organização e por
destinatário**, não apenas por registro de convite.

## 7. Responsividade

A partir de 768px: navegação persistente e filtros em linha. Abaixo de 768px: a
mesma navegação em drawer, navegação inferior e os mesmos filtros em sheet.

Nenhuma ação essencial desaparece por breakpoint sem equivalente. Bottom nav
limitada a 5 destinos, sem href duplicado, como subconjunto do drawer.

Viewports homologados por teste: 320, 375, 390, 768, 1024, 1280, 1440.

## 8. Acessibilidade

Skip link como primeiro elemento tabulável; exatamente um landmark `main` por
página (a casca já o provê — páginas reusam, não criam um segundo); foco visível;
nenhum significado transmitido apenas por cor.

Gráficos têm descrição acessível, tooltip e tabela alternativa real, operável por
teclado.

Honestidade (D4 histórica): **zero selo ou afirmação de conformidade de
acessibilidade sem auditoria**. Descrever comportamento verificável, não
certificação.

## 9. Honestidade

Nenhum texto de interface afirma conformidade legal. Descreve-se o comportamento
técnico — por exemplo "agregado com limiar mínimo de 5 pessoas por grupo" — e a
interpretação jurídica permanece com humanos.

Rótulo de ação que não existe no produto é proibido (§D1).

## 10. Definição de pronto

`npm run quality` verde: `audit:security`, `lint --max-warnings 0`, `typecheck`,
`test`, `build`, `security:gate`. Sem teste comentado, sem `skip`/`todo`, sem
hook de git desabilitado.
