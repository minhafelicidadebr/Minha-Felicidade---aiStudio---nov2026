# Onboarding do Claude Code neste repositório

Guia para assumir o projeto "App Yale / Felicidade.lab" no Claude Code.
Complementa o `CLAUDE.md` (raiz), que o Claude Code lê automaticamente.

## 1. Colocar o repositório no Claude Code

```bash
git clone https://github.com/minhafelicidadebr/app-curso-yale-vscode.git
cd app-curso-yale-vscode
claude
```

O `CLAUDE.md` é lido automaticamente. Ainda assim, envie o prompt abaixo na
primeira mensagem para forçar a leitura do contexto completo antes de agir.

## 2. Prompt de arranque (copiar e colar)

```
Você vai assumir o projeto "App Yale / Felicidade.lab" (edtech de bem-estar para
adolescentes, React+Vite+TS+Supabase/Lovable Cloud+Deno edge functions).

ANTES DE QUALQUER CÓDIGO, leia e me faça um resumo do que entendeu de:
1. CLAUDE.md (raiz) — handoff técnico 360°, estado atual e pendências.
2. .kiro/steering/doutrina-fable5.md e .kiro/steering/contexto-produto.md — regras
   não-negociáveis de segurança/ética e contexto de produto.
3. docs/security-invariants-runbook.md — invariantes de segurança e migrations.
4. .kiro/specs/pos-compra-assinatura/ (requirements, design, tasks) — próxima onda.

Contexto que você DEVE respeitar (detalhado no CLAUDE.md):
- Definição de "pronto" = `npm run quality` VERDE (audit+lint+typecheck+test+build+
  security:gate). Nunca use --no-verify, nunca comente teste que passou a falhar.
- Invariantes de segurança inegociáveis: nunca confiar no cliente (preço/plano/ids
  resolvidos no servidor); estado de assinatura só via RPC SECURITY DEFINER
  (service_role); service role key só em _shared/mercadopago.ts (allow-list do
  security-gate.mjs, amarrado à verificação HMAC).
- GOTCHAS de deploy Lovable Cloud: migrations em supabase/migrations NÃO são
  aplicadas automaticamente por git push; edge functions NÃO são deployadas
  automaticamente; o banco pode estar sem seed. Confirme schema/seed/deploy antes
  de assumir que algo "existe".
- Honestidade > overclaim: documente o que falta; não crie UI que promete o que o
  backend não faz (ex.: "editar cartão" sem billing recorrente).

Estado atual (confirme lendo o CLAUDE.md):
- Onda 1 (Monetização Mercado Pago) COMPLETA e validada em produção (Pix real
  ativou assinatura). Cobrança única por ciclo (não recorrente).
- Ganhos rápidos de pós-compra entregues (CTA de plano, card no dashboard,
  recursos por plano, erros de auth em PT).
- Onda 1.5 (pós-compra: e-mails via Resend, ciclo de vida, cancelamento
  self-service, histórico "Faturas e pagamentos") tem SPEC pronto, não implementada.
- ATENÇÃO: o protocolo de crise da IA (segurança de conteúdo para menores) está na
  branch feat/onda0-protocolo-crise e NÃO foi mergeado na main — item sensível.

Sua primeira tarefa: depois do resumo, proponha um plano priorizado dos próximos
passos (risco/impacto), destacando o que recomenda fazer primeiro e por quê. NÃO
comece a codar até eu aprovar. Trabalhe sempre em branch nova (feat/...), nunca
direto na main, e rode `git pull --ff-only origin main` antes de começar (o Lovable
também commita direto na main).
```

## 3. Regras de convivência com o Lovable

- O Lovable Cloud também commita direto na `main` (ex.: correções de client,
  migrations geradas). Sempre `git pull --ff-only origin main` antes de trabalhar.
- Mudanças em `main` só vão ao ar no site após **Publish** no Lovable.
- Migrations e edge functions novas precisam ser aplicadas/deployadas no Lovable
  (SQL editor / agente), não bastam no git.
