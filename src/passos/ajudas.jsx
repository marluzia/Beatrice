import { Ajuda } from "../componentes/index.js";

/**
 * As explicações longas do CDR, juntas num arquivo.
 *
 * Ficam fora dos passos porque são texto, não interface: quem for reescrever
 * uma frase não precisa abrir um componente com estado e efeito no meio.
 */

export function AjudaContas() {
  return (
    <Ajuda titulo="De onde tiro esses números">
      <p>
        Cada fatura traz dois números que interessam: <strong>quanto foi
        consumido</strong> (kWh na luz, m³ na água) e <strong>quanto foi
        cobrado</strong> no total. Copie os dois e o CDR calcula sozinho quanto
        custa cada unidade.
      </p>
      <p>
        Use o valor cheio da fatura, com impostos e taxa de iluminação pública.
        É esse valor que a casa vai pagar, então é ele que precisa ser
        dividido.
      </p>
      <p>
        O mês de referência define quantos dias entram na conta. Fevereiro tem
        28 ou 29, e vários meses têm 31 — deixar 30 fixo distorce o rateio de
        quem viajou.
      </p>
    </Ajuda>
  );
}

export function AjudaMoradores() {
  return (
    <Ajuda titulo="O que conta como dia fora">
      <p>
        <strong>Dias fora</strong> é o tempo que a pessoa passou longe da casa:
        viagem, feriado na casa da família, intercâmbio. Sair para trabalhar ou
        estudar não conta — ela dormiu lá, usou a geladeira, tomou banho.
      </p>
      <p>
        <strong>Dias contados</strong> é o que sobra, e é o peso usado nas
        divisões por tempo. Ele aparece sozinho, não dá para digitar: dois
        campos editáveis dizendo a mesma coisa acabam se contradizendo.
      </p>
      <p>
        Quem entra na casa depois passa a participar automaticamente dos itens
        que já estavam configurados. Se alguém não deve pagar algum deles, é só
        desmarcar no passo seguinte.
      </p>
    </Ajuda>
  );
}

export function AjudaItens() {
  return (
    <Ajuda titulo="Como escolher a divisão de cada item">
      <p>
        <strong>Igual</strong> — todo mundo do grupo paga a mesma fatia,
        independentemente de quanto usou ou de quanto tempo ficou. Serve para
        gasto que existe do mesmo jeito para todos.
      </p>
      <p>
        <strong>Por dias</strong> — cada um paga na proporção dos dias que
        passou em casa. Serve para gasto que acompanha a pessoa: galão de água,
        gás, comida.
      </p>
      <p>
        <strong>Por presença</strong> — o custo de cada dia é dividido entre
        quem estava em casa naquele dia. Quem ficou sozinho num dia paga aquele
        dia inteiro. É o certo para aparelho que gasta o mesmo com uma ou com
        várias pessoas: o ar-condicionado não consome mais porque tem duas
        pessoas no quarto.
      </p>
      <p>
        <strong>Por uso</strong> — cada um paga pelas vezes que usou. Aceita
        decimais: uma lavagem dividida entre duas pessoas conta 0,5 para cada.
      </p>
      <p>
        Itens que saem da fatura são descontados dela antes do rateio comum, e
        por isso têm teto. Itens pagos em reais somam por cima e não têm teto
        nenhum. O que sobrar das faturas vira uso comum, dividido por dias.
      </p>
    </Ajuda>
  );
}

export function AjudaCentavos() {
  return (
    <Ajuda titulo="Por que às vezes falta ou sobra um centavo">
      <p>
        Divisão exata quase nunca dá um número de dinheiro. Cem reais entre três
        pessoas dá 33,3333… para cada uma — e isso não existe. O menor pedaço
        de dinheiro que uma pessoa consegue pagar é um centavo.
      </p>
      <div className="ajuda__conta">
        {"R$ 100,00 ÷ 3  =  R$ 33,3333...\n" +
          "arredondando   =  R$ 33,33 para cada\n" +
          "somando         =  R$ 99,99\n" +
          "                   falta 1 centavo"}
      </div>
      <p>
        O centavo não sumiu por erro de cálculo. Ele nunca existiu: as três
        pessoas juntas não conseguem formar R$ 100,00 com fatias iguais em
        centavos inteiros.
      </p>
      <p>
        Muita calculadora esconde isso mostrando R$ 33,33 três vezes e dizendo
        que fechou. O CDR refaz a divisão em centavos inteiros — a moeda em que
        a conta vai ser paga de verdade — e, quando falta ou sobra, avisa em
        amarelo dizendo exatamente quantos centavos são.
      </p>
      <p>
        Quem cobre a diferença é decisão da casa, não da calculadora. Uma saída
        comum é revezar: quem paga o centavo a mais neste mês fica com o de
        sobra no próximo.
      </p>
    </Ajuda>
  );
}

export function AjudaRateio() {
  return (
    <Ajuda titulo="Como ler este resultado">
      <p>
        Toque no nome de alguém para abrir o detalhamento e ver de onde veio
        cada centavo daquele total.
      </p>
      <p>
        Nas barras, cada faixa colorida é a fatia de uma pessoa naquele item.
        Barras marcadas como <strong>sobra</strong> são o uso comum: o que restou
        das faturas depois de descontar os aparelhos específicos, dividido por
        dias em casa.
      </p>
      <p>
        A conferência no fim compara o que foi cobrado das pessoas com o que a
        casa deve de verdade. Os dois números têm que bater — se não baterem, o
        CDR avisa em vermelho em vez de esconder.
      </p>
    </Ajuda>
  );
}
