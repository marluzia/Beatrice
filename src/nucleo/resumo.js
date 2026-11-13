// Resumo: o que as telas novas mostram por cima do fechamento.
//
// Nada aqui calcula divisão. O motor diz quanto cada um deve; o acerto diz
// quem transfere para quem. Este arquivo só junta essas respostas do jeito
// que o Início, o painel do conjunto e os Saldos perguntam:
//
//   · quem é você neste conjunto, e qual é o seu saldo
//   · de que é feita a parte de cada pessoa (aparelhos, uso comum, taxas,
//     despesas avulsas)
//   · o que acontece num dia (vencimento, despesa, registro, lembrete,
//     ausência)
//   · o que aconteceu por último (a atividade)
//
// Tudo é função pura do estado (e do resultado, quando precisa de valor).

import { acertoDe } from "./acerto.js";
import { calcular, datasMarcadas, diasContadosNaFatura, janelaDaFatura, polaridadeDoConjunto } from "./adaptador.js";
import { diasDaJanela, intervalosDe, janelaDoFechamento, ultimoDiaDaJanela } from "./calendario.js";
import { ciclosLigados, unidadeDoRecurso } from "./ciclos.js";
import { MESES, nomeOu, num } from "./formato.js";
import { modoDoConjunto } from "./modos.js";
import { totalDaFatura } from "./traducao/fatura.js";
import { quantidadeNaJanela, registrosDe, temUsoDatado, usosPorJanela } from "./traducao/uso.js";
import { saiDoBolso } from "./acerto.js";
import { foraDaConta } from "./naConta.js";

// ── datas ──────────────────────────────────────────────────────────────────

/** Hoje como "aaaa-mm-dd", no fuso de quem usa. */
export function hojeISO(agora = new Date()) {
  const d = agora;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const curta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");

const DIAS_DA_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIAS_POR_EXTENSO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const dataDe = (iso) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

/** "qua, 4 nov" */
export function diaCurtoPorExtenso(iso) {
  const d = dataDe(iso);
  return `${DIAS_DA_SEMANA[d.getDay()]}, ${d.getDate()} ${MESES_CURTOS[d.getMonth()]}`;
}

/** { semana: "Quarta", resto: "4 de novembro" } */
export function diaPorExtenso(iso) {
  const d = dataDe(iso);
  return { semana: DIAS_POR_EXTENSO[d.getDay()], resto: `${d.getDate()} de ${MESES[d.getMonth()]}` };
}

/** "sáb, 14/11" */
export const diaDaSemanaCurto = (iso) => `${DIAS_DA_SEMANA[dataDe(iso).getDay()]}, ${curta(iso)}`;

/** Diferença em dias inteiros entre duas datas "aaaa-mm-dd". */
export function diasAte(deISO, ateISO) {
  return Math.round((dataDe(ateISO) - dataDe(deISO)) / 86400000);
}

/**
 * Quando, dito como gente fala: "hoje, 10:42", "ontem", "12/10". Recebe um
 * instante ISO completo ou só a data.
 */
export function quandoFoi(iso, hoje = hojeISO()) {
  if (!iso) return "";
  const dia = iso.slice(0, 10);
  const hora = iso.length > 10 ? new Date(iso) : null;
  const relogio =
    hora && !Number.isNaN(hora.getTime())
      ? `${String(hora.getHours()).padStart(2, "0")}:${String(hora.getMinutes()).padStart(2, "0")}`
      : null;
  const diferenca = diasAte(dia, hoje);
  if (diferenca === 0) return relogio ? `hoje, ${relogio}` : "hoje";
  if (diferenca === 1) return "ontem";
  return curta(dia);
}

// ── quem é você ────────────────────────────────────────────────────────────

const normal = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/**
 * Quem é você neste conjunto: o que o conjunto gravou, ou a pessoa com o seu
 * nome do perfil. Conjunto antigo, sem nenhum dos dois, não tem "você".
 */
export function quemSouEu(estado, perfil) {
  const moradores = estado?.moradores ?? [];
  if (estado?.voce && moradores.some((m) => m.id === estado.voce)) return estado.voce;
  const meu = normal(perfil?.nome);
  if (!meu) return null;
  return moradores.find((m) => normal(m.nome) === meu)?.id ?? null;
}

/** O nome de uma pessoa do conjunto, com o "Pessoa 2" de quem ficou sem nome. */
export function nomeDe(estado, id) {
  const i = (estado?.moradores ?? []).findIndex((m) => m.id === id);
  return i < 0 ? "" : nomeOu(estado.moradores[i].nome, i);
}

/** Primeira letra para o avatar. */
export const inicial = (nome) => (String(nome ?? "").trim()[0] ?? "?").toUpperCase();

// ── o fechamento ───────────────────────────────────────────────────────────

/** O período analisado: "18/09 a 24/10 · 37 dias", e o mês dele. */
export function periodoDe(estado) {
  const janela = janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte);
  const dias = diasDaJanela(janela, estado.periodo);
  return {
    de: janela.de,
    ate: ultimoDiaDaJanela(janela),
    dias,
    mes: MESES[(estado.periodo?.mes ?? 1) - 1],
    texto: `${curta(janela.de)} a ${curta(ultimoDiaDaJanela(janela))} · ${dias} ${dias === 1 ? "dia" : "dias"}`,
  };
}

