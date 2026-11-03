// Tradução: Item (Custo + Regra de alocação)
//
// Na tela, um item tem uma "espécie" (consumo, porHora, porUso, reais) e os
// campos que ela pede, em texto. O domínio quer um custo tipado e uma regra.

import { rateiosPermitidos, consumoDeclaradoPorHora } from "../motor.ts";
import { num } from "../formato.js";
import { faturaAtiva } from "../calendario.js";
import { cicloPorId, deConta, doCiclo, unidadeDoRecurso } from "../ciclos.js";
import { ciclosDoItem } from "../catalogo.js";
import { consumoDaFatura, valorDoConsumo } from "./fatura.js";
import { temUsoDatado, usosDe, usosPorJanela } from "./uso.js";

/** Uma tabela "id do ciclo → texto" vira "id do ciclo → número". */
const emNumeros = (t) => Object.fromEntries(Object.entries(t ?? {}).map(([c, v]) => [c, num(v)]));

/** Os ids dos ciclos de que o item puxa, pelo jeito de medir atual. */
export const ciclosDoAparelho = (item) => ciclosDoItem(item);

/**
 * O que falta nas faturas para este item conseguir custar alguma coisa.
 *
 * Aparelho de ciclos fixos (a geladeira é luz) reclama de qualquer ciclo dele
 * que não esteja pronto. Aparelho de ciclos livres só reclama dos ciclos
 * ligados que escolheu: um ciclo desligado aparece no cartão para ser tirado
 * com o x, e não trava o cartão   senão a pessoa não teria como tirá-lo.
 */
export function faltaParaItem(item, estado) {
  const ids = ciclosDoItem(item);
  if (ids.length === 0) return [];

  const faltando = [];

  for (const id of ids) {
    const ciclo = cicloPorId(estado, id);
    const ligado = ciclo && faturaAtiva(ciclo);

    if (!ligado) {
      if (item.ciclosLivres) continue;
      faltando.push(`a conta ${ciclo ? deConta(ciclo) : "de onde ele saía"} não está neste fechamento`);
      continue;
    }
    if (consumoDaFatura(ciclo) <= 0) {
      faltando.push(`o consumo ${doCiclo(ciclo)}, em ${unidadeDoRecurso(ciclo.recurso)}`);
    }
    if (valorDoConsumo(ciclo) === 0) {
      faltando.push(`as linhas de consumo da fatura ${deConta(ciclo)}`);
    }
  }

  return faltando;
}

function custoDoItem(item) {
  if (item.especie === "consumo") {
    return { tipo: "consumo", porCiclo: emNumeros(item.consumoPorCiclo) };
  }

  if (item.especie === "porHora") {
    return { tipo: "porHora", horas: num(item.horas), porCiclo: emNumeros(item.porHoraPorCiclo) };
  }

  if (item.especie === "porUso") {
    return {
      tipo: "porUso",
      usosTotais: num(item.usos),
      unitario:
        item.origemUso === "reais"
          ? { origem: "reais", valorPorUso: num(item.valorPorUso) }
          : { origem: "fatura", porCiclo: emNumeros(item.porUsoPorCiclo) },
    };
  }

  return { tipo: "reais", valor: num(item.valor) };
}

/** Uma tabela "id do morador → número", lida do que a tela guardou em texto. */
const tabelaDe = (item, campo) =>
  Object.fromEntries(
    (item.participantes ?? []).map((id) => [id, num(item[campo]?.[id])]),
  );

function rateioDoItem(item, janelas) {
  // Porcentagem e valor são tabelas que a pessoa preenche nome a nome.
  if (item.rateio === "porcentagem") {
    return { tipo: "porcentagem", porcentagens: tabelaDe(item, "porcentagens") };
  }

  if (item.rateio === "valor") {
    return { tipo: "valor", valores: tabelaDe(item, "valores") };
  }

  // Uso e horas compartilham o mesmo campo: a diferença está na tela, que pede
  // inteiro num caso e decimal no outro.
  if (item.rateio !== "uso" && item.rateio !== "horas") return { tipo: item.rateio };

  return {
    tipo: item.rateio,
    usos: Object.fromEntries((item.participantes ?? []).map((id) => [id, usosDe(item, id)])),
    // Com data, os usos de cada ciclo são contados à parte. `janelas` é o
    // intervalo de cada ciclo ligado, pelo id.
    ...(temUsoDatado(item) && janelas && Object.keys(janelas).length > 0
      ? {
          usosPorCiclo: Object.fromEntries(
            Object.entries(janelas).map(([ciclo, janela]) => [ciclo, usosPorJanela(item, janela)]),
          ),
        }
      : {}),
  };
}

export function itemParaMotor(item, janelas) {
  return {
    id: item.id,
    nome: item.nome?.trim() || "Item sem nome",
    custo: custoDoItem(item),
    participantes: item.participantes ?? [],
    rateio: rateioDoItem(item, janelas),
    rateiosDoItem: item.rateios,
  };
}

/** Divisões que precisam de contagem de tempo para existir. */
const PELO_TEMPO = ["dias", "presenca"];

/**
 * As divisões que este item oferece, neste conjunto.
 *
 * Num evento ninguém mora em lugar nenhum: não há ciclo, não há dia contado,
 * e a tela nem pergunta quem esteve quando. "Por dias" e "por presença" não
 * teriam de onde tirar peso   dividiriam tudo por igual calado, parecendo uma
 * escolha que não é. Então nesse modo elas não aparecem.
 */
export const rateiosDoItem = (item, modo) => {
  const todas = rateiosPermitidos(itemParaMotor(item));
  if (modo?.presenca !== "nenhuma") return todas;

  const oferecidas = todas.filter((r) => !PELO_TEMPO.includes(r));

  // Conjunto antigo pode ter um item já dividido por dias. Esconder a regra em
  // vigor deixaria a barra sem nada marcado, e a pessoa sem saber como aquilo
  // está sendo dividido   pior do que mostrar a opção.
  return oferecidas.includes(item.rateio) ? oferecidas : [item.rateio, ...oferecidas];
};

/** O total do mês de um aparelho por hora, ciclo a ciclo: "id do ciclo → quantidade". */
export const totalDeclaradoPorHora = (item) =>
  Object.fromEntries(
    Object.entries(item.porHoraPorCiclo ?? {}).map(([ciclo, v]) => [
      ciclo,
      consumoDeclaradoPorHora({ porHora: num(v), horas: num(item.horas) }),
    ]),
  );
