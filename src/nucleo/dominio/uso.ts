// CRC: Uso
//
// Responsabilidade: dizer quantos usos um item teve, no total ou por pessoa,
// e dentro de qual ciclo.
// Colabora com: Consumo (quantos usos viram quantos kWh e m³), RegraDeAlocação
// (a regra "por uso" usa os usos de cada um como peso).
//
// Uso é genérico: a máquina de lavar é só o caso mais comum. Quando os usos
// têm data, a tela já os separou por ciclo (`usosLuz`, `usosAgua`); um uso que
// caiu fora do ciclo da luz não entra na conta de luz, e é isso que impede
// contar a mesma lavagem em duas faturas.

import type { Item, MoradorId, Mundo } from "./tipos.ts";

/** Os usos de cada participante que valem para este recurso. */
export function usosPorPessoa(item: Item, mundo: Mundo = null): Record<MoradorId, number> {
  if (item.rateio.tipo !== "uso") return {};

  const datados =
    mundo === "luz" ? item.rateio.usosLuz : mundo === "agua" ? item.rateio.usosAgua : undefined;

  return datados ?? item.rateio.usos;
}

/** Quantos usos o item teve, no ciclo deste recurso. */
export function usosTotaisDe(item: Item, mundo: Mundo = null): number {
  if (item.custo.tipo !== "porUso") return 0;

  // Quem divide por uso sabe os usos de cada um, e o total é a soma deles.
  if (item.rateio.tipo === "uso") {
    const usos = usosPorPessoa(item, mundo);
    return item.participantes.reduce((s, id) => s + (usos[id] ?? 0), 0);
  }

  // Quem divide de outro jeito informou só o total.
  const datado =
    mundo === "luz"
      ? item.custo.usosTotaisLuz
      : mundo === "agua"
        ? item.custo.usosTotaisAgua
        : undefined;
  return datado ?? item.custo.usosTotais ?? 0;
}

/** Os usos deste item vieram com data, separados por ciclo? */
export const usosSeparadosPorCiclo = (item: Item): boolean =>
  item.rateio.tipo === "uso" && Boolean(item.rateio.usosLuz || item.rateio.usosAgua);
