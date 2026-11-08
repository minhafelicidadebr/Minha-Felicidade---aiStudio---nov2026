# METRIC_PRIVACY_POLICY

Política de privacidade dos indicadores agregados. **Normativa** — prevalece
sobre conveniência de formato de resposta, de layout ou de exportação.

Decidida pelo humano em 2026-07 (§D5, §D6, §D7 do
[DASHBOARD_PRODUCT_CONTRACT](./DASHBOARD_PRODUCT_CONTRACT.md)).

Contexto que justifica o rigor: a plataforma atende **adolescentes**. Um
indicador de turma pequena não é estatística, é quase um nome.

Nada aqui afirma conformidade legal. Descreve o comportamento técnico aplicado; a
interpretação jurídica é de humanos.

## 1. Limiar mínimo

**N = 5** participantes distintos por grupo agregado.

O valor vive em **uma** configuração canônica **server-side** e não é repetido em
componentes de interface. Repetir a constante em vários lugares é como o limiar
se degrada silenciosamente: basta um componente ficar para trás.

O cliente pode **exibir** o limiar que o servidor informou, mas nunca o define
nem o aplica sozinho.

## 2. Regra por cardinalidade do grupo

| Universo elegível | Comportamento |
|---|---|
| `n = 0` | Valor `0` e contagem `0`, com marcador de **grupo vazio**. Um grupo vazio não expõe pessoa alguma, então zero é um valor real. |
| `1 ≤ n ≤ 4` | **Supressão.** Sem valor, sem contagem, sem porcentagem. Apenas marcador de amostra insuficiente e o limiar aplicado. |
| `n ≥ 5` | Agregado divulgado, com contagem exata do grupo. |

Subdivisões (turma dentro de escola) estão sujeitas ao **mesmo** limiar,
avaliadas por subdivisão.

Os três estados — grupo vazio, amostra insuficiente e falha de leitura — têm
textos **distintos**, sem reuso entre eles. Confundi-los faria o gestor decidir
sobre um número que não existe.

## 3. Escola abaixo do limiar (§D5)

A escola **não** desaparece. Ela permanece visível como entidade operacional,
com:

- nome;
- situação da implantação;
- gestor responsável;
- turmas configuradas;
- convites e pendências operacionais;
- ações administrativas permitidas.

O que é suprimido são **os indicadores derivados da atividade dos estudantes**.
No lugar deles:

> Amostra insuficiente para exibição segura.

Racional: dado operacional da escola (quantas turmas existem, quantos convites
estão pendentes) é sobre a **implantação**, não sobre o comportamento de um
adolescente. Esconder a escola inteira quebraria a operação do piloto sem ganho
de privacidade.

## 4. Supressão complementar (§D6)

Problema: com **um único** grupo suprimido dentro de um conjunto cujo total é
divulgado, o valor suprimido é recuperável por subtração. Não é hipótese
teórica — é aritmética de primeiro grau.

Regra determinística obrigatória. Quando exatamente um grupo está suprimido e o
total do conjunto permite deduzir o seu valor, suprimir **também**:

- a **segunda menor** turma; **ou**
- o **total agregado**, quando essa opção preservar mais utilidade.

A escolha entre as duas alternativas é determinística e documentada no código,
não decidida caso a caso em tempo de execução por heurística opaca.

Resultado esperado: nenhum conjunto divulgado permite isolar o valor de um grupo
suprimido.

## 5. Superfícies cobertas (§D6)

A supressão vale em **todas** as saídas, não só no pixel:

- API;
- RPC;
- cards de métrica;
- gráficos;
- tooltips;
- labels de acessibilidade (`aria-*`);
- PDF;
- CSV;
- qualquer export.

Esconder apenas o número na interface **não cumpre** esta política: o valor real
continuaria trafegando no payload, visível em DevTools, em log de rede e em
qualquer export.

## 6. Forma da resposta suprimida (§D7)

Para grupo abaixo do limiar, a resposta **não** contém:

- valor;
- contagem;
- porcentagem;
- intervalo que permita inferência;
- tooltip com o dado;
- campo oculto no payload;
- metadado acessível por exportação.

A resposta contém **apenas**:

1. indicação de dado suprimido;
2. motivo da supressão;
3. limiar aplicado.

Isto contraria a uniformidade do formato de resposta — um grupo suprimido devolve
menos campos que um grupo divulgado. **A privacidade tem precedência sobre a
uniformidade.** Consumidores da resposta tratam o campo ausente como suprimido,
não como zero.

## 7. Testes obrigatórios

Nenhuma onda que toque indicadores agregados passa no gate sem cobrir:

- grupo com 1 a 4 participantes (supressão de valor **e** contagem);
- grupo com 0 participantes (zero real, texto próprio);
- inferência por subtração (supressão complementar);
- payload de grupo suprimido (ausência do valor no dado bruto, não só na tela);
- exportação de grupo suprimido (PDF/CSV);
- limiar lido de configuração única, não duplicado.
