# CEDER — Calculadora de Despesas
## VERSAO 3.0 CALCULADORA BEATRICE BUFFADA

Modéstia à parte, é a calculadora mais justa da internet para controlar despesas e pagamentos em moradias compartilhadas. Ela vem sendo desenvolvidada desde 2023, a partir de várias experiências reais em alojamentos e repúblicas. A CEDER divide as contas da casa por dias em casa, por uso de aparelhos e serviços e retorna o que cada pessoa deve pagar. Todo item é a mesma coisa: um custo, um grupo de participantes e uma regra de peso. Despesas "Fixa", "variável" e "individual" não são três mecanismos; são combinações de (quem paga × como divide (igual? por dias na casa? por uso?)). O custo, porém, tem três origens diferentes, e a diferença importa:
* consumo  -> sai de dentro da fatura de luz ou de água. Tem teto.
* porUso   -> também sai da fatura, mas o total depende de quantos usos.
* reais    -> não passa por fatura nenhuma. Soma por cima. Não tem teto.
O que sobra das faturas depois dos itens de consumo vira uso comum, dividido por dias contados. É isso que garante o invariante: a soma cobrada é luz + água + itens em reais.

> Para **rodar um teste de cliente** — da primeira mensagem ao relatório
> entregue — o arquivo é [`EQUIPE.md`](EQUIPE.md). Este README é sobre o
> código.

## Conjuntos e modos

A CEDER divide despesas de **conjuntos**. O app abre no painel de **Meus
conjuntos**: cada um guarda o próprio fechamento, e dá para ter quantos quiser
no mesmo navegador — um por cliente, ou um por mês do mesmo cliente.

Ao criar um conjunto, escolhe-se o **modo**. Os quatro são o mesmo motor em
escalas diferentes: moradia compartilhada é o caso completo (n contas, cada uma
com o seu ciclo) e evento é o degenerado (nenhuma conta, nenhum ciclo). O que
cresce entre eles é **quantos ciclos independentes se sobrepõem**, não o
cálculo. Um modo é um conjunto de padrões,
nunca um cálculo diferente:

| modo | quem é | como pergunta a presença | régua do uso comum |
| --- | --- | --- | --- |
| `moradia` | república, coliving, alojamento | marca os dias **fora** | sim, começa em por dias |
| `temporada` | multipropriedade, casa de praia, lancha | marca os dias de **estadia** | sim, começa em por dias |
| `familia` | casal ou família, até 5 pessoas | marca os dias **fora** | sim, começa em por igual |
| `evento` | churrasco, rolê, carona | não conta dias | não tem sobra para calibrar |

A régua de **por dias ↔ por igual** existe em todo modo que tenha fatura, e vai
de 0 a 100 em qualquer um deles. O que o modo define é só onde ela começa: a
casa arrasta para onde quiser. Um modo nunca tira uma regra de divisão da mesa.

Na temporada a régua pesa muito mais do que numa república. Os dias de cada
morador de uma república são parecidos, então mover a régua muda pouco. Numa
propriedade de temporada, parte da luz roda com a casa vazia — geladeira,
bomba, standby — e conserva a propriedade de todos: em *por dias*, quem foi
passar uns dias paga sozinho por isso. A tela diz isso ao lado da régua, no
momento do fechamento, em vez de escolher pela casa.

Todos os modos estão em `nucleo/modos.js`, um objeto cada. Acrescentar um modo
é acrescentar uma entrada: `estadoInicial`, a navegação, o vocabulário da tela
e a polaridade da presença leem de lá. **Se um modo algum dia precisar de uma
conta própria, o modelo quebrou** — não falta um campo no modo.

### A polaridade da presença

Numa república o normal é estar em casa, então marca-se a exceção: quem saiu.
Numa casa de temporada o normal é não estar, e a exceção é ter ido. São os
campos `ausencias` e `presencas` do morador, e quem decide qual vale é o modo,
nunca adivinhar qual dos dois está preenchido — uma casa de temporada recém
criada tem as estadias vazias, e isso quer dizer "ninguém foi ainda", não
"todo mundo ficou o mês inteiro".

A inversão acontece inteira em `traducao/morador.js`. O domínio continua
recebendo só `diasFora: number` e não sabe que existem dois jeitos de
perguntar.

### As sete divisões

Todo item oferece as sete, qualquer que seja o tipo de custo:

| regra | o que pesa | observação |
| --- | --- | --- |
| `igual` | 1 por cabeça | |
| `dias` | dias em casa | |
| `presenca` | probabilidade de estar em casa | estimativa com 2+ ausentes; o motor avisa |
| `uso` | vezes que usou | inteiro |
| `horas` | horas que usou | decimal; mesmo mecanismo do uso |
| `porcentagem` | a fatia declarada | avisa se não somar 100 |
| `valor` | os reais declarados | **erro** se não somar o custo do item |

