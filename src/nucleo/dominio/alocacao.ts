// CRC: Alocação
//
// Responsabilidade: aplicar uma regra a um custo e produzir a parcela de cada
// participante   o resultado, que é outra coisa que a regra.
// Colabora com: RegraDeAlocação (os pesos), Custo (o que dividir), Explicação
// (que junta as parcelas por pessoa).
//
// Um item pode ter custo saindo de três contas ao mesmo tempo. Cada parte é
// dividida com os pesos medidos no ciclo da sua conta: a parte da luz com os
// dias do ciclo da luz, a da água com os da água, a parte em reais com os do
// fechamento.

import type {
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
import { origemDoCusto } from "./custo.ts";
import { mesmaContagem } from "./morador.ts";

export interface Janela {
  dias: number;
  contados: DiasContados;
  /** Quem estava em casa em cada dia, quando a casa marcou as datas. */
  presentes?: PresencaPorDia;
}

/** Os três ciclos que um fechamento mede: o dele, o da luz e o da água. */
export interface Janelas {
  mes: Janela;
  luz: Janela;
  agua: Janela;
  /** O ciclo da luz conta o mesmo que o fechamento? Então a divisão é reaproveitada. */
  luzSegueOMes: boolean;
  aguaSegueOMes: boolean;
}

export function medirJanelas(moradores: Morador[], mes: Janela, luz: Janela, agua: Janela): Janelas {
  return {
    mes,
    luz,
    agua,
    luzSegueOMes: mesmaContagem(moradores, luz, mes),
    aguaSegueOMes: mesmaContagem(moradores, agua, mes),
  };
}

/** A parte de uma pessoa num item, separada pela conta de onde sai. */
export interface Parcela {
  moradorId: MoradorId;
  luz: number;
  agua: number;
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
  const porCiclo = usosSeparadosPorCiclo(item);

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

  const naLuz =
    janelas.luzSegueOMes && !porCiclo && !porPresenca
      ? noMes
      : pesosDe({
          item,
          diasContados: janelas.luz.contados,
          diasNoCiclo: janelas.luz.dias,
          mundo: "luz",
          presentes: janelas.luz.presentes,
        });

  const naAgua =
    janelas.aguaSegueOMes && !porCiclo && !porPresenca
      ? noMes
      : pesosDe({
          item,
          diasContados: janelas.agua.contados,
          diasNoCiclo: janelas.agua.dias,
          mundo: "agua",
          presentes: janelas.agua.presentes,
        });

  const custoTotal = bruto.luz + bruto.agua + bruto.reais;
  const fatias: Fatia[] = [];
  const parcelas: Parcela[] = [];

  for (const id of item.participantes) {
    const luz = bruto.luz * dividir(naLuz.pesos[id], naLuz.soma);
    const agua = bruto.agua * dividir(naAgua.pesos[id], naAgua.soma);
    const reais = bruto.reais * dividir(noMes.pesos[id], noMes.soma);
    const total = luz + agua + reais;

    const proporcao =
      Math.abs(custoTotal) > 1e-12 ? total / custoTotal : dividir(noMes.pesos[id], noMes.soma);

    fatias.push({ moradorId: id, peso: noMes.pesos[id], proporcao, total });
    parcelas.push({ moradorId: id, luz, agua, reais, total });
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
