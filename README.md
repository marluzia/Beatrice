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

A CEDER divide despesas de **conjuntos**. O app abre no **Início** (meu saldo
somado de todos os conjuntos, o que vence e o que foi lançado hoje, os
conjuntos recentes) e tem quatro abas embaixo: Início, Conjuntos, Atividade e
Perfil, com o **+** no meio para criar conjunto, despesa, registro ou lembrete.
Cada conjunto guarda o próprio fechamento, e dá para ter quantos quiser no mesmo
navegador.

Ao criar um conjunto, escolhe-se o **tipo**. Os cinco são o mesmo motor em
escalas diferentes: a multipropriedade é a calculadora completa e o evento é o
caso degenerado (nenhuma conta, nenhum ciclo, nenhum dia contado). Um tipo é um
conjunto de padrões, nunca um cálculo diferente:

| chave | nome na tela | calendário | despesa cíclica | uso comum | presença |
| --- | --- | --- | --- | --- | --- |
| `evento` | Evento | não | não | sem régua | não conta dias |
| `temporada` | Temporada | sim (no **período**) | não | sem régua | marca a **estadia**; despesas nascem por dias |
| `familia` | Familiar | sim | sim | régua, começa por igual | marca os dias **fora** |
| `moradia` | Moradia compartilhada | sim | sim | Moderado, Comunal, Temporal ou Livre | marca sempre os dias **fora** |
| `multipro` | Multi | sim | sim | régua livre | **escolha**: estadia (padrão) ou dias fora |

O que separa uma Moradia compartilhada Livre da Multi é a marcação: a república
marca sempre quem saiu; a Multi escolhe (`estado.marcacao`, em Configurar
conjunto ou no topo do calendário). Trocar converte as marcas de cada pessoa
dia a dia dentro do período, sem mudar os dias contados (`nucleo/marcacao.js`).

Todos os tipos estão em `nucleo/modos.js`, um objeto cada, na ordem de
`ORDEM_DOS_MODOS`. **Se um tipo algum dia precisar de uma conta própria, o
modelo quebrou**   não falta um campo no tipo.

Até a v11 a Multipropriedade tinha a chave `temporada`, e a Temporada era um
interruptor do evento (`eventoLongo`). A migração v11 → v12
(`persistencia.js`) troca `temporada` por `multipro` e o evento longo por
`temporada`, sem mudar número nenhum; as fichas do índice são refeitas uma vez.
O tipo fica fixo depois de criado: Evento não vira Temporada nem o contrário.
Só a Moradia compartilhada muda alguma coisa depois, o jeito de dividir o uso
comum. Evento e Temporada nascem **sem nenhuma despesa** (`itens: []`): cada
uma é lançada com o nome dela.

A Temporada não tem ciclos, mas tem **período** (`estado.corte`, `{ de, ate }`
com `ate` exclusivo), escolhido na criação e mudado na aba Período do painel ou
em Configurar (`definirPeriodoDaTemporada`). As estadias marcadas dentro dele dão o
peso de cada um nas divisões por dias e por presença; fora dele, não contam.

### Os presets da República

A República (`moradia`) escolhe, na criação, como o uso comum se divide. O
preset só fixa a `calibragem` que já existia e decide se a régua aparece. No
cabeçalho do conjunto aparece só o nome curto (Moderado, Comunal, Temporal ou
Livre):

| preset | uso comum | régua no rateio |
| --- | --- | --- |
| `moderada` (padrão, Moderado) | 50% por igual, 50% por dias | escondida |
| `comunal` | 100% por igual | escondida |
| `temporal` | 100% por dias | escondida |
| `livre` | o que a casa arrastar | visível |

República salva antes dos presets abre como Livre, com a régua que tinha. Tudo está em
`nucleo/modos.js` (`PRESETS_DA_REPUBLICA`, `presetDe`, `calibragemFixa`,
`reguaVisivel`).

### As telas

O design segue o Figma "App CEDER". As telas novas moram em `src/telas/`, a
moldura e a barra de baixo em `App.jsx` e `componentes/BarraInferior.jsx`, as
peças pequenas em `componentes/Interface.jsx`, `Icone.jsx` e `IconeDoTipo.jsx`,
e o estilo em `estilos/telas.css` (os tokens de cor e tipo ficam no topo de
`estilos/base.css`).

