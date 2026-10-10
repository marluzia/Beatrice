// CRC: Morador e Ausência
//
// Responsabilidade: dizer quantos dias de um ciclo cada morador passou em casa,
// a partir das ausências que ele declarou.
// Colabora com: Ciclo (o tamanho do intervalo), RegraDeAlocação (que usa esses
// dias como peso).
//
// A ausência chega ao domínio já contada — "5 dias fora neste ciclo". Se ela
// veio de datas marcadas ou de um número digitado, a tela resolveu antes.

import type { Morador, MoradorId } from "./tipos.ts";

export type DiasContados = Record<MoradorId, number>;

/** Os dias em casa de cada morador num ciclo, dado quantos dias ele ficou fora. */
export function diasContadosEm(
  moradores: Morador[],
  diasDoCiclo: number,
  diasFora: (m: Morador) => number,
): DiasContados {
  const contados: DiasContados = {};

  for (const m of moradores) {
    const ausente = Number.isFinite(diasFora(m)) ? diasFora(m) : 0;
    contados[m.id] = Math.max(0, Math.min(diasDoCiclo, diasDoCiclo - ausente));
  }

  return contados;
}

/**
 * Dois ciclos contam a mesma coisa? Quando sim, o fechamento reaproveita a
 * divisão de um no outro em vez de refazer a conta.
 */
export function mesmaContagem(
  moradores: Morador[],
  a: { dias: number; contados: DiasContados },
  b: { dias: number; contados: DiasContados },
): boolean {
  return a.dias === b.dias && moradores.every((m) => a.contados[m.id] === b.contados[m.id]);
}

export const somaDosDias = (moradores: Morador[], contados: DiasContados): number =>
  moradores.reduce((s, m) => s + contados[m.id], 0);
