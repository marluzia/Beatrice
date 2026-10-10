// CRC: Ciclo
//
// Responsabilidade: dizer quantos dias um intervalo tem. O fechamento tem o
// seu, e cada fatura medida pode ter outro, que não precisa coincidir.
// Colabora com: Morador (quantos desses dias cada um passou em casa), Fatura.
//
// As datas em si — de quando a quando vai cada ciclo — são problema da tela
// (`calendario.js`). O domínio só recebe os tamanhos já resolvidos.

import type { Periodo } from "./tipos.ts";

/** Um ciclo mais longo que isto é engano de digitação, não fatura. */
export const MAXIMO_DE_DIAS = 90;

export const NOMES_DOS_MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const tamanhoInformado = (informado: number | undefined): number | null =>
  typeof informado === "number" && Number.isFinite(informado) && informado > 0
    ? Math.min(MAXIMO_DE_DIAS, Math.round(informado))
    : null;

/** Quantos dias tem o fechamento. Sem tamanho informado, vale o mês de referência. */
export function diasDoPeriodo(periodo: Periodo): number {
  return tamanhoInformado(periodo.dias) ?? new Date(periodo.ano, periodo.mes, 0).getDate();
}

/** Quantos dias tem o ciclo de uma fatura. Sem tamanho informado, segue o fechamento. */
export function diasDoCiclo(informado: number | undefined, doFechamento: number): number {
  return tamanhoInformado(informado) ?? doFechamento;
}
