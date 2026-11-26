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

| chave | nome na tela | agenda | despesa cíclica | uso comum | presença |
| --- | --- | --- | --- | --- | --- |
| `evento` | Evento | não | não | sem régua | não conta dias |
| `temporada` | Temporada | sim (no **período**) | não | sem régua | marca a **estadia**; despesas nascem por dias |
| `familia` | Familiar | sim | sim | régua, começa por igual | marca os dias **fora** |
| `moradia` | Moradia | sim | sim | Moderado, Comunal, Temporal ou Livre | marca sempre os dias **fora** |
| `multipro` | Multi | sim | sim | régua livre | **escolha**: estadia (padrão) ou dias fora |

O que separa uma Moradia Livre da Multi é a marcação: a república
marca sempre quem saiu; a Multi escolhe (`estado.marcacao`, em Configurar
conjunto ou no topo da agenda). Trocar converte as marcas de cada pessoa
dia a dia dentro do período, sem mudar os dias contados (`nucleo/marcacao.js`).

Todos os tipos estão em `nucleo/modos.js`, um objeto cada, na ordem de
`ORDEM_DOS_MODOS`. **Se um tipo algum dia precisar de uma conta própria, o
modelo quebrou**   não falta um campo no tipo.

Até a v11 a Multipropriedade tinha a chave `temporada`, e a Temporada era um
interruptor do evento (`eventoLongo`). A migração v11 → v12
(`persistencia.js`) troca `temporada` por `multipro` e o evento longo por
`temporada`, sem mudar número nenhum; as fichas do índice são refeitas uma vez.
O tipo fica fixo depois de criado: Evento não vira Temporada nem o contrário.
Só a Moradia muda alguma coisa depois, o jeito de dividir o uso
comum. Evento e Temporada nascem **sem nenhuma despesa** (`itens: []`): cada
uma é lançada com o nome dela.

A Temporada não tem ciclos, mas tem **período** (`estado.corte`, `{ de, ate }`
com `ate` exclusivo). Ela nasce com uma semana a partir de hoje, e o período se
ajusta na aba Período do painel (`definirPeriodoDaTemporada`). As estadias marcadas dentro dele dão o
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

O design segue o Figma "App CEDER", sem fontes serifadas: títulos e números
usam a mesma sans do texto (`--sans`, Instrument Sans), e o fim dos títulos
(`<em>`) não tem mais itálico. As telas novas moram em `src/telas/`, a
moldura e a barra de baixo em `App.jsx` e `componentes/BarraInferior.jsx`, as
peças pequenas em `componentes/Interface.jsx`, `Icone.jsx` e `IconeDoTipo.jsx`,
e o estilo em `estilos/telas.css` (os tokens de cor e tipo ficam no topo de
`estilos/base.css`).

**Criar** pede só **Nome, Moeda e Pessoas** (depois do tipo). A data do conjunto
é a de criação (`desde`), e ela e a moeda aparecem em Configurar sem poder mudar.

**A moeda** (`estado.moeda`, `nucleo/moedas.js`): real, dólar, euro, libra,
pesos argentino, uruguaio, mexicano e colombiano, sol peruano, dólares canadense
e australiano e franco suíço   todas de duas casas decimais, que é como o motor
arredonda. O cálculo não muda com a moeda; muda o símbolo. Dentro de um
conjunto, o App chama `definirMoedaAtual` e todo `dinheiro()` e todo texto que
escrevia "R$" escreve o símbolo dele; os avisos do motor passam por
`trocarSimbolo`. Fora de um conjunto (Início, Atividade, busca), cada valor
leva a moeda do seu conjunto. No Início, no lugar de "Meu saldo", um seletor de
moeda: o saldo soma o que você paga e recebe nos conjuntos daquela moeda (só se
soma dinheiro da mesma moeda). Conjuntos de antes da v13 são em real.

**Início**: o saldo (por moeda), a ação rápida e Hoje. A lupa abre a **busca
geral** (`telas/Busca.jsx`), com abas de pasta: Conjuntos, Despesas, Itens,
Lembretes, Pessoas. Não há mais "Conjuntos recentes".

**Filtros de busca em abas de pasta** (`AbasDePasta`): Ver despesas, Ver
lembretes, Histórico, a busca geral, o Avulsa | Cíclica de Lançar despesas e o
Lista | Nota de Lançar lembretes. A aba escolhida se emenda com o conteúdo.
Uma aba sozinha fica do tamanho do nome; com mais de uma, todas ficam da
largura da maior (medida em negrito, como fica a escolhida, e guardada em
`--largura-da-aba`). Quando a linha enche, as que sobram descem para a linha
de baixo.

