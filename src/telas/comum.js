// O que mais de uma tela nova precisa saber sobre os conjuntos salvos.

import { MOEDA_PADRAO, moedaValida } from "../nucleo/moedas.js";
import { atrasosDe, curta, diasAte, eventosDoDia, hojeISO, nomeDe, quandoFoi, quandoNaLista } from "../nucleo/resumo.js";
import { num } from "../nucleo/formato.js";
import { modoDe, presetDe } from "../nucleo/modos.js";
import { lembreteParaMim } from "../nucleo/lembretes.js";

/** O último lançamento de dinheiro: despesa, conta paga, Pix. Lembrete, edição e o que mexe nas pessoas não contam. */
export const ultimoLancamento = (p) =>
  (p.atividade ?? []).find((a) => a.tipo !== "lembrete" && a.tipo !== "edicao" && a.tipo !== "conjunto") ?? null;

/**
 * A última coisa que alguém fez no conjunto: lançar, editar, lembrar, criar,
 * adicionar, entrar, sair. Conjunto sem nada guardado (de antes dos
 * movimentos) tem ao menos a criação, por quem administra.
 */
export function ultimaAtividade(p) {
  const a = (p.atividade ?? [])[0];
  if (a) return a;
  if (!p.ficha?.criadaEm) return null;
  const admin = p.estado?.admin ? nomeDe(p.estado, p.estado.admin) : "";
  return { tipo: "conjunto", movimento: "criou", quando: p.ficha.criadaEm, autor: admin || "Alguém" };
}

/**
 * Quantas movimentações houve no conjunto desde a última vez que a pessoa o
 * abriu neste aparelho. Conjunto nunca aberto aqui (de antes disso) não conta.
 */
export function novidadesDe(p) {
  const visto = p.ficha?.vistoEm;
  if (!visto) return 0;
  return (p.atividade ?? []).filter((a) => a.quando && String(a.quando) > visto).length;
}

/** Os conjuntos do panorama, da atividade mais recente para a mais antiga. */
export const porAtividade = (panorama) =>
  [...panorama].sort((a, b) =>
    String(ultimaAtividade(b)?.quando ?? b.ficha.salvaEm ?? "").localeCompare(String(ultimaAtividade(a)?.quando ?? a.ficha.salvaEm ?? "")),
  );

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

