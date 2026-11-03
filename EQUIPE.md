# Como rodar um teste, do primeiro contato ao relatório entregue

Este é o manual da operação, não do código. Quem vai pegar uma linha do painel
administrativo e levar até o relatório lê este arquivo. Para entender o motor
por dentro, o arquivo é o `README.md`.

Até aqui, as 22 linhas do painel têm o mesmo responsável. O objetivo deste
documento é que isso deixe de ser verdade.

---

## A regra que não se negocia

**Não peça a fatura inteira.** Não precisamos de endereço, número do cliente,
número da instalação, CPF nem código de barras. Nada disso entra em nenhum
cálculo, e pedir cria um risco que não temos por que correr.

O que precisamos da fatura são três coisas:

1. as linhas da tabela de valores   nome, quantidade e valor, do jeito que
   estão escritas;
2. as duas datas de leitura;
3. nada mais.

Se a pessoa mandar a fatura inteira por conta própria, **recorte a parte que
interessa, apague o resto e avise que apagou.** Isso aparece na conversa como
cuidado, não como burocracia   e é uma das poucas coisas que nos separa de uma
planilha qualquer.

Os dados ficam no navegador de quem atendeu. Não há servidor, não há conta, não
há login. Se você limpar os dados do site, os conjuntos somem   por isso existe o
botão **Baixar** no painel de conjuntos. Para qualquer conjunto que você não possa
perder, baixe o arquivo e guarde.

### Mandar o conjunto para o cliente

**Baixar** gera um `.ceder.json` com o fechamento inteiro: moradores, faturas,
calendário, itens, quem pagou e quem cedeu. O cliente abre o link da CEDER no
navegador dele, clica em **Trazer de um arquivo**, escolhe o `.ceder.json`, e o
conjunto abre já carregado   ele pode mexer na régua, trocar quem cede e refazer
a conta por conta própria.

Mande os dois: o **relatório** (PDF ou texto), que é o que ele lê, e o **JSON**,
que é o que ele abre. Um é a conclusão, o outro é a conta aberta.

Três coisas para saber antes de mandar:

- O arquivo sai com o nome do conjunto, acentos e tudo: `República da Serra  
  junho.ceder.json`. Dê um nome que o cliente reconheça antes de baixar.
- Importar **não apaga** o que o cliente já tiver. Se ele importar o mesmo
  arquivo duas vezes, a cópia vira `Nome (2)`, e não duas linhas iguais.
- Arquivo de uma versão anterior da CEDER sobe sozinho ao ser importado. Arquivo
  de uma versão mais nova que a do site é recusado com aviso   se isso
  acontecer, o site do cliente está desatualizado.

---

## Os estados do painel

| estado | o que significa | o que fazer |
| --- | --- | --- |
| Contato inicial | mandamos a primeira mensagem, sem resposta ainda | esperar; cobrar uma vez depois de 4 dias |
| Aguardando dados | topou, recebeu a planilha, não devolveu | cobrar uma vez por semana, no máximo duas vezes |
| Relatório entregue | mandamos o fechamento | pedir o feedback, que é o que vale o teste |

Só existe uma coisa pior que não responder: cobrar três vezes. Depois da
segunda, deixe a linha parada e vá para a próxima.

---

## Passo 1   primeiro contato

A mensagem de abordagem está em `8. MARKETING, IDEIAS, FEEDBACKS /
COMUNICAÇÃO-CLIENTE.docx` no Drive. Não improvise a primeira: ela já foi
testada 22 vezes.

Registre a linha no painel **na hora**, com origem (Orgânico, Redes Sociais,
WhatsApp, Indicação) e tipo (República, Coliving, Casa, Apartamento,
Flatsharing, Cohousing, Multipropriedade). A origem é o que vai dizer, daqui a
dois meses, onde vale gastar tempo de prospecção.

---

## Passo 2   coleta

Mande a planilha `ceder-teste-moradia.xlsx` e a lista de dados. A planilha tem
cinco abas e a instrução está na primeira.

A aba que as pessoas pulam e que **não pode ser pulada é a 4: como vocês
dividiram no último mês.** Sem ela não existe comparação, e sem comparação o
relatório é um número solto que não convence ninguém. Se a pessoa devolver sem
a aba 4, peça de novo antes de calcular.

