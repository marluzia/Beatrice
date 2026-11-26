// Agenda: tudo o que aconteceu no conjunto, em ordem de data.
//
// O estado guarda as coisas datadas em quatro lugares diferentes, porque cada
// uma pertence a uma entidade diferente:
//
//   morador.ausencias[] / .presencas[]   os dias de quem mora
//   item.registrosDeUso[]                os usos com data (uma lavagem)
//   item.data                            a despesa avulsa, lançada num dia
//   estado.tarefas[]                     o trabalho feito por quem mora
//
// Este arquivo é o único lugar que junta os quatro numa lista só. Cada entrada
// dela é uma MARCAÇÃO: algo que aconteceu num dia. ("Evento" é só o tipo de
// conjunto.) A agenda usa a lista para marcar os dias, e o histórico para
// contar o mês em ordem.
//
// Nada aqui calcula dinheiro. A agenda é uma leitura do estado; quem divide é
// o motor, e ele continua recebendo o estado do mesmo jeito de antes.

import { simboloDe } from "./moedas.js";
import { MESES, nomeOu, num, reais } from "./formato.js";
import { partesDoDia } from "./calendario.js";
import { modoDoConjunto, polaridadeDoConjuntoNoModo as polaridadeDe } from "./modos.js";

/** As quatro naturezas de marcação, na ordem em que aparecem num dia. */
export const NATUREZAS = ["presenca", "uso", "despesa", "tarefa"];

export const ROTULO_DA_NATUREZA = {
  presenca: { ausencia: "Dia fora", presenca: "Estadia", nenhuma: "Presença" },
  uso: "Uso",
  despesa: "Despesa",
  tarefa: "Tarefa",
};

const listar = (nomes) => {
  if (nomes.length === 0) return "ninguém";
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
};

/** Os nomes de um punhado de ids, na ordem em que os moradores aparecem. */
export function nomesDe(estado, ids) {
  const lista = ids ?? [];
  return estado.moradores
    .map((m, i) => (lista.includes(m.id) ? nomeOu(m.nome, i) : null))
    .filter(Boolean);
}

/**
 * Uma despesa datada é qualquer item com dia marcado   não só as em reais.
 * Um aparelho que só rodou numa semana do ciclo também tem quando.
 */
export const ehDespesaDatada = (item) =>
  typeof item.data === "string" && Boolean(partesDoDia(item.data));

/** O fim do período de um item, quando ele é um período e não um dia só. */
export const fimDoItem = (item) =>
  typeof item.ate === "string" && partesDoDia(item.ate) && item.ate > item.data
    ? item.ate
    : null;

/**
 * Tudo o que tem data, numa lista só, ordenada por dia.
 *
 * Cada entrada traz o que a tela precisa para desenhar e para editar: a
 * natureza, o dia, um texto pronto, e as referências de volta à entidade de
 * origem (`moradorId`, `itemId`, `tarefaId`).
 */
export function agendaDe(estado) {
  const marcacoes = [];
  const polaridade = polaridadeDe(estado);
  const lugar = modoDoConjunto(estado).palavras.noLugar ?? "no espaço";
  const campo = polaridade === "presenca" ? "presencas" : "ausencias";

  // 1. Os dias de cada morador.
  if (polaridade !== "nenhuma") {
    estado.moradores.forEach((m, i) => {
      const quem = nomeOu(m.nome, i);
      for (const dia of m[campo] ?? []) {
        if (!partesDoDia(dia)) continue;
        marcacoes.push({
          id: `p-${m.id}-${dia}`,
          natureza: "presenca",
          dia,
          moradorId: m.id,
          indice: i,
          titulo: quem,
          detalhe: polaridade === "presenca" ? `esteve ${lugar}` : "não dormiu em casa",
        });
      }
    });
  }

  for (const item of estado.itens ?? []) {
    // 2. Os usos com data.
    for (const uso of item.registrosDeUso ?? []) {
      if (!partesDoDia(uso.data)) continue;
      const quantos = num(uso.quantidade) || 1;
      marcacoes.push({
        id: `u-${item.id}-${uso.id}`,
        natureza: "uso",
        dia: uso.data,
        itemId: item.id,
        usoId: uso.id,
        titulo: item.nome,
        detalhe:
          `${quantos === 1 ? "1 uso" : `${quantos} usos`}` +
          ` · ${listar(nomesDe(estado, uso.participantes))}`,
      });
    }

    // 3. As despesas avulsas. Um período entra uma vez só, no dia em que
    //    começa, dizendo até quando vai   espalhar a mesma despesa por trinta
    //    dias da agenda encheria o mês de repetição sem acrescentar nada.
    if (ehDespesaDatada(item)) {
      const valor = num(item.valor);
      const ate = fimDoItem(item);
      const partes = [];

      if (item.especie === "reais") partes.push(valor ? `${simboloDe()} ${reais(valor)}` : "sem valor ainda");
      if (ate) partes.push(`até ${ate.slice(8, 10)}/${ate.slice(5, 7)}`);
      partes.push(listar(nomesDe(estado, item.participantes)));

      marcacoes.push({
        id: `d-${item.id}`,
        natureza: "despesa",
        dia: item.data,
        ate,
        itemId: item.id,
        titulo: item.nome,
        detalhe: partes.join(" · "),
      });
    }
  }

  // 4. As tarefas.
  for (const tarefa of estado.tarefas ?? []) {
    if (!partesDoDia(tarefa.data)) continue;
    marcacoes.push({
      id: `t-${tarefa.id}`,
      natureza: "tarefa",
      dia: tarefa.data,
      tarefaId: tarefa.id,
      titulo: tarefa.nome?.trim() || "Tarefa sem nome",
      detalhe: listar(nomesDe(estado, tarefa.responsaveis)),
    });
  }

  const ordem = (e) => NATUREZAS.indexOf(e.natureza);
  return marcacoes.sort((a, b) => a.dia.localeCompare(b.dia) || ordem(a) - ordem(b));
}

/** A agenda agrupada por dia: { "2026-09-12": [marcação, ...] }. */
export function agendaPorDia(estado) {
  const mapa = {};
  for (const e of agendaDe(estado)) (mapa[e.dia] ??= []).push(e);
  return mapa;
}

/** Quantas marcações de cada natureza existem no conjunto. */
export function contagemPorNatureza(estado) {
  const conta = Object.fromEntries(NATUREZAS.map((n) => [n, 0]));
  for (const e of agendaDe(estado)) conta[e.natureza] += 1;
  return conta;
}

const diaLongo = (iso) => {
  const p = partesDoDia(iso);
  return p ? `${p.dia} de ${MESES[p.mes - 1]}` : iso;
};

/**
 * O histórico em texto, para entrar no relatório.
 *
 * É a mesma lista da agenda, escrita em linhas. Serve para a casa conferir
 * o que foi lançado sem precisar abrir o app   e é onde um desencontro
 * aparece ("ninguém marcou nada no dia 20").
 */
export function historicoEmTexto(estado) {
  const agenda = agendaDe(estado);
  if (agenda.length === 0) return [];

  const rotulo = (e) =>
    e.natureza === "presenca"
      ? ROTULO_DA_NATUREZA.presenca[polaridadeDe(estado)]
      : ROTULO_DA_NATUREZA[e.natureza];

  const linhas = [];
  let ultimoDia = null;

  for (const e of agenda) {
    if (e.dia !== ultimoDia) {
      linhas.push(`  ${diaLongo(e.dia)}`);
      ultimoDia = e.dia;
    }
    linhas.push(`    ${rotulo(e).padEnd(10)} ${e.titulo}   ${e.detalhe}`);
  }

  return linhas;
}
