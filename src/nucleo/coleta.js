import { MESES, nomeOu, num, reais } from "./formato.js";
import { datasMarcadas, polaridadeDaCasa, totalDaFatura } from "./adaptador.js";
import { diasDaJanela, janelaDoFechamento } from "./calendario.js";
import { modoDe } from "./modos.js";

const unidadeDe = (item) => (item.unidade === "kwh" ? "kWh" : "m³");

const qtd = (v) => num(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

function listar(nomes) {
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

const itensAtivos = (estado) => estado.itens.filter((i) => i.participantes.length > 0);

/** Um uso cobrado em reais: a faxina por diária, a embarcação por hora. */
const usoEmReais = (item) => item.especie === "porUso" && item.origemUso === "reais";

// ── presença: a pergunta muda de lado conforme o modo ──────────────────────
//
// Numa república pergunta-se quantos dias a pessoa ficou FORA, porque o normal
// é estar. Numa multipropriedade pergunta-se quantos dias ela ESTEVE, porque o
// normal é não estar. Perguntar "quantos dias você ficou fora da casa" para um
// cotista que foi passar um fim de semana é uma pergunta sem resposta.

const VOCABULARIO = {
  ausencia: {
    rotulo: "Dias fora",
    pergunta: (dias) => `quantos dias cada um ficou fora da casa (o ciclo tem ${dias})`,
    pessoal: (nomes, dias) =>
      `${listar(nomes)}: ${nomes.length > 1 ? "quantos dias ficaram" : "quantos dias ficou"} fora (o ciclo tem ${dias})`,
  },
  presenca: {
    rotulo: "Dias de estadia",
    pergunta: (dias) => `quantos dias cada um ficou na propriedade (o ciclo tem ${dias})`,
    pessoal: (nomes, dias) =>
      `${listar(nomes)}: ${nomes.length > 1 ? "quantos dias ficaram" : "quantos dias ficou"} na propriedade (o ciclo tem ${dias})`,
  },
};

/** Este conjunto conta dias de alguém? Um evento não conta. */
const contaDias = (estado) => polaridadeDaCasa(estado) !== "nenhuma";

/** Este conjunto tem fatura de luz e água? Um evento não tem. */
const temFaturas = (estado) => modoDe(estado?.modo).faturas !== false;

const vocabulario = (estado) =>
  VOCABULARIO[polaridadeDaCasa(estado) === "presenca" ? "presenca" : "ausencia"];

const respondeuPresenca = (estado, m) => {
  const polaridade = polaridadeDaCasa(estado);
  const marcadas = datasMarcadas(m, polaridade);
  if (marcadas.length > 0) return true;
  // Estadia vazia numa temporada é resposta ("não fui"); numa república, não.
  if (polaridade === "presenca") return Array.isArray(m.presencas);
  return String(m.diasFora ?? "").trim() !== "";
};

const quantosDias = (estado, m) => {
  const marcadas = datasMarcadas(m, polaridadeDaCasa(estado));
  return marcadas.length > 0 ? marcadas.length : num(m.diasFora);
};

const semResposta = (estado) =>
  estado.moradores
    .map((m, i) => ({ nome: nomeOu(m.nome, i), respondeu: respondeuPresenca(estado, m) }))
    .filter((m) => !m.respondeu)
    .map((m) => m.nome);

function faturaLancada(fatura, nome, unidade) {
  const consumo = num(fatura?.consumo);
  const total = totalDaFatura(fatura);
  if (!consumo && !total) return null;

  const partes = [];
  if (consumo) partes.push(`${qtd(consumo)} ${unidade}`);
  if (total) partes.push(`R$ ${reais(total)}`);
  return `${nome}: ${partes.join(", ")}`;
}

function itemLancado(item) {
  const un = unidadeDe(item);

  if (item.especie === "consumo") {
    return num(item.quantidade) ? `${item.nome}: ${qtd(item.quantidade)} ${un}` : null;
  }

  if (item.especie === "porHora") {
    return num(item.horas) ? `${item.nome}: ${qtd(item.horas)} h ligado` : null;
  }

  if (item.especie === "porUso") {
    // O que a casa precisa conferir num item por uso em reais é o PREÇO, não
    // só a quantidade: "4 usos" não diz se a diária da faxina está certa.
    const preco = usoEmReais(item) && num(item.valorPorUso)
      ? `R$ ${reais(num(item.valorPorUso))} cada`
      : null;

    const quantos =
      item.rateio === "uso" || item.rateio === "horas"
        ? null
        : num(item.usos)
          ? `${qtd(item.usos)} usos`
          : null;

    const partes = [preco, quantos].filter(Boolean);
    return partes.length ? `${item.nome}: ${partes.join(", ")}` : null;
  }

  return num(item.valor) ? `${item.nome}: R$ ${reais(num(item.valor))}` : null;
}

function jaLancado(estado) {
  const linhas = [];

  // Num evento não há fatura: pedir consumo em kWh de um churrasco é pedir
  // um dado que não existe, e quem recebe a mensagem não sabe o que responder.
  if (temFaturas(estado)) {
    const luz = faturaLancada(estado.faturas?.luz, "Luz", "kWh");
    if (luz) linhas.push(luz);

    const agua = faturaLancada(estado.faturas?.agua, "Água", "m³");
    if (agua) linhas.push(agua);
  }

  const responderam = !contaDias(estado)
    ? []
    : estado.moradores
    .map((m, i) => ({
      nome: nomeOu(m.nome, i),
      dias: quantosDias(estado, m),
      respondeu: respondeuPresenca(estado, m),
    }))
    .filter((m) => m.respondeu);

  if (responderam.length > 0) {
    linhas.push(
      `${vocabulario(estado).rotulo}: ${responderam.map((m) => `${m.nome} ${qtd(m.dias)}`).join(", ")}`,
    );
  }

  for (const item of itensAtivos(estado)) {
    const linha = itemLancado(item);
    if (linha) linhas.push(linha);
  }

  return linhas;
}

function faltaNaFatura(fatura, nome, unidade) {
  const semConsumo = !num(fatura?.consumo);
  const semValor = !totalDaFatura(fatura);

  if (semConsumo && semValor) return `${nome}: consumo em ${unidade} e as linhas da fatura`;
  if (semConsumo) return `${nome}: consumo em ${unidade}`;
  if (semValor) return `${nome}: os valores das linhas da fatura`;
  return null;
}

function faltando(estado, diasNoMes) {
  const perguntas = [];

  const palavras = vocabulario(estado);
  // Num evento não se pergunta quantos dias cada um ficou: não há onde ficar.
  const faltaDias = contaDias(estado) ? semResposta(estado) : [];

  if (faltaDias.length > 0 && faltaDias.length === estado.moradores.length) {
    perguntas.push({ texto: palavras.pergunta(diasNoMes), pessoal: true });
  } else if (faltaDias.length > 0) {
    perguntas.push({ texto: palavras.pessoal(faltaDias, diasNoMes), pessoal: true });
  }

  for (const item of itensAtivos(estado)) {
    if (item.rateio === "uso") {
      perguntas.push({ texto: `${item.nome}: quantos usos foram seus`, pessoal: true });
    }
    if (item.rateio === "horas") {
      perguntas.push({ texto: `${item.nome}: quantas horas foram suas`, pessoal: true });
    }
  }

  if (temFaturas(estado)) {
    const luz = faltaNaFatura(estado.faturas?.luz, "Luz", "kWh");
    if (luz) perguntas.push({ texto: luz, pessoal: false });

    const agua = faltaNaFatura(estado.faturas?.agua, "Água", "m³");
    if (agua) perguntas.push({ texto: agua, pessoal: false });
  }

  for (const item of itensAtivos(estado)) {
    if (item.especie === "porHora" && !num(item.horas)) {
      perguntas.push({ texto: `${item.nome}: quantas horas ficou ligado no mês`, pessoal: false });
    }

    // O preço do uso é da casa, não de cada um: a diária da faxina e a hora
    // da embarcação valem o mesmo para todo mundo, e sem elas o item custa
    // zero por mais usos que sejam lançados.
    if (usoEmReais(item) && !num(item.valorPorUso)) {
      perguntas.push({
        texto: `${item.nome}: quanto custa cada ${item.rateio === "horas" ? "hora" : "uso"}`,
        pessoal: false,
      });
    }

    if (
      item.especie === "porUso" &&
      item.rateio !== "uso" &&
      item.rateio !== "horas" &&
      !num(item.usos)
    ) {
      perguntas.push({ texto: `${item.nome}: quantos usos no mês`, pessoal: false });
    }

    if (item.especie === "consumo" && !num(item.quantidade)) {
      perguntas.push({
        texto: `${item.nome}: consumo do mês em ${unidadeDe(item)}`,
        pessoal: false,
      });
    }

    if (item.especie === "reais" && !num(item.valor)) {
      perguntas.push({ texto: `${item.nome}: quanto foi no mês`, pessoal: false });
    }
  }

  return perguntas;
}

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

    if (nomes.length > 0) observacoes.push(`${item.nome} é só de ${listar(nomes)}.`);
  }

  return observacoes;
}