Quando o dado vier pelo chat em vez da planilha, tudo bem   transcreva você
mesma para a planilha antes de lançar. Não lance direto da conversa: é onde se
perde linha de fatura.

---

## Passo 3   fechamento no app

Abra a CEDER, **Criar conjunto**, e escolha o modo:

| modo | quando usar |
| --- | --- |
| Moradia compartilhada | república, coliving, alojamento, flat dividido |
| Multipropriedade | casa de praia, chalé, lancha, imóvel de temporada |
| Casa ou família | casal ou família, até 5 pessoas |
| Evento | churrasco, viagem, carona, vaquinha   sem fatura e sem ciclo. Em Despesas, **Evento longo** liga a divisão por dias e o passo Calendário |

O modo não muda o cálculo. Muda com o que o conjunto abre, e **como a tela pergunta
a presença**: na moradia marcam-se os dias **fora**; na multipropriedade, os
dias de **estadia**. Numa casa de temporada, quem não tem dia marcado conta
zero, e isso é proposital.

Dê um nome ao conjunto que você reconheça daqui a um mês: `República da Serra  
setembro`, não `teste 3`.

### Os quatro passos, na ordem

O programa sempre abre em **Meus conjuntos**. Abra o conjunto pela lista.

No topo, as etapas aparecem numa linha com nós: cada nó tem o número da
etapa e o nome fica em cima. O nó cheio é a etapa atual. A linha fica grudada
no topo da tela, e embaixo dela vão as seções da etapa: cada etapa mostra uma
seção por vez (nas Contas, **Faturas cíclicas** e depois **Período**), e
**Continuar** passa para a seção seguinte antes de mudar de etapa. Tocar no
nome de uma seção pula direto para ela.

**Contas.** Em **Faturas cíclicas**, todas as contas começam desligadas. Toque
em **Água** ou **Luz** para ligar e em **editar** para preencher. As faturas
ligadas viram abas de fichário: uma folha aberta por vez, o que cabe bem no
celular. Toda conta criada pelo grupo tem um **x** ao lado do editar para
removê-la; água e luz não, só desligam. Dentro dela, na ordem: quem pagou, o período de
leitura (as duas datas da fatura) e as linhas. Outra conta que chega todo
mês   gás encanado, aluguel, condomínio, internet   entra em **+ Gás ou
outras**: dê o nome e diga o que ela mede. **Só valor** pede o valor e como
divide (igual, por dias, porcentagem ou régua do uso comum); **kWh** ou **m³**
abrem como a fatura de luz ou de água, com linhas e **+ outra**. Até 8 contas.

Em **Período**, a figura mostra os ciclos de cada conta ao longo do período,
com uma linha preta tracejada marcando o começo e o fim dele. **Sem corte**, o
período vai do ciclo que começa primeiro ao que termina por último. **Com
período de corte**, o grupo diz o período analisado inteiro: digite início e
fim, ou arraste as duas bolinhas da própria barra do período, que preenchem
as datas sozinhas (até 40 dias). Arrastar sem corte liga o corte. O início
vai até 30 dias antes do ciclo que começa primeiro e o fim até 30 dias depois
do que termina por último. Uma conta que termina depois do corte aparece com
aviso, porque é do período seguinte. O
**vencimento** de cada conta é só registro.

**Contas.** Lance as linhas da fatura como elas estão escritas. Para cada
linha, escolha o comportamento:

- **consumo**   acompanha o que foi medido (energia elétrica, tarifa de água).
  Tem quantidade em kWh ou m³.
- **taxa fixa**   não depende de consumo (iluminação pública, custo mínimo).
  Divide igual entre todo mundo.

Essa classificação é sua, não da pessoa. Ela copia; você interpreta.

As duas datas de leitura resolvem o ciclo. Se não vierem, **deixe as duas em
branco**   aí vale o mês de referência inteiro. Meia data trava a tela de
propósito, porque um ciclo pela metade gera contagem de dias que não vem de
lugar nenhum e o erro só aparece três telas depois.

**Pessoas.** Quantas pessoas e os dias de cada uma, conforme o modo. (Na
tela, moradores, cotistas e participantes são todos "pessoas".)

