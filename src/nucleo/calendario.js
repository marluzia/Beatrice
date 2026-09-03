
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

export function faltaNaFatura(fatura, nome, hoje) {
  if (faturaPronta(fatura, hoje)) return null;

  const janela = fatura?.janela ?? {};
  if (!janela.de || !janela.ate) {
    return `Falta a data ${janela.de ? "final" : "inicial"} do ciclo da ${nome}.`;
  }
  if (janela.de >= janela.ate) {
    return `Na ${nome}, a leitura final precisa vir depois da inicial.`;
  }
  if (!dataPlausivel(janela.de, hoje) || !dataPlausivel(janela.ate, hoje)) {
    return `As datas da ${nome} precisam ser de ${ANO_MINIMO} até ${anoMaximo(hoje)}.`;
  }

  const dias = distanciaEmDias(janela.de, janela.ate);
  return `O ciclo da ${nome} deu ${dias} dias. Uma leitura de fatura fica entre ${LIMITES_DO_CICLO.minimo} e ${LIMITES_DO_CICLO.maximo}.`;
}

export function faltasDoFechamento(faturas, hoje) {
  return [
    faltaNaFatura(faturas?.luz, "luz", hoje),
    faltaNaFatura(faturas?.agua, "água", hoje),
  ].filter(Boolean);
}

export const fechamentoPronto = (faturas, hoje) => faltasDoFechamento(faturas, hoje).length === 0;

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

export function periodoDasFaturas(faturas, padrao) {
  return (
    mesPredominante(faturas?.luz?.janela) ?? mesPredominante(faturas?.agua?.janela) ?? padrao
  );
}

export function janelaDoFechamento(faturas, periodo) {
  const luz = faturas?.luz;
  const agua = faturas?.agua;
  if (faturaAtiva(luz) && cicloValido(luz.janela)) return luz.janela;
  if (faturaAtiva(agua) && cicloValido(agua.janela)) return agua.janela;
  return janelaDoMes(periodo);
}

export function janelaTotal(faturas, periodo) {
  const janelas = [faturas?.luz, faturas?.agua]
    .filter(faturaAtiva)
    .map((f) => f.janela)
    .filter((j) => cicloValido(j));
  if (janelas.length === 0) return janelaDoMes(periodo);

  return {
    de: janelas.map((j) => j.de).sort()[0],
    ate: janelas.map((j) => j.ate).sort().pop(),
  };
}

export const ultimoDiaDaJanela = (janela) => somarDias(janela.ate, -1);

export const mesDoDia = (iso) => (iso ?? "").slice(0, 7);

export const chaveDoMes = ({ mes, ano }) => `${ano}-${String(mes).padStart(2, "0")}`;

export function janelaComum(faturas, periodo) {
  const janelas = [faturas?.luz, faturas?.agua]
    .filter(faturaAtiva)
    .map((f) => f.janela)
    .filter((j) => cicloValido(j));

  if (janelas.length < 2) return janelaTotal(faturas, periodo);

  const de = janelas.map((j) => j.de).sort().pop();
  const ate = janelas.map((j) => j.ate).sort()[0];
  return de < ate ? { de, ate } : null;
}

export function diasSemSobreposicao(faturas, periodo) {
  const total = janelaTotal(faturas, periodo);
  const comum = janelaComum(faturas, periodo);
  return diasDaJanela(total, periodo) - (comum ? diasDaJanela(comum, periodo) : 0);
}

export function temCicloInvalido(faturas) {
  return [faturas?.luz, faturas?.agua]
    .filter(faturaAtiva)
    .some((f) => janelaPreenchida(f.janela) && !cicloValido(f.janela));
}
