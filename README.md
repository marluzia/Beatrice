# CDR — Calculadora de Despesas Republicanas
## VERSAO 3.0 CALCULADORA BEATRICE BUFFADA

Modéstia à parte, é a calculadora mais justa da internet para controlar despesas e pagamentos em moradias compartilhadas. Ela vem sendo desenvolvidada desde 2023, a partir de várias experiências em alojamentos e repúblicas. A CDR divide as contas da república por dias em casa, por uso de aparelhos e serviços e retorna o que cada pessoa deve pagar. Todo item é a mesma coisa: um custo, um grupo de participantes e uma regra de peso. Despesas "Fixa", "variável" e "individual" não são três mecanismos; são combinações de (quem paga × como divide (igual? por dias na casa? por uso?)). O custo, porém, tem três origens diferentes, e a diferença importa:
* consumo  -> sai de dentro da fatura de luz ou de água. Tem teto.
* porUso   -> também sai da fatura, mas o total depende de quantos usos.
* reais    -> não passa por fatura nenhuma. Soma por cima. Não tem teto.
O que sobra das faturas depois dos itens de consumo vira uso comum, dividido por dias contados. É isso que garante o invariante: a soma cobrada é luz + água + itens em reais.

## Rodar

```bash
npm install
npm run dev
```
## Estrutura

```
src/
├─ main.jsx                 entrada
├─ App.jsx                  casca: cabeçalho, navegação, passo atual, barra final
│
├─ nucleo/                  
│  ├─ motor.ts              o cálculo. segue a fonte da verdade
│  ├─ adaptador.js          traduz a tela (texto) para o motor (números)
│  ├─ catalogo.js           itens que a casa pode adicionar
│  ├─ estadoInicial.js      com o que a tela abre
│  └─ formato.js            num, reais, tarifa, cores, nomes
│
├─ ganchos/
│  └─ useCDR.js             todo o estado + ações com nome de coisa do mundo
│
├─ componentes/             
│  ├─ MarcaCDR.jsx          
│  ├─ Cabecalho.jsx  Navegacao.jsx
│  ├─ Campo.jsx  Seletor.jsx  Segmentado.jsx  Pastilha.jsx
│  └─ Botao.jsx  Ficha.jsx  Titulo.jsx  Rotulo.jsx  Alerta.jsx
│
├─ passos/                  
│  ├─ PassoContas.jsx  PassoMoradores.jsx
│  ├─ PassoItens.jsx  CartaoItem.jsx
│  └─ PassoRateio.jsx  Regua.jsx
│
└─ estilos/base.css         tokens em variáveis CSS + toda a responsividade
```

## Os centavos que não existem

Cem reais entre três pessoas dá 33,33 para cada uma, e 33,33 três vezes são
99,99. A conta fecha em números reais e não fecha em dinheiro. O CDR refaz a
divisão em centavos inteiros (a moeda em que ela vai ser paga de verdade) e,
quando sobra ou falta, avisa em amarelo dizendo quantos centavos são, em vez de
dizer que fechou certinho. Quem paga a diferença é decisão da casa, não da
calculadora.
## Checagem e testes

```bash
npm run checar        # tsc --noEmit: verifica os tipos do motor
npm run testar        # vitest: 86 testes
npm run testar:vigiar # roda de novo a cada arquivo salvo
npm run build         # checar + testar + vite build, nessa ordem
```

### O que os testes cobrem

- `src/nucleo/motor.teste.ts` — cenários: cada tipo de custo, cada rateio,
  o teto das faturas, o resto que vira uso comum, os centavos, e os casos
  degenerados (casa vazia, um morador só, fatura zerada).
- `src/nucleo/propriedades.teste.ts` — 400 repúblicas sorteadas por semente
  determinística. Afirma o que precisa valer **sempre**: a soma cobrada é igual
  ao total devido, nada é `NaN`, as fatias de cada item somam o custo do item,
  os dias contados cabem no mês. Quando falha, a mensagem traz a semente:
  `republica(12)` reproduz o caso exato.
- `src/nucleo/adaptador.teste.js` — a fronteira entre a tela e o motor, que é
  onde um erro de nome de campo faria um item custar zero em silêncio. Todo
  modelo do catálogo é preenchido e precisa custar mais que zero.
- `src/ganchos/useCDR.teste.js` — as ações que mexem em morador e item ao mesmo
  tempo, como entrar na casa depois que os itens já existem.

### Casa sem morador

Zerar a quantidade de moradores é um estado que a tela alcança. Existe conta a
pagar e não existe quem pague, então o motor devolve alerta vermelho em vez de
um rateio vazio. `conferir()` trata esse caso à parte: sem morador, o invariante
que se exige é que não haja nada a dividir.

### Quando é exato e quando é estimativa

O rateio por presença precisa saber se as ausências se sobrepõem. Com **uma
pessoa** viajando, isso é dedutível sem datas: os dias dela caem
necessariamente dentro dos dias de quem ficou. O resultado é exato.

Com **duas ou mais**, não dá para saber se as viagens coincidiram. O motor
supõe que não coincidiram e **avisa na tela que supôs**. A resposta definitiva
para esse caso é coletar as datas, não só a contagem de dias — e é aí que um
formulário preenchido por cada morador passa a valer mais que uma mensagem no
grupo.

## O período segura o resto

Moradores, itens e rateio são todos medidos contra o ciclo do fechamento. Com
meia data escrita, o ciclo não existe, e a tela seguinte mostra contagem de
dias que não vem de lugar nenhum — o erro aparece três telas depois da causa.
Por isso a tela de contas segura as outras até o período estar resolvido.

Resolver quer dizer uma destas três, por fatura:

- **as duas datas em branco** — vale o mês de referência inteiro
- **o ciclo completo** — de 20 a 45 dias, com datas de 2020 até o ano seguinte
  ao corrente
- **a fatura desligada** — não cobra nada e não exige nada

Meia data não é nenhuma das três, e é justamente o caso que produzia
fechamento sem mês.

O teto do ano tem um ano de folga de propósito. Parar no ano corrente
quebraria todo dezembro: uma leitura de 28/12 termina em 26/01 do ano
seguinte, e é fatura comum. A folga ainda recusa 2039 e 2932, que são os
dedos trocados que de fato acontecem.

### Como a data pode ser escrita

Espaço, ponto e traço valem como barra, e o grupo de um dígito ganha o zero:
`01/09/2026`, `01 09 2026`, `1 09 2026`, `01 9 2026` e `1-9-2026` produzem a
mesma data. A máscara recusa na tecla o dígito impossível — dia acima de 31,
mês acima de 12, ano que não comece em 1 ou 2 — em vez de deixar escrever
`23/23/2323` e reclamar no fim.

## Testes e deploy

```bash
npm run verificar   # tipos + 435 testes, antes de dar push
npm run build       # tipos + vite build, é o que o Vercel roda
```

Os testes saíram do `build` de propósito. Amarrar o deploy à suíte parecia
prudência e na prática tirou o site do ar por um teste desatualizado, num
momento em que havia gente esperando o link. O que precisa bloquear a
publicação é erro de tipo, que é rápido e determinístico; a suíte roda antes
do push, na máquina de quem mudou o código.
