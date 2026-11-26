// O que acontece com o conjunto em si, fora o dinheiro: quem o criou, quem
// adicionou quem, quem entrou, saiu ou foi tirado. Cada movimento guarda os
// nomes do momento (quem sai do conjunto deixa de ter nome nele) e a data.
//
//   movimentos: [{ tipo: "adicionou", quem, nomeDeQuem, alvo, nomeDoAlvo, quando }]
//
// Entrar sobrepõe ter sido adicionado: quando a pessoa entra, o "Ana
// adicionou Bia" dá lugar ao "Bia entrou no conjunto".

import { nomeOu } from "./formato.js";

function nomeDe(estado, id) {
  const i = (estado?.moradores ?? []).findIndex((m) => m.id === id);
  return i < 0 ? "" : nomeOu(estado.moradores[i].nome, i);
}

export const TIPOS_DE_MOVIMENTO = ["criou", "adicionou", "entrou", "saiu", "removeu"];

const agora = () => new Date().toISOString();

/** O estado com mais um movimento, já com os nomes de agora. */
export function comMovimento(estado, { tipo, quem = null, alvo = null, nomeDeQuem, nomeDoAlvo, quando = agora() }) {
  const antes = Array.isArray(estado.movimentos) ? estado.movimentos : [];
  const novo = {
    tipo,
    quem,
    nomeDeQuem: nomeDeQuem ?? (quem ? nomeDe(estado, quem) : ""),
    alvo,
    nomeDoAlvo: nomeDoAlvo ?? (alvo ? nomeDe(estado, alvo) : ""),
    quando,
  };
  if (tipo === "entrou") {
    if (antes.some((m) => m.tipo === "entrou" && m.alvo === alvo)) return estado;
    return { ...estado, movimentos: [...antes.filter((m) => !(m.tipo === "adicionou" && m.alvo === alvo)), novo] };
  }
  return { ...estado, movimentos: [...antes, novo] };
}

/** Só os movimentos bem formados (o que vier de um arquivo pode vir torto). */
export const movimentosLimpos = (lista) =>
  Array.isArray(lista)
    ? lista.filter((m) => m && TIPOS_DE_MOVIMENTO.includes(m.tipo) && typeof m.quando === "string")
    : [];

/** "Ana criou o conjunto", "Ana adicionou Bia", "Bia entrou no conjunto"… */
export function textoDoMovimento(m) {
  const quem = m.nomeDeQuem || "Alguém";
  const alvo = m.nomeDoAlvo || "uma pessoa";
  switch (m.tipo) {
    case "criou":
      return `${quem} criou o conjunto`;
    case "adicionou":
      return `${quem} adicionou ${alvo}`;
    case "entrou":
      return `${m.nomeDoAlvo || quem} entrou no conjunto`;
    case "saiu":
      return `${m.nomeDoAlvo || quem} saiu do conjunto`;
    default:
      return `${quem} tirou ${alvo} do conjunto`;
  }
}

/** Quem fez o movimento: quem entra ou sai é a própria pessoa. */
export const autorDoMovimento = (m) =>
  (m.tipo === "entrou" || m.tipo === "saiu" ? m.nomeDoAlvo || m.nomeDeQuem : m.nomeDeQuem) || "Alguém";
