// Acerto: de quem para quem, e quanto.
//
// O motor responde "quanto cada um DEVE do fechamento". Este arquivo responde
// a pergunta seguinte: "e aí, me paga quanto?".
//
// ── O pagador é opcional, e a ausência dele quer dizer alguma coisa ─────────
//
// Existem duas situações bem diferentes, e a CEDER precisa das duas:
//
//   **Cada um pagou a sua parte direto.** Quatro pessoas rachando o jantar,
//   cada uma passando o próprio cartão na maquininha. O dinheiro saiu de
//   quatro bolsos para fora do grupo, e ninguém ficou devendo a ninguém. A
//   despesa não tem pagador.
//
//   **Alguém centralizou.** Uma pessoa passou o cartão pelo grupo todo, ou
//   pagou o boleto da luz inteiro. O dinheiro saiu de um bolso só, e agora os
//   outros devem a ela. A despesa tem pagador.
//
// Então **só as despesas com pagador entram no acerto**. Uma despesa sem
// pagador continua pesando no quanto-cada-um-deve do fechamento   ela
// aconteceu, ela foi rateada, ela aparece no relatório   mas não gera dívida
// interna, porque já foi paga direto.
//
// Isso é diferente do que esta mesma função fazia antes, e o jeito anterior
// estava errado: ele tratava despesa sem pagador como buraco, e inflava a
// dívida interna de todo mundo com dinheiro que já tinha sido pago.
//
// ── Os centavos ────────────────────────────────────────────────────────────
//
// Tudo em centavos inteiros, a partir do mesmo arredondamento que o relatório
// mostra. Quando a divisão não fecha em dinheiro, o resto vai para quem a casa
// escolheu   é o `quemCede` do estado, e é a frase da marca virando campo.

import { nomeOu, num } from "./formato.js";
import { totalDaFatura } from "./traducao/fatura.js";
import { ciclosLigados, deConta } from "./ciclos.js";
import { emCentavos, quemCedeDe } from "./cessao.js";

export { emCentavos, quemCedeDe };

/**
 * As despesas que podem ter sido centralizadas por alguém, com quanto cada
 * pessoa foi alocada de cada uma.
 *
 * São as faturas ligadas e os itens cujo custo sai em reais. O que sai de
 * dentro da fatura   geladeira, máquina, chuveiro   não aparece aqui: o
 * dinheiro daquilo já está no valor da conta do ciclo, e contar de novo seria
 * cobrar duas vezes.
 */
export function despesasPagaveis(estado, resultado) {
  const lista = [];

  // As faturas: a parte de cada um já vem somada no resultado, porque uma
  // fatura não é um item só   ela se desmancha em aparelhos, uso comum e taxas.
  for (const ciclo of ciclosLigados(estado)) {
    const centavos = emCentavos(totalDaFatura(ciclo));
    if (centavos === 0) continue;

    lista.push({
      id: `fatura-${ciclo.id}`,
      tipo: "fatura",
      nome: `Conta ${deConta(ciclo)}`,
      centavos,
      pagoPor: ciclo.pagoPor ?? null,
      // quanto cada um deve desta fatura
      porPessoa: Object.fromEntries(
        resultado.moradores.map((m) => [m.moradorId, m.porCiclo?.[ciclo.id] ?? 0]),
      ),
    });
  }

  // Os itens em reais: a fatia de cada um vem do próprio item calculado.
  for (const item of estado.itens ?? []) {
    if (!saiDoBolso(item)) continue;

    const calculado = resultado.itens.find((x) => x.id === item.id);
    const centavos = emCentavos(calculado?.custoTotal ?? 0);
    if (centavos === 0) continue;

    lista.push({
      id: item.id,
      tipo: "item",
      nome: item.nome?.trim() || "Item sem nome",
      centavos,
      pagoPor: item.pagoPor ?? null,
      data: item.data ?? null,
      porPessoa: Object.fromEntries(
        (calculado?.fatias ?? []).map((f) => [f.moradorId, f.total]),
      ),
    });
  }

  return lista;
}

/** Este item sai do bolso de alguém, ou sai de dentro de uma fatura? */
export const saiDoBolso = (item) =>
  item.especie === "reais" || (item.especie === "porUso" && item.origemUso === "reais");

/**
 * As transferências que zeram todo mundo, em centavos.
 *
 * Casa o maior devedor com o maior credor, repete. Produz no máximo n−1
 * transferências para n pessoas, que é o que importa na prática: ninguém quer
 * fazer seis Pix quando dois resolvem.
 *
 * Achar o mínimo absoluto é um problema difícil (dá para reduzir subset-sum a
 * ele). Esta é a heurística que todo mundo usa, e ela acerta o ótimo na
 * esmagadora maioria das casas reais.
 */
export function transferenciasDe(saldos) {
  const credores = saldos
    .filter((s) => s.saldo > 0)
    .map((s) => ({ id: s.moradorId, resta: s.saldo }))
    .sort((a, b) => b.resta - a.resta);

  const devedores = saldos
    .filter((s) => s.saldo < 0)
    .map((s) => ({ id: s.moradorId, resta: -s.saldo }))
    .sort((a, b) => b.resta - a.resta);

  const transferencias = [];
  let i = 0;
  let j = 0;

  while (i < devedores.length && j < credores.length) {
    const quanto = Math.min(devedores[i].resta, credores[j].resta);

    if (quanto > 0) {
      transferencias.push({ de: devedores[i].id, para: credores[j].id, centavos: quanto });
      devedores[i].resta -= quanto;
      credores[j].resta -= quanto;
    }

    if (devedores[i].resta === 0) i += 1;
    if (credores[j].resta === 0) j += 1;
  }

  return {
    transferencias,
    sobraDevendo: devedores.slice(i).reduce((s, d) => s + d.resta, 0),
    sobraRecebendo: credores.slice(j).reduce((s, c) => s + c.resta, 0),
  };
}

