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
/**
 * As duas classes da partição. Linha zerada não entra em nenhuma: campo em
 * branco no formulário não pode virar item de R$ 0,00 no resultado.
 *
 * Valor negativo entra normalmente — crédito de geração distribuída, bônus e
 * restituição aparecem na fatura como abatimento, e ignorá-los cobraria da
 * casa dinheiro que a distribuidora devolveu.
 */
export function linhasPorComportamento(fatura, comportamento) {
  return (fatura?.linhas ?? []).filter(
    (l) => l.comportamento === comportamento && num(l.valor) !== 0,
  );
}

/** Soma das linhas que acompanham o consumo. É o que forma a tarifa. */
export function valorDoConsumo(fatura) {
  return linhasPorComportamento(fatura, "consumo").reduce((s, l) => s + num(l.valor), 0);
}

/** Soma das linhas que dividem igual. */
export function totalDasTaxas(fatura) {
  return linhasPorComportamento(fatura, "igual").reduce((s, l) => s + num(l.valor), 0);
}

/** Total da fatura: as duas classes somadas. É o número a conferir com o papel. */
export function totalDaFatura(fatura) {
  return valorDoConsumo(fatura) + totalDasTaxas(fatura);
}

/**
 * Tarifa deduzida das linhas de consumo.
 *
 * Serve de conferência: a fatura de luz imprime o preço por kWh, e se o número
 * daqui não bater com o de lá, alguma linha ficou de fora.
 */
export function tarifaDaFatura(fatura) {
  const quantidade = num(fatura?.consumo);
  return quantidade > 0 ? valorDoConsumo(fatura) / quantidade : 0;
}

function faturaParaMotor(fatura, qual) {
  const consumo = num(fatura?.consumo);
  const taxas = linhasPorComportamento(fatura, "igual").map((l) => ({
    nome: l.nome ?? "",
    valor: num(l.valor),
  }));

  const total = totalDaFatura(fatura);

  return qual === "luz"
    ? { luzKwh: consumo, luzValor: total, luzTaxas: taxas }
    : { aguaM3: consumo, aguaValor: total, aguaTaxas: taxas };
}

export function paraMotor(estado) {
  return {
    periodo: estado.periodo,
    faturas: {
      ...faturaParaMotor(estado.faturas.luz, "luz"),
      ...faturaParaMotor(estado.faturas.agua, "agua"),
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
