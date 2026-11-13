// CRC: RegraDeAlocação
//
// Responsabilidade: dizer, para um custo e um grupo, quanto pesa cada pessoa.
// Não divide dinheiro nenhum: produz pesos, e quem transforma pesos em reais
// é a Alocação.
// Colabora com: Morador (dias em casa), Uso (usos de cada um), Alocação.
//
// Cada regra é uma entrada em REGRAS. Para acrescentar uma, acrescente uma
// entrada; `rateiosPermitidos` e o aviso de estimativa leem daqui.

import type { Item, MoradorId, Mundo, PresencaPorDia, TipoDeRateio } from "./tipos.ts";
import type { DiasContados } from "./morador.ts";
import { entreZeroEUm, somar } from "./numeros.ts";
import { usosPorPessoa } from "./uso.ts";

/** Tudo o que uma regra precisa saber para produzir pesos. */
export interface ContextoDaRegra {
  item: Item;
  diasContados: DiasContados;
  diasNoCiclo: number;
  mundo: Mundo;
  /**
   * Quem estava em casa em cada dia deste ciclo, quando a casa marcou as
   * datas. Só a divisão por presença usa isto, e é o que a torna exata.
   */
  presentes?: PresencaPorDia;
  /**
   * O custo inteiro do item, somando todas as contas de onde ele sai. Só o
   * ajuste usa: o ajuste é em reais, e o resto se divide por igual.
   */
  custoTotal?: number;
}

export type Pesos = Record<MoradorId, number>;

export interface RegraDeAlocacao {
  chave: TipoDeRateio;
  /**
   * A regra aparece para a casa escolher? O `misto` existe e é usado pelo
   * uso comum, mas ainda não é oferecido item a item.
   */
  oferecida: boolean;
  /** Faz sentido para um item cujo custo é por uso? */
  serveParaPorUso: boolean;
  /** O peso de cada participante. Não precisa somar 1. */
  pesos: (ctx: ContextoDaRegra) => Pesos;
  /**
   * A conta é exata neste contexto? Quando não é, o fechamento avisa que
   * supôs alguma coisa. Regra sem esta função é sempre exata.
   */
  exata?: (ctx: ContextoDaRegra) => boolean;
}

const cadaUm = (item: Item, peso: (id: MoradorId) => number): Pesos =>
  Object.fromEntries(item.participantes.map((id) => [id, peso(id)]));

/**
 * O que os participantes declararam, nas regras em que cada um escreve o
 * próprio número: a soma das porcentagens, ou a soma dos reais.
 *
 * Só conta quem participa do item. Um número deixado para trás por alguém que
 * saiu do grupo não deve fazer a conta parecer fechada.
 */
export function somaDeclarada(item: Item): number {
  const tabela =
    item.rateio.tipo === "porcentagem"
      ? item.rateio.porcentagens
      : item.rateio.tipo === "valor"
        ? item.rateio.valores
        : null;

  if (!tabela) return 0;
  return somar(item.participantes.map((id) => Math.max(0, tabela[id] ?? 0)));
}

/** A regra deste item é das que a pessoa declara número a número? */
export const regraDeclarada = (item: Item): boolean =>
  item.rateio.tipo === "porcentagem" || item.rateio.tipo === "valor";

// ── por presença ───────────────────────────────────────────────────────────
//
// O custo de cada dia é dividido entre quem estava em casa naquele dia.
//
// Com as datas marcadas no calendário, isso é uma conta direta: percorre-se os
// dias do ciclo, e cada dia é dividido entre quem estava. Nada é suposto.
//
// Sem as datas   a casa informou só "ficou 5 dias fora", sem dizer quais   não
// dá para saber se as viagens coincidiram. Aí a regra percorre todas as
// combinações de quem está em casa, supondo que as ausências são independentes,
// e o fechamento avisa que supôs.

/**
 * A divisão por presença quando se sabe exatamente quem estava em cada dia.
 *
 * Dia sem ninguém dos participantes em casa não some da conta: volta para o
 * grupo em partes iguais, do mesmo jeito que na versão estimada. O aparelho
 * ficou ligado e alguém paga.
 */