/** A frase da lista de conjuntos: quem fez algo por último e quando ("Bia · 10:42", "Bia · ontem", "Bia · 12/10/2026"). */
export function fraseDoConjunto(p, hoje = hojeISO()) {
  const a = ultimaAtividade(p);
  if (!a) return "Nada lançado ainda";
  return `${a.autor || "Alguém"} · ${quandoNaLista(a.quando, hoje)}`;
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
 * Uma despesa envolve você se você pagou ou está entre quem divide. Sem saber
 * quem é você no conjunto, não dá para excluir ninguém: entra.
 */
function envolve(e, eu, itemId, pagoPor) {
  if (!eu) return true;
  if (pagoPor === eu) return true;
  const item = itemId ? (e.itens ?? []).find((i) => i.id === itemId) : null;
  return !item || (item.participantes ?? []).includes(eu);
}

/** O que conta como despesa no Hoje: atrasos, o que foi lançado hoje e o Pix que você deve fazer. */
export const EH_DESPESA_DE_HOJE = new Set(["atraso", "despesa", "transferencia"]);

/**
 * O que acontece hoje em todos os conjuntos: atrasos, os Pix que você deve
 * fazer, vencimentos, despesas de hoje que envolvem você, registros e
 * lembretes do dia. Cada um sabe de qual conjunto veio.
 */
export function hojeEmTudo(panorama, hoje = hojeISO()) {
  const lista = [];
  for (const p of panorama) {
    const e = p.estado;
    const eu = p.resumo?.eu ?? null;
    const doConjunto = { conjunto: p.ficha.id, nomeDoConjunto: p.ficha.nome, estado: e };
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
        ...doConjunto,
      });
    }
    // Avulsas com vencimento que passou e ninguém pagou.
    for (const i of e.itens ?? []) {
      if (i.especie !== "reais" || !i.vencimento || i.vencimento >= hoje || i.pagoPor) continue;
      const dias = diasAte(i.vencimento, hoje);
      lista.push({
        tipo: "atraso",
        id: `aa-${i.id}`,
        item: i.id,
        titulo: `${i.nome?.trim() || "Despesa"} atrasada · ${dias} ${dias === 1 ? "dia" : "dias"}`,
        valor: num(i.valor),
        vencimento: i.vencimento,
        dias,
        ...doConjunto,
      });
    }
    // O Pix que você ainda deve fazer neste conjunto.
    if (eu) {
      for (const t of p.resumo?.transferencias ?? []) {
        if (t.confirmada || t.de !== eu) continue;
        lista.push({
          tipo: "transferencia",
          id: `t-${t.chave}`,
          titulo: `Pix para ${nomeDe(e, t.para)}`,
          valor: t.centavos / 100,
          para: t.para,
          ...doConjunto,
        });
      }
    }
    for (const ev of eventosDoDia(e, hoje)) {
      if (ev.tipo === "ausencia") continue;
      if (ev.item) vistos.add(ev.item);
      if (ev.tipo === "despesa" && !envolve(e, eu, ev.item, ev.pagoPor)) continue;
      // O lembrete é de quem foi marcado nele (sem ninguém marcado, de todos).
      if (ev.tipo === "lembrete" && !lembreteParaMim(ev, eu)) continue;
      lista.push({ ...ev, ...doConjunto });
    }
    // Despesas lançadas hoje, mesmo sem data marcada.
    for (const a of p.atividade ?? []) {
      if (a.tipo !== "despesa" || !String(a.quando).startsWith(hoje)) continue;
      const item = e.itens.find((i) => i.criadoEm === a.quando);
      if (item && vistos.has(item.id)) continue;
      if (!envolve(e, eu, item?.id, a.quem)) continue;
      lista.push({
        tipo: "despesa",
        id: `n-${item?.id ?? a.quando}`,
        item: item?.id,
        titulo: a.titulo,
        valor: a.valor,
        pagoPor: a.quem,
        ...doConjunto,
      });
    }
  }
  const ordem = { atraso: 0, transferencia: 1, vencimento: 2, despesa: 3, registro: 4, lembrete: 5 };
  return lista.sort((a, b) => (ordem[a.tipo] ?? 9) - (ordem[b.tipo] ?? 9));
}

/** A segunda linha de um evento do dia: "Lar Doce Lar · Bia pagou". */
export function detalheDoEvento(ev) {
  const quem = (id) => nomeDe(ev.estado, id);
  if (ev.tipo === "atraso")
    return `${ev.nomeDoConjunto} · venceu ${curta(ev.vencimento)}`;
  if (ev.tipo === "vencimento") return `${ev.nomeDoConjunto} · ${ev.pagoPor ? `${quem(ev.pagoPor)} pagou` : "ninguém pagou ainda"}`;
  if (ev.tipo === "despesa") return `${ev.nomeDoConjunto}${ev.pagoPor ? ` · ${quem(ev.pagoPor)} pagou` : ""}`;
  if (ev.tipo === "transferencia") return `${ev.nomeDoConjunto} · você paga`;
  if (ev.tipo === "registro") return `${ev.nomeDoConjunto} · ${ev.participantes.map(quem).join(" e ")}`;
  if (ev.tipo === "lembrete") return ev.nomeDoConjunto;
  return ev.nomeDoConjunto;
}

/** Para onde um evento do dia leva, dentro do conjunto dele. */
export function destinoDoEvento(ev) {
  // Cada evento do dia abre o lançamento dele, sozinho.
  if ((ev.tipo === "vencimento" || ev.tipo === "atraso") && ev.item) return { tela: "lancamento", tipo: "avulsa", id: ev.item };
  if (ev.tipo === "vencimento" || ev.tipo === "atraso") return { tela: "lancamento", tipo: "ciclica", id: ev.ciclo };
  if (ev.tipo === "registro") return { tela: "lancamento", tipo: "registro", item: ev.item, id: ev.registro };
  if (ev.tipo === "lembrete") return { tela: "lancamento", tipo: "lembrete", id: ev.lembrete };
  if (ev.tipo === "transferencia") return { tela: "fechar" };
  if (ev.item) return { tela: "lancamento", tipo: "avulsa", id: ev.item };
  return { tela: "despesas" };
}
