import { novoId } from "./formato.js";

/**
 * Catálogo de itens que a casa pode adicionar.
 *
 * Duas famílias, e a diferença entre elas é de onde sai o dinheiro:
 *   sai da fatura -> descontado da luz ou da água antes do uso comum (tem teto)
 *   pago em reais -> soma por cima das faturas (não tem teto)
 *
 * Cada modelo declara os rateios que fazem sentido para ele. Geladeira liga
 * sozinha o mês inteiro, então "por uso" não quer dizer nada ali. O motor
 * ainda aplica por cima a regra estrutural: item cobrado por uso nunca divide
 * por dias.
 */
export const CATALOGO = [
  {
    grupo: "Sai da fatura de luz ou água",
    itens: [
      {
        chave: "geladeira", nome: "Geladeira", especie: "consumo",
        quantidade: "", unidade: "kwh",
        rateio: "igual", rateios: ["igual", "dias"],
        dica: "Fica ligada o mês inteiro, esteja alguém em casa ou não. Divide igual, ou por dias se a casa preferir aliviar quem viaja.",
      },
      {
        chave: "maquina", nome: "Máquina de lavar", especie: "porUso",
        origemUso: "fatura", kwhPorUso: "", m3PorUso: "",
        rateio: "uso", rateios: ["igual", "uso"],
        dica: "Cada ciclo puxa luz e água da fatura. Insira as métricas de energia e água por ciclo da máquina. Cada um paga pelas lavagens que fez. Uma lavagem por uso entre duas pessoas conta 0,5 para cada.",
      },
      {
        chave: "ar", nome: "Ar-condicionado", especie: "porHora",
        porHora: "", horas: "", unidade: "kwh",
        rateio: "presenca", rateios: ["igual", "dias", "presenca"],
        dica: "O consumo por hora está na etiqueta do aparelho ou no manual, em kWh/h. Multiplicado pelas horas ligadas no mês, dá o total. Marque só quem usa o cômodo. Por presença é o mais preciso aqui: o ar gasta o mesmo com uma ou com duas pessoas no quarto, então quem ficou sozinha num dia pagou aquele dia inteiro.",
      },
      {
        chave: "chuveiro", nome: "Chuveiro elétrico", especie: "consumo",
        quantidade: "", unidade: "kwh",
        rateio: "dias", rateios: ["igual", "dias", "presenca", "uso"],
        dica: "Por dias, para quem usa aquele banheiro. Se a casa contar banhos, dá para dividir por uso.",
      },
      {
        chave: "ventilador", nome: "Ventilador", especie: "consumo",
        quantidade: "", unidade: "kwh",
        rateio: "presenca", rateios: ["igual", "dias", "presenca"],
      },
      {
        chave: "freezer", nome: "Freezer", especie: "consumo",
        quantidade: "", unidade: "kwh",
        rateio: "igual", rateios: ["igual", "dias"],
      },
      {
        chave: "agua_extra", nome: "Consumo de água à parte", especie: "consumo",
        quantidade: "", unidade: "m3",
        rateio: "dias", rateios: ["igual", "dias", "uso"],
        dica: "Mangueira, piscina, aquário, o que puxa água fora do uso comum.",
      },
      {
        chave: "livre", nome: "Outro aparelho", especie: "consumo",
        quantidade: "", unidade: "kwh",
        rateio: "dias", rateios: ["igual", "dias", "presenca", "uso"],
        dica: "Renomeie e escolha se o gasto entra em kWh ou em m³.",
      },
    ],
  },
  {
    grupo: "Pago em reais, por fora das faturas",
    itens: [
      {
        chave: "faxina", nome: "Faxina", especie: "porUso",
        origemUso: "reais", valorPorUso: "", usos: "4",
        rateio: "igual", rateios: ["igual", "uso"],
        dica: "Paga por diária. Marque quem contratou: ou divide igual entre eles, ou por quantas diárias cada um puxou.",
      },
      {
        chave: "gas", nome: "Gás", especie: "reais", valor: "",
        rateio: "igual", rateios: ["igual", "dias"],
      },
      {
        chave: "internet", nome: "Internet", especie: "reais", valor: "",
        rateio: "igual", rateios: ["igual", "dias"],
      },
      {
        chave: "streaming", nome: "Streaming", especie: "reais", valor: "",
        rateio: "igual", rateios: ["igual", "dias"],
        dica: "Marque só quem assina junto.",
      },
      {
        chave: "mineral", nome: "Água mineral", especie: "reais", valor: "",
        rateio: "dias", rateios: ["igual", "dias", "uso"],
        dica: "Galão é consumo de quem está em casa. Por dias costuma cair melhor que igual.",
      },
      {
        chave: "outra", nome: "Outra despesa", especie: "reais", valor: "",
        rateio: "igual", rateios: ["igual", "dias", "uso"],
      },
    ],
  },
];

export const TODOS_OS_ITENS = CATALOGO.flatMap((g) => g.itens);

export const modeloPorChave = (chave) => TODOS_OS_ITENS.find((i) => i.chave === chave);

/** Modelo do catálogo -> item editável, já com todo mundo marcado. */
export const criarItem = (modelo, participantes = []) => ({
  id: novoId("i"),
  nome: modelo.nome,
  especie: modelo.especie,
  quantidade: modelo.quantidade ?? "",
  unidade: modelo.unidade ?? "kwh",
  porHora: modelo.porHora ?? "",
  horas: modelo.horas ?? "",
  origemUso: modelo.origemUso ?? "fatura",
  kwhPorUso: modelo.kwhPorUso ?? "",
  m3PorUso: modelo.m3PorUso ?? "",
  valorPorUso: modelo.valorPorUso ?? "",
  usos: modelo.usos ?? "",
  valor: modelo.valor ?? "",
  rateio: modelo.rateio,
  rateios: modelo.rateios ?? ["igual", "dias", "uso"],
  usosPorPessoa: {},
  dica: modelo.dica,
  participantes: [...participantes],
});
