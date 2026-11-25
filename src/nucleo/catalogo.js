import { novoId } from "./formato.js";

// Os aparelhos dizem de quais ciclos tiram consumo:
//
//   ciclos       os ciclos de partida, pelo id, com o valor em branco
//   livres       true = a pessoa escolhe (e tira com o x) de quais contas o
//                aparelho puxa; false = fixo, sem escolha (a geladeira é luz)
//   especies     como o consumo pode ser declarado: total do mês, por hora,
//                por uso. O cartão oferece a troca só entre estas.

export const CATALOGO = [
  {
    grupo: "Sai do ciclo de faturas",
    itens: [
      {
        chave: "geladeira", nome: "Geladeira", especie: "consumo",
        ciclos: ["luz"], livres: false, especies: ["consumo", "porHora"],
        rateio: "igual", rateios: ["igual", "dias"],
        dica: "Fica ligada o mês inteiro, esteja alguém em casa ou não. Divide igual, ou por dias se o grupo preferir aliviar quem viaja.",
      },
      {
        chave: "maquina", nome: "Máquina de lavar", especie: "porUso", origemUso: "fatura",
        ciclos: ["luz", "agua"], livres: true, especies: ["porUso"],
        rateio: "uso", rateios: ["igual", "uso"],
        dica: "Cada ciclo da máquina puxa da fatura. Insira o gasto de cada conta por ciclo da máquina; se não quiser contar uma delas, tire com o x. Cada um paga pelas lavagens que fez. Uma lavagem entre duas pessoas conta 0,5 para cada.",
      },
      {
        chave: "ar", nome: "Ar-condicionado", especie: "porHora",
        ciclos: ["luz"], livres: false, especies: ["consumo", "porHora"],
        rateio: "presenca", rateios: ["igual", "dias", "presenca"],
        dica: "O consumo por hora está na etiqueta do aparelho ou no manual, em kWh/h. Multiplicado pelas horas ligadas no mês, dá o total. Marque só quem usa o cômodo. Por presença é o mais preciso aqui: o ar gasta o mesmo com uma ou com duas pessoas no quarto, então quem ficou sozinha num dia pagou aquele dia inteiro.",
      },
      {
        chave: "chuveiro", nome: "Chuveiro elétrico", especie: "porHora",
        ciclos: ["luz", "agua"], livres: true, especies: ["consumo", "porHora"],
        rateio: "dias", rateios: ["igual", "dias", "presenca", "uso"],
        dica: "Puxa luz e água: por hora, a potência (kWh/h) e a vazão (m³/h) vezes as horas de banho no mês. Por dias, para quem usa aquele banheiro. Se o grupo contar banhos, dá para dividir por uso.",
      },
      {
        chave: "ventilador", nome: "Ventilador", especie: "porHora",
        ciclos: ["luz"], livres: false, especies: ["consumo", "porHora"],
        rateio: "presenca", rateios: ["igual", "dias", "presenca"],
        dica: "Como o ar-condicionado: o consumo por hora vem da etiqueta, em kWh/h, e multiplica pelas horas ligadas no mês. Um ventilador de teto fica perto de 0,12 kWh/h.",
      },
      {
        chave: "freezer", nome: "Freezer", especie: "consumo",
        ciclos: ["luz"], livres: false, especies: ["consumo", "porHora"],
        rateio: "igual", rateios: ["igual", "dias"],
      },
      {
        chave: "agua_extra", nome: "Consumo de água à parte", especie: "consumo",
        ciclos: ["agua"], livres: false, especies: ["consumo"],
        rateio: "dias", rateios: ["igual", "dias", "uso"],
        dica: "Mangueira, piscina, aquário, o que puxa água fora do uso comum.",
      },
      {
        chave: "livre", nome: "Outro aparelho", especie: "consumo", origemUso: "fatura",
        ciclos: ["luz"], livres: true, especies: ["consumo", "porHora", "porUso"],
        rateio: "dias", rateios: ["igual", "dias", "presenca", "uso"],
        dica: "Renomeie e escolha de quais contas ele puxa   luz, água, gás ou outra medida. Dá para declarar o total do mês, o consumo por hora ou cada uso com data.",
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
        chave: "propriedade", nome: "Espaço", especie: "reais", valor: "",
        rateio: "igual", rateios: ["igual", "porcentagem", "dias"],
        dica: "Custo fixo que não depende de uso: condomínio, IPTU, seguro, marina, taxa de administração. Numa multipropriedade, divida por porcentagem e escreva a fração de cada pessoa   é assim que se divide por cota enquanto a regra de cota não existe sozinha.",
      },
      {
        chave: "outra", nome: "Outra despesa", especie: "reais", valor: "",
        rateio: "igual", rateios: ["igual", "dias", "uso"],
      },
    ],
  },
];