export function fatiasPorPresencaExata(
  participantes: MoradorId[],
  presentes: PresencaPorDia,
): Pesos {
  const fatias: Pesos = {};
  for (const id of participantes) fatias[id] = 0;

  const quantos = participantes.length;
  if (quantos === 0 || presentes.length === 0) return fatias;

  const doItem = new Set(participantes);

  for (const noDia of presentes) {
    const presentesDoItem = noDia.filter((id) => doItem.has(id));

    if (presentesDoItem.length === 0) {
      for (const id of participantes) fatias[id] += 1 / quantos;
      continue;
    }

    const porCabeca = 1 / presentesDoItem.length;
    for (const id of presentesDoItem) fatias[id] += porCabeca;
  }

  return fatias;
}

/** Acima disto, percorrer as combinações custa caro demais (2^n). */
export const MAXIMO_PARA_PRESENCA = 12;

/** Quantos participantes ficaram fora pelo menos um dia. */
export function ausentesEntre(
  participantes: MoradorId[],
  diasContados: DiasContados,
  diasNoPeriodo: number,
): number {
  return participantes.filter((id) => (diasContados[id] ?? 0) < diasNoPeriodo).length;
}

export function fatiasPorPresenca(
  participantes: MoradorId[],
  diasContados: DiasContados,
  diasNoCiclo: number,
): Pesos {
  const fatias: Pesos = {};
  for (const id of participantes) fatias[id] = 0;

  const quantos = participantes.length;
  if (quantos === 0) return fatias;

  if (diasNoCiclo <= 0) {
    for (const id of participantes) fatias[id] = 1 / quantos;
    return fatias;
  }

  const presenca = participantes.map((id) =>
    entreZeroEUm((diasContados[id] ?? 0) / diasNoCiclo),
  );

  let ninguem = 0;
  const combinacoes = 1 << quantos;

  for (let mascara = 0; mascara < combinacoes; mascara++) {
    let probabilidade = 1;
    let presentes = 0;

    for (let i = 0; i < quantos; i++) {
      const estaPresente = (mascara >> i) & 1;
      probabilidade *= estaPresente ? presenca[i] : 1 - presenca[i];
      if (estaPresente) presentes++;
    }

    if (probabilidade === 0) continue;

    if (presentes === 0) {
      ninguem += probabilidade;
      continue;
    }

    const porCabeca = probabilidade / presentes;
    for (let i = 0; i < quantos; i++) {
      if ((mascara >> i) & 1) fatias[participantes[i]] += porCabeca;
    }
  }

  // Dia sem ninguém em casa: o custo não some, volta para o grupo em partes iguais.
  if (ninguem > 0) {
    for (const id of participantes) fatias[id] += ninguem / quantos;
  }

  return fatias;
}

// ── o registro ─────────────────────────────────────────────────────────────

const pelosDias = ({ item, diasContados }: ContextoDaRegra): Pesos =>
  cadaUm(item, (id) => diasContados[id] ?? 0);

/**
 * Este contexto sabe quem estava em casa em cada dia?
 *
 * Exige um dia para cada dia do ciclo. Uma lista parcial dividiria o custo
 * inteiro entre os dias que ela cobre, cobrando a mais de quem aparece neles  
 * errado em silêncio, que é o pior jeito de errar.
 */
export const temPresencaExata = (ctx: ContextoDaRegra): boolean =>
  Array.isArray(ctx.presentes) &&
  ctx.presentes.length > 0 &&
  ctx.presentes.length === ctx.diasNoCiclo;

/** As partes do ajuste: o resto por igual, mais o ajuste de cada um. */
export function partesDoAjuste(item: Item, custoTotal: number): Pesos {
  const ajustes = item.rateio.tipo === "ajuste" ? item.rateio.ajustes : {};
  const quantos = item.participantes.length;
  if (quantos === 0) return {};
  const soma = somar(item.participantes.map((id) => ajustes[id] ?? 0));
  const base = (custoTotal - soma) / quantos;
  return cadaUm(item, (id) => base + (ajustes[id] ?? 0));
}

