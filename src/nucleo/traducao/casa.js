// Tradução: Casa
//
// A casa inteira, como a tela a guarda, vira o `Estado` que o domínio fecha.
// É aqui que as datas viram tamanhos de ciclo: o domínio não sabe de
// calendário, só de quantos dias.

import { calcular as fecharNoDominio } from "../motor.ts";
import { num } from "../formato.js";
import { diasDaJanela, janelaDoFechamento } from "../calendario.js";
import { faturaParaMotor, janelaDaFatura } from "./fatura.js";
import { diasForaNaJanela, polaridadeDaCasa, presentesPorDia } from "./morador.js";
import { itemParaMotor } from "./item.js";
import { alertaDeLavagens } from "./uso.js";

export function paraMotor(estado) {
  const { periodo } = estado;
  const doFechamento = janelaDoFechamento(estado.faturas, periodo);
  const daLuz = janelaDaFatura(estado.faturas.luz, periodo);
  const daAgua = janelaDaFatura(estado.faturas.agua, periodo);
  const polaridade = polaridadeDaCasa(estado);

  return {
    calibragem: num(estado.calibragem),
    periodo: {
      ...periodo,
      dias: diasDaJanela(doFechamento, periodo),
      diasLuz: diasDaJanela(daLuz, periodo),
      diasAgua: diasDaJanela(daAgua, periodo),
    },
    faturas: {
      ...faturaParaMotor(estado.faturas.luz, "luz"),
      ...faturaParaMotor(estado.faturas.agua, "agua"),
    },
    moradores: estado.moradores.map((m) => ({
      id: m.id,
      nome: m.nome,
      diasFora: diasForaNaJanela(m, doFechamento, polaridade),
      diasForaLuz: diasForaNaJanela(m, daLuz, polaridade),
      diasForaAgua: diasForaNaJanela(m, daAgua, polaridade),
    })),
    itens: estado.itens.map((i) => itemParaMotor(i, { luz: daLuz, agua: daAgua })),
    // Quem estava em casa em cada dia de cada ciclo. Só existe quando todo
    // mundo marcou as datas; sem isso a divisão por presença volta a estimar.
    presencas: {
      mes: presentesPorDia(estado.moradores, doFechamento, polaridade),
      luz: presentesPorDia(estado.moradores, daLuz, polaridade),
      agua: presentesPorDia(estado.moradores, daAgua, polaridade),
    },
  };
}

/** O fechamento da casa, com os avisos que só a tela sabe dar. */
export const calcular = (estado) => {
  const resultado = fecharNoDominio(paraMotor(estado));
  const extras = alertaDeLavagens(estado);
  return extras.length ? { ...resultado, alertas: [...resultado.alertas, ...extras] } : resultado;
};
