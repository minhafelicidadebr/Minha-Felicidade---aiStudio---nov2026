# TRUST-1.2.1 — RECEIPT DE UI E EXPORT

**Status:** ✅ contrato de supressão parcial propagado ao navegador e ao PDF.

## UI

Sete testes cobrem loading, erro recuperável, vazio real, suprimido, divulgado,
tabela acessível e resumo parcialmente suprimido. Resultado: **7/7 verdes**.

Para grupo suprimido, valor e count não aparecem em gráfico, tooltip, tabela,
DOM, `aria-label`, `title` ou `data-*`. O warning de dimensão zero do Recharts em
jsdom é benigno e não representa falha de contrato.

## Resumo e PDF

`suppressed_metrics` diferencia quais indicadores ficaram abaixo do limiar.
Métrica permitida continua visível; métrica suprimida vira `null` no cliente e
travessão/texto explícito no PDF — nunca zero fabricado.

O bloco inteiro só é substituído por “Amostra insuficiente” quando nenhum dos
indicadores de analytics é divulgável. Em supressão parcial, o PDF preserva os
permitidos e explica os travessões. NPS só é calculado com contagem, promotores e
detratores efetivamente divulgados.

## Limites honestos

Não há teste visual pixel a pixel do PDF ou do gráfico. Está provado o contrato de
dados e o DOM acessível. Contagens de roster administrativo continuam fora deste
limiar por decisão D90/R30.