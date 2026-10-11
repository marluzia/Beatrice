// Tradução: Item (Custo + Regra de alocação)
//
// Na tela, um item tem uma "espécie" (consumo, porHora, porUso, reais) e os
// campos que ela pede, em texto. O domínio quer um custo tipado e uma regra.

import { rateiosPermitidos, consumoDeclaradoPorHora } from "../motor.ts";
import { num } from "../formato.js";
import { faturaAtiva } from "../calendario.js";
import { consumoDaFatura, valorDoConsumo } from "./fatura.js";
import { temUsoDatado, usosDe, usosPorJanela } from "./uso.js";

export const unidadeDoItem = (item) => item.unidade;

/** O que falta na fatura para este item conseguir custar alguma coisa. */
export function faltaParaItem(item, faturas) {
  const precisa = new Set();

  if (item.especie === "consumo" || item.especie === "porHora") {
    precisa.add(item.unidade);
  }
  if (item.especie === "porUso" && item.origemUso === "fatura") {
    if (faturaAtiva(faturas?.luz)) precisa.add("kwh");
    if (faturaAtiva(faturas?.agua)) precisa.add("m3");
    if (precisa.size === 0) precisa.add("kwh");
  }

  const faltando = [];

  for (const unidade of precisa) {
    const qual = unidade === "kwh" ? "luz" : "agua";
    const nome = unidade === "kwh" ? "luz" : "água";
    const fatura = faturas?.[qual];

    if (!faturaAtiva(fatura)) {
      faltando.push(`a conta de ${nome} não está neste fechamento`);
      continue;
    }
    if (consumoDaFatura(fatura) <= 0) {
      faltando.push(`o consumo da ${nome}, em ${unidade === "kwh" ? "kWh" : "m³"}`);
    }
    if (valorDoConsumo(fatura) === 0) {
      faltando.push(`as linhas de consumo da fatura de ${nome}`);
    }
  }

  return faltando;
}

function custoDoItem(item) {
  if (item.especie === "consumo") {
    return { tipo: "consumo", quantidade: num(item.quantidade), unidade: item.unidade };
  }

  if (item.especie === "porHora") {
    return { tipo: "porHora", porHora: num(item.porHora), horas: num(item.horas), unidade: item.unidade };
  }

  if (item.especie === "porUso") {
    return {
      tipo: "porUso",
      usosTotais: num(item.usos),
      unitario:
        item.origemUso === "reais"
          ? { origem: "reais", valorPorUso: num(item.valorPorUso) }
          : { origem: "fatura", kwhPorUso: num(item.kwhPorUso), m3PorUso: num(item.m3PorUso) },
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
    // Com data, os usos de cada ciclo são contados à parte.
    ...(temUsoDatado(item) && janelas
      ? {
          usosLuz: usosPorJanela(item, janelas.luz),
          usosAgua: usosPorJanela(item, janelas.agua),
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

export const rateiosDoItem = (item) => rateiosPermitidos(itemParaMotor(item));

export const totalDeclaradoPorHora = (item) =>
  consumoDeclaradoPorHora({ porHora: num(item.porHora), horas: num(item.horas) });