Dentro de um conjunto: o **painel** (total, meu saldo, **Recente** com a última
atividade e "mostrar mais" para o histórico, contas atrasadas, próximo
vencimento, as abas **Despesas | Pessoas | Período**, Calendário, Lembretes,
Registros e o gráfico dos ciclos), **Lançar despesas** (avulsas e cíclicas; os
botões de criar no rodapé, Avulsa antes de Cíclica), **Ver despesas** (uma
linha própria do painel, logo abaixo de Lançar despesas: busca e filtro
Avulsas / Cíclicas / Registradas, com o status de cada uma, da mais recente
para a mais antiga, `todasAsDespesas`), **Histórico** (o relógio do topo:
filtros Despesas, Lembretes e Registros; nas despesas, filtro por status),
**Saldos** (a parte de cada um em
aparelhos, uso comum, taxas e avulsas), **Fechar contas** (o assistente de
sempre: Pessoas, Contas, Itens, Calendário, Rateio), a **despesa cíclica por
dentro**, **Calendário**, **Lembretes**, **Registros**, **Notificações** e
**Configurar conjunto** (Dados gerais | Itens; Itens é onde se cadastram os
aparelhos que saem da fatura e recebem registros   evento e temporada não têm
essa parte). As telas de edição antigas (`passos/`) continuam sendo
os editores, dentro da moldura nova.

**O anel do total** mostra o balanço das despesas que estão na conta: o que
está em aberto em amarelo e o que já foi pago em verde-água
(`balancoDasDespesas`). Quando tudo foi pago e o acerto entre as pessoas
terminou, o anel fica preto.

**O status de uma despesa** (`statusDaDespesa`): **paga**, se alguém pagou;
sem pagamento, **atrasada** (passou do vencimento), **a vencer** (faltam até 3
dias) ou **aberta** (no resto, e sempre quando não há vencimento). Avulsa sem
pagador conta como aberta.

**A aba Período** (`telas/Periodo.jsx`) tem o período do fechamento (com ou
sem corte, a barra e as datas) ou o da temporada. O início nunca vai mais de
**40 dias antes de hoje** e o fim nunca mais de **2 anos depois**
(`limitesDeHoje`, aplicado nos campos e nas ações). Embaixo, **Antes do
período**: avulsa datada antes do início, ou fatura que termina antes dele,
em aberto, ganha a escolha "Entra na conta / Fica de fora" (`naConta` no item
ou no ciclo). `estadoDaConta` (`nucleo/naConta.js`) tira o que ficou de fora
antes do motor e do acerto; a escolha só vale enquanto a despesa continua antes
do período. Sem escolha, tudo entra, como sempre.

A barra de baixo só aparece nas **seções** do conjunto (o painel e o que ele
abre direto: Lançar despesas, Ver despesas, Saldos, Calendário, Lembretes,
Registros). Toda tela de
ação (lançar, Ver despesas, a despesa cíclica por dentro, Fechar contas,
Configurar, Notificações) esconde a barra (`SECOES_COM_BARRA` em `App.jsx`).

No calendário a legenda começa oculta ("Mostrar legenda"), em duas colunas,
Ciclos e Ações; o botão do rodapé é "+ Lançar no dia N"; dia fora e estadia
são laranja. Tarefa não existe mais na tela: o que se marca num dia é despesa,
registro ou lembrete (tarefas antigas continuam guardadas, só não aparecem).

No Início, **Hoje** mostra primeiro os **Atrasos**: conta com vencimento que
já passou e que ninguém marcou como paga (`atrasosDe`), com filtro próprio.

O que as telas mostram por cima do fechamento vem de `nucleo/resumo.js`: quem é
você (`quemSouEu`), o saldo em aberto (`resumoDoConjunto`), a composição da
parte (`composicaoPorPessoa`, `composicaoDoCiclo`), o que acontece num dia
(`eventosDoDia`) e a atividade (`atividadeDe`). Nada ali divide dinheiro.

**Registros** são usos de itens e aparelhos que consomem kWh ou m³ e se medem
por uso (a máquina de lavar) ou por hora (o ar-condicionado):
`registravel`/`ciclosDoRegistro` em `traducao/uso.js`. Num aparelho por hora com
registros, as horas vêm deles, cada uma no ciclo em que caiu, e o campo de
horas do cartão some (`traducao/item.js`). Faxina (em reais) e geladeira (total
do mês) não têm registro.