**O "+"** ("O que vamos criar?") não mostra subcategorias: cada cartão tem só o
"em [conjunto]" e leva à tela certa. As setas "›" das linhas ficam separadas do
texto por uma barra (`SetaComBarra`). Nos cartões do "+", a seta e a barra
ocupam uma coluna própria da altura do cartão (a barra fica à mesma distância
do topo e da base), e o seletor "em [conjunto]" termina antes da barra.

**O topo do conjunto** tem dois ícones: os três pontos (Compartilhar e
Histórico) e a engrenagem (Configurar conjunto).

**Lançar despesas** (`telas/Despesas.jsx`): a pasta Avulsa | Cíclica e três
jeitos: Importar arquivo e Foto (ainda "em breve") e Lançar manualmente, que
abre **Nova avulsa** ou **Nova cíclica** (`telas/LancarDespesa.jsx`): título,
categorias e o formulário clássico (quem pagou, valor, como divide, quem paga,
quando foi). A cíclica escreve a fatura do ciclo de uma vez (`lancarCiclica`);
"+ Outra conta" cria um ciclo novo. Lançar nunca mostra o que já foi lançado:
depois de lançar aparece só "Sucesso. Confira em Ver despesas". Em **Ver
despesas**, tocar numa despesa abre **Abrir** ou **Duplicar** (a cíclica não se
duplica; um registro duplica com a data de hoje).

**Lembretes** tem o mesmo jeito: a aba Lembretes do painel mostra **Lançar
lembretes** e **Ver lembretes**. Lançar (`telas/LancarLembrete.jsx`) tem a
pasta Lista | Nota; depois de lançar aparece só "Sucesso. Confira em Ver
lembretes". Ver (`telas/VerLembretes.jsx`) tem busca, a pasta Todos | Listas |
Notas e, ao tocar, Abrir ou Duplicar.

**Um lançamento sozinho** (`telas/Lancamento.jsx`, a rota `lancamento` com
`tipo` avulsa, cíclica, registro ou lembrete): fora das seções "Ver", tocar em
qualquer lançamento (Recente, Histórico, Hoje, atrasos, notificações, busca
geral, Atividade, o dia da agenda, Registros) abre só ele, com os dados,
**Lançado por** e **Lançado em**. No topo, o lápis no papel (editar) para quem
tem direito e o ícone de duplicar. Quem lançou e o admin editam
(`podeEditar`, `nucleo/autoria.js`); o que foi lançado antes de existir autoria
qualquer um edita; sem saber quem é você, só edita num conjunto sem admin.
Duplicar faz um lançamento de quem duplicou, com a hora de agora. A cíclica não
se duplica (é a fatura do ciclo). Riscar um item de lista é de qualquer um.
Cada lançamento guarda `lancadoPor` e `lancadoEm` (os antigos leem `autor` e
`criadoEm`).

**Editar despesa** (`telas/EditarLancamento.jsx`, a rota `editarLancamento`):
o lápis abre o mesmo formulário de lançar, já preenchido   na avulsa,
categoria, nome, quem pagou, valor, como divide, quem paga e quando foi; na
cíclica, a fatura da conta (a conta não se troca). Registro e lembrete têm o
seu Editar registro e Editar lembrete, no mesmo jeito. Nada muda até **Salvar
edição**; no fim da tela fica "Apagar". Avulsa que não é em dinheiro (faxina por
uso, equipamento) abre o cartão do item mexendo num rascunho.

**A edição é um lançamento** (`estado.edicoes`): salvar guarda quem editou,
quando, o que foi editado e o que mudou, campo a campo, com o antes e o depois
já em texto (`salvarEdicaoDa…` no `useCDR`). Quem lançou o original continua
o mesmo. A edição entra na atividade ("Duda editou a despesa Streaming"), no
Histórico (aba Edições) e embaixo do lançamento editado; tocar nela abre a
edição sozinha (a rota `lancamento` com `tipo: "edicao"`). Editar sem mudar
nada não lança nada. As mudanças feitas dentro de Fechar contas são o
assistente e não viram edição.

