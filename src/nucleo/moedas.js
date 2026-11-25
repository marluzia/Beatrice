// A moeda de um conjunto: escolhida ao criar, fixa depois.
//
// O cálculo não muda com a moeda   o motor trabalha em centavos de qualquer
// coisa. Muda o símbolo que as telas, o relatório e as mensagens escrevem.
// A lista fica nas moedas de duas casas decimais, que é o que o motor arredonda.
//
// Dentro de um conjunto, a tela escreve na moeda dele (`definirMoedaAtual`,
// chamado pelo App ao abrir o conjunto). Fora dele (o Início, a busca), quem
// escreve diz a moeda de cada valor.

import { reais } from "./formato.js";

export const MOEDAS = {
  BRL: { codigo: "BRL", nome: "Real", simbolo: "R$" },
  USD: { codigo: "USD", nome: "Dólar americano", simbolo: "US$" },
  EUR: { codigo: "EUR", nome: "Euro", simbolo: "€" },
  GBP: { codigo: "GBP", nome: "Libra esterlina", simbolo: "£" },
  ARS: { codigo: "ARS", nome: "Peso argentino", simbolo: "AR$" },
  UYU: { codigo: "UYU", nome: "Peso uruguaio", simbolo: "$U" },
  MXN: { codigo: "MXN", nome: "Peso mexicano", simbolo: "MX$" },
  COP: { codigo: "COP", nome: "Peso colombiano", simbolo: "COL$" },
  PEN: { codigo: "PEN", nome: "Sol peruano", simbolo: "S/" },
  CAD: { codigo: "CAD", nome: "Dólar canadense", simbolo: "CA$" },
  AUD: { codigo: "AUD", nome: "Dólar australiano", simbolo: "AU$" },
  CHF: { codigo: "CHF", nome: "Franco suíço", simbolo: "CHF" },
};

export const MOEDA_PADRAO = "BRL";

export const LISTA_DE_MOEDAS = Object.values(MOEDAS);

/** Um código de moeda que existe, ou o real. */
export const moedaValida = (codigo) => (MOEDAS[codigo] ? codigo : MOEDA_PADRAO);

let atual = MOEDA_PADRAO;

/** A moeda em que a tela está escrevendo agora (a do conjunto aberto). */
export const moedaAtual = () => atual;

export function definirMoedaAtual(codigo) {
  atual = moedaValida(codigo);
}

/** "R$", "US$", "€"… */
export const simboloDe = (codigo = atual) => MOEDAS[moedaValida(codigo)].simbolo;

/** "US$ 12,50": o símbolo da moeda e o número no jeito brasileiro. */
export const emMoeda = (valor, codigo = atual) => `${simboloDe(codigo)} ${reais(valor)}`;

/** "Dólar americano (US$)" */
export const nomeDaMoeda = (codigo) => {
  const m = MOEDAS[moedaValida(codigo)];
  return `${m.nome} (${m.simbolo})`;
};

/**
 * Troca o "R$ " de um texto pronto (os avisos do motor, que escrevem em
 * reais) pelo símbolo da moeda. Em real, devolve o texto como veio.
 */
export const trocarSimbolo = (texto, codigo = atual) =>
  moedaValida(codigo) === MOEDA_PADRAO || typeof texto !== "string" ? texto : texto.replace(/R\$(\s)/g, (_, espaco) => `${simboloDe(codigo)}${espaco}`);
