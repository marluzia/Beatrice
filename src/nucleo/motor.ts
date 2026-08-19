
// ---------------------------------------------------------------- entidades

export type MoradorId = string;

export interface Morador {
  id: MoradorId;
  nome: string;
  diasFora: number;
}

export type Unidade = "kwh" | "m3";

/** De onde sai o custo do item. */
export type Custo =
  /** Consumo medido ou estimado no período. Sai da fatura correspondente. */
  | { tipo: "consumo"; quantidade: number; unidade: Unidade }
  /**
   * Aparelho ou serviço cobrado por uso. Custo total = usos × valor unitário.
   * O unitário pode sair da fatura (máquina de lavar gasta kWh e m³) ou do
   * bolso (faxina é paga em reais, por fora).
   */
  | {
      tipo: "porUso";
      usosTotais?: number;
      unitario:
        | { origem: "fatura"; kwhPorUso: number; m3PorUso: number }
        | { origem: "reais"; valorPorUso: number };
    }
  /** Valor em reais, por fora das faturas. Gás, internet, streaming. */
  | { tipo: "reais"; valor: number };

/** Como o custo se distribui entre os participantes. */
export type Rateio =
  /** Todo mundo do grupo paga a mesma fatia. */
  | { tipo: "igual" }
  /** Peso proporcional aos dias contados de cada um. */
  | { tipo: "dias" }
  /** Peso proporcional a usos individuais, lavagens, banhos, o que for. */
  | { tipo: "uso"; usos: Record<MoradorId, number> };

export interface Item {
  id: string;
  nome: string;
  custo: Custo;
  participantes: MoradorId[];
  rateio: Rateio;
  /**
   * Restrição opcional, vinda do catálogo. Uma geladeira não tem "por uso":
   * ela liga sozinha o mês inteiro. Serve para a interface não oferecer
   * divisões que não querem dizer nada para aquele item específico.
   */
  rateiosDoItem?: Rateio["tipo"][];
}

export interface Faturas {
  /** Consumo total da fatura de luz, em kWh. */
  luzKwh: number;
  /** Valor total da fatura de luz, em reais. */
  luzValor: number;
  /** Consumo total da fatura de água, em m³. */
  aguaM3: number;
  /** Valor total da fatura de água, em reais. */
  aguaValor: number;
}

export interface Periodo {
  /** Mês de referência, 1 a 12. */
  mes: number;
  ano: number;
}

export interface Estado {
  periodo: Periodo;
  faturas: Faturas;
  moradores: Morador[];
  itens: Item[];
}

/** Dias do mês de referência. Fevereiro bissexto sai certo. */
export function diasDoPeriodo(periodo: Periodo): number {
  return new Date(periodo.ano, periodo.mes, 0).getDate();
}

/**
 * Rateios que fazem sentido para um item.
 *
 * Há uma regra estrutural e uma restrição de catálogo. A estrutural: um item
 * cobrado por uso é uma sequência de eventos discretos, quatro faxinas, oito
 * lavagens. Ninguém fica exposto a uma faxina por mais tempo por ter dormido
 * mais noites em casa; ou a pessoa contratou aquela diária ou não contratou.
 * Por isso "dias" nunca entra ali. Consumo e valores em reais são fluxos ao
 * longo do mês, e nesses o peso por dias é legítimo.
 *
 * Por cima disso, o item pode restringir mais (ver rateiosDoItem).
 */
export function rateiosPermitidos(item: Item): Rateio["tipo"][] {
  const estrutural: Rateio["tipo"][] =
    item.custo.tipo === "porUso" ? ["igual", "uso"] : ["igual", "dias", "uso"];
  const doItem = item.rateiosDoItem;
  return doItem ? estrutural.filter((r) => doItem.includes(r)) : estrutural;
}

export const NOMES_DOS_MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// ---------------------------------------------------------------- resultado

export interface Fatia {
  moradorId: MoradorId;
  peso: number;
  proporcao: number;
  total: number;
}

