import { Ajuda } from "../componentes/index.js";

export function AjudaContas() {
  return (
    <Ajuda titulo="Como lançar dados da fatura">
      <p>
        Pegue a conta. Para cada item das <strong>linhas da fatura</strong> (energia consumida, taxas etc), insira o valor descrito e escolha como ela se comporta:
      </p>
      <p>
        <strong>Acompanha o consumo</strong> : o valor sobe e desce com a
        quantidade. Energia elétrica, tarifa de água e, importante, coleta e
        tratamento de esgoto: esgoto tem cara de taxa, mas é cobrado como
        percentual da água consumida. Essas linhas somadas, divididas pela
        quantidade, dão a tarifa que pondera os aparelhos.
      </p>
      <p>
        <strong>Divide igual</strong> : o valor existe independentemente do
        consumo. Iluminação pública, custo mínimo fixo, custo de
        disponibilidade. Viram itens próprios divididos entre todo mundo,
        inclusive quem viajou, porque vieram na fatura de qualquer jeito.
      </p>
      <p>
        A diferença importa em dinheiro. Se o esgoto for lançado como divide
        igual, quem passou o mês fora paga o mesmo esgoto de quem tomou banho
        todo dia, e esgoto costuma custar quase o mesmo que a água.
      </p>
      <p>
        <strong>Crédito também é linha.</strong> Bônus, energia compensada e
        restituição entram com valor negativo e abatem normalmente. Casa com
        placa solar precisa disso.
      </p>
      <p>
        <strong>Não lance a bandeira tarifária</strong> quando a fatura disser
        que ela já está inclusa no valor a pagar. Nesse caso ela já está dentro
        da linha de energia, e repetir cobra duas vezes.
      </p>
      <p>
        <strong>Parcelamento e juros de dívida antiga</strong> não são consumo
        de ninguém. Lance como divide igual se a casa combinou dividir, ou
        deixe de fora se a dívida é anterior a algum morador.
      </p>
      <p>
         O{" "}
        <strong>total</strong> deve bater com o valor a pagar.
      </p>
    </Ajuda>
  );
}

export function AjudaMoradores() {
  return (
    <Ajuda titulo="Ajuda">
      <p>
        <strong>Dias fora</strong> são os dias em que a pessoa não dormiu em
        casa: viagem, feriado na casa da família, intercâmbio. Marque um a um
        no calendário, inclusive fins de semana soltos.
      </p>
      <p>
        <strong>Dias contados</strong> é o peso usado nas
        divisões por tempo. 
        Quem entra na casa depois passa a participar automaticamente dos itens
        que já estavam configurados. Se alguém não deve pagar algum deles, é só
        desmarcar no passo seguinte.
      </p>
    </Ajuda>
  );
}

export function AjudaItens() {
  return (
    <Ajuda titulo="Ajuda">
      <p>
        <strong>Seleciona a forma de divisão que julgar justa</strong> 
      </p>
      <p>
        <strong>Igual</strong> : paga a mesma fatia,
        independentemente de quanto usou ou de quanto tempo ficou. 
      </p>
      <p>
        <strong>Por dias</strong> : paga na proporção dos dias que
        passou em casa. 
      </p>
      <p>
        <strong>Por uso</strong> : paga pelas vezes que usou. Aceita
        decimais para casos de compartilhamento, 1/n: uma despesa dividida entre duas pessoas conta 0,5 para cada. 3; 0,33. 4; 0,25 e assim por diante...
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
    <Ajuda titulo="Leitura">
      <p>
        A conferência no fim compara as estimativas de despesa das pessoas com o que a
        casa deve de verdade. 
      </p>
      <p>
        Divisão exata geralmente possui mais casas decimais que o formato monetário, isso causa arredondamentos. Por exemplo, cem reais entre três pessoas:
      </p>
      <div className="ajuda__conta">
        {"R$ 100,00 ÷ 3  =  R$ 33,3333...\n" +
          "arredondando   =  R$ 33,33 para cada\n" +
          "somando         =  R$ 99,99\n" +
          "                   falta 1 centavo"}
      </div>
      <p>
        O centavo não sumiu por erro de cálculo. 3 pessoas juntas não conseguem formar R$ 100,00 com fatias iguais em
        centavos inteiros.
      </p>
      <p>
        A CDR, quando falta ou sobra, avisa exatamente a quantidade que "foge" da conta.
      </p>
      <p>
        Quem cobre a diferença é decisão da casa, não da calculadora.
      </p>
    </Ajuda>
  );
}