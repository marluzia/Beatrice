// Tradução: Fatura
//
// A tela guarda a fatura como ela vem no papel   linhas com nome, quantidade,
// valor e comportamento ("consumo", "igual", "abatimento"), tudo em texto. O
// domínio quer números: quanto foi consumido, quanto custou, quais taxas.

import { num } from "../formato.js";
import { cicloValido, faturaAtiva, janelaDoMes } from "../calendario.js";

export function linhasPorComportamento(fatura, comportamento) {
  return (fatura?.linhas ?? []).filter(
    (l) => l.comportamento === comportamento && num(l.valor) !== 0,
  );
}

/** O que a fatura cobra pelo consumo: as linhas de consumo, já com os abatimentos. */
export function valorDoConsumo(fatura) {
  const linhas = fatura?.linhas ?? [];
  return linhas
    .filter((l) => l.comportamento === "consumo" || l.comportamento === "abatimento")
    .reduce((s, l) => s + num(l.valor), 0);
}

/** Quanto foi consumido, em kWh ou m³, somando as linhas de consumo. */
export function consumoMedido(fatura) {
  return linhasPorComportamento(fatura, "consumo").reduce((s, l) => s + num(l.quantidade), 0);
}

export function consumoDaFatura(fatura) {
  return consumoMedido(fatura);
}

/** As linhas que se dividem por igual: taxa de iluminação, bandeira, esgoto fixo. */
export function totalDasTaxas(fatura) {
  return linhasPorComportamento(fatura, "igual").reduce((s, l) => s + num(l.valor), 0);
}

export function totalDaFatura(fatura) {
  return valorDoConsumo(fatura) + totalDasTaxas(fatura);
}

export function tarifaDaFatura(fatura) {
  const quantidade = consumoDaFatura(fatura);
  return quantidade > 0 ? valorDoConsumo(fatura) / quantidade : 0;
}

/** O ciclo da fatura, quando ele foi informado inteiro; senão, o mês de referência. */
export const janelaDaFatura = (fatura, periodo) =>
  cicloValido(fatura?.janela) ? fatura.janela : janelaDoMes(periodo);

/** A fatura como o domínio a recebe. Fatura desligada entra zerada. */
export function faturaParaMotor(fatura, qual) {
  if (!faturaAtiva(fatura)) {
    return qual === "luz"
      ? { luzKwh: 0, luzValor: 0, luzTaxas: [] }
      : { aguaM3: 0, aguaValor: 0, aguaTaxas: [] };
  }

  const consumo = consumoDaFatura(fatura);
  const taxas = linhasPorComportamento(fatura, "igual").map((l) => ({
    nome: l.nome ?? "",
    valor: num(l.valor),
  }));

  const total = totalDaFatura(fatura);

  return qual === "luz"
    ? { luzKwh: consumo, luzValor: total, luzTaxas: taxas }
    : { aguaM3: consumo, aguaValor: total, aguaTaxas: taxas };
}