**Marque os dias no calendário, um a um**   não só o total. Com as datas, a
divisão por presença passa a ser exata: o app sabe se duas viagens coincidiram.
Só com o total ele precisa supor que não coincidiram, e avisa em amarelo que
supôs. A diferença é dinheiro de verdade: num ar-condicionado de R$ 300 com
duas pessoas fora cinco dias, quem ficou paga R$ 133,33 se as ausências
coincidiram e R$ 116,67 se não.

**Itens.** O que a casa tem que gasta luz ou água, e quem usa. Só o que for
relevante: um chuveiro que todo mundo usa igual não muda o rateio; o
ar-condicionado de um quarto muda muito.

Os itens entram como pilha: o último adicionado fica logo abaixo da seção
Adicionar. Os que saem da fatura e os que não saem ficam em seções separadas:
**Continuar** passa de um grupo para o outro, e depois para a mensagem de
coleta. No celular o nome do item fica em cima e os controles descem para a
linha de baixo. Num evento, a seção **Duração** vem antes de **O que o conjunto
gasta**.

Os itens aparecem nas mesmas duas categorias da seção Adicionar: **sai do ciclo
de faturas** (tem teto, porque sai de dentro da conta) e **independente do
ciclo de faturas** (soma por cima, sem teto).

Ao abrir um item, a primeira pergunta é **quem pagou**, porque é ela que decide
se vai existir acerto. Item que sai da fatura não tem essa escolha: ali o
cartão só mostra quem pagou a conta de luz ou de água, e a troca é feita em
Contas.

**Quando foi** tem três opções: *sem data*, *dia* e *período*. Ela não muda a
divisão   serve para o item aparecer no calendário e no histórico. Um período
entra no calendário uma vez só, no dia em que começa.

Para cada item, escolha a regra de divisão. A regra é da casa, não nossa   a
aba 4 da planilha diz como eles dividem hoje, e esse é o ponto de partida.

**Rateio.** Na ordem: a régua do uso comum, quem cede, quanto cada um deve,
quanto cada um paga, como cada item foi dividido, a conferência e, por último,
os botões de exportar. Exportar vem no fim de propósito   é o passo depois de
conferir, e não antes.

### Quem pagou (e quando deixar em branco)

O pagador é **opcional**, e deixar em branco quer dizer alguma coisa:

- **Sem pagador** = cada um pagou a própria parte direto. Quatro pessoas
  rachando o jantar, cada uma passando o próprio cartão. Não gera dívida.
- **Com pagador** = alguém adiantou pelo grupo. Os outros devem a essa pessoa.

Pergunte isso ao cliente com essas palavras: *"alguém pagou a conta inteira e
os outros devolveram depois, ou cada um pagou a sua parte na hora?"*. É a
pergunta que decide se existe acerto ou não.

O que sai de dentro da fatura   geladeira, máquina, chuveiro   **não tem
pagador próprio**. Quem pagou aquilo foi quem pagou a conta de luz.

### Quem cede o centavo

Quando a divisão não fecha em dinheiro, alguém fica com a diferença. A seção
**vem antes** de "quanto cada um deve", porque a escolha muda aqueles valores.

Toque na caixa de quem cede. Cada pessoa tem uma caixa com o nome e o R; só
a caixa de quem cede troca para o R. (com o ponto, que é a moeda), e o valor
muda na hora na seção de baixo.

**O app não escolhe por ninguém.** Se a casa não decidir, a moeda fica sem dono,
a soma do que cada um deve não bate com o devido (e a tela diz isso), e a seção
**Quanto cada um paga fica travada**. Não é bug: é a conta estar em aberto.

Então pergunte à casa quem cede, sempre. Vale puxar o assunto: é o momento em
que a casa percebe o que a CEDER está fazendo.

**Se você mexer na régua do uso comum depois, a escolha se desfaz** e precisa
ser feita de novo. Não é bug: a régua muda o resíduo, e a escolha anterior foi
tomada sobre outra conta.

Quando a divisão fecha redonda, a seção diz *"Fizemos o sistema ceder ;)"* e
não há o que escolher.

---

## Passo 4   ler os alertas antes de enviar

O motor avisa quando alguma coisa não fecha. **Nenhum relatório sai com alerta
vermelho.**

| alerta | o que fazer |
| --- | --- |
| Os itens de consumo passam o valor da fatura | os kWh ou m³ lançados estão altos demais; confira as quantidades |
| Há valor a dividir e nenhum morador cadastrado | faltou cadastrar quem mora |
| Um item está sem ninguém marcado | ou marque alguém, ou apague o item |