/** A chave de uma transferência do acerto. Muda quando o valor muda. */
export const chaveDaTransferencia = (t) => `${t.de}>${t.para}:${t.centavos}`;

/**
 * Tudo o que uma tela precisa saber do saldo de um conjunto, do ponto de
 * vista de quem usa. Valores em centavos.
 */
export function resumoDoConjunto(estado, { perfil = null, resultado = null } = {}) {
  const r = resultado ?? calcular(estado);
  const acerto = acertoDe(estado, r);
  const eu = quemSouEu(estado, perfil);
  const pagamentos = estado.pagamentos ?? {};

  const transferencias = acerto.precisaCeder
    ? []
    : acerto.transferencias.map((t) => {
        const chave = chaveDaTransferencia(t);
        return { ...t, chave, confirmada: Boolean(pagamentos[chave]), confirmadaEm: pagamentos[chave]?.em ?? null };
      });

  const meu = acerto.saldos.find((s) => s.moradorId === eu) ?? null;
  const minhaParteNoMotor = r.moradores.find((m) => m.moradorId === eu)?.total ?? 0;

  // O que ainda está em aberto para você: as transferências não confirmadas.
  // Antes de existir acerto (falta quem ceda), vale o saldo.
  let aPagar = 0;
  let aReceber = 0;
  if (eu) {
    if (acerto.precisaCeder) {
      if (meu?.saldo < 0) aPagar = -meu.saldo;
      if (meu?.saldo > 0) aReceber = meu.saldo;
    } else {
      for (const t of transferencias) {
        if (t.confirmada) continue;
        if (t.de === eu) aPagar += t.centavos;
        if (t.para === eu) aReceber += t.centavos;
      }
    }
  }

  const total = Math.round(num(r.somaDevida) * 100);
  const todasConfirmadas = transferencias.length > 0 && transferencias.every((t) => t.confirmada);
  const modo = modoDoConjunto(estado);

  let situacao = "em dia";
  if (!eu) situacao = "sem você";
  else if (aPagar > 0) situacao = "a pagar";
  else if (aReceber > 0) situacao = modo.faturas === false ? "previsto" : "a receber";
  else if (todasConfirmadas) situacao = modo.faturas === false ? "encerrado" : "em dia";

  return {
    eu,
    total,
    saldo: meu ? meu.saldo : null,
    aberto: aReceber - aPagar,
    aPagar,
    aReceber,
    minhaParte: Math.round(minhaParteNoMotor * 100),
    euPaguei: meu?.pagou ?? 0,
    situacao,
    transferencias,
    acerto,
    resultado: r,
  };
}

