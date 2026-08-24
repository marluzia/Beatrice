import { MESES, nomeOu, num } from "./formato.js";
import { diasDoPeriodo } from "./adaptador.js";

/**
 * Monta a mensagem que a casa cola no grupo para juntar os dados do mês.
 *
 * A parte chata de fechar as contas nunca foi calcular: foi catar o dado de
 * cada um. Uma pessoa fica cobrando seis no grupo, esperando resposta, ouvindo
 * "acho que fiquei uns dez dias fora". Esta função não resolve isso, mas tira
 * a pior parte: saber o que perguntar, para quem, e de uma vez só.
 *
 * A mensagem pergunta exatamente o que os itens configurados exigem, e nada
 * além disso. Sem item por uso na casa, ninguém é perguntado sobre lavagens.
 *
 * É pura de propósito. Recebe o estado da tela e devolve texto — dá para
 * testar sem navegador e sem React.
 */

/** Pergunta que só uma pessoa precisa responder, sobre a casa toda. */
function perguntasDaCasa(estado) {
  const perguntas = [];

  const semFatura =
    !num(estado.faturas.luzValor) ||
    !num(estado.faturas.aguaValor) ||
    !num(estado.faturas.luzKwh) ||
    !num(estado.faturas.aguaM3);

  if (semFatura) {
    perguntas.push("Quem tiver as faturas de luz e água em mãos: consumo (kWh e m³) e valor de cada uma");
  }

  for (const item of estado.itens) {
    if (item.participantes.length === 0) continue;

    // Aparelho declarado por hora: as horas são da casa, não de cada um.
    if (item.especie === "porHora" && !num(item.horas)) {
      perguntas.push(`${item.nome}: quantas horas ficou ligado no mês`);
    }

    // Item por uso que divide igual: o total de usos é da casa.
    if (item.especie === "porUso" && item.rateio !== "uso" && !num(item.usos)) {
      perguntas.push(`${item.nome}: quantos usos no mês`);
    }

    // Consumo declarado direto e ainda em branco.
    if (item.especie === "consumo" && !num(item.quantidade)) {
      const unidade = item.unidade === "kwh" ? "kWh" : "m³";
      perguntas.push(`${item.nome}: consumo do mês em ${unidade}`);
    }
  }

  return perguntas;
}

/** Perguntas que cada morador responde por si. */
function perguntasDeCadaUm(estado, diasNoMes) {
  const perguntas = [`Quantos dias você ficou fora da casa (o mês tem ${diasNoMes})`];

  for (const item of estado.itens) {
    if (item.rateio !== "uso" || item.participantes.length === 0) continue;
    perguntas.push(`${item.nome}: quantos usos foram seus`);
  }

  return perguntas;
}

/** Quem precisa responder, item por item, quando não é a casa inteira. */
function observacoesDeGrupo(estado) {
  const total = estado.moradores.length;
  const observacoes = [];

  for (const item of estado.itens) {
    const quantos = item.participantes.length;
    if (quantos === 0 || quantos === total) continue;

    const nomes = item.participantes
      .map((id) => {
        const indice = estado.moradores.findIndex((m) => m.id === id);
        return indice < 0 ? null : nomeOu(estado.moradores[indice].nome, indice);
      })
      .filter(Boolean);

    if (nomes.length > 0) {
      observacoes.push(`${item.nome} é só de ${listar(nomes)}.`);
    }
  }

  return observacoes;
}

/** "Ana, Bia e Cau" em vez de "Ana, Bia, Cau". */
function listar(nomes) {
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
}

export function montarMensagemDeColeta(estado) {
  const { mes, ano } = estado.periodo;
  const diasNoMes = diasDoPeriodo(estado.periodo);
  const nomes = estado.moradores.map((m, i) => nomeOu(m.nome, i));

  const linhas = [`Fechamento de ${MESES[mes - 1]} de ${ano}`, ""];

  if (nomes.length === 0) {
    linhas.push("Nenhum morador cadastrado ainda — sem isso não há a quem perguntar.");
    return linhas.join("\n");
  }

  linhas.push(`${listar(nomes)}: cada um responde aqui no grupo, para todo mundo poder conferir.`);
  linhas.push("");

  for (const pergunta of perguntasDeCadaUm(estado, diasNoMes)) {
    linhas.push(`- ${pergunta}`);
  }

  const observacoes = observacoesDeGrupo(estado);
  if (observacoes.length > 0) {
    linhas.push("");
    for (const observacao of observacoes) linhas.push(observacao);
  }

  const daCasa = perguntasDaCasa(estado);
  if (daCasa.length > 0) {
    linhas.push("", "Falta ainda, e qualquer um pode responder:");
    for (const pergunta of daCasa) linhas.push(`- ${pergunta}`);
  }

  linhas.push("", "Com isso eu fecho a conta e mando o detalhamento de quanto cada um paga.");

  return linhas.join("\n");
}
