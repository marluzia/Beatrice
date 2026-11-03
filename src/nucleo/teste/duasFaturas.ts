// Apoio de teste: o fechamento visto como ele era quando só existiam luz e água.
//
// Centenas de casos de teste foram escritos com duas faturas fixas (`luzKwh`,
// `aguaM3`, `diasLuz`, `usosLuz`...). O motor agora recebe uma lista de ciclos.
// Em vez de reescrever cada caso, este arquivo monta a lista a partir da forma
// antiga e devolve o resultado com os nomes antigos ao lado dos novos.
//
// Isso não é compatibilidade do produto (o app migra o que está salvo): é a
// prova de regressão. Se o motor genérico, recebendo luz e água, devolve
// exatamente o que o motor de duas faturas devolvia, a generalização não
// mudou nenhuma conta.
//
// Só os testes importam daqui.

import { calcular as calcularNoMotor, cicloDe } from "../motor.ts";
import type { Estado, MoradorId, Resultado, TotalMorador } from "../motor.ts";

/** O resultado com os campos que existiam quando só havia luz e água. */
export type ResultadoDeDuasFaturas = Omit<Resultado, "moradores"> & {
  diasNoPeriodoLuz: number;
  diasNoPeriodoAgua: number;
  tarifaLuz: number;
  tarifaAgua: number;
  diasContadosLuz: Record<MoradorId, number>;
  diasContadosAgua: Record<MoradorId, number>;
  sobraLuz: number;
  sobraAgua: number;
  moradores: (TotalMorador & { luz: number; agua: number })[];
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type Qualquer = any;

const cicloDaUnidade = (unidade: string) => (unidade === "m3" ? "agua" : "luz");

const semVazios = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

function custoNovo(custo: Qualquer) {
  if (!custo) return custo;
  if (custo.tipo === "consumo" && custo.porCiclo === undefined) {
    return { tipo: "consumo", porCiclo: { [cicloDaUnidade(custo.unidade)]: custo.quantidade } };
  }
  if (custo.tipo === "porHora" && custo.porCiclo === undefined) {
    return { tipo: "porHora", horas: custo.horas, porCiclo: { [cicloDaUnidade(custo.unidade)]: custo.porHora } };
  }
  if (custo.tipo === "porUso") {
    const { usosTotaisLuz, usosTotaisAgua, unitario, ...resto } = custo;
    const porCiclo = semVazios({ luz: usosTotaisLuz, agua: usosTotaisAgua });
    const novo: Qualquer = { ...resto };
    if (Object.keys(porCiclo).length > 0) novo.usosTotaisPorCiclo = porCiclo;
    novo.unitario =
      unitario?.origem === "fatura" && !unitario.porCiclo
        ? { origem: "fatura", porCiclo: { luz: unitario.kwhPorUso ?? 0, agua: unitario.m3PorUso ?? 0 } }
        : unitario;
    return novo;
  }
  return custo;
}

function rateioNovo(rateio: Qualquer) {
  if (!rateio || (rateio.usosLuz === undefined && rateio.usosAgua === undefined)) return rateio;
  const { usosLuz, usosAgua, ...resto } = rateio;
  return { ...resto, usosPorCiclo: semVazios({ luz: usosLuz, agua: usosAgua }) };
}

/** A forma antiga do Estado (duas faturas) vira a forma atual (lista de ciclos). */
export function estadoDeDuasFaturas(antigo: Qualquer): Estado {
  if (Array.isArray(antigo.faturas)) return antigo;

  const f = antigo.faturas ?? {};
  const { diasLuz, diasAgua, ...periodo } = antigo.periodo ?? {};

  const faturas = [
    semVazios({
      id: "luz", nome: "Luz", recurso: "kwh",
      quantidade: f.luzKwh ?? 0, valor: f.luzValor ?? 0,
      taxas: f.luzTaxas, taxasFixas: f.luzTaxasFixas, dias: diasLuz,
    }),
    semVazios({
      id: "agua", nome: "Água", recurso: "m3",
      quantidade: f.aguaM3 ?? 0, valor: f.aguaValor ?? 0,
      taxas: f.aguaTaxas, taxasFixas: f.aguaTaxasFixas, dias: diasAgua,
    }),
  ];

  const moradores = (antigo.moradores ?? []).map((m: Qualquer) => {
    const { diasForaLuz, diasForaAgua, ...resto } = m;
    const porCiclo = semVazios({ luz: diasForaLuz, agua: diasForaAgua });
    return Object.keys(porCiclo).length > 0 ? { ...resto, diasForaPorCiclo: porCiclo } : resto;
  });

  const itens = (antigo.itens ?? []).map((i: Qualquer) => ({
    ...i,
    custo: custoNovo(i.custo),
    rateio: rateioNovo(i.rateio),
  }));

  const presencas = antigo.presencas
    ? { mes: antigo.presencas.mes, porCiclo: { luz: antigo.presencas.luz, agua: antigo.presencas.agua } }
    : undefined;

  return { ...antigo, periodo, faturas, moradores, itens, ...(presencas ? { presencas } : {}) };
}

/** O resultado com os campos antigos (`tarifaLuz`, `sobraAgua`, `morador.luz`...) ao lado dos novos. */
export function vistaDeDuasFaturas(r: Resultado): ResultadoDeDuasFaturas {
  const luz = cicloDe(r, "luz");
  const agua = cicloDe(r, "agua");

  return {
    ...r,
    diasNoPeriodoLuz: luz?.dias ?? r.diasNoPeriodo,
    diasNoPeriodoAgua: agua?.dias ?? r.diasNoPeriodo,
    tarifaLuz: luz?.tarifa ?? 0,
    tarifaAgua: agua?.tarifa ?? 0,
    diasContadosLuz: luz?.diasContados ?? r.diasContados,
    diasContadosAgua: agua?.diasContados ?? r.diasContados,
    sobraLuz: luz?.sobra ?? 0,
    sobraAgua: agua?.sobra ?? 0,
    moradores: r.moradores.map((m) => ({
      ...m,
      luz: m.porCiclo.luz ?? 0,
      agua: m.porCiclo.agua ?? 0,
    })),
  };
}

/** O fechamento, recebendo e devolvendo a forma de duas faturas. */
export const calcular = (antigo: Qualquer): ResultadoDeDuasFaturas =>
  vistaDeDuasFaturas(calcularNoMotor(estadoDeDuasFaturas(antigo)));

/** Um item escrito na forma de duas faturas (`unidade`, `kwhPorUso`, `usosLuz`). */
export type ItemDeDuasFaturas = Qualquer;