export function montarMensagemDeColeta(estado) {
  const { mes, ano } = estado.periodo;
  const diasNoMes = diasDaJanela(janelaDoFechamento(estado.faturas, estado.periodo), estado.periodo);
  const nomes = estado.moradores.map((m, i) => nomeOu(m.nome, i));

  const linhas = [`Fechamento de ${MESES[mes - 1]} de ${ano}`, ""];

  if (nomes.length === 0) {
    linhas.push("Nenhum morador cadastrado ainda, sem isso não há a quem perguntar.");
    return linhas.join("\n");
  }

  linhas.push(`${listar(nomes)}: cada um responde aqui no grupo, para todo mundo poder conferir.`);

  const lancado = jaLancado(estado);
  if (lancado.length > 0) {
    linhas.push("", "JÁ LANÇADO (confiram se está certo):");
    for (const linha of lancado) linhas.push(`- ${linha}`);
  }

  const falta = faltando(estado, diasNoMes);
  if (falta.length > 0) {
    linhas.push("", "FALTA:");
    for (const p of falta) {
      linhas.push(`- ${p.texto}${p.pessoal ? " (cada um responde)" : ""}`);
    }
  } else {
    linhas.push("", "Não falta nada, já dá para fechar.");
  }

  const observacoes = observacoesDeGrupo(estado);
  if (observacoes.length > 0) {
    linhas.push("");
    for (const observacao of observacoes) linhas.push(observacao);
  }

  linhas.push("", "Com isso eu fecho a conta e mando o detalhamento de quanto cada um paga.");

  return linhas.join("\n");
}
