// CRC: Custo
//
// Responsabilidade: transformar o consumo de um item em reais, separando de
// qual conta cada real sai.
// Colabora com: Consumo (as quantidades), Fatura (as tarifas), Alocação (que
// divide o que sai daqui).
//
// As três origens de custo:
//  · consumo — sai de dentro da fatura de luz ou de água, e por isso tem teto;
//  · por uso — também pode sair da fatura, mas depende de quantos usos houve;
//  · em reais — não passa por fatura nenhuma e soma por cima.

import type { CustoBruto, Item, ItemCalculado } from "./tipos.ts";
import { consumoDe } from "./consumo.ts";

export interface Tarifas {
  luz: number;
  agua: number;
}

export function custoDe(item: Item, tarifas: Tarifas): CustoBruto {
  const consumo = consumoDe(item);

  return {
    luz: consumo.kwh === undefined ? 0 : consumo.kwh * tarifas.luz,
    agua: consumo.m3 === undefined ? 0 : consumo.m3 * tarifas.agua,
    reais: consumo.reais ?? 0,
  };
}

/** De qual conta o custo de um item saiu, para a tela saber como rotulá-lo. */
export function origemDoCusto(bruto: CustoBruto): ItemCalculado["origem"] {
  if (bruto.reais !== 0) return "reais";
  if (bruto.luz !== 0 && bruto.agua !== 0) return "mista";
  if (bruto.agua !== 0) return "agua";
  return "luz";
}
