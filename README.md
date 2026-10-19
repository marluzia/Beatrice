# CEDER   Calculadora de Despesas
## VERSAO 3.0 CALCULADORA BEATRICE BUFFADA

Modéstia à parte, é a calculadora mais justa da internet para controlar despesas e pagamentos em moradias compartilhadas. Ela vem sendo desenvolvidada desde 2023, a partir de várias experiências reais em alojamentos e repúblicas. A CEDER divide as contas da casa por dias em casa, por uso de aparelhos e serviços e retorna o que cada pessoa deve pagar. Todo item é a mesma coisa: um custo, um grupo de participantes e uma regra de peso. Despesas "Fixa", "variável" e "individual" não são três mecanismos; são combinações de (quem paga × como divide (igual? por dias na casa? por uso?)). O custo, porém, tem três origens diferentes, e a diferença importa:
* consumo  -> sai de dentro da fatura de luz ou de água. Tem teto.
* porUso   -> também sai da fatura, mas o total depende de quantos usos.
* reais    -> não passa por fatura nenhuma. Soma por cima. Não tem teto.
O que sobra das faturas depois dos itens de consumo vira uso comum, dividido por dias contados. É isso que garante o invariante: a soma cobrada é luz + água + itens em reais.

> Para **rodar um teste de cliente**   da primeira mensagem ao relatório
> entregue   o arquivo é [`EQUIPE.md`](EQUIPE.md). Este README é sobre o
> código.

## Conjuntos e modos

A CEDER divide despesas de **conjuntos**. O app abre no painel de **Meus
conjuntos**: cada um guarda o próprio fechamento, e dá para ter quantos quiser
no mesmo navegador   um por cliente, ou um por mês do mesmo cliente.

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
propriedade de temporada, parte da luz roda com a casa vazia   geladeira,
bomba, standby   e conserva a propriedade de todos: em *por dias*, quem foi
passar uns dias paga sozinho por isso. A tela diz isso ao lado da régua, no
momento do fechamento, em vez de escolher pela casa.

Todos os modos estão em `nucleo/modos.js`, um objeto cada. Acrescentar um modo
é acrescentar uma entrada: `estadoInicial`, a navegação, o vocabulário da tela
e a polaridade da presença leem de lá. **Se um modo algum dia precisar de uma
conta própria, o modelo quebrou**   não falta um campo no modo.

### A polaridade da presença

Numa república o normal é estar em casa, então marca-se a exceção: quem saiu.
Numa casa de temporada o normal é não estar, e a exceção é ter ido. São os
campos `ausencias` e `presencas` do morador, e quem decide qual vale é o modo,
nunca adivinhar qual dos dois está preenchido   uma casa de temporada recém
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