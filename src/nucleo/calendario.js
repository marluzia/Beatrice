// Calendário: datas, janelas e os ciclos de leitura.
//
// Uma janela é um intervalo [de, ate): `ate` é a leitura que fecha o ciclo e
// abre o seguinte, e por isso o dia dela não é contado aqui.
//
// As funções que olham os ciclos recebem a LISTA de ciclos do conjunto
// (`estado.ciclos`). Só os ligados contam.

import { doCiclo } from "./ciclos.js";

const doisDigitos = (n) => String(n).padStart(2, "0");

export const diaISO = (ano, mes, dia) => `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;

export function partesDoDia(iso) {
  if (typeof iso !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasDoMes(mes, ano)) return null;
  return { ano, mes, dia };
}

export const diasDoMes = (mes, ano) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

export const diaDaSemanaInicial = (mes, ano) => new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();

export function distanciaEmDias(deISO, ateISO) {
  const a = partesDoDia(deISO);
  const b = partesDoDia(ateISO);
  if (!a || !b) return 0;
  const ms = Date.UTC(b.ano, b.mes - 1, b.dia) - Date.UTC(a.ano, a.mes - 1, a.dia);
  return Math.round(ms / 86400000);
}

export function somarDias(iso, quantos) {
  const p = partesDoDia(iso);
  if (!p) return iso;
  const d = new Date(Date.UTC(p.ano, p.mes - 1, p.dia + quantos));
  return diaISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export const mesSeguinte = ({ mes, ano }) => (mes === 12 ? { mes: 1, ano: ano + 1 } : { mes: mes + 1, ano });

export const mesAnterior = ({ mes, ano }) => (mes === 1 ? { mes: 12, ano: ano - 1 } : { mes: mes - 1, ano });

export function janelaDoMes(periodo) {
  const proximo = mesSeguinte(periodo);
  return {
    de: diaISO(periodo.ano, periodo.mes, 1),
    ate: diaISO(proximo.ano, proximo.mes, 1),
  };
}

export function janelaValida(janela) {
  if (!janela) return false;
  if (!partesDoDia(janela.de) || !partesDoDia(janela.ate)) return false;
  return janela.de < janela.ate;
}

export function diasDaJanela(janela, periodo) {
  if (!janelaValida(janela)) return periodo ? diasDoMes(periodo.mes, periodo.ano) : 0;
  return distanciaEmDias(janela.de, janela.ate);
}

export const faturaAtiva = (fatura) => Boolean(fatura) && fatura.ativa !== false;

export const LIMITES_DO_CICLO = { minimo: 20, maximo: 45 };

export const ANO_MINIMO = 2020;

export const anoMaximo = (hoje = new Date()) => hoje.getFullYear() + 1;

export function dataPlausivel(iso, hoje) {
  const p = partesDoDia(iso);
  if (!p) return false;
  return p.ano >= ANO_MINIMO && p.ano <= anoMaximo(hoje);
}

export function cicloValido(janela, hoje) {
  if (!janelaValida(janela)) return false;
  if (!dataPlausivel(janela.de, hoje) || !dataPlausivel(janela.ate, hoje)) return false;
  const dias = distanciaEmDias(janela.de, janela.ate);
  return dias >= LIMITES_DO_CICLO.minimo && dias <= LIMITES_DO_CICLO.maximo;
}

export function faturaPronta(fatura, hoje) {
  if (!faturaAtiva(fatura)) return true;
  const janela = fatura?.janela;
  const temDe = Boolean(janela?.de);
  const temAte = Boolean(janela?.ate);
  if (!temDe && !temAte) return true;
  return cicloValido(janela, hoje);
}

export function faltaNaFatura(ciclo, hoje) {
  if (faturaPronta(ciclo, hoje)) return null;

  const de = doCiclo(ciclo);
  const janela = ciclo?.janela ?? {};
  if (!janela.de || !janela.ate) {
    return `Falta a data ${janela.de ? "final" : "inicial"} do ciclo ${de}.`;
  }
  if (janela.de >= janela.ate) {
    return `No ciclo ${de}, a leitura final precisa vir depois da inicial.`;
  }
  if (!dataPlausivel(janela.de, hoje) || !dataPlausivel(janela.ate, hoje)) {
    return `As datas ${de} precisam ser de ${ANO_MINIMO} até ${anoMaximo(hoje)}.`;
  }

  const dias = distanciaEmDias(janela.de, janela.ate);
  return `O ciclo ${de} deu ${dias} dias. Uma leitura de fatura fica entre ${LIMITES_DO_CICLO.minimo} e ${LIMITES_DO_CICLO.maximo}.`;
}

/** Os ciclos de uma lista que estão ligados. */
export const ciclosAtivos = (ciclos) => (Array.isArray(ciclos) ? ciclos : []).filter(faturaAtiva);

export function faltasDoFechamento(ciclos, hoje) {
  return ciclosAtivos(ciclos)
    .map((c) => faltaNaFatura(c, hoje))
    .filter(Boolean);
}

export const fechamentoPronto = (ciclos, hoje) => faltasDoFechamento(ciclos, hoje).length === 0;

export const janelaPreenchida = (janela) => Boolean(janela?.de) && Boolean(janela?.ate);

export function dentroDaJanela(iso, janela) {
  if (!janelaValida(janela) || !partesDoDia(iso)) return false;
  return iso >= janela.de && iso < janela.ate;
}

export function diasNaJanela(dias, janela) {
  if (!Array.isArray(dias)) return 0;
  const vistos = new Set();
  for (const dia of dias) {
    if (!vistos.has(dia) && dentroDaJanela(dia, janela)) vistos.add(dia);
  }
  return vistos.size;
}

export function diasEntre(deISO, ateISO) {
  if (!partesDoDia(deISO) || !partesDoDia(ateISO)) return [];
  if (ateISO < deISO) return diasEntre(ateISO, deISO);

  const quantos = Math.min(90, distanciaEmDias(deISO, ateISO));
  return Array.from({ length: quantos + 1 }, (_, i) => somarDias(deISO, i));
}

export function intervalosDe(dias) {
  const limpos = [...new Set((dias ?? []).filter((d) => partesDoDia(d)))].sort();
  const trechos = [];

  for (const dia of limpos) {
    const ultimo = trechos[trechos.length - 1];
    if (ultimo && somarDias(ultimo.ate, 1) === dia) ultimo.ate = dia;
    else trechos.push({ de: dia, ate: dia });
  }

  return trechos;
}

export const fimDoMes = ({ mes, ano }) => diaISO(ano, mes, diasDoMes(mes, ano));

export function semanasDoMes(mes, ano) {
  const total = diasDoMes(mes, ano);
  const celulas = Array.from({ length: diaDaSemanaInicial(mes, ano) }, () => null);

  for (let dia = 1; dia <= total; dia++) celulas.push(diaISO(ano, mes, dia));
  while (celulas.length % 7 !== 0) celulas.push(null);

  const semanas = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
  return semanas;
}

export const NOMES_CURTOS_DOS_DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function mesPredominante(janela) {
  if (!cicloValido(janela)) return null;

  const dias = {};
  const total = distanciaEmDias(janela.de, janela.ate);

  for (let i = 0; i < total; i++) {
    const p = partesDoDia(somarDias(janela.de, i));
    if (!p) continue;
    const chave = `${p.ano}-${p.mes}`;
    dias[chave] = (dias[chave] ?? 0) + 1;
  }

  const vencedor = Object.entries(dias).sort((a, b) => b[1] - a[1])[0];
  if (!vencedor) return null;

  const [ano, mes] = vencedor[0].split("-").map(Number);
  return { mes, ano };
}

/**
 * O mês de referência, lido dos ciclos: o mês em que caiu a maior parte do
 * primeiro ciclo ligado que tem datas. Sem nenhum, fica o que já estava.
 */
export function periodoDasFaturas(ciclos, padrao) {
  for (const c of ciclosAtivos(ciclos)) {
    const mes = mesPredominante(c.janela);
    if (mes) return mes;
  }
  return padrao;
}

// ── o corte ────────────────────────────────────────────────────────────────
//
// O corte é o dia do mês em que o período fecha, como a data de fechamento do
// cartão de crédito. Com corte no dia 22, o período de agosto vai de 23/07 a
// 22/08, e o de setembro começa no dia seguinte: períodos seguidos encostam
// um no outro, sem buraco e sem sobreposição. Mês que não tem o dia (corte
// 31 em fevereiro) usa o último dia dele.

export const LIMITE_DO_PERIODO = 40;

/**
 * O corte é válido? Ele pode ser o PERÍODO DE CORTE escolhido pelo grupo   uma
 * janela `{ de, ate }`, com `ate` sendo o dia seguinte ao último   ou, em
 * conjuntos da v11, um dia do mês de 1 a 31.
 */
export const corteValido = (corte) =>
  (Number.isInteger(corte) && corte >= 1 && corte <= 31) ||
  (Boolean(corte) && typeof corte === "object" && janelaValida(corte));

/** O corte é um período escolhido (e não um dia do mês)? */
export const corteEhPeriodo = (corte) => Boolean(corte) && typeof corte === "object" && janelaValida(corte);

const diaDoCorteNoMes = ({ mes, ano }, corte) => diaISO(ano, mes, Math.min(corte, diasDoMes(mes, ano)));

/** A janela do período que fecha no corte deste mês de referência. */
export function janelaDoCorte(periodo, corte) {
  if (corteEhPeriodo(corte)) return { de: corte.de, ate: corte.ate };
  if (!corteValido(corte)) return janelaDoMes(periodo);
  return {
    de: somarDias(diaDoCorteNoMes(mesAnterior(periodo), corte), 1),
    ate: somarDias(diaDoCorteNoMes(periodo, corte), 1),
  };
}

/**
 * A janela do fechamento.
 *
 *  · com corte  → o período de corte escolhido (ou, num conjunto antigo,
 *                 do dia seguinte ao corte anterior até o corte deste mês);
 *  · sem corte  → do começo do ciclo que começa primeiro ao fim do que
 *                 termina por último, entre os ciclos ligados com datas;
 *  · sem nada   → o mês de referência.
 */
export function janelaDoFechamento(ciclos, periodo, corte = null) {
  if (corteValido(corte)) return janelaDoCorte(periodo, corte);
  const janelas = ciclosAtivos(ciclos)
    .map((c) => c.janela)
    .filter((j) => cicloValido(j));
  if (janelas.length === 0) return janelaDoMes(periodo);
  return {
    de: janelas.map((j) => j.de).sort()[0],
    ate: janelas.map((j) => j.ate).sort().pop(),
  };
}

/** Até quantos dias antes do primeiro ciclo, e depois do último, o corte pode ir. */
export const FOLGA_DO_CORTE = 30;

/**
 * Até onde o período de corte pode ir: o início, até 30 dias antes do começo
 * do ciclo que começa primeiro; o fim, até 30 dias depois do fim do ciclo que
 * termina por último. Sem ciclo ligado com datas, a referência é o mês.
 * `ate` é exclusivo, como em toda janela.
 */
export function limitesDoCorte(ciclos, periodo) {
  const base = janelaDoFechamento(ciclos, periodo, null);
  return { de: somarDias(base.de, -FOLGA_DO_CORTE), ate: somarDias(base.ate, FOLGA_DO_CORTE) };
}

/**
 * Um período de corte trazido para dentro dos limites: o início não vai antes
 * do primeiro dia permitido, nem o fim depois do último. Devolve null se, depois
 * de ajustado, não sobrar pelo menos um dia.
 */
export function corteNosLimites(janela, limites) {
  if (!janelaValida(janela)) return null;
  const de = janela.de < limites.de ? limites.de : janela.de;
  const ate = janela.ate > limites.ate ? limites.ate : janela.ate;
  return de < ate ? { de, ate } : null;
}

/** O mês em que caiu a maior parte de uma janela qualquer (sem limite de tamanho). */
export function mesDaMaiorParte(janela) {
  if (!janelaValida(janela)) return null;
  const dias = {};
  const total = distanciaEmDias(janela.de, janela.ate);
  for (let i = 0; i < total; i++) {
    const p = partesDoDia(somarDias(janela.de, i));
    const chave = `${p.ano}-${p.mes}`;
    dias[chave] = (dias[chave] ?? 0) + 1;
  }
  const [vencedor] = Object.entries(dias).sort((a, b) => b[1] - a[1]);
  if (!vencedor) return null;
  const [ano, mes] = vencedor[0].split("-").map(Number);
  return { mes, ano };
}

const janelasValidas = (ciclos) =>
  ciclosAtivos(ciclos)
    .map((c) => c.janela)
    .filter((j) => cicloValido(j));

/**
 * Da data mais cedo à mais tarde que algum ciclo ligado cobre   e o período
 * do corte, quando há corte. É onde faz sentido marcar presença e usos.
 */
export function janelaTotal(ciclos, periodo, corte = null) {
  const janelas = janelasValidas(ciclos);
  if (corteValido(corte)) janelas.push(janelaDoCorte(periodo, corte));
  if (janelas.length === 0) return janelaDoMes(periodo);

  return {
    de: janelas.map((j) => j.de).sort()[0],
    ate: janelas.map((j) => j.ate).sort().pop(),
  };
}

export const ultimoDiaDaJanela = (janela) => somarDias(janela.ate, -1);

export const mesDoDia = (iso) => (iso ?? "").slice(0, 7);

export const chaveDoMes = ({ mes, ano }) => `${ano}-${String(mes).padStart(2, "0")}`;

/** O trecho que todos os ciclos ligados cobrem ao mesmo tempo, ou null se não há um. */
export function janelaComum(ciclos, periodo) {
  const janelas = janelasValidas(ciclos);
  if (janelas.length < 2) return janelaTotal(ciclos, periodo);

  const de = janelas.map((j) => j.de).sort().pop();
  const ate = janelas.map((j) => j.ate).sort()[0];
  return de < ate ? { de, ate } : null;
}

/** Quantos dias são cobertos por algum ciclo, mas não por todos. */
export function diasSemSobreposicao(ciclos, periodo) {
  const total = janelaTotal(ciclos, periodo);
  const comum = janelaComum(ciclos, periodo);
  return diasDaJanela(total, periodo) - (comum ? diasDaJanela(comum, periodo) : 0);
}

export function temCicloInvalido(ciclos) {
  return ciclosAtivos(ciclos).some((c) => janelaPreenchida(c.janela) && !cicloValido(c.janela));
}

/**
 * Os ciclos ligados cuja leitura final cai fora do período do corte. Um ciclo
 * entra no período em que termina; se termina depois do corte, ele é do
 * período seguinte, e se termina antes do começo, do anterior.
 */
export function ciclosForaDoCorte(ciclos, periodo, corte) {
  if (!corteValido(corte)) return [];
  const janela = janelaDoCorte(periodo, corte);
  const ultimoDia = ultimoDiaDaJanela(janela);

  return ciclosAtivos(ciclos)
    .filter((c) => cicloValido(c.janela))
    .map((c) => {
      const fim = ultimoDiaDaJanela(c.janela);
      if (fim > ultimoDia) return { ciclo: c, fim, quando: "seguinte" };
      if (fim < janela.de) return { ciclo: c, fim, quando: "anterior" };
      return null;
    })
    .filter(Boolean);
}