export interface ItemCalculado {
  id: string;
  nome: string;
  /** true para os dois rateios de uso comum, gerados automaticamente. */
  automatico: boolean;
  origem: "luz" | "agua" | "reais" | "mista";
  custoTotal: number;
  fatias: Fatia[];
}

export interface TotalMorador {
  moradorId: MoradorId;
  nome: string;
  diasContados: number;
  luz: number;
  agua: number;
  reais: number;
  total: number;
  linhas: { nome: string; valor: number }[];
}

export interface Alerta {
  nivel: "aviso" | "erro";
  texto: string;
}

export interface Resultado {
  diasNoPeriodo: number;
  tarifaLuz: number;
  tarifaAgua: number;
  diasContados: Record<MoradorId, number>;
  somaDiasContados: number;
  itens: ItemCalculado[];
  moradores: TotalMorador[];
  sobraLuz: number;
  sobraAgua: number;
  totalEmReais: number;
  somaCobrada: number;
  somaDevida: number;
  /** Deve ser ~0 sempre. Se não for, há erro no rateio. */
  diferenca: number;
  /**
   * O que a casa realmente consegue pagar: cada pessoa arredondada ao centavo.
   * Dinheiro não tem terça parte. Cem reais entre três dá 33,33 para cada um,
   * e 33,33 três vezes são 99,99. o centavo que falta não existe em nenhum
   * lugar do cálculo, ele morre no arredondamento.
   */
  somaCobradaArredondada: number;
  /**
   * Centavos devidos menos centavos cobrados, já arredondados.
   * Positivo: falta esse tanto. Negativo: sobra. Zero: fecha de verdade.
   */
  residuoDeCentavos: number;
  alertas: Alerta[];
}

// ---------------------------------------------------------------- auxiliares

const TOLERANCIA = 0.005;

const dividir = (a: number, b: number) => (b > 0 ? a / b : 0);

/** Reais -> centavos inteiros. É nessa moeda que a conta é paga de verdade. */
const emCentavos = (valor: number) => Math.round(valor * 100);

/** Formata para o texto dos alertas, com vírgula. */
const escrito = (valor: number) => valor.toFixed(2).replace(".", ",");

const plural = (n: number, um: string, muitos: string) =>
  n === 1 ? `1 ${um}` : `${n} ${muitos}`;

function usosTotaisDe(item: Item): number {
  if (item.custo.tipo !== "porUso") return 0;
  if (item.rateio.tipo === "uso") {
    const { usos } = item.rateio;
    return item.participantes.reduce((s, id) => s + (usos[id] ?? 0), 0);
  }
  return item.custo.usosTotais ?? 0;
}

/** Custo bruto do item, separado pela fatura de origem. */
function custoDe(
  item: Item,
  tarifaLuz: number,
  tarifaAgua: number,
): { luz: number; agua: number; reais: number } {
  const { custo } = item;
  switch (custo.tipo) {
    case "consumo":
      return custo.unidade === "kwh"
        ? { luz: custo.quantidade * tarifaLuz, agua: 0, reais: 0 }
        : { luz: 0, agua: custo.quantidade * tarifaAgua, reais: 0 };
    case "porUso": {
      const usos = usosTotaisDe(item);
      return custo.unitario.origem === "fatura"
        ? {
            luz: usos * custo.unitario.kwhPorUso * tarifaLuz,
            agua: usos * custo.unitario.m3PorUso * tarifaAgua,
            reais: 0,
          }
        : { luz: 0, agua: 0, reais: usos * custo.unitario.valorPorUso };
    }
    case "reais":
      return { luz: 0, agua: 0, reais: custo.valor };
  }
}

/**
 * Peso de cada participante. Se a regra escolhida zera todos os pesos -
 * ninguém lavou, ou o grupo inteiro ficou fora o mês inteiro - cai para
 * divisão igual, que é o resultado menos surpreendente e não produz NaN.
 */