Antes o catálogo restringia as regras por item — geladeira só aceitava igual e
dias. Isso ia contra a tese: a base da divisão é escolha da casa, não da
calculadora. `rateiosDoItem` continua existindo, mas como **sugestão** (o que a
tela destaca), não como permissão. `rateiosSugeridos` lê isso; `rateiosPermitidos`
devolve sempre as sete.

**`valor` é a única regra em que o número digitado é o valor final**, e não uma
proporção. Por isso é a única que pode não fechar, e por isso o alerta dela é
vermelho: dinheiro declarado que não soma o custo do item é erro de quem
lançou. Enquanto não é consertado, o motor divide na proporção escrita e o
invariante continua de pé — ele nunca inventa nem perde dinheiro por causa de
um lançamento torto.

### O calendário

Depois de Contas, Moradores e Itens vem o **Calendário**: um mês, e o que
aconteceu em cada dia. É por ali que entra tudo o que tem data —

| natureza | de onde vem no estado | entra no cálculo? |
| --- | --- | --- |
| presença | `morador.ausencias[]` ou `.presencas[]` | sim, como dias contados |
| uso | `item.eventos[]` | sim, no item por uso |
| despesa | item em reais com `data` | sim, como qualquer item em reais |
| tarefa | `estado.tarefas[]` | **não** |

**Tarefa é registro, não dinheiro.** Lavar louça, passar pano e tirar o lixo
ficam anotados com data e com quem fez, e nenhum valor muda por causa disso.
Faxineira paga tem nome parecido e é outra coisa: ali sai dinheiro, então é um
item do catálogo (`faxina`, por uso, em reais).

`nucleo/agenda.js` é o único lugar que junta as quatro origens numa lista só.
Ele não calcula nada — é uma leitura do estado, e o motor continua recebendo o
mesmo estado de antes. A mesma lista vira o **Histórico**, no fim do passo e no
relatório: o mês em ordem, que é onde se enxerga o dia que ficou em branco.

### Onde os conjuntos ficam

No `localStorage` deste navegador, em duas chaves de natureza diferente:

```
cdr:casas      o índice: uma ficha por conjunto (nome, modo, mês) e qual está aberto
cdr:casa:<id>  o estado de um conjunto, lido só quando ele abre
```

Guardar o índice separado é o que faz o painel abrir rápido com trinta
conjuntos salvos. A casa única das versões anteriores (`cdr:casa`) é adotada
como a primeira do índice na primeira vez que o app abre, e a chave antiga sai
do caminho.

