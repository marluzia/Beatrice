// CRC: Alocação
//
// Responsabilidade: aplicar uma regra a um custo e produzir a parcela de cada
// participante   o resultado, que é outra coisa que a regra.
// Colabora com: RegraDeAlocação (os pesos), Custo (o que dividir), Explicação
// (que junta as parcelas por pessoa).
//
// Um item pode ter custo saindo de várias contas ao mesmo tempo. Cada parte é
// dividida com os pesos medidos no ciclo da sua conta: a parte da luz com os
// dias do ciclo da luz, a da água com os da água, a parte em reais com os do
// fechamento.

import type {
  CicloId,
  CustoBruto,
  Fatia,
  Item,
  ItemCalculado,
  MoradorId,
  Morador,
  PresencaPorDia,
} from "./tipos.ts";
import type { DiasContados } from "./morador.ts";
import { dividir } from "./numeros.ts";
import { pesosDe } from "./regras.ts";
import { usosSeparadosPorCiclo } from "./uso.ts";
import { origemDoCusto, totalDoBruto } from "./custo.ts";
import { mesmaContagem } from "./morador.ts";

export interface Janela {
  dias: number;
  contados: DiasContados;
  /** Quem estava em casa em cada dia, quando a casa marcou as datas. */
  presentes?: PresencaPorDia;
}

/** Os intervalos que um fechamento mede: o dele e o de cada ciclo ativo. */
export interface Janelas {
  mes: Janela;
  porCiclo: Record<CicloId, Janela>;
  /** O ciclo conta o mesmo que o fechamento? Então a divisão é reaproveitada. */
  segueOMes: Record<CicloId, boolean>;
}

export function medirJanelas(
  moradores: Morador[],
  mes: Janela,
  porCiclo: Record<CicloId, Janela>,
): Janelas {
  const segueOMes: Record<CicloId, boolean> = {};
  for (const [id, janela] of Object.entries(porCiclo)) {
    segueOMes[id] = mesmaContagem(moradores, janela, mes);
  }
  return { mes, porCiclo, segueOMes };
}

/** A parte de uma pessoa num item, separada pela conta de onde sai. */
export interface Parcela {
  moradorId: MoradorId;
  porCiclo: Record<CicloId, number>;
  reais: number;
  total: number;
}

export interface ItemAlocado {
  calculado: ItemCalculado;
  parcelas: Parcela[];
}

export function alocar(
  item: Item,
  bruto: CustoBruto,
  janelas: Janelas,
  automatico: boolean,
): ItemAlocado {
  // Usos com data já vêm separados por ciclo, então cada conta precisa da sua
  // própria divisão, mesmo que os ciclos coincidam.
  const separado = usosSeparadosPorCiclo(item);

  // Por presença, dois ciclos com a mesma contagem de dias ainda podem ter
  // dias diferentes   e aí a divisão exata dá outro resultado em cada um.
  // Reaproveitar a do mês nesse caso cobraria a luz pelos dias da água.
  const porPresenca = item.rateio.tipo === "presenca";

  const noMes = pesosDe({
    item,
    diasContados: janelas.mes.contados,
    diasNoCiclo: janelas.mes.dias,
    mundo: null,
    presentes: janelas.mes.presentes,
  });

  // Os pesos de cada ciclo de onde este item tira dinheiro. Um ciclo que não
  // é medido neste fechamento (desligado) cai nos pesos do mês.
  const ciclos = Object.keys(bruto.porCiclo);
  const pesosPorCiclo = Object.fromEntries(
    ciclos.map((ciclo) => {
      const janela = janelas.porCiclo[ciclo];
      const reaproveita = !janela || (janelas.segueOMes[ciclo] && !separado && !porPresenca);
      return [
        ciclo,
        reaproveita
          ? noMes
          : pesosDe({
              item,
              diasContados: janela.contados,
              diasNoCiclo: janela.dias,
              mundo: ciclo,
              presentes: janela.presentes,
            }),
      ];
    }),
  );

  const custoTotal = totalDoBruto(bruto);
  const fatias: Fatia[] = [];
  const parcelas: Parcela[] = [];

  for (const id of item.participantes) {
    const porCiclo: Record<CicloId, number> = {};
    let total = 0;

    for (const ciclo of ciclos) {
      const pesos = pesosPorCiclo[ciclo];
      porCiclo[ciclo] = bruto.porCiclo[ciclo] * dividir(pesos.pesos[id], pesos.soma);
      total += porCiclo[ciclo];
    }

    const reais = bruto.reais * dividir(noMes.pesos[id], noMes.soma);
    total += reais;

    const proporcao =
      Math.abs(custoTotal) > 1e-12 ? total / custoTotal : dividir(noMes.pesos[id], noMes.soma);

    fatias.push({ moradorId: id, peso: noMes.pesos[id], proporcao, total });
    parcelas.push({ moradorId: id, porCiclo, reais, total });
  }

  return {
    calculado: {
      id: item.id,
      nome: item.nome,
      automatico,
      origem: origemDoCusto(bruto),
      custoTotal,
      fatias,
    },
    parcelas,
  };
}