function pesosDe(
  item: Item,
  diasContados: Record<MoradorId, number>,
): { pesos: Record<MoradorId, number>; soma: number } {
  const pesos: Record<MoradorId, number> = {};
  for (const id of item.participantes) {
    if (item.rateio.tipo === "dias") pesos[id] = diasContados[id] ?? 0;
    else if (item.rateio.tipo === "uso") pesos[id] = item.rateio.usos[id] ?? 0;
    else pesos[id] = 1;
  }
  let soma = Object.values(pesos).reduce((a, b) => a + b, 0);
  if (soma <= 0 && item.participantes.length > 0) {
    for (const id of item.participantes) pesos[id] = 1;
    soma = item.participantes.length;
  }
  return { pesos, soma };
}

// ------------------------------------------------------------------- cálculo

export function calcular(estado: Estado): Resultado {
  const { moradores, faturas, itens } = estado;
  const alertas: Alerta[] = [];
  const diasNoPeriodo = diasDoPeriodo(estado.periodo);

  const tarifaLuz = dividir(faturas.luzValor, faturas.luzKwh);
  const tarifaAgua = dividir(faturas.aguaValor, faturas.aguaM3);

  const diasContados: Record<MoradorId, number> = {};
  for (const m of moradores) {
    diasContados[m.id] = Math.max(0, Math.min(diasNoPeriodo, diasNoPeriodo - m.diasFora));
  }
  const somaDiasContados = moradores.reduce((s, m) => s + diasContados[m.id], 0);
  const todos = moradores.map((m) => m.id);

  const validos = itens.filter((i) => i.participantes.length > 0);
  const orfaos = itens.length - validos.length;
  if (orfaos > 0) {
    alertas.push({
      nivel: "aviso",
      texto:
        orfaos === 1
          ? "Um item está sem ninguém marcado e ficou de fora do rateio."
          : `${orfaos} itens estão sem ninguém marcado e ficaram de fora do rateio.`,
    });
  }

  const custos = validos.map((i) => custoDe(i, tarifaLuz, tarifaAgua));
  const sobraLuz = faturas.luzValor - custos.reduce((s, c) => s + c.luz, 0);
  const sobraAgua = faturas.aguaValor - custos.reduce((s, c) => s + c.agua, 0);
  const totalEmReais = custos.reduce((s, c) => s + c.reais, 0);

  if (sobraLuz < -TOLERANCIA) {
    alertas.push({
      nivel: "erro",
      texto: `Os itens de consumo elétrico passam em R$ ${escrito(Math.abs(sobraLuz))} o valor da fatura de luz. Revise os kWh informados.`,
    });
  }
  if (sobraAgua < -TOLERANCIA) {
    alertas.push({
      nivel: "erro",
      texto: `Os itens de consumo de água passam em R$ ${escrito(Math.abs(sobraAgua))} o valor da fatura de água. Revise os m³ informados.`,
    });
  }
  if (somaDiasContados === 0 && moradores.length > 0) {
    alertas.push({
      nivel: "aviso",
      texto: "Ninguém passou nenhum dia em casa no período. O uso comum foi dividido em partes iguais.",
    });
  }

  const totais: Record<MoradorId, TotalMorador> = {};
  for (const m of moradores) {
    totais[m.id] = {
      moradorId: m.id, nome: m.nome, diasContados: diasContados[m.id],
      luz: 0, agua: 0, reais: 0, total: 0, linhas: [],
    };
  }

  const calculados: ItemCalculado[] = [];

  const processar = (
    item: Item,
    bruto: { luz: number; agua: number; reais: number },
    automatico: boolean,
  ) => {
    const { pesos, soma } = pesosDe(item, diasContados);
    const custoTotal = bruto.luz + bruto.agua + bruto.reais;
    const fatias: Fatia[] = [];

    for (const id of item.participantes) {
      const proporcao = dividir(pesos[id], soma);
      const luz = bruto.luz * proporcao;
      const agua = bruto.agua * proporcao;
      const emReais = bruto.reais * proporcao;
      const total = luz + agua + emReais;

      fatias.push({ moradorId: id, peso: pesos[id], proporcao, total });

      const alvo = totais[id];
      if (!alvo) continue;
      alvo.luz += luz;
      alvo.agua += agua;
      alvo.reais += emReais;
      alvo.total += total;
      if (Math.abs(total) > 1e-9) alvo.linhas.push({ nome: item.nome, valor: total });
    }

    const origem: ItemCalculado["origem"] =
      bruto.reais !== 0 ? "reais"
        : bruto.luz !== 0 && bruto.agua !== 0 ? "mista"
        : bruto.agua !== 0 ? "agua"
        : "luz";

    calculados.push({ id: item.id, nome: item.nome, automatico, origem, custoTotal, fatias });
  };

  validos.forEach((item, i) => processar(item, custos[i], false));

  if (todos.length > 0) {
    const comum = { participantes: todos, rateio: { tipo: "dias" } as Rateio };
    processar(
      { ...comum, id: "__luz", nome: "Uso comum de luz", custo: { tipo: "reais", valor: sobraLuz } },
      { luz: sobraLuz, agua: 0, reais: 0 },
      true,
    );
    processar(
      { ...comum, id: "__agua", nome: "Uso comum de água", custo: { tipo: "reais", valor: sobraAgua } },
      { luz: 0, agua: sobraAgua, reais: 0 },
      true,
    );
  }

  const lista = moradores.map((m) => totais[m.id]);
  const somaCobrada = lista.reduce((s, t) => s + t.total, 0);
  const somaDevida = faturas.luzValor + faturas.aguaValor + totalEmReais;

  /**
   * A conta fecha em números reais e mesmo assim não fecha em dinheiro.
   * Aqui a divisão é refeita na moeda em que ela vai ser paga - centavos
   * inteiros - e o que sobrar ou faltar é dito em voz alta, em vez de ficar
   * escondido atrás de um "fecha certinho" que ninguém consegue reproduzir
   * somando os valores da tela.
   */
  const centavosCobrados = lista.reduce((s, t) => s + emCentavos(t.total), 0);
  const residuoDeCentavos = emCentavos(somaDevida) - centavosCobrados;
  const somaCobradaArredondada = centavosCobrados / 100;

  if (residuoDeCentavos !== 0) {
    const quanto = plural(Math.abs(residuoDeCentavos), "centavo", "centavos");
    alertas.push({
      nivel: "aviso",
      texto:
        residuoDeCentavos > 0
          ? `Arredondando cada pessoa ao centavo, a soma dá R$ ${escrito(somaCobradaArredondada)} e não os R$ ${escrito(somaDevida)} devidos: ${quanto} de menos. Não existe divisão exata aqui. combinem quem cobre a diferença.`
          : `Arredondando cada pessoa ao centavo, a soma dá R$ ${escrito(somaCobradaArredondada)} contra os R$ ${escrito(somaDevida)} devidos: ${quanto} de sobra. Não existe divisão exata aqui. combinem quem fica com a diferença.`,
    });
  }

  return {
    diasNoPeriodo, tarifaLuz, tarifaAgua, diasContados, somaDiasContados,
    itens: calculados, moradores: lista, sobraLuz, sobraAgua, totalEmReais,
    somaCobrada, somaDevida, diferenca: somaCobrada - somaDevida,
    somaCobradaArredondada, residuoDeCentavos, alertas,
  };
}

/**
 * O invariante do sistema: ninguém paga a mais nem a menos no agregado.
 * Vale para qualquer configuração de moradores, itens e regras.
 * Rode contra entradas aleatórias e você pega quase todo erro de rateio antes
 * que alguém reclame no grupo da república.
 */
export function conferir(resultado: Resultado): boolean {
  return Math.abs(resultado.diferenca) < TOLERANCIA;
}

/**
 * O invariante mais duro: fechar também depois de arredondar ao centavo.
 * Este falha de propósito em casos como cem reais para três pessoas, e é por
 * isso que a interface avisa em vez de dizer que está tudo certo.
 */
export function conferirEmCentavos(resultado: Resultado): boolean {
  return resultado.residuoDeCentavos === 0;
}
