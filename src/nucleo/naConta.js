// Antes do período: o que fica de fora da conta, por escolha do grupo.
//
// Uma despesa avulsa com data antes do começo do período, ou uma fatura cuja
// leitura final cai antes dele, é de antes. Enquanto ela está em aberto, o
// grupo escolhe se entra na conta deste fechamento ou não (`naConta: false`).
// A escolha só vale enquanto a despesa continua antes do período: se o período
// muda e ela cai dentro, volta a contar sozinha.
//
// O app nunca tira dinheiro da conta por conta própria: sem escolha, tudo entra.

import { ciclosForaDoCorte, janelaDoFechamento } from "./calendario.js";

/** Sai do bolso (não de dentro de uma fatura)? O mesmo critério do acerto. */
const avulsa = (item) => item.especie === "reais" || (item.especie === "porUso" && item.origemUso === "reais");

/** O último dia de uma despesa datada: o fim do período dela, ou o dia. */
const ultimoDia = (item) => (typeof item.ate === "string" && item.ate > (item.data ?? "") ? item.ate : item.data);

/** As despesas de antes do período: avulsas datadas e faturas que terminam antes. */
export function antesDoPeriodo(estado) {
  const janela = janelaDoFechamento(estado.ciclos ?? [], estado.periodo, estado.corte);
  const itens = (estado.itens ?? []).filter((i) => avulsa(i) && ultimoDia(i) && ultimoDia(i) < janela.de);
  const ciclos = ciclosForaDoCorte(estado.ciclos ?? [], estado.periodo, estado.corte)
    .filter((f) => f.quando === "anterior")
    .map((f) => f.ciclo);
  return { janela, itens, ciclos };
}

/** Os ids do que o grupo tirou da conta, e que continua antes do período. */
export function foraDaConta(estado) {
  const { itens, ciclos } = antesDoPeriodo(estado);
  return {
    itens: new Set(itens.filter((i) => i.naConta === false).map((i) => i.id)),
    ciclos: new Set(ciclos.filter((c) => c.naConta === false).map((c) => c.id)),
  };
}

/**
 * O conjunto como entra na conta: sem os itens tirados, e com as faturas
 * tiradas desligadas. É isto que o motor e o acerto recebem.
 */
export function estadoDaConta(estado) {
  const fora = foraDaConta(estado);
  if (fora.itens.size === 0 && fora.ciclos.size === 0) return estado;
  return {
    ...estado,
    itens: estado.itens.filter((i) => !fora.itens.has(i.id)),
    ciclos: estado.ciclos.map((c) => (fora.ciclos.has(c.id) ? { ...c, ativa: false } : c)),
  };
}
