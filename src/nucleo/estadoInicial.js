import { novoId } from "./formato.js";
import { ciclosDeFabrica, novaLinha } from "./ciclos.js";
import { criarItem, modeloPorChave } from "./catalogo.js";
import { modoDe, PADRAO, PRESETS_DA_REPUBLICA, presetValido } from "./modos.js";

// A linha de fatura mora em `ciclos.js`, com os ciclos; continua saindo daqui
// para quem já importava deste arquivo.
export { novaLinha };

export function novaPessoa() {
  return { id: novoId("m"), nome: "", diasFora: "", ausencias: [], presencas: [] };
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
    // Só o evento usa: um evento longo conta os dias de cada pessoa.
    eventoLongo: false,
    moradores,
    tarefas: [],
    itens: modo.itens
      .map((chave) => modeloPorChave(chave))
      .filter(Boolean)
      .map((modelo) => criarItem(modelo, ids)),
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
    linhas: (ciclo.linhas ?? []).map((l) => ({ ...l, quantidade: "", valor: "" })),
  });

  return {
    ...estado,
    periodo: { ...estado.periodo, ...seguinte, dias: undefined },
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
