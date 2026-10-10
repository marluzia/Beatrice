// CRC: Consumo
//
// Responsabilidade: dizer quanto um item consumiu em grandeza física — kWh,
// m³ — antes de qualquer conversa sobre dinheiro.
// Colabora com: Uso (quantos usos houve), Custo (que multiplica pela tarifa).
//
// Uma lavagem é 0,8 kWh e 0,05 m³ qualquer que seja a tarifa do mês. Separar
// as duas coisas é o que permite, um dia, mostrar a conta em m³ e não só em
// reais.

import type { Item } from "./tipos.ts";
import { usosTotaisDe } from "./uso.ts";

/**
 * O que um item consome. Cada campo só existe quando o item de fato passa por
 * aquele recurso: um item de água não tem `kwh`, nem mesmo zero.
 *
 * `reais` é o custo que já chega em dinheiro, sem grandeza física por trás:
 * uma despesa, ou um uso cobrado em reais.
 */
export interface ConsumoDoItem {
  kwh?: number;
  m3?: number;
  reais?: number;
}

export function consumoDeclaradoPorHora(custo: { porHora: number; horas: number }): number {
  return custo.porHora * custo.horas;
}

const naUnidade = (unidade: "kwh" | "m3", quantidade: number): ConsumoDoItem =>
  unidade === "kwh" ? { kwh: quantidade } : { m3: quantidade };

export function consumoDe(item: Item): ConsumoDoItem {
  const { custo } = item;

  switch (custo.tipo) {
    case "consumo":
      return naUnidade(custo.unidade, custo.quantidade);

    case "porHora":
      return naUnidade(custo.unidade, consumoDeclaradoPorHora(custo));

    case "porUso":
      if (custo.unitario.origem !== "fatura") {
        return { reais: usosTotaisDe(item) * custo.unitario.valorPorUso };
      }
      // Cada ciclo conta os seus usos: a lavagem que caiu fora do ciclo da
      // água não gasta água nesta fatura.
      return {
        kwh: usosTotaisDe(item, "luz") * custo.unitario.kwhPorUso,
        m3: usosTotaisDe(item, "agua") * custo.unitario.m3PorUso,
      };

    case "reais":
      return { reais: custo.valor };
  }
}
