import { novoId } from "./formato.js";

export const CATALOGO = [
  {
    grupo: "Sai do ciclo de faturas",
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
        chave: "ventilador", nome: "Ventilador", especie: "porHora",
        porHora: "", horas: "", unidade: "kwh",
        rateio: "presenca", rateios: ["igual", "dias", "presenca"],
        dica: "Como o ar-condicionado: o consumo por hora vem da etiqueta, em kWh/h, e multiplica pelas horas ligadas no mês. Um ventilador de teto fica perto de 0,12 kWh/h.",
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
        porHora: "", horas: "",
        rateio: "dias", rateios: ["igual", "dias", "presenca", "uso"],
        dica: "Renomeie e escolha a unidade. Se você souber o consumo por hora da etiqueta, troque para \"por hora\" e informe quantas horas rodou no mês.",
      },
    ],
  },
  {
    grupo: "Independente do ciclo de faturas",
    itens: [
      {
        chave: "faxina", nome: "Faxina", especie: "porUso",
        origemUso: "reais", valorPorUso: "", usos: "4",
        rateio: "igual", rateios: ["igual", "uso"]
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
        chave: "embarcacao", nome: "Embarcação", especie: "porUso",
        origemUso: "reais", valorPorUso: "", usos: "",
        rateio: "horas", rateios: ["horas", "igual", "porcentagem", "uso"],
        dica: "Combustível, motor, manutenção por tempo de uso. Lance quanto custa a hora e quantas horas cada um navegou. Quem usou pouco não paga pela temporada inteira de quem usou muito.",
      },
      {
        chave: "propriedade", nome: "Propriedade", especie: "reais", valor: "",
        rateio: "igual", rateios: ["igual", "porcentagem", "dias"],
        dica: "Custo fixo que não depende de uso: condomínio, IPTU, seguro, marina, taxa de administração. Numa multipropriedade, divida por porcentagem e escreva a fração de cada cotista   é assim que se divide por cota enquanto a regra de cota não existe sozinha.",
      },
      {
        chave: "outra", nome: "Outra despesa", especie: "reais", valor: "",
        rateio: "igual", rateios: ["igual", "dias", "uso"],
      },
    ],
  },
];

export const TODOS_OS_ITENS = CATALOGO.flatMap((g) => g.itens);

/**
 * O catálogo que este conjunto pode usar.
 *
 * Sem fatura de luz nem de água   um evento, por exemplo   o grupo que sai da
 * fatura não tem de onde tirar dinheiro: aqueles itens custariam zero e
 * ficariam na tela sem fazer nada. Num evento, toda despesa é em reais.
 */
export function catalogoDe(modo) {
  if (modo?.faturas !== false) return CATALOGO;
  return CATALOGO.filter((g) => g.itens.every((i) => ehEmReais(i)));
}

/** Este modelo sai do bolso, em vez de sair de dentro de uma fatura? */
export const ehEmReais = (modelo) =>
  modelo.especie === "reais" || (modelo.especie === "porUso" && modelo.origemUso === "reais");

export const GRUPO_DA_FATURA = "Sai do ciclo de faturas";
export const GRUPO_INDEPENDENTE = "Independente do ciclo de faturas";

/**
 * Em que categoria este item cai.
 *
 * Vem da natureza do item, não de uma chave guardada: trocar "cada uso sai da
 * fatura" para "sai do bolso" no cartão muda o item de grupo na hora, que é o
 * que a pessoa acabou de dizer que ele é.
 */
export const grupoDoItem = (item) => (ehEmReais(item) ? GRUPO_INDEPENDENTE : GRUPO_DA_FATURA);

/** Os itens da casa, agrupados pelas mesmas categorias do catálogo. */
export function itensPorGrupo(itens, modo) {
  const grupos = catalogoDe(modo).map((g) => g.grupo);

  return grupos
    .map((grupo) => ({ grupo, itens: (itens ?? []).filter((i) => grupoDoItem(i) === grupo) }))
    .filter((g) => g.itens.length > 0);
}

export const modeloPorChave = (chave) => TODOS_OS_ITENS.find((i) => i.chave === chave);

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
  // Tabelas das regras em que cada um declara o próprio número.
  porcentagens: {},
  valores: {},
  // Quando a despesa aconteceu, quando ela tem quando. `data` sozinha é um dia
  // só; com `ate`, é um período que começa em `data` e termina em `ate`.
  // As duas são opcionais: sem data, o item vale para o fechamento inteiro.
  data: modelo.data ?? null,
  ate: modelo.ate ?? null,
  // Quem desembolsou. Só faz sentido no que sai do bolso, não no que sai da fatura.
  pagoPor: null,
  eventos: [],
  dica: modelo.dica,
  participantes: [...participantes],
});
