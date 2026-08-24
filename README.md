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

O `build` só produz `dist/` se as duas etapas anteriores passarem. Isso é
proposital: o CDR existe para o número estar certo, e um erro de cálculo que
chega ao usuário custa mais caro que um build que falha.

A checagem de tipos não é decorativa. O `vite build` usa esbuild, que **apaga**
as anotações de TypeScript sem verificar nada — sem o `tsc` no caminho, acessar
um campo do ramo errado de um `Custo` passa direto e só quebra no navegador.

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

## Juntar os dados do mês

A parte chata de fechar as contas nunca foi calcular: foi catar o dado de cada
um. No fim do passo de itens, o CDR monta uma mensagem pronta para colar no
grupo da casa, perguntando exatamente o que os itens configurados exigem — e
nada além disso. Sem item por uso, ninguém é perguntado sobre lavagens; com o
ar-condicionado já preenchido, as horas não são pedidas de novo.

A mensagem pede que todo mundo responda no mesmo lugar, à vista dos outros.
Isso é de propósito: transparência na coleta é o que permite qualquer morador
conferir a conta por fora.

`src/nucleo/coleta.js` é pura — recebe o estado da tela e devolve texto, então
dá para testar sem navegador (`src/nucleo/coleta.teste.js`).

## Por dias e por presença

Duas formas de cobrar quem viaja, e a diferença entre elas é dinheiro real.

**Por dias** cobra na proporção dos dias que cada um passou em casa. Serve para
gasto que acompanha a pessoa: galão de água, gás, comida.

**Por presença** divide o custo de *cada dia* entre quem estava em casa naquele
dia. Serve para aparelho cujo consumo não muda com o número de pessoas — um
ar-condicionado gasta o mesmo resfriando o quarto com uma ou com duas.

Quarto dividido, mês de 30 dias, ar de R$ 300. Bia ficou o mês inteiro, Cau
ficou 10 dias:

| | por dias | por presença |
|---|---:|---:|
| Bia | R$ 225,00 | R$ 250,00 |
| Cau | R$ 75,00 | R$ 50,00 |

Nos 20 dias em que a Cau esteve fora, o ar rodou inteiro para a Bia e custou o
mesmo. Por dias, a Cau paga parte disso; por presença, não.

### Quando é exato e quando é estimativa

O rateio por presença precisa saber se as ausências se sobrepõem. Com **uma
pessoa** viajando, isso é dedutível sem datas: os dias dela caem
necessariamente dentro dos dias de quem ficou. O resultado é exato.

Com **duas ou mais**, não dá para saber se as viagens coincidiram. O motor
supõe que não coincidiram e **avisa na tela que supôs**. A resposta definitiva
para esse caso é coletar as datas, não só a contagem de dias — e é aí que um
formulário preenchido por cada morador passa a valer mais que uma mensagem no
grupo.

## Salvamento no navegador

A casa é salva no `localStorage` meio segundo depois da última tecla — sem
servidor, sem conta, sem sincronização. Recarregar a página ou fechar a aba não
apaga nada; trocar de aparelho ou abrir numa aba anônima começa do zero.

`src/nucleo/persistencia.js` é à prova de falha por obrigação: navegador com
armazenamento bloqueado, cota estourada ou dado corrompido não podem derrubar a
tela. Em qualquer desses casos o CDR abre vazio, que é ruim mas utilizável.

O campo `VERSAO` existe para quando a forma do estado mudar. Suba o número e o
dado antigo é descartado em vez de lido errado — dado antigo interpretado com
código novo produz conta errada em silêncio, que é pior que começar do zero.

Para publicar, veja `DEPLOY.md`.

## Ajuda dentro da tela

Cada passo tem um painel recolhível explicando as regras daquela parte:
de onde tirar os números das faturas, o que conta como dia fora, como escolher
entre as quatro divisões, como ler o resultado e por que às vezes falta um
centavo.

Ficam fechados por padrão. Regra que não é óbvia precisa estar explicada em
algum lugar, mas explicar tudo de uma vez na tela assusta quem só quer fechar a
conta do mês. Os textos estão todos em `src/passos/ajudas.jsx`.
