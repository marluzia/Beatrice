// CRC: RegraDeAlocação
//
// Responsabilidade: dizer, para um custo e um grupo, quanto pesa cada pessoa.
// Não divide dinheiro nenhum: produz pesos, e quem transforma pesos em reais
// é a Alocação.
// Colabora com: Morador (dias em casa), Uso (usos de cada um), Alocação.
//
// Cada regra é uma entrada em REGRAS. Para acrescentar uma, acrescente uma
// entrada; `rateiosPermitidos` e o aviso de estimativa leem daqui.

import type { Item, MoradorId, Mundo, TipoDeRateio } from "./tipos.ts";
import type { DiasContados } from "./morador.ts";
import { entreZeroEUm, somar } from "./numeros.ts";
import { usosPorPessoa } from "./uso.ts";

/** Tudo o que uma regra precisa saber para produzir pesos. */
export interface ContextoDaRegra {
  item: Item;
  diasContados: DiasContados;
  diasNoCiclo: number;
  mundo: Mundo;
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

// ── por presença ───────────────────────────────────────────────────────────
//
// O custo de cada dia é dividido entre quem estava em casa naquele dia.
// Sabendo só quantos dias cada um ficou fora, e não quais, não dá para saber se
// as viagens coincidiram. A regra percorre todas as combinações de quem está em
// casa, supondo que as ausências são independentes, e avisa que supôs.

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

export const REGRAS: Record<TipoDeRateio, RegraDeAlocacao> = {
  igual: {
    chave: "igual",
    oferecida: true,
    serveParaPorUso: true,
    pesos: ({ item }) => cadaUm(item, () => 1),
  },

  dias: {
    chave: "dias",
    oferecida: true,
    serveParaPorUso: false,
    pesos: pelosDias,
  },

  presenca: {
    chave: "presenca",
    oferecida: true,
    serveParaPorUso: false,
    pesos: (ctx) => {
      // Com gente demais, as combinações não cabem: cai em por dias.
      if (ctx.item.participantes.length > MAXIMO_PARA_PRESENCA) return pelosDias(ctx);

      const fatias = fatiasPorPresenca(ctx.item.participantes, ctx.diasContados, ctx.diasNoCiclo);
      return cadaUm(ctx.item, (id) => fatias[id]);
    },
    // Com uma pessoa só fora, os dias dela caem necessariamente dentro dos
    // dias de quem ficou. Não há o que supor.
    exata: ({ item, diasContados, diasNoCiclo }) =>
      ausentesEntre(item.participantes, diasContados, diasNoCiclo) <= 1,
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
 * As regras que a casa pode escolher para este item: as oferecidas, as que o
 * tipo de custo permite, e dentre elas as que o próprio item aceita.
 */
export function rateiosPermitidos(item: Item): TipoDeRateio[] {
  const estrutural = Object.values(REGRAS)
    .filter((r) => r.oferecida && (item.custo.tipo === "porUso" ? r.serveParaPorUso : true))
    .map((r) => r.chave);

  const doItem = item.rateiosDoItem;
  return doItem ? estrutural.filter((r) => doItem.includes(r)) : estrutural;
}

/**
 * Os pesos de um item e a soma deles. Grupo sem peso nenhum — ninguém em casa,
 * nenhum uso lançado — divide por igual, senão o item sumiria da conta.
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