/**
 * Quem fica com o centavo que sobra ou falta: ver `cessao.js`.
 *
 * O fechamento inteiro e o acerto usam o mesmo critério: a escolha do
 * conjunto, e nenhuma enquanto ninguém escolheu. Os dois resíduos são números
 * diferentes (o do fechamento olha tudo, o do acerto só o que alguém
 * centralizou), mas o dono é decidido do mesmo jeito nos dois.
 */

/**
 * O acerto completo do conjunto.
 *
 * Recebe o estado (que sabe quem centralizou o quê) e o resultado do motor
 * (que sabe quanto cada um deve de cada coisa). Devolve tudo em centavos.
 */
export function acertoDe(estado, resultado) {
  const moradores = estado.moradores ?? [];
  const despesas = despesasPagaveis(estado, resultado);

  const nomeDe = (id) => {
    const i = moradores.findIndex((m) => m.id === id);
    return i < 0 ? null : nomeOu(moradores[i].nome, i);
  };

  const mora = (quem) => Boolean(quem) && moradores.some((m) => m.id === quem);

  // Centralizada: alguém de dentro pagou o todo e os outros devem a ela.
  // Direta: cada um pagou a própria parte para fora, e ninguém deve a ninguém.
  const centralizadas = despesas.filter((d) => mora(d.pagoPor));
  const diretas = despesas.filter((d) => !mora(d.pagoPor));

  const pagou = {};
  const deveFloat = {};
  const centralizouQuais = {};

  for (const m of moradores) {
    pagou[m.id] = 0;
    deveFloat[m.id] = 0;
    centralizouQuais[m.id] = [];
  }

  for (const d of centralizadas) {
    pagou[d.pagoPor] += d.centavos;
    centralizouQuais[d.pagoPor].push(d);

    for (const m of moradores) {
      deveFloat[m.id] += num(d.porPessoa?.[m.id]);
    }
  }

  // Arredonda uma vez por pessoa, e o que sobrar do total centralizado vai
  // para quem cede. Assim os saldos somam zero exato e as transferências
  // fecham no centavo.
  const parciais = moradores.map((m, i) => ({
    moradorId: m.id,
    nome: nomeOu(m.nome, i),
    pagou: pagou[m.id],
    deve: emCentavos(deveFloat[m.id]),
    centralizou: centralizouQuais[m.id],
  }));

  const totalCentralizado = centralizadas.reduce((s, d) => s + d.centavos, 0);
  const somaArredondada = parciais.reduce((s, p) => s + p.deve, 0);
  const residuo = totalCentralizado - somaArredondada;

  const cede = quemCedeDe(estado, parciais);

  const saldos = parciais.map((p) => {
    const deve = p.deve + (p.moradorId === cede.id ? residuo : 0);
    return { ...p, deve, saldo: p.pagou - deve, cedeu: p.moradorId === cede.id ? residuo : 0 };
  });

  const { transferencias, sobraDevendo, sobraRecebendo } = transferenciasDe(saldos);

  return {
    saldos,
    transferencias: transferencias.map((t) => ({
      ...t,
      deNome: nomeDe(t.de),
      paraNome: nomeDe(t.para),
    })),
    despesas,
    centralizadas,
    /** Despesas em que cada um pagou a própria parte direto. Não geram dívida. */
    diretas,
    totalCentralizado,
    totalDireto: diretas.reduce((s, d) => s + d.centavos, 0),
    /** O centavo que não fecha, e de quem ele ficou. */
    residuo,
    quemCede: cede.id,
    /**
     * Há centavo a ceder neste acerto e ninguém assumiu. Sem dono, os saldos
     * não zeram e as transferências não fecham   por isso a tela trava a
     * seção em vez de mostrar números que não somam.
     */
    precisaCeder: residuo !== 0 && cede.id === null,
    /** Sobras do casamento devedor-credor. Devem ser zero; se não forem, é bug. */
    sobraDevendo,
    sobraRecebendo,
  };
}

/**
 * A mensagem pronta para mandar no grupo.
 *
 * Existe porque o acerto só vira dinheiro quando alguém manda a mensagem, e
 * reescrever isso à mão todo mês é onde o processo morre.
 */
export function mensagemDoAcerto(acerto, periodo, nomeDoConjunto) {
  const linhas = [];
  const reais = (c) => (c / 100).toFixed(2).replace(".", ",");

  linhas.push(`${nomeDoConjunto ?? "Fechamento"}   ${periodo.mes}/${periodo.ano}`, "");

  if (acerto.transferencias.length === 0) {
    linhas.push(
      acerto.totalCentralizado === 0
        ? "Cada um pagou a própria parte direto. Ninguém deve ninguém."
        : "Ninguém deve ninguém neste fechamento.",
    );
  } else {
    linhas.push("Acerto:");
    for (const t of acerto.transferencias) {
      linhas.push(`  ${t.deNome} → ${t.paraNome}: R$ ${reais(t.centavos)}`);
    }
  }

  if (acerto.residuo !== 0) {
    const quem = acerto.saldos.find((s) => s.moradorId === acerto.quemCede)?.nome;
    const quantos = Math.abs(acerto.residuo);
    linhas.push(
      "",
      `A divisão não fecha em dinheiro por ${quantos} ${quantos === 1 ? "centavo" : "centavos"}. ` +
        `${quem} cedeu.`,
    );
  }

  if (acerto.diretas.length > 0) {
    linhas.push(
      "",
      `Fora do acerto (cada um pagou a sua parte direto): ${acerto.diretas
        .map((d) => d.nome)
        .join(", ")}.`,
    );
  }

  return linhas.join("\n");
}
