// Tradução: Morador, Ausência e Estadia
//
// Na tela, quem estava em casa pode ser perguntado de dois jeitos, e é o modo
// da casa que decide qual:
//
//  · ausência   marcam-se as datas em que a pessoa NÃO estava. É o normal numa
//    república: todo mundo mora lá, viajar é a exceção, e marcar a exceção dá
//    menos trabalho.
//  · presença   marcam-se as datas em que a pessoa ESTAVA. É o normal numa casa
//    de temporada: ninguém fica o mês inteiro, e a exceção é ter ido.
//
// A polaridade vem do modo, nunca de adivinhar qual campo está preenchido.
// Uma casa de temporada recém-criada tem as estadias vazias, e isso quer dizer
// "ninguém foi ainda"   não "todo mundo ficou o mês inteiro". Inferir pelo
// campo daria exatamente o contrário.
//
// O domínio recebe sempre a mesma coisa: quantos dias a pessoa ficou fora
// dentro do ciclo que interessa. A inversão acontece aqui e em nenhum outro
// lugar; o motor não sabe que existem dois jeitos de perguntar.

import { num } from "../formato.js";
import {
  diasDaJanela,
  diasNaJanela,
  janelaDoFechamento,
  janelaDoMes,
  janelaValida,
  somarDias,
} from "../calendario.js";
import { polaridadeDe } from "../modos.js";
import { janelaDaFatura } from "./fatura.js";

/** O campo em que este modo guarda as datas marcadas. */
export const campoDaPresenca = (polaridade) =>
  polaridade === "presenca" ? "presencas" : "ausencias";

export const datasMarcadas = (morador, polaridade) => {
  const lista = morador?.[campoDaPresenca(polaridade)];
  return Array.isArray(lista) ? lista : [];
};

/** Quantos dias o morador ficou fora dentro de um ciclo. */
export function diasForaNaJanela(morador, janela, polaridade = "ausencia") {
  if (polaridade === "nenhuma") return 0;

  if (polaridade === "presenca") {
    const doCiclo = diasDaJanela(janela);
    const dentro = diasNaJanela(datasMarcadas(morador, "presenca"), janela);
    return Math.max(0, doCiclo - dentro);
  }

  if (Array.isArray(morador.ausencias)) return diasNaJanela(morador.ausencias, janela);

  return num(morador.diasFora);
}

const emCasa = (dias, fora) => Math.max(0, Math.min(dias, dias - fora));

/** Quantos dias do ciclo desta fatura o morador passou em casa. */
export function diasContadosNaFatura(morador, fatura, periodo, polaridade = "ausencia") {
  const janela = janelaDaFatura(fatura, periodo);
  const dias = diasDaJanela(janela, periodo);
  return emCasa(dias, diasForaNaJanela(morador, janela, polaridade));
}

/** Quantos dias do fechamento o morador passou em casa. */
export function diasContadosDe(morador, periodo, faturas, polaridade = "ausencia") {
  const janela = faturas ? janelaDoFechamento(faturas, periodo) : janelaDoMes(periodo);
  const dias = diasDaJanela(janela, periodo);
  return emCasa(dias, diasForaNaJanela(morador, janela, polaridade));
}

/** A polaridade de uma casa, lida do modo que ela guarda. */
export const polaridadeDaCasa = (estado) => polaridadeDe(estado?.modo);

// ── quem estava em casa em cada dia ────────────────────────────────────────
//
// A divisão por presença quer saber mais do que "ficou 5 dias fora": ela quer
// saber QUAIS cinco, para saber se duas viagens coincidiram. Desde que o
// calendário existe, a tela sabe disso   e era só não estar contando a ninguém.

/**
 * Este morador tem as datas marcadas, ou só um total digitado?
 *
 * Numa casa de temporada a lista de estadias vazia é uma resposta completa
 * ("não foi nenhum dia"), e por isso conta como sabida. Numa república, a
 * ausência da lista quer dizer que a pessoa respondeu pelo total antigo, e aí
 * não dá para saber quais dias foram.
 */
export function temDatasMarcadas(morador, polaridade = "ausencia") {
  if (polaridade === "nenhuma") return true;
  if (polaridade === "presenca") return Array.isArray(morador?.presencas);
  return Array.isArray(morador?.ausencias);
}

/** Todos os moradores marcaram as datas? Basta um não para a conta voltar a estimar. */
export const todosComDatas = (moradores, polaridade) =>
  (moradores ?? []).every((m) => temDatasMarcadas(m, polaridade));

/**
 * Para cada dia da janela, quem estava em casa naquele dia.
 *
 * Devolve `undefined` quando alguém do grupo não marcou datas: é o sinal de
 * que a divisão por presença precisa voltar a estimar, em vez de inventar uma
 * precisão que os dados não têm.
 */
export function presentesPorDia(moradores, janela, polaridade = "ausencia") {
  if (!janelaValida(janela)) return undefined;
  if (!todosComDatas(moradores, polaridade)) return undefined;

  const quantos = diasDaJanela(janela);
  if (quantos <= 0) return undefined;

  // Um Set por pessoa: a varredura dos dias vira uma consulta direta em vez de
  // percorrer a lista de datas de novo a cada dia.
  const marcados = (moradores ?? []).map((m) => new Set(datasMarcadas(m, polaridade)));

  const dias = [];
  for (let i = 0; i < quantos; i++) {
    const dia = somarDias(janela.de, i);
    const noDia = [];

    (moradores ?? []).forEach((m, indice) => {
      const marcou = marcados[indice].has(dia);
      // Numa república marca-se a ausência: marcado = fora.
      // Numa temporada marca-se a estadia: marcado = presente.
      const presente = polaridade === "presenca" ? marcou : !marcou;
      if (presente) noDia.push(m.id);
    });

    dias.push(noDia);
  }

  return dias;
}
