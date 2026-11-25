// Tradução: Conjunto
//
// O conjunto inteiro, como a tela o guarda, vira o `Estado` que o domínio
// fecha. É aqui que as datas viram tamanhos de ciclo: o domínio não sabe de
// calendário, só de quantos dias.
//
// Só os ciclos ligados chegam ao motor, na ordem do conjunto. Um ciclo
// desligado não existe para o cálculo: nem fatura, nem uso comum, nem taxa.

import { calcular as fecharNoDominio } from "../motor.ts";
import { num } from "../formato.js";
import {
  ciclosForaDoCorte,
  diasDaJanela,
  janelaDoFechamento,
  ultimoDiaDaJanela,
} from "../calendario.js";
import { ciclosLigados, doCiclo } from "../ciclos.js";
import { faturaParaMotor, janelaDaFatura } from "./fatura.js";
import { diasForaNaJanela, polaridadeDoConjunto, presentesPorDia } from "./morador.js";
import { itemParaMotor } from "./item.js";
import { alertaDeLavagens } from "./uso.js";
import { estadoDaConta } from "../naConta.js";
import { MOEDA_PADRAO, moedaValida, trocarSimbolo } from "../moedas.js";

export function paraMotor(estado) {
  const { mes, ano } = estado.periodo;
  const periodo = { mes, ano };
  const ligados = ciclosLigados(estado);
  const doFechamento = janelaDoFechamento(estado.ciclos, periodo, estado.corte);
  const janelas = Object.fromEntries(ligados.map((c) => [c.id, janelaDaFatura(c, periodo)]));
  const polaridade = polaridadeDoConjunto(estado);

  const porCiclo = (f) => Object.fromEntries(ligados.map((c) => [c.id, f(janelas[c.id])]));

  return {
    calibragem: num(estado.calibragem),
    periodo: { mes, ano, dias: diasDaJanela(doFechamento, periodo) },
    faturas: ligados.map((c) => faturaParaMotor(c, periodo)),
    moradores: estado.moradores.map((m) => ({
      id: m.id,
      nome: m.nome,
      diasFora: diasForaNaJanela(m, doFechamento, polaridade),
      diasForaPorCiclo: porCiclo((janela) => diasForaNaJanela(m, janela, polaridade)),
    })),
    itens: estado.itens.map((i) => itemParaMotor(i, janelas, doFechamento)),
    // Quem estava em casa em cada dia de cada ciclo. Só existe quando todo
    // mundo marcou as datas; sem isso a divisão por presença volta a estimar.
    presencas: {
      mes: presentesPorDia(estado.moradores, doFechamento, polaridade),
      porCiclo: porCiclo((janela) => presentesPorDia(estado.moradores, janela, polaridade)),
    },
  };
}

const curto = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Ciclo que termina fora do período do corte. Ele ainda entra na conta   o
 * app não tira dinheiro do fechamento por conta própria   mas a casa fica
 * sabendo que ele é de outro período.
 */
export function alertaDoCorte(estado) {
  const fora = ciclosForaDoCorte(estado.ciclos, estado.periodo, estado.corte);
  if (fora.length === 0) return [];

  const corte = ultimoDiaDaJanela(janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte));

  return fora.map(({ ciclo, fim, quando }) => ({
    nivel: "aviso",
    texto:
      quando === "seguinte"
        ? `O ciclo ${doCiclo(ciclo)} termina em ${curto(fim)}, depois do corte (${curto(corte)}). Pela regra do corte, ele pertence ao período seguinte.`
        : `O ciclo ${doCiclo(ciclo)} termina em ${curto(fim)}, antes deste período começar. Pela regra do corte, ele pertence ao período anterior.`,
  }));
}

/** O fechamento do conjunto, com os avisos que só a tela sabe dar. */
export const calcular = (estadoCompleto) => {
  // O que o grupo tirou da conta (de antes do período) não chega ao motor.
  const estado = estadoDaConta(estadoCompleto);
  const resultado = fecharNoDominio(paraMotor(estado));
  const extras = [...alertaDeLavagens(estado), ...alertaDoCorte(estado)];
  const comExtras = extras.length ? { ...resultado, alertas: [...resultado.alertas, ...extras] } : resultado;
  // O motor escreve os avisos em reais; o conjunto pode ser de outra moeda.
  const moeda = moedaValida(estadoCompleto.moeda);
  if (moeda === MOEDA_PADRAO) return comExtras;
  return { ...comExtras, alertas: comExtras.alertas.map((a) => ({ ...a, texto: trocarSimbolo(a.texto, moeda) })) };
};
