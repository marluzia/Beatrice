import { novoId } from "./formato.js";
import { ciclosDeFabrica, novaLinha } from "./ciclos.js";
import { totalDaFatura } from "./traducao/fatura.js";
import { somarDias } from "./calendario.js";

const proximoDia = (iso) => somarDias(iso, 1);
import { criarItem, modeloPorChave } from "./catalogo.js";
import { modoDe, PADRAO, PRESETS_DA_REPUBLICA, presetValido } from "./modos.js";

// A linha de fatura mora em `ciclos.js`, com os ciclos; continua saindo daqui
// para quem já importava deste arquivo.
export { novaLinha };

export function novaPessoa(nome = "", convidado = false) {
  return { id: novoId("m"), nome, convidado, diasFora: "", ausencias: [], presencas: [] };
}

/**
 * Um lembrete: uma lista (mercado da semana) ou uma nota (a senha do wi-fi).
 * Como a tarefa, não tem dinheiro e não entra em cálculo nenhum.
 */
export function novoLembrete(tipo = "nota", campos = {}) {
  return {
    id: novoId("lb"),
    tipo: tipo === "lista" ? "lista" : "nota",
    titulo: "",
    texto: "",
    itens: [],
    autor: null,
    data: null,
    registro: null,
    criadoEm: new Date().toISOString(),
    ...campos,
  };
}

/** A regra de partida de um item neste modo: na Temporada, o que é por igual vira por dias. */
export function comRateioDoModo(item, modo) {
  if (modo?.rateioPadrao !== "dias") return item;
  if (item.rateio !== "igual") return item;
  if (Array.isArray(item.rateios) && !item.rateios.includes("dias")) return item;
  return { ...item, rateio: "dias" };
}

/**
 * Uma tarefa é trabalho feito por quem mora: lavar louça, passar pano, tirar o
 * lixo. Fica registrada com data e com quem fez, e NÃO entra em nenhum
 * cálculo   nenhum valor muda por causa dela.
 *
 * Faxina paga é outra coisa, apesar do nome parecido: ali existe dinheiro
 * saindo, então é um item do catálogo (`faxina`, por uso, em reais), não uma
 * tarefa.
 */
export function novaTarefa(data = null) {
  return { id: novoId("t"), data, nome: "", responsaveis: [], observacao: "" };
}

/**
 * Com o que a tela abre. O modo decide quantas pessoas, quais itens, se as
 * faturas entram e como o uso comum divide; daqui para a frente é estado
 * comum, e o domínio não sabe de que modo ele veio.
 */
export function estadoInicial(chaveDoModo = PADRAO, quantasPessoas, chaveDoPreset) {
  // A assinatura já foi `estadoInicial(quantosMoradores)`. Quem chamar do jeito
  // antigo recebe o padrão com o número errado de pessoas e não descobre  
  // então aqui é erro, não tolerância.
  if (typeof chaveDoModo !== "string") {
    throw new TypeError(
      `estadoInicial espera a chave do modo primeiro, e veio ${typeof chaveDoModo}. ` +
        `A forma certa é estadoInicial("${PADRAO}", ${chaveDoModo}).`,
    );
  }

  const modo = modoDe(chaveDoModo);

  const quantos = Math.max(
    0,
    Math.min(modo.maximoDeMoradores, quantasPessoas ?? modo.moradores),
  );

  const moradores = Array.from({ length: quantos }, novaPessoa);
  const ids = moradores.map((m) => m.id);
  const hoje = new Date();

  // Na República, o preset decide de onde a régua parte (e, nos fechados, onde
  // ela fica). Nos outros modos `preset` é null e vale a calibragem do modo.
  const preset = presetValido(modo.chave, chaveDoPreset);
  const calibragem = preset ? PRESETS_DA_REPUBLICA[preset].calibragem : modo.calibragem;

  return {
    modo: modo.chave,
    preset,
    calibragem,
    // Quem fica com o centavo que a divisão não fecha. Null = ninguém decidiu
    // ainda, e o acerto usa um padrão declarado em vez de escolher calado.
    quemCede: null,
    periodo: { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() },
    // Luz e água vêm de fábrica, desligadas: o grupo liga as contas que tem.
    ciclos: ciclosDeFabrica(false),
    // O dia do mês em que o período fecha. Null = ainda não escolhido: o
    // período segue o primeiro ciclo ligado, como sempre seguiu a luz.
    corte: null,
    // De antes da v12, quando a Temporada era um interruptor do evento.
    eventoLongo: false,
    // Só a Multi escolhe: "presenca" (estadia) ou "ausencia" (dias fora).
    // Null = a marcação do tipo.
    marcacao: null,
    moradores,
    tarefas: [],
    itens: modo.itens
      .map((chave) => modeloPorChave(chave))
      .filter(Boolean)
      .map((modelo) => comRateioDoModo(criarItem(modelo, ids), modo)),
    // Nada daqui entra no cálculo: quem é você neste conjunto, quem o
    // administra, a descrição, desde quando ele existe, os lembretes, os Pix
    // do acerto já confirmados e o que cada ciclo custou nos meses passados.
    voce: null,
    admin: null,
    descricao: "",
    desde: null,
    lembretes: [],
    pagamentos: {},
    historicoDeCiclos: [],
  };
}