**Limpar os dados do site apaga tudo, e nenhum outro aparelho vê nada.** Por
isso o painel tem *Baixar* e *Trazer de um arquivo*: para um conjunto que não
pode ser perdido, o arquivo é o backup. *Próximo mês* copia o conjunto com as
mesmas pessoas e os mesmos itens, já virado para o mês seguinte e com os
valores em branco.

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
│  ├─ motor.ts              porta de entrada do domínio (só reexporta)
│  ├─ dominio/              o cálculo, uma CRC por arquivo — ver abaixo
│  ├─ adaptador.js          porta de entrada da tradução (só reexporta)
│  ├─ traducao/             a tela (texto) vira o domínio (números)
│  ├─ catalogo.js           itens que a casa pode adicionar
│  ├─ modos.js              os padrões de cada tipo de conjunto
│  ├─ agenda.js             tudo o que tem data, numa lista só
│  ├─ persistencia.js       os conjuntos salvos neste navegador
│  ├─ estadoInicial.js      com o que a tela abre, conforme o modo
│  └─ formato.js            num, reais, tarifa, cores, nomes
│
├─ ganchos/
│  └─ useCDR.js             o estado da casa aberta, as casas salvas e as ações
│
├─ componentes/             
│  ├─ MarcaCeder.jsx
│  ├─ Cabecalho.jsx  Navegacao.jsx
│  ├─ Campo.jsx  Seletor.jsx  Segmentado.jsx  Pastilha.jsx
│  └─ Botao.jsx  Ficha.jsx  Titulo.jsx  Rotulo.jsx  Alerta.jsx
│
├─ passos/                  
│  ├─ PainelDeCasas.jsx  EscolhaDeModo.jsx
│  ├─ PassoContas.jsx  PassoMoradores.jsx
│  ├─ PassoItens.jsx  CartaoItem.jsx  PassoCalendario.jsx
│  └─ PassoRateio.jsx  Regua.jsx
│
└─ estilos/base.css         tokens em variáveis CSS + toda a responsividade
```

## O domínio, por responsabilidade

O cálculo está dividido pelas CRCs (Classe–Responsabilidade–Colaboração) do
modelo da CEDER. Não são classes: cada CRC é um arquivo com o seu tipo e as
suas funções puras, porque o estado da tela é um objeto simples que o React
recria a cada mudança e o navegador salva como JSON.

| arquivo em `dominio/` | CRC | responsabilidade |
| --- | --- | --- |
| `ciclo.ts` | Ciclo | quantos dias tem o fechamento e cada fatura |
| `morador.ts` | Morador, Ausência | quantos desses dias cada um passou em casa |
| `fatura.ts` | Fatura | separar taxa de consumo e achar a tarifa |
| `uso.ts` | Uso | quantos usos, de quem, dentro de qual ciclo |
| `consumo.ts` | Consumo | quanto cada item gastou em kWh e m³, antes de virar dinheiro |
| `custo.ts` | Custo | consumo × tarifa, separado pela conta de onde sai |
| `regras.ts` | RegraDeAlocação | o peso de cada pessoa, uma entrada por regra em `REGRAS` |
| `alocacao.ts` | Alocação | aplicar os pesos ao custo: a parcela de cada um |
| `explicacao.ts` | Explicação | o total de cada um desmontado item a item, e todos os avisos |
| `fechamento.ts` | Fechamento | a ordem em que tudo isso acontece, e a conferência |

`tipos.ts` é o vocabulário que todas compartilham e `numeros.ts` a aritmética
miúda. A Casa é o `Estado` que o fechamento recebe e não tem comportamento
próprio. Regra e resultado são coisas separadas: `regras.ts` só produz pesos,
quem transforma peso em reais é `alocacao.ts`.

Para acrescentar uma regra de divisão, acrescente uma entrada em `REGRAS`. O
`misto` já está lá — é o que divide o uso comum —, mas com `oferecida: false`,
então ainda não aparece para a casa escolher item a item.

`traducao/` é a outra metade: a tela guarda texto e datas, o domínio só
entende números e tamanhos de ciclo. Cada arquivo dali traduz um assunto
(`fatura.js`, `morador.js`, `uso.js`, `item.js`, `casa.js`). O domínio não
importa nada da tela; é sempre a tradução que importa o domínio.

`motor.ts` e `adaptador.js` continuam existindo com os mesmos nomes
exportados de antes, então nenhum import do resto do projeto mudou.

### O que ainda não é genérico

Luz e água têm nome próprio em vários tipos (`luzKwh`, `diasLuz`, `usosLuz`).
Uma terceira conta com ciclo próprio — gás, internet — ainda não cabe sem
mexer nesses tipos. Todo lugar do domínio que distingue as duas passa pelo
tipo `Mundo`, em `tipos.ts`, e só `fatura.ts` conhece os nomes dos campos de
cada fatura; é por aí que começa a troca por uma lista de recursos.

O Evento também não existe como entidade. As ausências chegam ao domínio já
contadas e os usos já somados; as datas ficam na tradução.

**Falta a regra por cota.** Numa multipropriedade, custo fixo que não depende
de uso — condomínio, seguro, IPTU, marina — não deveria ir por dias nem por
igual, e sim pela fração que cada um tem da propriedade. Hoje só existe
`igual` para esse caso, e é uma resposta errada que parece certa. A regra cabe
em `dominio/regras.ts` como mais uma entrada em `REGRAS`, lendo uma fração
declarada por morador; `rateiosPermitidos` e o resto leem do registro sozinhos.

**Divisão por horas já funciona**, e não é regra nova: é `uso` com hora no
lugar de uso. `usos` é `Record<MoradorId, number>` e aceita decimal, então
`custo: reais` mais `rateio: uso` com as horas de cada um já divide um
combustível de lancha na proporção certa. O que falta é a tela dizer "horas"
em vez de "usos" e aceitar vírgula.

## Os centavos que não existem

Cem reais entre três pessoas dá 33,33 para cada uma, e 33,33 três vezes são
99,99. A conta fecha em números reais e não fecha em dinheiro. A CEDER refaz a
divisão em centavos inteiros (a moeda em que ela vai ser paga de verdade) e,
quando sobra ou falta, avisa em amarelo dizendo quantos centavos são, em vez de
dizer que fechou certinho. Quem paga a diferença é decisão da casa, não da
calculadora.

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

### Leitura, não dia

As duas datas do ciclo são **leituras**, não um intervalo de dias. A segunda é
o instante em que o ciclo seguinte começa, então o dia dela não é cobrado aqui:
de 01/12 a 30/12 são **29 dias**, e o último dia cobrado é 29/12. É o que
garante que o fim de um ciclo seja o começo do outro sem nenhum dia ser contado
duas vezes — se o dia 30 contasse inteiro, ele seria cobrado nesta fatura e na
próxima.

Isso já confundiu em uso real, então o selo do ciclo mostra sempre o último dia
contado (`29 dias · até 29/12`) em vez de só o número.

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
npm run verificar   # tipos + a suíte inteira, antes de dar push
npm run build       # tipos + vite build, é o que o Vercel roda
```

Os testes saíram do `build` de propósito. Amarrar o deploy à suíte parecia
prudência e na prática tirou o site do ar por um teste desatualizado, num
momento em que havia gente esperando o link. O que precisa bloquear a
publicação é erro de tipo, que é rápido e determinístico; a suíte roda antes
do push, na máquina de quem mudou o código.