// A ordem das chaves é a ordem em que a tela oferece as regras: as que se
// declaram (igual, %, valor, cotas, ajuste) e depois as que se medem (dias,
// horas, presença, uso).
export const REGRAS: Record<TipoDeRateio, RegraDeAlocacao> = {
  igual: {
    chave: "igual",
    oferecida: true,
    serveParaPorUso: true,
    pesos: ({ item }) => cadaUm(item, () => 1),
  },

  // Cada um declara a sua fatia. Como os pesos são normalizados pela soma,
  // 30 e 70 dividem igual a 3 e 7   a porcentagem é uma proporção escrita de
  // um jeito que a casa reconhece. Se não somar 100, o fechamento avisa.
  porcentagem: {
    chave: "porcentagem",
    oferecida: true,
    serveParaPorUso: true,
    pesos: ({ item }) => {
      const declaradas = item.rateio.tipo === "porcentagem" ? item.rateio.porcentagens : {};
      return cadaUm(item, (id) => Math.max(0, declaradas[id] ?? 0));
    },
    exata: ({ item }) => Math.abs(somaDeclarada(item) - 100) < 0.005,
  },

  // A única regra em que o número digitado é o valor final, e não uma
  // proporção. Ela só é exata quando a soma bate com o custo do item: é o
  // fechamento que confere isso e reclama em vermelho, porque dinheiro
  // declarado que não fecha é erro de quem lançou, não arredondamento.
  valor: {
    chave: "valor",
    oferecida: true,
    serveParaPorUso: true,
    pesos: ({ item }) => {
      const declarados = item.rateio.tipo === "valor" ? item.rateio.valores : {};
      return cadaUm(item, (id) => Math.max(0, declarados[id] ?? 0));
    },
  },

  // Cotas: 2 pagam o dobro de 1. Sem número declarado, cada um tem uma cota.
  cotas: {
    chave: "cotas",
    oferecida: true,
    serveParaPorUso: true,
    pesos: ({ item }) => {
      const cotas = item.rateio.tipo === "cotas" ? item.rateio.cotas : {};
      return cadaUm(item, (id) => {
        const c = cotas[id];
        return typeof c === "number" && Number.isFinite(c) ? Math.max(0, c) : 1;
      });
    },
  },

  // Ajuste: por igual, com um a mais ou a menos em reais para cada um. Os
  // pesos são as próprias partes em reais (somam o custo), então a alocação
  // normaliza e cada conta de onde o item sai leva a mesma proporção. Parte
  // negativa (ajuste maior que o custo) vira zero, e o fechamento avisa.
  ajuste: {
    chave: "ajuste",
    oferecida: true,
    serveParaPorUso: true,
    pesos: ({ item, custoTotal }) => {
      const partes = partesDoAjuste(item, custoTotal ?? 0);
      return cadaUm(item, (id) => Math.max(0, partes[id] ?? 0));
    },
    exata: ({ item, custoTotal }) =>
      Object.values(partesDoAjuste(item, custoTotal ?? 0)).every((v) => v >= -0.005),
  },

  dias: {
    chave: "dias",
    oferecida: true,
    serveParaPorUso: false,
    pesos: pelosDias,
  },

  // Horas é uso com outra unidade: três lavagens ou duas horas e meia de
  // ar-condicionado produzem peso do mesmo jeito. Elas são regras separadas
  // porque a tela pede coisas diferentes   inteiro de um lado, decimal do
  // outro   e porque "R$ por hora de motor" é uma frase que a casa entende.
  horas: {
    chave: "horas",
    oferecida: true,
    serveParaPorUso: true,
    pesos: (ctx) => {
      const horas = usosPorPessoa(ctx.item, ctx.mundo);
      return cadaUm(ctx.item, (id) => horas[id] ?? 0);
    },
  },

  presenca: {
    chave: "presenca",
    oferecida: true,
    serveParaPorUso: false,
    pesos: (ctx) => {
      // Com as datas em mãos, a conta é dia a dia e não custa nada: nem o teto
      // de participantes se aplica, porque não há combinação para percorrer.
      if (temPresencaExata(ctx)) {
        const fatias = fatiasPorPresencaExata(ctx.item.participantes, ctx.presentes!);
        return cadaUm(ctx.item, (id) => fatias[id]);
      }

      // Com gente demais, as combinações não cabem: cai em por dias.
      if (ctx.item.participantes.length > MAXIMO_PARA_PRESENCA) return pelosDias(ctx);

      const fatias = fatiasPorPresenca(ctx.item.participantes, ctx.diasContados, ctx.diasNoCiclo);
      return cadaUm(ctx.item, (id) => fatias[id]);
    },
    // Sabendo os dias, nada é suposto. Sem eles, com uma pessoa só fora os
    // dias dela caem necessariamente dentro dos dias de quem ficou, e também
    // não há o que supor.
    exata: (ctx) =>
      temPresencaExata(ctx) ||
      ausentesEntre(ctx.item.participantes, ctx.diasContados, ctx.diasNoCiclo) <= 1,
  },

  uso: {
    chave: "uso",
    oferecida: true,
    serveParaPorUso: true,
    pesos: (ctx) => {
      const usos = usosPorPessoa(ctx.item, ctx.mundo);
      return cadaUm(ctx.item, (id) => usos[id] ?? 0);
    },
  },

  misto: {
    chave: "misto",
    oferecida: false,
    serveParaPorUso: false,
    pesos: ({ item, diasContados }) => {
      const k = entreZeroEUm(item.rateio.tipo === "misto" ? item.rateio.igual : 0);
      const quantos = item.participantes.length;
      const soma = item.participantes.reduce((t, x) => t + (diasContados[x] ?? 0), 0);

      return cadaUm(item, (id) => {
        const porDias = soma > 0 ? (diasContados[id] ?? 0) / soma : 1 / quantos;
        return (1 - k) * porDias + k / quantos;
      });
    },
  },
};