E dois avisos amarelos que **devem ir no relatório, não ser escondidos**:

- **Os centavos.** Cem reais entre três pessoas dá 33,33 cada, e três vezes
  33,33 são 99,99. O recado agora aparece dentro de **Quem cede**, junto da
  decisão que ele pede, e não mais na pilha do topo. Esse texto é a marca do
  produto; não apague.
- **A estimativa de presença.** Só aparece quando os dias **não** foram
  marcados no calendário. Se aparecer, volte ao Calendário e marque os dias de
  cada um: o aviso some e a conta fica exata. Não mande relatório com esse
  aviso quando você tem as datas   é trabalho de um minuto.

---

## Passo 5   entregar e pedir o feedback

Exporte pelo botão da tela de Rateio (PDF ou texto) e mande. O cabeçalho do
relatório traz o R. e **diz que tipo de conjunto é**   moradia compartilhada,
multipropriedade, casa ou família, evento   e se a presença foi marcada por
ausência ou por estadia. Quem recebe lê os mesmos números de jeitos diferentes
conforme isso, então confira se o modo está certo antes de enviar.

O relatório agora registra o dinheiro inteiro: além de quanto cada um deve,
ele traz **Quem pagou** (cada despesa com quem desembolsou) e **O acerto**
(quanto cada um adiantou e as transferências). Vale para o PDF e para o texto.
Se faltar decidir quem cede, o relatório sai dizendo **em aberto** em vez de
imprimir transferências que não fecham   nesse caso, volte e feche o Quem cede
antes de enviar.

No envio, diga quatro coisas, nesta ordem:

1. quanto cada pessoa paga;
2. **a diferença em relação a como eles dividiam antes**   é isto que convence;
3. **o acerto**: quem transfere para quem, e quanto. O botão *Copiar mensagem
   do acerto* já monta o texto pronto para o grupo;
4. o que foi suposto e o que ficou de fora.

Depois marque **Relatório entregue** no painel e pergunte duas coisas: se o
número fez sentido e se podemos publicar sem nome. A autorização de publicar é
o que alimenta o Instagram, e a resposta sobre o número é o que corrige o
motor.

---

## Para o mês seguinte

No painel de conjuntos, **Próximo mês** copia o conjunto com as mesmas pessoas e os
mesmos itens, já virada para o mês seguinte e com os valores em branco. É o
caminho normal para quem já testou e quer repetir   não crie conjunto novo.

---

## Armadilhas conhecidas

**Máquina de lavar fora do ciclo.** Uma lavagem de dia 2 pode cair dentro do
ciclo da luz e fora do ciclo da água, se os dois ciclos não coincidirem. O
motor detecta e avisa que aquela parte vem na próxima fatura. Não é erro:
repita o mesmo dia no fechamento do mês seguinte.

**Multipropriedade e custo fixo.** Condomínio, seguro, IPTU e marina não
dependem de uso. Use o item **Espaço** e divida por **porcentagem**,
escrevendo a fração de cada cotista: porcentagem é uma fração declarada por
pessoa, que é exatamente o que uma cota é. Não existe uma regra chamada "cota"
com esse nome, e não faz falta   mas **avise o cliente de que a fração é
lançada item a item**, não guardada na casa, então ela se repete em cada custo
fixo.

**Chuveiro.** É quase sempre a maior carga da casa e o dado mais difícil de
coletar. Peça faixa de hábito (banho curto, médio, longo), nunca cronômetro, e
entregue como estimativa com margem, nunca como medição.

**Potência de aparelho.** Quando a pessoa mandar marca e modelo em vez do kWh,
procure a etiqueta ou o manual. Em caso de dúvida, use faixa e diga no
relatório que é faixa.

---

## Quando algo está errado no cálculo

Não conserte na mão nem ajuste o número no relatório. Abra uma **issue** no
repositório com: o modo do conjunto, o que você lançou, o que o motor devolveu e o
que você esperava. Se der, use o botão **Baixar** e anexe o arquivo do conjunto  
com ele, qualquer pessoa reproduz o caso exato.

Relatório entregue com número ajustado na mão é o único jeito garantido de
perder a confiança que o motor leva meses construindo.