/**
 * Os equipamentos da Multi: coisas que não saem de fatura nenhuma, mas que
 * têm uso registrado   a lancha, o jet ski, o gerador. O custo é em reais,
 * por hora ou por uso (combustível, motor, manutenção), e cada registro diz
 * quem usou e quanto. Ficam em Configurar conjunto → Itens, junto dos
 * aparelhos das faturas.
 */
export const CATALOGO_DOS_EQUIPAMENTOS = {
  grupo: "Equipamentos fora das faturas",
  itens: [
    {
      chave: "embarcacao", nome: "Embarcação", especie: "porUso", equipamento: true, medida: "hora",
      origemUso: "reais", valorPorUso: "", usos: "",
      rateio: "horas", rateios: ["horas", "igual", "porcentagem", "uso"],
      dica: "Combustível, motor, manutenção por tempo de uso. Escreva quanto custa a hora e registre quem navegou e por quantas horas. Quem usou pouco não paga pela temporada inteira de quem usou muito.",
    },
    {
      chave: "equipamento", nome: "Equipamento", especie: "porUso", equipamento: true, medida: "uso",
      origemUso: "reais", valorPorUso: "", usos: "",
      rateio: "uso", rateios: ["uso", "horas", "igual", "porcentagem"],
      dica: "Jet ski, gerador, quadriciclo, caiaque: o que tem custo por uso (ou por hora, se dividir por horas). Escreva quanto custa cada uso e registre quem usou.",
    },
  ],
};

/**
 * O catálogo do evento: as categorias de despesa de um rolê, uma viagem, um
 * churrasco, uma vaquinha. Tudo em reais, sem fatura.
 */
export const CATALOGO_DO_EVENTO = [
  {
    grupo: "Despesas do evento",
    itens: [
      { chave: "comida", nome: "Comida", especie: "reais", valor: "", rateio: "igual", rateios: ["igual", "dias", "uso", "porcentagem", "valor"] },
      { chave: "bebida", nome: "Bebida", especie: "reais", valor: "", rateio: "igual", rateios: ["igual", "dias", "uso", "porcentagem", "valor"] },
      { chave: "transporte", nome: "Transporte", especie: "reais", valor: "", rateio: "igual", rateios: ["igual", "dias", "uso", "porcentagem", "valor"] },
      { chave: "outra", nome: "Outra despesa", especie: "reais", valor: "", rateio: "igual", rateios: ["igual", "dias", "uso", "porcentagem", "valor"] },
    ],
  },
];

export const TODOS_OS_ITENS = [...CATALOGO, CATALOGO_DOS_EQUIPAMENTOS].flatMap((g) => g.itens);

const DO_EVENTO = CATALOGO_DO_EVENTO.flatMap((g) => g.itens);

/**
 * O catálogo que este conjunto pode usar.
 *
 * Sem ciclos de fatura   um evento, por exemplo   o grupo que sai da
 * fatura não tem de onde tirar dinheiro: aqueles itens custariam zero e
 * ficariam na tela sem fazer nada. Num evento, toda despesa é em reais.
 */
export function catalogoDe(modo) {
  if (modo?.faturas === false) return CATALOGO_DO_EVENTO;
  return modo?.equipamentos ? COM_EQUIPAMENTOS : CATALOGO;
}

const COM_EQUIPAMENTOS = [...CATALOGO, CATALOGO_DOS_EQUIPAMENTOS];

/** Este modelo sai do bolso, em vez de sair de dentro de uma fatura? */
export const ehEmReais = (modelo) =>
  modelo.especie === "reais" || (modelo.especie === "porUso" && modelo.origemUso === "reais");

export const GRUPO_DA_FATURA = "Sai do ciclo de faturas";
export const GRUPO_INDEPENDENTE = "Independente do ciclo de faturas";
export const GRUPO_DOS_EQUIPAMENTOS = CATALOGO_DOS_EQUIPAMENTOS.grupo;

/** Um equipamento da Multi: em reais, com uso registrado, fora das faturas. */
export const ehEquipamento = (item) => Boolean(item?.equipamento) && ehEmReais(item);

/**
 * Em que categoria este item cai.
 *
 * Vem da natureza do item, não de uma chave guardada: trocar "cada uso sai da
 * fatura" para "sai do bolso" no cartão muda o item de grupo na hora, que é o
 * que a pessoa acabou de dizer que ele é.
 */
export const grupoDoItem = (item) =>
  ehEquipamento(item) ? GRUPO_DOS_EQUIPAMENTOS : ehEmReais(item) ? GRUPO_INDEPENDENTE : GRUPO_DA_FATURA;

/**
 * Os itens do conjunto, agrupados pelas mesmas categorias do catálogo, cada
 * grupo com os modelos que dá para adicionar nele. Num evento é um grupo só:
 * toda despesa é em reais. Com `comVazios`, os grupos sem item também vêm
 * (a tela mostra os botões de adicionar mesmo assim).
 */