// ── de que é feita a parte de cada um ──────────────────────────────────────

export const CATEGORIAS_DA_PARTE = [
  { chave: "aparelhos", nome: "Aparelhos" },
  { chave: "comum", nome: "Uso comum" },
  { chave: "taxas", nome: "Taxas" },
  { chave: "avulsas", nome: "Despesas avulsas" },
];

/** Em que categoria um item calculado cai. */
export function categoriaDoItem(item) {
  if (item.automatico && String(item.id).startsWith("__taxa_")) return "taxas";
  if (item.automatico) return "comum";
  if (item.origem === "reais") return "avulsas";
  return "aparelhos";
}

/** Para cada pessoa: quanto da parte dela vem de cada categoria (em reais). */
export function composicaoPorPessoa(resultado) {
  const porPessoa = {};
  for (const m of resultado.moradores) {
    porPessoa[m.moradorId] = { aparelhos: 0, comum: 0, taxas: 0, avulsas: 0, total: m.total };
  }
  for (const item of resultado.itens) {
    const cat = categoriaDoItem(item);
    for (const f of item.fatias) {
      if (porPessoa[f.moradorId]) porPessoa[f.moradorId][cat] += f.total;
    }
  }
  return porPessoa;
}

/** O que cada pessoa adiantou, pelo nome das despesas: "luz e faxina". */
export function oQueCadaUmPagou(estado, resultado) {
  const acerto = acertoDe(estado, resultado);
  const nomes = {};
  for (const d of acerto.centralizadas) {
    const curto = d.tipo === "fatura" ? d.nome.replace(/^Conta d[aoe]s?\s*/i, "").toLowerCase() : d.nome.toLowerCase();
    (nomes[d.pagoPor] ??= []).push(curto);
  }
  return Object.fromEntries(Object.entries(nomes).map(([id, l]) => [id, listaEmFrase(l)]));
}

