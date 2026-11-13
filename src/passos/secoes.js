// As macrosseções de cada etapa: a tela mostra uma por vez, e "Continuar"
// anda de uma para a outra antes de passar para a etapa seguinte. Assim a
// pessoa não precisa rolar por cima de uma seção para achar a próxima.
//
// Uma etapa sem seção listada aqui é uma seção só. Uma tela que recebe
// `secao` indefinida mostra tudo de uma vez (é como os testes a montam).

import { GRUPO_DA_FATURA, GRUPO_INDEPENDENTE, GRUPO_DOS_EQUIPAMENTOS } from "../nucleo/catalogo.js";
import { presetDe } from "../nucleo/modos.js";

/**
 * As seções de uma etapa, na ordem em que "Continuar" passa por elas.
 * @returns {{ chave: string, titulo: string }[]}
 */
export function secoesDaEtapa(chave, estado, modo) {
  // Sem faturas (evento, temporada) as despesas são um grupo só.
  const evento = modo?.faturas === false;

  switch (chave) {
    case "contas":
      return [
        { chave: "faturas", titulo: "Faturas cíclicas" },
        { chave: "periodo", titulo: "Período" },
      ];

    case "moradores":
      return [
        { chave: "pessoas", titulo: modo?.palavras?.quemMora ?? "Pessoas" },
        ...(presetDe(estado) ? [{ chave: "preset", titulo: "Uso comum" }] : []),
      ];

    // Os itens não são macrosseções, mas os dois grupos são: o que sai da
    // fatura e o que corre por fora dela ficam um de cada vez.
    case "itens":
      return evento
        ? [
            { chave: "despesas", titulo: "Despesas" },
            { chave: "coleta", titulo: "Juntar os dados" },
          ]
        : [
            { chave: "fatura", titulo: "Saem da fatura" },
            { chave: "independente", titulo: "Não saem da fatura" },
            { chave: "coleta", titulo: "Juntar os dados" },
          ];

    case "calendario":
      return [
        { chave: "mes", titulo: "Mês" },
        { chave: "historico", titulo: "Histórico" },
      ];

    case "rateio":
      return [
        { chave: "divisao", titulo: "Quanto cada um deve" },
        { chave: "acerto", titulo: "Acerto" },
        { chave: "conferencia", titulo: "Conferência" },
      ];

    default:
      return [{ chave: "tudo", titulo: "" }];
  }
}

/** O grupo do catálogo que cada seção de itens mostra. */
export const GRUPO_DA_SECAO = {
  fatura: GRUPO_DA_FATURA,
  independente: GRUPO_INDEPENDENTE,
};

/**
 * Os grupos que cada seção mostra. "aparelhos" é Configurar conjunto → Itens:
 * o que sai das faturas e, na Multi, os equipamentos fora delas.
 */
export const GRUPOS_DA_SECAO = {
  fatura: [GRUPO_DA_FATURA],
  independente: [GRUPO_INDEPENDENTE],
  aparelhos: [GRUPO_DA_FATURA, GRUPO_DOS_EQUIPAMENTOS],
};

/** Esta seção aparece? Sem seção escolhida, tudo aparece. */
export const mostra = (secao, ...chaves) => !secao || chaves.includes(secao);

/**
 * A posição vizinha no assistente: a próxima (sentido 1) ou a anterior
 * (sentido -1). Dentro da etapa anda de seção em seção; na borda, pula para a
 * etapa ao lado   para a primeira seção dela, indo, e para a última, voltando.
 *
 * @param {{ passo: number, secao: number }} pos
 * @param {1 | -1} sentido
 * @param {number[]} quantas  quantas seções tem cada etapa
 * @returns {{ passo: number, secao: number } | null}  null na ponta
 */
export function vizinha(pos, sentido, quantas) {
  const n = quantas[pos.passo] ?? 1;
  if (sentido > 0) {
    if (pos.secao < n - 1) return { passo: pos.passo, secao: pos.secao + 1 };
    if (pos.passo < quantas.length - 1) return { passo: pos.passo + 1, secao: 0 };
    return null;
  }
  if (pos.secao > 0) return { passo: pos.passo, secao: pos.secao - 1 };
  if (pos.passo > 0) return { passo: pos.passo - 1, secao: (quantas[pos.passo - 1] ?? 1) - 1 };
  return null;
}
