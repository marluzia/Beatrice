// CRC: Consumo
//
// Responsabilidade: dizer quanto um item consumiu em grandeza física   kWh,
// m³   antes de qualquer conversa sobre dinheiro.
// Colabora com: Uso (quantos usos houve), Custo (que multiplica pela tarifa).
//
// Uma lavagem é 0,8 kWh e 0,05 m³ qualquer que seja a tarifa do mês. Separar
// as duas coisas é o que permite mostrar a conta em kWh e m³, e não só em
// reais.

import type { CicloId, Item } from "./tipos.ts";
import { usosTotaisDe } from "./uso.ts";

/**
 * O que um item consome. `porCiclo` traz a quantidade física puxada de cada
 * ciclo, na unidade dele; um ciclo que o item não toca não aparece, nem com
 * zero.
 *
 * `reais` é o custo que já chega em dinheiro, sem grandeza física por trás:
 * uma despesa, ou um uso cobrado em reais.
 */
export interface ConsumoDoItem {
  porCiclo: Record<CicloId, number>;
  reais?: number;
}

export function consumoDeclaradoPorHora(custo: { porHora: number; horas: number }): number {
  return custo.porHora * custo.horas;
}

export function consumoDe(item: Item): ConsumoDoItem {
  const { custo } = item;

  switch (custo.tipo) {
    case "consumo":
      return { porCiclo: { ...custo.porCiclo } };

    case "porHora": {
      const porCiclo: Record<CicloId, number> = {};
      for (const [ciclo, porHora] of Object.entries(custo.porCiclo)) {
        porCiclo[ciclo] = consumoDeclaradoPorHora({ porHora, horas: custo.horas });
      }
      return { porCiclo };
    }

    case "porUso": {
      if (custo.unitario.origem !== "fatura") {
        return { porCiclo: {}, reais: usosTotaisDe(item) * custo.unitario.valorPorUso };
      }
      // Cada ciclo conta os seus usos: a lavagem que caiu fora do ciclo da
      // água não gasta água nesta fatura.
      const porCiclo: Record<CicloId, number> = {};
      for (const [ciclo, porUso] of Object.entries(custo.unitario.porCiclo)) {
        porCiclo[ciclo] = usosTotaisDe(item, ciclo) * porUso;
      }
      return { porCiclo };
    }

    case "reais":
      return { porCiclo: {}, reais: custo.valor };
  }
}
