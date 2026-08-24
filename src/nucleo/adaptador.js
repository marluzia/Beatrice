import {
  calcular as calcularNoMotor,
  rateiosPermitidos,
  diasDoPeriodo,
  consumoDeclaradoPorHora,
} from "./motor.ts";
import { num } from "./formato.js";


/** Item da tela - Item do motor. */
export function itemParaMotor(item) {
  const custo =
    item.especie === "consumo"
      ? { tipo: "consumo", quantidade: num(item.quantidade), unidade: item.unidade }
      : item.especie === "porHora"
      ? {
          tipo: "porHora",
          porHora: num(item.porHora),
          horas: num(item.horas),
          unidade: item.unidade,
        }
      : item.especie === "porUso"
        ? {
            tipo: "porUso",
            usosTotais: num(item.usos),
            unitario:
              item.origemUso === "reais"
                ? { origem: "reais", valorPorUso: num(item.valorPorUso) }
                : {
                    origem: "fatura",
                    kwhPorUso: num(item.kwhPorUso),
                    m3PorUso: num(item.m3PorUso),
                  },
          }
        : { tipo: "reais", valor: num(item.valor) };

  const rateio =
    item.rateio === "uso"
      ? {
          tipo: "uso",
          usos: Object.fromEntries(
            item.participantes.map((id) => [id, num(item.usosPorPessoa[id])]),
          ),
        }
      : { tipo: item.rateio };

  return {
    id: item.id,
    nome: item.nome?.trim() || "Item sem nome",
    custo,
    participantes: item.participantes,
    rateio,
    rateiosDoItem: item.rateios,
  };
}

/** Estado da tela - Estado do motor. */
export function paraMotor(estado) {
  return {
    periodo: estado.periodo,
    faturas: {
      luzKwh: num(estado.faturas.luzKwh),
      luzValor: num(estado.faturas.luzValor),
      aguaM3: num(estado.faturas.aguaM3),
      aguaValor: num(estado.faturas.aguaValor),
    },
    moradores: estado.moradores.map((m) => ({
      id: m.id,
      nome: m.nome,
      diasFora: num(m.diasFora),
    })),
    itens: estado.itens.map(itemParaMotor),
  };
}

/** Roda o motor sobre o estado da tela. */
export const calcular = (estado) => calcularNoMotor(paraMotor(estado));

/** Divisões que fazem sentido para este item, segundo o próprio motor. */
export const rateiosDoItem = (item) => rateiosPermitidos(itemParaMotor(item));

/** Dias contados de um morador, para mostrar enquanto a pessoa digita. */
export function diasContadosDe(morador, periodo) {
  const dias = diasDoPeriodo(periodo);
  return Math.max(0, Math.min(dias, dias - num(morador.diasFora)));
}

/**
 * Total consumido por um aparelho declarado por hora, para a tela mostrar
 * enquanto a pessoa digita. Passa pelo motor para não existirem duas contas.
 */
export const totalDeclaradoPorHora = (item) =>
  consumoDeclaradoPorHora({ porHora: num(item.porHora), horas: num(item.horas) });

export { diasDoPeriodo };