Na **Multi**, Configurar → Itens também cadastra **equipamentos fora das
faturas** (`CATALOGO_DOS_EQUIPAMENTOS`: Embarcação, por hora; Equipamento, por
uso). O custo é em reais (`valorPorUso` vezes as horas ou usos), e os registros
de cada um contam só dentro do período do fechamento. Eles aparecem em
Registros com o valor em reais e nas avulsas, com pagador.

**Compartilhar conjunto** (o ícone de enviar, ao lado do info) gera um link ou
o QR Code desse link (`nucleo/compartilhar/`). O link leva uma **cópia** do
conjunto dentro do próprio endereço (`#conjunto=…`, compactado com
`CompressionStream`, sem servidor); cada item viaja só com o que difere do
catálogo, e o "quem é você" não vai junto. Quem abre o link recebe a cópia no
aparelho dele (`App.jsx` lê o `#` ao abrir). Não há sincronização: é um retrato
do momento. O QR Code é gerado aqui mesmo (`qr.js`, sem dependência); um
conjunto grande demais para caber num QR pede o link.

**Ainda não funcionam** (aparecem e avisam "em breve"): Cobrar, Entrar em
conjunto, Escanear conta, convidar por Link / QR code / Contato e Adicionar
amigos. Convidado funciona: entra na divisão pelo nome, sem conta.

### Campos novos do estado (v12)

Nenhum entra no cálculo:

| campo | o que é |
| --- | --- |
| `voce` | o id da pessoa que é você neste conjunto (sem ele, vale o nome do Perfil) |
| `marcacao` | só na Multi: `"presenca"` (estadia) ou `"ausencia"` (dias fora) |
| `admin` | quem organiza |
| `descricao`, `desde` | o que a tela de criação pergunta |
| `lembretes` | listas (`itens` para riscar) e notas, com data opcional (aparecem no calendário) |
| `pagamentos` | os Pix do acerto marcados como feitos, pela chave `de>para:centavos` |
| `historicoDeCiclos` | quanto cada ciclo custou nos fechamentos anteriores (o gráfico "Os ciclos") |
| `ciclo.pagoEm`, `item.criadoEm`, `morador.convidado` | datas para a atividade e a marca de convidado |

O perfil (seu nome e quando avisar) fica em `ceder:perfil`, fora dos conjuntos.

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

`estado.eventoLongo` é de antes da v12: um evento salvo com ele ligado abre
como Temporada (`modoDoConjunto`), e a migração já grava `modo: "temporada"`.

### Etapas e seções (Fechar contas)

As etapas, na ordem do Figma: Pessoas, Contas, Itens, Calendário e Rateio.
Cada etapa mostra uma macrosseção por vez. A lista de cada uma está em
`passos/secoes.js` (`secoesDaEtapa`); `telas/FecharContas.jsx` guarda a seção
aberta, passa `secao` para a tela e anda com `vizinha`: o botão da direita vai
à seção seguinte (e diz o nome dela) e, na última, à etapa seguinte; **Voltar**
da primeira seção cai na última da etapa anterior. Uma tela montada sem
`secao` mostra tudo (é assim que os testes de componente a montam). A linha de
etapas fica grudada no topo (`.assistente-topo`).

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

### As nove divisões

Os nomes na tela, na ordem em que aparecem: **igual, %, valor, cotas, ajuste,
dias, horas, presença, uso**. Todo item oferece todas, em todo tipo de
conjunto; onde não se contam dias (o evento), dias e presença não aparecem.

| regra | na tela | o que pesa | observação |
| --- | --- | --- | --- |
| `igual` | igual | 1 por cabeça | |
| `porcentagem` | % | a fatia declarada | avisa se não somar 100 |
| `valor` | valor | o valor declarado | avisa se não fechar com o custo |
| `cotas` | cotas | cotas por pessoa (em branco = 1) | 2 cotas pagam o dobro de 1 |
| `ajuste` | ajuste | igual, mais ou menos o ajuste de cada um | como no Splitwise: quem tem +R$ 10 paga 10 a mais e o resto se divide igual; avisa se alguém ficar negativo |
| `dias` | dias | dias em casa (ou de estadia, no período) | |
| `horas` | horas | horas que usou | decimal; mesmo mecanismo do uso |
| `presenca` | presença | probabilidade de estar em casa | estimativa com 2+ ausentes; o motor avisa |
| `uso` | uso | vezes que usou | inteiro |
