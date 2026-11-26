// Tradução: Fatura
//
// A tela guarda a fatura como ela vem no papel   linhas com nome, quantidade,
// valor e comportamento ("consumo", "igual", "abatimento"), tudo em texto. O
// domínio quer números: quanto foi consumido, quanto custou, quais taxas.

import { num } from "../formato.js";
import { cicloValido, diasDaJanela, janelaDoMes } from "../calendario.js";
import { divisaoDoCiclo, ehMedido } from "../ciclos.js";

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

/** Quanto foi consumido, na unidade do ciclo, somando as linhas de consumo. */
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

/** A janela do ciclo, quando ela foi informada inteira; senão, o mês de referência. */
export const janelaDaFatura = (fatura, periodo) =>
  cicloValido(fatura?.janela) ? fatura.janela : janelaDoMes(periodo);

/**
 * A regra própria de uma conta só de valor, como o domínio a entende, ou null
 * quando ela segue a régua do uso comum (e em todo ciclo medido).
 */
export function regraDoCiclo(ciclo) {
  // Registros + régua: o que os itens não explicam vai pela régua.
  if (divisaoDoCiclo(ciclo) === "registros") return null;
  const tabela = (campo) =>
    Object.fromEntries(
      Object.entries(ciclo?.[campo] ?? {})
        .filter(([, v]) => String(v ?? "").trim() !== "")
        .map(([id, v]) => [id, num(v)]),
    );
  switch (ciclo?.rateio) {
    case "dias":
      return { tipo: "dias" };
    case "porcentagem":
      return { tipo: "porcentagem", porcentagens: tabela("porcentagens") };
    case "valor":
      return { tipo: "valor", valores: tabela("valores") };
    // Cotas: quem não escreveu nada tem uma (o domínio completa).
    case "cotas":
      return { tipo: "cotas", cotas: tabela("cotas") };
    case "ajuste":
      return { tipo: "ajuste", ajustes: tabela("ajustes") };
    // Horas e uso: quanto cada um declarou nesta fatura.
    case "horas":
    case "uso":
      return { tipo: ciclo.rateio, usos: tabela("usosPorPessoa") };
    default:
      return { tipo: "igual" };
  }
}

/**
 * A fatura de um ciclo como o domínio a recebe. Só ciclos ligados chegam ao
 * motor; quem chama filtra antes.
 */
export function faturaParaMotor(ciclo, periodo) {
  const taxas = linhasPorComportamento(ciclo, "igual").map((l) => ({
    nome: l.nome ?? "",
    valor: num(l.valor),
  }));

  const rateio = regraDoCiclo(ciclo);
  // Na calculadora, a fatura inteira (taxas junto) vai pela regra escolhida.
  const naCalculadora = divisaoDoCiclo(ciclo) === "calculadora";

  return {
    id: ciclo.id,
    nome: ciclo.nome?.trim() || "Conta",
    recurso: ehMedido(ciclo) ? ciclo.recurso : null,
    quantidade: ehMedido(ciclo) ? consumoDaFatura(ciclo) : 0,
    valor: totalDaFatura(ciclo),
    taxas: naCalculadora ? [] : taxas,
    dias: diasDaJanela(janelaDaFatura(ciclo, periodo), periodo),
    ...(rateio ? { rateio } : {}),
    // Quem divide: só quando a conta marcou pessoas (sem marca, todo o conjunto).
    ...(Array.isArray(ciclo.participantes) && ciclo.participantes.length > 0 ? { participantes: [...ciclo.participantes] } : {}),
  };
}
