// O que mais de uma tela nova precisa saber sobre os conjuntos salvos.

import { MOEDA_PADRAO, moedaValida } from "../nucleo/moedas.js";
import { atrasosDe, curta, eventosDoDia, hojeISO, nomeDe, quandoFoi } from "../nucleo/resumo.js";
import { modoDe, presetDe } from "../nucleo/modos.js";

/** O último lançamento de dinheiro: despesa, conta paga, Pix. Lembrete e edição não contam. */
export const ultimoLancamento = (p) => (p.atividade ?? []).find((a) => a.tipo !== "lembrete" && a.tipo !== "edicao") ?? null;

/** O momento mais recente em que algo foi lançado num conjunto. */
export const momentoDe = (p) => ultimoLancamento(p)?.quando ?? p.ficha.criadaEm ?? p.ficha.salvaEm ?? "";

/** Os conjuntos do panorama, do lançamento mais recente para o mais antigo. */
export const porLancamento = (panorama) =>
  [...panorama].sort((a, b) => String(momentoDe(b)).localeCompare(String(momentoDe(a))));

/** "MERCADO · HOJE", "LUZ PAGA · ONTEM", "SETEMBRO QUITADO · 12/10". */
export function sobrescritoDoConjunto(p, hoje = hojeISO()) {
  const a = ultimoLancamento(p);
  if (!a) return "sem lançamentos";
  const oque =
    a.tipo === "pagamento"
      ? `${(a.titulo ?? "conta").toLowerCase()} paga`
      : a.tipo === "pix"
        ? "pix confirmado"
        : (a.titulo ?? a.texto ?? "").toLowerCase();
  return `${oque} · ${quandoFoi(a.quando, hoje)}`;
}

/** A frase de atividade da lista de conjuntos: "Bia pagou Mercado · hoje, 10:42". */
export function fraseDoConjunto(p, hoje = hojeISO()) {
  const a = ultimoLancamento(p);
  if (!a) return p.ficha.pessoas ? `${p.ficha.pessoas} ${p.ficha.pessoas === 1 ? "pessoa" : "pessoas"} · nada lançado` : "Nada lançado ainda";
  return `${a.texto} · ${quandoFoi(a.quando, hoje)}`;
}

/** O que aparece embaixo do valor: "a pagar", "previsto", "em dia". */
export const TEXTO_DA_SITUACAO = {
  "a pagar": "a pagar",
  "a receber": "a receber",
  previsto: "previsto",
  "em dia": "em dia",
  encerrado: "encerrado",
  "sem você": "sem você",
};

/** "MORADIA COMPARTILHADA · REPÚBLICA MODERADA · 4 PESSOAS" */
export function partesDoTipo(estado) {
  const modo = modoDe(estado.modo);
  const preset = presetDe(estado);
  const n = estado.moradores.length;
  return [modo.nome, preset?.curto, `${n} ${n === 1 ? "pessoa" : "pessoas"}`, codigoSeNaoForReal(estado)];
}

/** "USD", "EUR"… no sobrescrito; em real, nada (o R$ já diz). */
export const codigoSeNaoForReal = (estado) => {
  const codigo = moedaValida(estado?.moeda);
  return codigo === MOEDA_PADRAO ? null : codigo;
};

/**
 * O que acontece hoje em todos os conjuntos: vencimentos, despesas lançadas
 * hoje, registros e lembretes do dia. Cada um sabe de qual conjunto veio.
 */
export function hojeEmTudo(panorama, hoje = hojeISO()) {
  const lista = [];
  for (const p of panorama) {
    const e = p.estado;
    const vistos = new Set();
    // Atrasos: passou do vencimento e ninguém pagou. Vêm antes de tudo.
    for (const a of atrasosDe(e, hoje)) {
      lista.push({
        tipo: "atraso",
        id: `a-${a.ciclo.id}`,
        ciclo: a.ciclo.id,
        titulo: `${a.ciclo.nome || "Conta"} atrasada · ${a.dias} ${a.dias === 1 ? "dia" : "dias"}`,
        valor: a.valor,
        vencimento: a.ciclo.vencimento,
        dias: a.dias,
        conjunto: p.ficha.id,
        nomeDoConjunto: p.ficha.nome,
        estado: e,
      });
    }
    for (const ev of eventosDoDia(e, hoje)) {
      if (ev.tipo === "ausencia") continue;
      if (ev.item) vistos.add(ev.item);
      lista.push({ ...ev, conjunto: p.ficha.id, nomeDoConjunto: p.ficha.nome, estado: e });
    }
    // Despesas lançadas hoje, mesmo sem data marcada.
    for (const a of p.atividade ?? []) {
      if (a.tipo !== "despesa" || !String(a.quando).startsWith(hoje)) continue;
      const item = e.itens.find((i) => i.criadoEm === a.quando);
      if (item && vistos.has(item.id)) continue;
      lista.push({
        tipo: "despesa",
        id: `n-${item?.id ?? a.quando}`,
        item: item?.id,
        titulo: a.titulo,
        valor: a.valor,
        pagoPor: a.quem,
        conjunto: p.ficha.id,
        nomeDoConjunto: p.ficha.nome,
        estado: e,
      });
    }
  }
  const ordem = { atraso: 0, vencimento: 1, despesa: 2, registro: 3, lembrete: 4 };
  return lista.sort((a, b) => (ordem[a.tipo] ?? 9) - (ordem[b.tipo] ?? 9));
}

/** A segunda linha de um evento do dia: "Lar Doce Lar · Bia pagou". */
export function detalheDoEvento(ev) {
  const quem = (id) => nomeDe(ev.estado, id);
  if (ev.tipo === "atraso")
    return `${ev.nomeDoConjunto} · venceu ${curta(ev.vencimento)}`;
  if (ev.tipo === "vencimento") return `${ev.nomeDoConjunto} · ${ev.pagoPor ? `${quem(ev.pagoPor)} pagou` : "ninguém pagou ainda"}`;
  if (ev.tipo === "despesa") return `${ev.nomeDoConjunto}${ev.pagoPor ? ` · ${quem(ev.pagoPor)} pagou` : ""}`;
  if (ev.tipo === "registro") return `${ev.nomeDoConjunto} · ${ev.participantes.map(quem).join(" e ")}`;
  if (ev.tipo === "lembrete") return ev.nomeDoConjunto;
  return ev.nomeDoConjunto;
}

/** Para onde um evento do dia leva, dentro do conjunto dele. */
export function destinoDoEvento(ev) {
  // Cada evento do dia abre o lançamento dele, sozinho.
  if (ev.tipo === "vencimento" || ev.tipo === "atraso") return { tela: "lancamento", tipo: "ciclica", id: ev.ciclo };
  if (ev.tipo === "registro") return { tela: "lancamento", tipo: "registro", item: ev.item, id: ev.registro };
  if (ev.tipo === "lembrete") return { tela: "lancamento", tipo: "lembrete", id: ev.lembrete };
  if (ev.item) return { tela: "lancamento", tipo: "avulsa", id: ev.item };
  return { tela: "despesas" };
}
