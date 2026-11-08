# TRUST-1.2 — SUPRESSÃO COMPLEMENTAR (§D6)

Documenta o **algoritmo**, não apenas o resultado. Sem secrets nem dados pessoais.

## O problema

Suprimir um grupo pequeno não basta quando o total é divulgado:

```
Total    = 20
Turma A  = 17
Turma B  = SUPRIMIDO
```

`20 − 17 = 3`. Não é ataque teórico — é aritmética de primeiro grau, e qualquer
pessoa com a tela aberta faz.

Com **dois ou mais** grupos suprimidos o valor de cada um fica indeterminado: só
se conhece a soma. Por isso o gatilho é **exatamente um** grupo suprimido.

## Dois canais independentes

O payload de `get_school_metrics` carrega duas famílias de números, e cada uma
permite sua própria subtração:

| Canal | Total | Partes |
|---|---|---|
| **Valor** (eventos de atividade) | `totals.*` | `classes[].group.value` |
| **Headcount** (pessoas) | `eligible_universe` | `classes[].group.count` |

A implementação da UX-3 protegia só o canal de **valor**. O canal de
**headcount** ficou aberto até esta onda — foi o segundo vazamento do R10.

## Algoritmo — canal de valor

Executado sobre os grupos de turma, depois da supressão por limiar.

```
suprimidos  := grupos com suppressed = true
divulgados  := grupos com suppressed = false

se universo da escola é divulgável E |suprimidos| = 1:
    se |divulgados| >= 2:
        vítima := o divulgado de MENOR value
                  (empate resolvido pela chave, ordem lexicográfica)
        vítima passa a suprimido, reason = 'complementary'
    senão:
        totals inteiros passam a suprimidos, reason = 'complementary'
```

**Por que suprimir o menor divulgado quando sobram dois ou mais:** o conjunto
continua mostrando o total e ao menos um grupo, então o gestor ainda compara.
Esconder o total cegaria a visão de conjunto sem necessidade.

**Por que suprimir o total quando só sobra um divulgado:** suprimir o único grupo
restante deixaria o conjunto sem nenhum detalhe. Preservar os grupos e esconder o
total mantém mais utilidade.

**Determinismo:** o desempate pela chave em ordem lexicográfica garante que a
mesma entrada produza sempre a mesma saída. Sem isso, dois renders da mesma tela
poderiam esconder turmas diferentes — e comparar os dois reconstruiria as duas.

## Algoritmo — canal de headcount (novo nesta onda)

Executado **depois** do canal de valor, sobre o resultado dele.

```
ainda_suprimidos := recontagem de grupos suprimidos APÓS o canal de valor

se universo é divulgável E universo > 0 E ainda_suprimidos = 1:
    eligible_universe passa a suprimido, reason = 'complementary'
```

Justificativa: com exatamente um grupo suprimido, o `count` dele é a única
incógnita de

```
eligible_universe = Σ(counts divulgados) + count_suprimido
```

Suprimir `eligible_universe` transforma isso em duas incógnitas e fecha o canal.

**Por que suprimir o total e não mais um `count`:** o total é um único número,
enquanto esconder outro `count` cegaria uma turma inteira que atingiu o limiar.
Mesma lógica do `suppress_total` já documentada em `metric-privacy.ts`.

**Independência de ordem:** a recontagem opera sobre o conjunto inteiro, não sobre
a sequência de retorno. Reordenar `classes` não muda o resultado.

## Interação entre os dois canais

O caso `ainda_suprimidos = 1` só ocorre quando o canal de valor caiu no ramo
`|divulgados| < 2` — ou seja, quando os totais **já** foram suprimidos. Isso é
consequência, não coincidência:

- `|suprimidos| = 1, |divulgados| >= 2` → vítima suprimida → recontagem = 2
- `|suprimidos| = 1, |divulgados| < 2` → totais suprimidos → recontagem = 1
- `|suprimidos| = 0` → recontagem = 0
- `|suprimidos| >= 2` → recontagem >= 2

A função mantém uma **linha de guarda** que força os totais a suprimidos sempre
que `eligible_universe` é suprimido por complementaridade. Hoje é redundante; ela
existe para que uma alteração futura no canal de valor não reabra o canal de
headcount em silêncio.

## Tabela-verdade verificada em execução

Turmas descritas por headcount. `k = 5`.

| Cenário | Turmas | Suprimidos por limiar | Ação complementar | `eligible_universe` | `totals` |
|---|---|---|---|---|---|
| Todas grandes | [17, 8] | 0 | nenhuma | divulgado | divulgado |
| Uma pequena, uma grande | [17, 3] | 1 | totais suprimidos | **suprimido** (`complementary`) | suprimido |
| Uma pequena, duas grandes | [17, 5, 3] | 1 | menor divulgado suprimido | divulgado | divulgado |
| Duas pequenas | [18, 3, 3] | 2 | nenhuma necessária | divulgado | divulgado |
| Escola abaixo do limiar | [3] | — | — | **suprimido** (`below_threshold`) | suprimido |
| Escola vazia | [] | — | — | divulgado (`0`, `isEmpty`) | divulgado (`0`) |

Todos os seis medidos contra PostgreSQL real. Ver
`TRUST_1_2_PRIVACY_TEST_RECEIPT.md`.

## Onde o algoritmo vive

| Lado | Arquivo | Papel |
|---|---|---|
| Servidor (autoridade) | `20260828120000_trust1_2_privacy_and_archive.sql` | Decide e aplica |
| Cliente (leitura) | `src/lib/metric-privacy.ts` | Só lê o que o servidor decidiu |

`metric-privacy.ts` mantém `isSubtractionRecoverable`,
`planComplementarySuppression` e `enforceSubtractionSafety` como funções puras
testadas. Elas **não** são usadas para proteger em tempo de render — se fossem, o
valor real teria que chegar ao cliente. Servem para verificar o contrato em teste
e para documentar a regra em código executável.