/**
 * O conjunto como a tela de criação o pede: com nome para cada pessoa, a
 * primeira sendo você (e quem administra). As outras entram como convidadas:
 * fazem parte da divisão sem precisar de conta no app.
 */
export function estadoDeCriacao({ modo: chaveDoModo = PADRAO, preset, voce = "", convidados = [], descricao = "", desde = null, ate = null } = {}) {
  const nomes = [String(voce ?? "").trim(), ...convidados.map((n) => String(n ?? "").trim()).filter(Boolean)];
  const base = estadoInicial(chaveDoModo, nomes.length, preset);
  const moradores = base.moradores.map((m, i) => ({ ...m, nome: nomes[i] ?? "", convidado: i > 0 }));
  const eu = moradores[0]?.id ?? null;
  const data = typeof desde === "string" && /^\d{4}-\d{2}-\d{2}$/.test(desde) ? desde : null;
  // Sem faturas (evento, temporada), o mês do conjunto é o da data dele: é
  // nele que o calendário abre. Com faturas, o período vem dos ciclos.
  const periodo =
    data && modoDe(chaveDoModo).faturas === false
      ? { mes: Number(data.slice(5, 7)), ano: Number(data.slice(0, 4)) }
      : base.periodo;
  // A temporada tem período próprio: do início ao fim que a tela pede. Ele
  // mora no corte (o mesmo campo que o período de corte das casas), e é nele
  // que as estadias marcadas contam.
  const fim = typeof ate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ate) ? ate : null;
  const corte = chaveDoModo === "temporada" && data && fim && fim >= data ? { de: data, ate: proximoDia(fim) } : base.corte;
  return {
    ...base,
    periodo,
    corte,
    moradores,
    voce: eu,
    admin: eu,
    descricao: String(descricao ?? "").trim(),
    desde: data,
  };
}

/**
 * O mesmo conjunto, um mês adiante: mantém quem mora e o que a casa tem, e limpa o
 * que é do mês que passou   valores das faturas, ciclos, dias fora e usos.
 * É o que a maioria dos clientes quer quando diz "quero refazer no mês que vem".
 */
export function proximoMes(estado) {
  // O corte fica: é uma regra do conjunto, não do mês.
  const { mes, ano } = estado.periodo;
  const seguinte = mes === 12 ? { mes: 1, ano: ano + 1 } : { mes: mes + 1, ano };

  // O ciclo continua existindo, ligado ou não, com as mesmas linhas: só os
  // números, as datas e quem pagou são do mês que passou.
  const limparCiclo = (ciclo) => ({
    ...ciclo,
    janela: null,
    vencimento: null,
    pagoPor: null,
    pagoEm: null,
    linhas: (ciclo.linhas ?? []).map((l) => ({ ...l, quantidade: "", valor: "" })),
  });

  // O que cada ciclo ligado custou fica guardado para o gráfico "Os ciclos".
  const fechado = {
    mes,
    ano,
    valores: Object.fromEntries(
      (estado.ciclos ?? [])
        .filter((c) => c.ativa !== false)
        .map((c) => [c.id, totalDaFatura(c)]),
    ),
  };

  return {
    ...estado,
    periodo: { ...estado.periodo, ...seguinte, dias: undefined },
    historicoDeCiclos: [...(estado.historicoDeCiclos ?? []), fechado].slice(-11),
    // Os Pix confirmados são do acerto do mês que passou.
    pagamentos: {},
    ciclos: (estado.ciclos ?? []).map(limparCiclo),
    moradores: estado.moradores.map((m) => ({
      ...m,
      diasFora: "",
      ausencias: [],
      presencas: [],
    })),
    // Quem cede e as tarefas são do mês que passou.
    quemCede: null,
    tarefas: [],
    itens: estado.itens.map((i) => ({
      ...i,
      quantidade: "",
      horas: "",
      usos: "",
      valor: "",
      usosPorPessoa: {},
      porcentagens: {},
      valores: {},
      // Quem pagou e quando são do mês que passou.
      pagoPor: null,
      data: null,
      ate: null,
      registrosDeUso: [],
    })),
  };
}