**"O que o conjunto gasta"** (o `PassoItens`, com todas as despesas e o
catálogo) só aparece em **Fechar contas**. Configurar → Itens é uma lista dos
aparelhos (e, na Multi, dos equipamentos), com os botões de adicionar; cada um
abre **Editar item** (`telas/EditarItem.jsx`), o cartão daquele item sozinho.
Ali o que muda vale na hora: é configuração, não lançamento.

Dentro de um conjunto: o **painel** (total, meu saldo, **Recente** com a última
atividade e "mostrar mais" para o histórico, contas atrasadas, próximo
vencimento e o toggle **Despesas | Lembretes | Registros | Período**   o
evento tem só Despesas e Lembretes; a temporada, Despesas, Lembretes e
Período), **Lançar despesas**, **Ver despesas** (uma
linha própria do painel, logo abaixo de Lançar despesas: busca e filtro
Avulsas / Cíclicas / Registradas, com o status de cada uma, da mais recente
para a mais antiga, `todasAsDespesas`), **Histórico** (nos três pontos do topo:
filtros Despesas, Lembretes e Registros; nas despesas, filtro por status),
**Saldos** (a parte de cada um em
aparelhos, uso comum, taxas e avulsas), **Fechar contas** (o assistente de
sempre: Pessoas, Contas, Itens, Agenda, Rateio), a **despesa cíclica por
dentro**, **Agenda**, **Lembretes**, **Registros**, **Notificações** e
**Configurar conjunto** (Dados gerais | Itens; Itens é onde se cadastram os
aparelhos que saem da fatura e recebem registros   evento e temporada não têm
essa parte). As telas antigas de `passos/` continuam sendo os editores de
Fechar contas.

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

**A barra de baixo do conjunto** (`componentes/BarraDoConjunto.jsx`) toma o
lugar da barra do app enquanto se navega por um conjunto: na cor da barra
padrão, com
**Agenda**, **Pessoas** e **Análise** (círculos concêntricos), todas com
ícone. Ela aparece no painel e nessas três seções; para sair do conjunto, a
seta do topo. No evento, a Agenda avisa que evento não conta dias. Lançar
despesas, Ver despesas, Ver saldos e toda tela de ação (lançar à mão, a
despesa cíclica por dentro, Fechar contas, Configurar, Histórico) não têm
barra nenhuma (`COM_BARRA_DO_CONJUNTO` em `App.jsx`). Não há mais os botões
de Agenda, Lembretes e Registros no painel: Lembretes e Registros são
abas do toggle (`ABAS_DO_PAINEL`; ir para eles, de qualquer lugar, abre o
painel com a aba certa), e a agenda está na barra. **Pessoas**
(`telas/Pessoas.jsx`) tem os membros, adicionar convidado, "Sou eu" e admin.
**Análise** (`telas/Analise.jsx`) mostra o em aberto e o pago, a parte de cada
um, os ciclos e para onde foi.

**Abas de pasta responsivas**: nenhuma aba se espreme nem rola. As que não
cabem descem para a linha de baixo. O Hoje do
Início também usa abas de pasta (com um ponto vermelho em Atrasos quando há
conta atrasada). O toggle do painel faz o mesmo: partes iguais enquanto cabe,
e a que não cabe desce.

Na agenda a legenda começa oculta ("Mostrar legenda"), em duas colunas,
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
| `descricao` | escrita em Configurar |
| `desde` | o dia em que o conjunto foi criado (não se edita) |
| `moeda` | o código da moeda (`BRL`, `USD`, `EUR`…), escolhido ao criar e fixo |
| `lembretes` | listas (`itens` para riscar) e notas, com data opcional (aparecem na agenda) |
| `pagamentos` | os Pix do acerto marcados como feitos, pela chave `de>para:centavos` |
| `historicoDeCiclos` | quanto cada ciclo custou nos fechamentos anteriores (o gráfico "Os ciclos") |
| `ciclo.pagoEm`, `item.criadoEm`, `morador.convidado` | datas para a atividade e a marca de convidado |
| `lancadoPor`, `lancadoEm` | em cada despesa, ciclo, registro e lembrete: quem lançou e quando (decide quem pode editar) |
| `edicoes` | as edições lançadas: `ref` (o que foi editado), `nome`, `mudancas` (campo, antes, depois), `lancadoPor`, `lancadoEm` |

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

As etapas, na ordem do Figma: Pessoas, Contas, Itens, Agenda e Rateio.
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
