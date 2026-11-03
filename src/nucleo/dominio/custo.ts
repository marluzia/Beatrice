// CRC: Custo
//
// Responsabilidade: transformar o consumo de um item em reais, separando de
// qual conta cada real sai.
// Colabora com: Consumo (as quantidades), Fatura (as tarifas), Alocação (que
// divide o que sai daqui).
//
// As três origens de custo:
//  · consumo   sai de dentro da fatura de um ciclo medido, e por isso tem teto;
//  · por uso   também pode sair da fatura, mas depende de quantos usos houve;
//  · em reais   não passa por fatura nenhuma e soma por cima.

import type { CicloId, CustoBruto, Item, ItemCalculado } from "./tipos.ts";
import { consumoDe } from "./consumo.ts";

/** Reais por unidade de cada ciclo ativo. Ciclo ausente = tarifa zero. */
export type Tarifas = Record<CicloId, number>;

export function custoDe(item: Item, tarifas: Tarifas): CustoBruto {
  const consumo = consumoDe(item);
  const porCiclo: Record<CicloId, number> = {};

  for (const [ciclo, quantidade] of Object.entries(consumo.porCiclo)) {
    porCiclo[ciclo] = quantidade * (tarifas[ciclo] ?? 0);
  }

  return { porCiclo, reais: consumo.reais ?? 0 };
}

/** Quanto um custo soma, de todas as contas. */
export const totalDoBruto = (bruto: CustoBruto): number =>
  Object.values(bruto.porCiclo).reduce((s, v) => s + v, 0) + bruto.reais;

/** De qual conta o custo de um item saiu, para a tela saber como rotulá-lo. */
export function origemDoCusto(bruto: CustoBruto): ItemCalculado["origem"] {
  if (bruto.reais !== 0) return "reais";

  const ciclos = Object.keys(bruto.porCiclo);
  const comValor = ciclos.filter((c) => bruto.porCiclo[c] !== 0);

  if (comValor.length > 1) return "mista";
  if (comValor.length === 1) return comValor[0];
  // Custo zero: o rótulo é o do ciclo que o item puxaria, se houver um.
  return ciclos[0] ?? "reais";
}
