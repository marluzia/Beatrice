# CEDER   Calculadora de Despesas
## VERSAO 3.0 CALCULADORA BEATRICE BUFFADA

Modéstia à parte, é a calculadora mais justa da internet para controlar despesas e pagamentos em moradias compartilhadas. Ela vem sendo desenvolvidada desde 2023, a partir de várias experiências reais em alojamentos e repúblicas. A CEDER divide as contas da casa por dias em casa, por uso de aparelhos e serviços e retorna o que cada pessoa deve pagar. Todo item é a mesma coisa: um custo, um grupo de participantes e uma regra de peso. Despesas "Fixa", "variável" e "individual" não são três mecanismos; são combinações de (quem paga × como divide (igual? por dias na casa? por uso?)). O custo, porém, tem três origens diferentes, e a diferença importa:
* consumo  -> sai de dentro da fatura de um ciclo medido (luz, água, gás). Tem teto.
* porUso   -> também sai da fatura, mas o total depende de quantos usos.
* reais    -> não passa por fatura nenhuma. Soma por cima. Não tem teto.
O que sobra das faturas depois dos itens de consumo vira uso comum, dividido por dias contados. É isso que garante o invariante: a soma cobrada é a soma das faturas dos ciclos ligados + itens em reais.

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
morador de uma república são parecidos, então mover a régua muda pouco. Num
espaço de temporada, parte da luz roda com a casa vazia   geladeira,
bomba, standby   e conserva o espaço de todos: em *por dias*, quem foi
passar uns dias paga sozinho por isso. A tela diz isso ao lado da régua, no
momento do fechamento, em vez de escolher pela casa.

Todos os modos estão em `nucleo/modos.js`, um objeto cada. Acrescentar um modo
é acrescentar uma entrada: `estadoInicial`, a navegação, o vocabulário da tela
e a polaridade da presença leem de lá. **Se um modo algum dia precisar de uma
conta própria, o modelo quebrou**   não falta um campo no modo.

### Os presets da República

A República (`moradia`) escolhe, na criação, como o uso comum se divide. O
preset só fixa a `calibragem` que já existia e decide se a régua aparece:

| preset | uso comum | régua no rateio |
| --- | --- | --- |
| `moderada` (padrão) | 50% por igual, 50% por dias | escondida |
| `comunal` | 100% por igual | escondida |
| `temporal` | 100% por dias | escondida |
| `livre` | o que a casa arrastar | visível |

República salva antes dos presets abre como `livre`, com a régua que tinha.
Trocar de preset fica no passo Moradores. Tudo está em `nucleo/modos.js`
(`PRESETS_DA_REPUBLICA`, `presetDe`, `calibragemFixa`, `reguaVisivel`).

### Ciclos e corte

As contas que chegam de tempos em tempos são **ciclos**, numa lista
(`estado.ciclos`, até 8). Luz e água vêm de fábrica com os ids `"luz"` e
`"agua"` e podem ser desligadas; o conjunto cria os outros. Cada ciclo tem um
**recurso**: `kwh`, `m3` ou `null` (só valor: aluguel, condomínio, internet).

| recurso | linhas "acompanha o consumo" | sobra |
| --- | --- | --- |
| `kwh` / `m3` | dão a tarifa; aparelhos tiram dali, com teto | vira uso comum |
| `null` | não há tarifa nem quantidade | vira uso comum inteira |

Linhas "divide igual" são taxas fixas em qualquer ciclo. O domínio recebe só
os ciclos ligados (`faturas: Fatura[]`) e não distingue os de fábrica dos
outros: `__<id>` é o uso comum de cada um, `__taxa_<id>_<n>` as taxas. Um item
de consumo aponta para o ciclo de onde sai (`item.ciclo`); um item por uso
declara quanto puxa de cada ciclo (`item.porUsoPorCiclo`).

Sem corte, o período vai do ciclo ligado que começa primeiro ao que termina
por último (a união das janelas, `janelaDoFechamento`). O **corte**
(`estado.corte`) é o próprio período analisado, `{ de, ate }` com `ate`
exclusivo, até 40 dias, que vai no máximo de 30 dias antes do primeiro ciclo
a 30 dias depois do último (`limitesDoCorte`, `corteNosLimites`); na tela ele se ajusta pelas datas ou arrastando as
bolinhas da própria barra do período (`LinhaDoTempo.jsx`, `definirJanelaDeCorte`), e o
mês do fechamento passa a ser o que tem mais dias dentro dele. O corte antigo,
um dia de 1 a 31, continua lido como antes. Ciclo cuja leitura final cai fora
do período do corte entra na conta, mas gera um aviso dizendo a que período
ele pertence (`traducao/conjunto.js`).

Conjuntos salvos na v9 (`faturas: { luz, agua }`, `item.unidade`,
`item.eventos`) sobem para a v10 ao abrir, sem mudar nenhum número
(`persistencia.js`). Os testes escritos com duas faturas passam pela mesma
migração (`nucleo/teste/`), o que prova isso a cada execução.

### Aparelhos e contas

Um aparelho guarda o consumo numa tabela por ciclo, uma por jeito de medir:
`consumoPorCiclo` (total do mês), `porHoraPorCiclo` (gasto por hora, vezes
`horas`) e `porUsoPorCiclo` (gasto por uso). O chuveiro elétrico puxa kWh da
luz e m³ da água ao mesmo tempo. Os modelos do catálogo dizem se os ciclos
são fixos (`livres: false`: geladeira, ar, freezer e ventilador são luz) ou
escolhidos pela pessoa, que tira um ciclo com o x (máquina, chuveiro, outro
aparelho). Conta só de valor (`recurso: null`) tem regra própria em
`ciclo.rateio`: `igual`, `dias`, `porcentagem` (com `ciclo.porcentagens`) ou
`comum`, que segue a régua.

O evento ganha `estado.eventoLongo`: ligado, ele conta os dias marcados de
cada pessoa (polaridade de presença) e ganha o passo Calendário
(`modoDoConjunto`).

### Etapas e seções

Cada etapa mostra uma macrosseção por vez. A lista de cada uma está em
`passos/secoes.js` (`secoesDaEtapa`); o App guarda a seção aberta, passa
`secao` para a tela e anda com `vizinha`: **Continuar** vai à seção seguinte
e, na última, à etapa seguinte; **Voltar** da primeira seção cai na última da
etapa anterior. Uma tela montada sem `secao` mostra tudo (é assim que os
testes de componente a montam). A navegação fica grudada no topo
(`.topo-fixo`).

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