export const regraDe = (tipo: TipoDeRateio): RegraDeAlocacao => REGRAS[tipo] ?? REGRAS.igual;

/**
 * As regras que a casa pode escolher para este item.
 *
 * São todas as oferecidas, para todo item. Antes o catálogo restringia a lista
 * por item   a geladeira só aceitava igual e dias, por exemplo   e isso ia
 * contra a tese da CEDER: a base da divisão é escolha da casa, não da
 * calculadora. Dividir a faxina por dias em casa é estranho em quase toda
 * república e é exatamente certo em alguma.
 *
 * `rateiosDoItem` continua existindo como SUGESTÃO: é o que a tela destaca
 * primeiro, não o que ela permite.
 */
export function rateiosPermitidos(_item: Item): TipoDeRateio[] {
  return Object.values(REGRAS)
    .filter((r) => r.oferecida)
    .map((r) => r.chave);
}

/** As regras que este item sugere, para a tela mostrar antes das outras. */
export function rateiosSugeridos(item: Item): TipoDeRateio[] {
  const permitidas = rateiosPermitidos(item);
  const doItem = item.rateiosDoItem;
  return doItem ? permitidas.filter((r) => doItem.includes(r)) : permitidas;
}

/**
 * Os pesos de um item e a soma deles. Grupo sem peso nenhum   ninguém em casa,
 * nenhum uso lançado   divide por igual, senão o item sumiria da conta.
 */
export function pesosDe(ctx: ContextoDaRegra): { pesos: Pesos; soma: number } {
  const pesos = regraDe(ctx.item.rateio.tipo).pesos(ctx);
  const { participantes } = ctx.item;

  let soma = somar(Object.values(pesos));

  if (soma <= 0 && participantes.length > 0) {
    for (const id of participantes) pesos[id] = 1;
    soma = participantes.length;
  }

  return { pesos, soma };
}

/** A regra deste item é exata neste contexto? */
export function regraExata(ctx: ContextoDaRegra): boolean {
  const regra = regraDe(ctx.item.rateio.tipo);
  return regra.exata ? regra.exata(ctx) : true;
}