/** ["luz", "água", "faxina"] → "luz, água e faxina" */
export function listaEmFrase(lista) {
  const l = lista.filter(Boolean);
  if (l.length <= 1) return l.join("");
  return `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}

// ── despesas ───────────────────────────────────────────────────────────────

/** As despesas cíclicas (faturas ligadas), com o que a tela mostra delas. */
export function despesasCiclicas(estado, resultado) {
  return ciclosLigados(estado).map((c) => {
    const calculado = resultado?.ciclos?.find((x) => x.id === c.id);
    const janela = janelaDaFatura(c, estado.periodo);
    const quantidade = (c.linhas ?? [])
      .filter((l) => l.comportamento === "consumo")
      .reduce((s, l) => s + num(l.quantidade), 0);
    return {
      ciclo: c,
      id: c.id,
      nome: c.nome || "Conta",
      valor: totalDaFatura(c),
      consumo: { de: janela.de, ate: ultimoDiaDaJanela(janela) },
      vencimento: c.vencimento ?? null,
      pagoPor: c.pagoPor ?? null,
      pagoEm: c.pagoEm ?? null,
      quantidade,
      unidade: unidadeDoRecurso(c.recurso),
      componentes: (c.linhas ?? []).length,
      tarifa: calculado?.tarifa ?? 0,
    };
  });
}

/** O valor que a pessoa escreveu numa despesa avulsa, sem passar pelo motor. */
export function valorDeclarado(item) {
  if (item.especie === "reais") return num(item.valor);
  if (item.especie === "porUso" && item.origemUso === "reais") {
    const usos = num(item.usos) || Object.values(item.usosPorPessoa ?? {}).reduce((s, v) => s + num(v), 0);
    return num(item.valorPorUso) * usos;
  }
  return 0;
}

/** As despesas avulsas: tudo o que sai do bolso, sem passar por fatura. */
export function despesasAvulsas(estado, resultado) {
  return (estado.itens ?? [])
    .filter(saiDoBolso)
    .map((i) => ({
      item: i,
      id: i.id,
      nome: i.nome?.trim() || "Despesa sem nome",
      // Fora da conta, o item não passa pelo motor: vale o que foi escrito.
      valor: resultado?.itens?.find((x) => x.id === i.id)?.custoTotal ?? valorDeclarado(i),
      pagoPor: i.pagoPor ?? null,
      data: i.data ?? null,
      criadoEm: i.criadoEm ?? null,
    }));
}

/** O nome curto de cada divisão, na ordem em que a tela as oferece. */
export const NOME_DA_REGRA = {
  igual: "igual",
  porcentagem: "%",
  valor: "valor",
  cotas: "cotas",
  ajuste: "ajuste",
  dias: "dias",
  horas: "horas",
  presenca: "presença",
  uso: "uso",
};

export const nomeDaRegra = (regra) => NOME_DA_REGRA[regra] ?? regra ?? "";

// ── os dias ────────────────────────────────────────────────────────────────

/**
 * Como cada pessoa aparece na lista de membros: "em casa: luz 30/30 · água
 * 30/30" ou "fora de 05 a 10/10 · luz 24/30".
 */
export function linhaDoMembro(estado, morador) {
  const modo = modoDoConjunto(estado);
  const polaridade = polaridadeDoConjunto(estado);
  if (polaridade === "nenhuma") return "";

  const ligados = ciclosLigados(estado);
  const contas = ligados.map((c) => {
    const janela = janelaDaFatura(c, estado.periodo);
    const conta = (c.nome || "conta").toLowerCase();
    return `${conta} ${diasContadosNaFatura(morador, c, estado.periodo, polaridade)}/${diasDaJanela(janela, estado.periodo)}`;
  });

  const marcados = datasMarcadas(morador, polaridade);
  const trechos = intervalosDe(marcados).map(({ de, ate }) =>
    de === ate ? curta(de) : de.slice(5, 7) === ate.slice(5, 7) ? `${de.slice(8, 10)} a ${curta(ate)}` : `${curta(de)} a ${curta(ate)}`,
  );

  if (polaridade === "presenca") {
    const cabeca = trechos.length ? `esteve ${trechos.join(", ")}` : `nenhum dia marcado ${modo.palavras.noLugar}`;
    return [cabeca, ...contas].join(" · ");
  }
  const cabeca = trechos.length ? `fora de ${trechos.join(", ")}` : "em casa";
  return trechos.length ? [cabeca, ...contas].join(" · ") : `${cabeca}${contas.length ? `: ${contas.join(" · ")}` : ""}`;
}

/**
 * O que acontece num dia, de todas as naturezas. É o que o calendário marca
 * e o que o Início lista em "Hoje".
 */
export function eventosDoDia(estado, dia) {
  const eventos = [];
  const polaridade = polaridadeDoConjunto(estado);

  for (const c of ciclosLigados(estado)) {
    if (c.vencimento === dia) {
      eventos.push({
        tipo: "vencimento",
        id: `v-${c.id}`,
        ciclo: c.id,
        titulo: `${c.nome || "Conta"} vence`,
        valor: totalDaFatura(c),
        pagoPor: c.pagoPor ?? null,
        pagoEm: c.pagoEm ?? null,
      });
    }
  }

  for (const i of estado.itens ?? []) {
    if (saiDoBolso(i) && i.data && (i.data === dia || (i.ate && i.data <= dia && dia <= i.ate))) {
      eventos.push({ tipo: "despesa", id: `d-${i.id}`, item: i.id, titulo: i.nome?.trim() || "Despesa", valor: num(i.valor), pagoPor: i.pagoPor ?? null });
    }
    for (const r of registrosDe(i)) {
      if (r.data === dia) {
        eventos.push({ tipo: "registro", id: `r-${r.id}`, item: i.id, registro: r.id, titulo: i.nome?.trim() || "Uso", quantidade: num(r.quantidade) || 1, participantes: r.participantes ?? [] });
      }
    }
  }

  for (const l of estado.lembretes ?? []) {
    if (l.data === dia) eventos.push({ tipo: "lembrete", id: `l-${l.id}`, lembrete: l.id, titulo: l.titulo || l.texto || "Lembrete" });
  }

  if (polaridade !== "nenhuma") {
    for (const m of estado.moradores ?? []) {
      const marcados = datasMarcadas(m, polaridade);
      const marcou = marcados.includes(dia);
      if (polaridade === "ausencia" ? marcou : false) {
        eventos.push({ tipo: "ausencia", id: `a-${m.id}`, morador: m.id, titulo: `${nomeDe(estado, m.id)} fora` });
      }
    }
  }

  return eventos;
}

/** Quais naturezas um dia tem, para as marquinhas do calendário. */
export function marcasDoDia(estado, dia) {
  const tipos = new Set(eventosDoDia(estado, dia).map((e) => e.tipo));
  return {
    despesa: tipos.has("vencimento") || tipos.has("despesa"),
    ausencia: tipos.has("ausencia"),
    registro: tipos.has("registro"),
    lembrete: tipos.has("lembrete"),
  };
}

/** O vencimento mais próximo de hoje (o de hoje primeiro, depois os seguintes). */
export function proximoVencimento(estado, hoje = hojeISO()) {
  const futuros = ciclosLigados(estado)
    .filter((c) => c.vencimento && c.vencimento >= hoje)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const c = futuros[0];
  if (!c) return null;
  return { ciclo: c, dias: diasAte(hoje, c.vencimento), valor: totalDaFatura(c), pagoPor: c.pagoPor ?? null, pagoEm: c.pagoEm ?? null };
}

/**
 * As contas atrasadas: passou do vencimento e ninguém marcou como paga.
 * Da mais atrasada para a menos.
 */
export function atrasosDe(estado, hoje = hojeISO()) {
  if (modoDoConjunto(estado).faturas === false) return [];
  return ciclosLigados(estado)
    .filter((c) => c.vencimento && c.vencimento < hoje && !c.pagoPor)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .map((c) => ({ ciclo: c, dias: diasAte(c.vencimento, hoje), valor: totalDaFatura(c) }));
}

// ── a atividade ────────────────────────────────────────────────────────────

/**
 * O que aconteceu no conjunto, do mais recente para o mais antigo. Só entra o
 * que tem data gravada: despesas lançadas, contas marcadas como pagas, Pix
 * confirmados, registros de uso e lembretes.
 */
export function atividadeDe(estado, { resultado = null } = {}) {
  const lista = [];
  const nome = (id) => nomeDe(estado, id);
  // Neste navegador, quem lança é quem usa: você (ou, sem você, "alguém").
  const quemLancou = estado.voce ? nome(estado.voce) : "Alguém";

  for (const i of estado.itens ?? []) {
    if (!i.criadoEm) continue;
    const titulo = i.nome?.trim() || "Despesa";
    const valor = resultado?.itens?.find((x) => x.id === i.id)?.custoTotal ?? num(i.valor);
    lista.push({
      quando: i.criadoEm,
      tipo: "despesa",
      texto: i.pagoPor ? `${nome(i.pagoPor)} pagou ${titulo}` : `${quemLancou} lançou ${titulo}`,
      titulo,
      valor,
      quem: i.pagoPor ?? null,
      regra: nomeDaRegra(i.rateio),
      participantes: (i.participantes ?? []).length,
    });
  }

  for (const c of ciclosLigados(estado)) {
    if (c.pagoEm && c.pagoPor) {
      lista.push({
        quando: c.pagoEm,
        tipo: "pagamento",
        texto: `${nome(c.pagoPor)} marcou ${artigoDe(c)} ${(c.nome || "conta").toLowerCase()} como paga`,
        titulo: c.nome,
        valor: totalDaFatura(c),
        quem: c.pagoPor,
      });
    }
  }

  for (const [chave, p] of Object.entries(estado.pagamentos ?? {})) {
    const [par, centavos] = chave.split(":");
    const [de, para] = par.split(">");
    if (!p?.em) continue;
    lista.push({
      quando: p.em,
      tipo: "pix",
      texto: `${nome(para) || "Alguém"} confirmou o Pix de ${nome(de) || "alguém"}`,
      valor: Number(centavos) / 100,
      quem: para,
    });
  }

  for (const l of estado.lembretes ?? []) {
    if (!l.criadoEm) continue;
    const sobre = l.tipo === "lista" ? l.titulo : l.texto;
    const curtoDe = (t) => (t.length > 32 ? `${t.slice(0, 30).trim()}…` : t);
    lista.push({
      quando: l.criadoEm,
      tipo: "lembrete",
      titulo: sobre,
      texto: `${l.autor ? `${nome(l.autor)} criou ${l.tipo === "lista" ? "a lista" : "a nota"}` : l.tipo === "lista" ? "Lista criada" : "Nota criada"}${sobre ? ` “${curtoDe(sobre)}”` : ""}`,
      quem: l.autor,
    });
  }

  return lista.sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
}

function artigoDe(ciclo) {
  const n = normal(ciclo.nome);
  if (["agua", "luz", "energia", "internet", "conta"].includes(n) || n.endsWith("a")) return "a";
  return "o";
}

// ── os ciclos ao longo dos meses ───────────────────────────────────────────

/**
 * Os valores de cada ciclo nos fechamentos guardados mais o atual: o gráfico
 * "Os ciclos". Até seis fechamentos.
 */
export function historicoDosCiclos(estado, maximo = 6) {
  const atual = {
    mes: estado.periodo.mes,
    ano: estado.periodo.ano,
    valores: Object.fromEntries(ciclosLigados(estado).map((c) => [c.id, totalDaFatura(c)])),
    atual: true,
  };
  return [...(estado.historicoDeCiclos ?? []), atual].slice(-maximo).map((h) => ({
    ...h,
    rotulo: MESES_CURTOS[(h.mes ?? 1) - 1].toUpperCase(),
  }));
}

// ── um ciclo por dentro ────────────────────────────────────────────────────

/**
 * Do que uma despesa cíclica é feita: os itens que tiram dela, o uso comum e
 * as taxas, cada um com o total e a fatia de cada pessoa.
 */
export function composicaoDoCiclo(estado, resultado, idDoCiclo) {
  const pecas = [];
  for (const item of resultado.itens) {
    const doCiclo =
      (item.automatico && (item.id === `__${idDoCiclo}` || String(item.id).startsWith(`__taxa_${idDoCiclo}_`))) ||
      (!item.automatico && item.origem === idDoCiclo);
    if (!doCiclo) continue;
    pecas.push({ ...item, categoria: categoriaDoItem(item) });
  }
  // A parte de cada um nesta conta vem pronta do motor (`porCiclo`). Uso
  // comum e taxas saem das peças automáticas; o resto são os aparelhos   inclusive
  // os que puxam de mais de uma conta, que não têm peça própria aqui.
  const porPessoa = {};
  for (const m of resultado.moradores) {
    const total = m.porCiclo?.[idDoCiclo] ?? 0;
    let comum = 0;
    let taxas = 0;
    for (const p of pecas) {
      const f = p.fatias.find((x) => x.moradorId === m.moradorId);
      if (!f) continue;
      if (p.categoria === "comum") comum += f.total;
      if (p.categoria === "taxas") taxas += f.total;
    }
    porPessoa[m.moradorId] = { aparelhos: total - comum - taxas, comum, taxas, total };
  }
  const calculado = resultado.ciclos.find((c) => c.id === idDoCiclo) ?? null;
  const explicado = pecas.reduce((s, p) => s + p.custoTotal, 0);
  const valor = calculado?.valor ?? 0;
  // Aparelho que puxa de mais de uma conta (o chuveiro: luz e água). O motor
  // não separa a parte de cada conta num item assim; aqui ela é estimada pela
  // quantidade que ele declara em cada ciclo, e ajustada para fechar com o
  // que sobrou da fatura.
  const misto = valor - explicado > 0.005 ? valor - explicado : 0;
  const mistos = [];
  if (misto > 0) {
    const ciclo = (estado.ciclos ?? []).find((c) => c.id === idDoCiclo);
    const janela = ciclo ? janelaDaFatura(ciclo, estado.periodo) : null;
    for (const item of resultado.itens) {
      if (item.automatico || item.origem !== "mista") continue;
      const i = (estado.itens ?? []).find((x) => x.id === item.id);
      if (!i) continue;
      let quantidade = 0;
      let usos = 0;
      if (i.especie === "porUso") {
        usos = janela ? Object.values(usosPorJanela(i, janela)).reduce((s, v) => s + v, 0) : 0;
        quantidade = num(i.porUsoPorCiclo?.[idDoCiclo]) * usos;
      } else if (i.especie === "porHora") {
        const horas = temUsoDatado(i) && janela ? quantidadeNaJanela(i, janela) : num(i.horas);
        quantidade = num(i.porHoraPorCiclo?.[idDoCiclo]) * horas;
      } else {
        quantidade = num(i.consumoPorCiclo?.[idDoCiclo]);
      }
      if (quantidade > 0) mistos.push({ id: item.id, nome: item.nome, quantidade, usos, porUso: num(i.porUsoPorCiclo?.[idDoCiclo]), especie: i.especie });
    }
    const soma = mistos.reduce((s, m) => s + m.quantidade, 0);
    for (const m of mistos) m.custo = soma > 0 ? (m.quantidade / soma) * misto : 0;
  }
  return { pecas, porPessoa, calculado, misto, mistos };
}

// ── todas as despesas, para Ver despesas ───────────────────────────────────

/** Este item conta horas (o ar, a lancha) em vez de usos? */
export const medeHoras = (item) =>
  item.especie === "porHora" || (Boolean(item.equipamento) && (item.medida === "hora" || item.rateio === "horas"));

const PALAVRA_DO_USO = (item, n) => {
  const q = num(n) || 1;
  const [um, varios] = medeHoras(item)
    ? ["hora", "horas"]
    : item.modelo === "maquina"
      ? ["lavagem", "lavagens"]
      : ["uso", "usos"];
  return `${String(q).replace(".", ",")} ${q === 1 ? um : varios}`;
};

/**
 * Tudo o que custa, numa lista só e do mais recente para o mais antigo:
 * avulsas (do bolso), cíclicas (as faturas) e registradas (os usos de
 * aparelho, valorados pelo preço do kWh ou do m³ do ciclo). Avulsa vem antes
 * de cíclica quando a data empata, na ordem alfabética.
 */
export function todasAsDespesas(estado, resultado, hoje = hojeISO()) {
  const lista = [];
  const nome = (id) => nomeDe(estado, id);
  const fora = foraDaConta(estado);

  for (const d of despesasAvulsas(estado, resultado)) {
    const quem = d.pagoPor ? `${nome(d.pagoPor)} pagou` : "ninguém pagou ainda";
    lista.push({
      tipo: "avulsa",
      id: d.id,
      nome: d.nome,
      detalhe: `${quem} · ${nomeDaRegra(d.item.rateio)}`,
      valor: d.valor,
      quando: d.criadoEm ?? d.data ?? "",
      dia: (d.data ?? d.criadoEm ?? "").slice(0, 10) || null,
      pagoPor: d.pagoPor,
      vencimento: null,
      status: statusDaDespesa(d, hoje),
      naConta: !fora.itens.has(d.id),
      equipamento: Boolean(d.item.equipamento),
    });
  }

  if (modoDoConjunto(estado).faturas !== false) {
    for (const d of despesasCiclicas(estado, resultado)) {
      // Fatura que ninguém preencheu nem pagou ainda não foi lançada.
      if (!(d.valor > 0) && !d.pagoPor) continue;
      const quando = d.pagoEm ?? d.vencimento ?? d.consumo.ate;
      lista.push({
        tipo: "ciclica",
        id: d.id,
        nome: d.nome,
        detalhe: `${curta(d.consumo.de)}–${curta(d.consumo.ate)} · ${d.pagoPor ? `${nome(d.pagoPor)} pagou` : d.vencimento ? `vence ${curta(d.vencimento)}` : "sem pagador"}`,
        valor: d.valor,
        quando: quando ?? "",
        dia: (quando ?? "").slice(0, 10) || null,
        pagoPor: d.pagoPor,
        vencimento: d.vencimento,
        status: statusDaDespesa(d, hoje),
        naConta: !fora.ciclos.has(d.id),
      });
    }
  }

  const tarifas = Object.fromEntries((resultado?.ciclos ?? []).map((c) => [c.id, c.tarifa ?? 0]));
  for (const item of estado.itens ?? []) {
    // Os equipamentos da Multi valem em reais: o preço da hora (ou do uso).
    const equipamento = Boolean(item.equipamento) && item.especie === "porUso" && item.origemUso === "reais";
    const tabela = item.especie === "porHora" ? item.porHoraPorCiclo : item.especie === "porUso" && item.origemUso !== "reais" ? item.porUsoPorCiclo : null;
    if (!tabela && !equipamento) continue;
    for (const r of registrosDe(item)) {
      if (!r.data) continue;
      const vezes = num(r.quantidade) || 1;
      const valor = equipamento
        ? num(item.valorPorUso) * vezes
        : Object.entries(tabela).reduce((s, [ciclo, porVez]) => s + num(porVez) * vezes * (tarifas[ciclo] ?? 0), 0);
      lista.push({
        tipo: "registrada",
        id: `${item.id}:${r.id}`,
        item: item.id,
        nome: item.nome?.trim() || "Aparelho",
        detalhe: `${listaEmFrase((r.participantes ?? []).map(nome))} · ${PALAVRA_DO_USO(item, r.quantidade)} · ${curta(r.data)}`,
        valor,
        quando: r.data,
        dia: r.data,
      });
    }
  }

  const ordem = { avulsa: 0, ciclica: 1, registrada: 2 };
  return lista.sort((a, b) => String(b.quando).localeCompare(String(a.quando)) || ordem[a.tipo] - ordem[b.tipo]);
}

// ── o status de uma despesa ────────────────────────────────────────────────

/** Os quatro status, na ordem em que pedem atenção. */
export const STATUS_DA_DESPESA = {
  atrasada: { rotulo: "atrasada", tom: "vermelho" },
  avencer: { rotulo: "a vencer", tom: "ouro" },
  aberta: { rotulo: "aberta", tom: "neutro" },
  paga: { rotulo: "paga", tom: "agua" },
};

/**
 * Paga, se alguém pagou. Sem pagamento: atrasada, se passou do vencimento;
 * a vencer, se faltam até 3 dias; aberta, no resto (e sempre, se não tem
 * vencimento).
 */
export function statusDaDespesa({ pagoPor, vencimento }, hoje = hojeISO()) {
  if (pagoPor) return "paga";
  if (vencimento) {
    const dias = diasAte(hoje, vencimento);
    if (dias < 0) return "atrasada";
    if (dias <= 3) return "avencer";
  }
  return "aberta";
}

/**
 * O balanço das despesas que estão na conta: quanto ainda está em aberto
 * (aberta, a vencer, atrasada) e quanto já foi pago. Em reais.
 */
export function balancoDasDespesas(estado, resultado, hoje = hojeISO()) {
  let aberto = 0;
  let pago = 0;
  for (const d of todasAsDespesas(estado, resultado, hoje)) {
    if (d.tipo === "registrada" || !d.naConta) continue;
    if (d.status === "paga") pago += d.valor;
    else aberto += d.valor;
  }
  return { aberto, pago };
}