export function itensPorGrupo(itens, modo, comVazios = false) {
  const catalogo = catalogoDe(modo);

  if (catalogo === CATALOGO_DO_EVENTO) {
    const [unico] = catalogo;
    const lista = [{ grupo: unico.grupo, modelos: unico.itens, itens: [...(itens ?? [])] }];
    return comVazios ? lista : lista.filter((g) => g.itens.length > 0);
  }

  return catalogo
    .map((g) => ({
      grupo: g.grupo,
      modelos: g.itens,
      itens: (itens ?? []).filter((i) => grupoDoItem(i) === g.grupo),
    }))
    .filter((g) => comVazios || g.itens.length > 0);
}

export const modeloPorChave = (chave) =>
  TODOS_OS_ITENS.find((i) => i.chave === chave) ?? DO_EVENTO.find((i) => i.chave === chave);

/** Os ciclos de partida de um modelo, como tabela "id → texto em branco". */
const emBranco = (ids) => Object.fromEntries((ids ?? []).map((id) => [id, ""]));

/** As espécies que um item sem lista própria oferece, pela espécie que ele tem. */
export const especiesDe = (item) =>
  Array.isArray(item?.especies) && item.especies.length > 0
    ? item.especies
    : item?.especie === "consumo" || item?.especie === "porHora"
      ? ["consumo", "porHora"]
      : [item?.especie ?? "reais"];

export const criarItem = (modelo, participantes = []) => ({
  id: novoId("i"),
  /** De qual modelo do catálogo o item nasceu. */
  modelo: modelo.chave ?? null,
  nome: modelo.nome,
  especie: modelo.especie,
  especies: [...(modelo.especies ?? [modelo.especie])],
  // De quais ciclos o aparelho puxa: fixo (geladeira = luz) ou escolhido.
  ciclosLivres: Boolean(modelo.livres),
  // Uma tabela "id do ciclo → texto" por jeito de medir: o total do mês, o
  // gasto por hora, o gasto por uso. Separadas para um total digitado nunca
  // virar, por engano, um gasto por hora multiplicado pelas horas.
  consumoPorCiclo: modelo.especie === "consumo" ? emBranco(modelo.ciclos) : {},
  porHoraPorCiclo: modelo.especie === "porHora" ? emBranco(modelo.ciclos) : {},
  porUsoPorCiclo: modelo.especie === "porUso" && modelo.origemUso !== "reais" ? emBranco(modelo.ciclos) : {},
  horas: modelo.horas ?? "",
  origemUso: modelo.origemUso ?? "fatura",
  valorPorUso: modelo.valorPorUso ?? "",
  usos: modelo.usos ?? "",
  valor: modelo.valor ?? "",
  rateio: modelo.rateio,
  rateios: modelo.rateios ?? ["igual", "dias", "uso"],
  usosPorPessoa: {},
  // Tabelas das regras em que cada um declara o próprio número.
  porcentagens: {},
  valores: {},
  cotas: {},
  ajustes: {},
  // Quando a despesa aconteceu, quando ela tem quando. `data` sozinha é um dia
  // só; com `ate`, é um período que começa em `data` e termina em `ate`.
  // As duas são opcionais: sem data, o item vale para o fechamento inteiro.
  data: modelo.data ?? null,
  ate: modelo.ate ?? null,
  // Quem desembolsou. Só faz sentido no que sai do bolso, não no que sai da fatura.
  pagoPor: null,
  // Os usos com data: um registro por lavagem, com quem participou.
  registrosDeUso: [],
  dica: modelo.dica,
  participantes: [...participantes],
  // Só nos equipamentos da Multi: a lancha, o gerador. "hora" ou "uso".
  // Os preços por mês, dia, hora ou uso (`precos`) só nascem quando a pessoa
  // liga as unidades no cartão; até lá vale o preço único da `medida`.
  ...(modelo.equipamento ? { equipamento: true, medida: modelo.medida ?? "uso" } : {}),
});

/** O campo em que o item guarda o consumo por ciclo, conforme o jeito de medir. */
export const campoDoConsumo = (item) =>
  item?.especie === "porHora"
    ? "porHoraPorCiclo"
    : item?.especie === "porUso" && item?.origemUso !== "reais"
      ? "porUsoPorCiclo"
      : item?.especie === "consumo"
        ? "consumoPorCiclo"
        : null;

/** Os ciclos de que o item puxa, pela tabela do jeito de medir atual. */
export const ciclosDoItem = (item) => {
  const campo = campoDoConsumo(item);
  return campo ? Object.keys(item?.[campo] ?? {}) : [];
};

/** Uma cópia do item, com id novo e "(cópia)" no nome. */
export const duplicarItem = (item) => ({
  ...structuredClone(item),
  id: novoId("i"),
  nome: `${item.nome || "Item"} (cópia)`,
  registrosDeUso: (item.registrosDeUso ?? []).map((r) => ({ ...r, id: novoId("ev") })),
});
