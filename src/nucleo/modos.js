// Modos: o que muda entre uma república, uma propriedade de temporada, uma
// família e um evento.
//
// A CEDER divide despesas de CONJUNTOS. Os quatro modos são o mesmo objeto em
// escalas diferentes: moradia compartilhada é o caso completo (n contas, cada
// uma com seu ciclo) e evento é o degenerado (nenhuma conta, nenhum ciclo).
// Entre os dois muda quantos ciclos independentes se sobrepõem, não o cálculo.
//
// Um modo é um conjunto de PADRÕES, nunca um cálculo diferente. Ele decide com
// o que o conjunto abre (itens, quantas pessoas, faturas ligadas), como a tela
// pergunta a presença, e que palavras usar. O domínio não sabe que modos
// existem: tudo o que está aqui vira estado comum antes de chegar ao motor.
//
// No dia em que um modo precisar de uma conta própria, é sinal de que o modelo
// quebrou — não de que falta um campo aqui.

export const PADRAO = "moradia";

/**
 * Como a tela pergunta quem estava em casa.
 *
 *  · ausencia — o normal é estar; marca-se quem saiu. (república)
 *  · presenca — o normal é não estar; marca-se quem foi. (temporada)
 *  · nenhuma  — não há dias a contar. (rolê)
 */
export const POLARIDADES = ["ausencia", "presenca", "nenhuma"];

const PASSOS_COM_CONTAS = ["contas", "moradores", "itens", "calendario", "rateio"];

export const MODOS = {
  moradia: {
    chave: "moradia",
    nome: "Moradia compartilhada",
    tipo: "Moradia",
    exemplo: "República, coliving, alojamento, flat dividido",
    descricao:
      "Todo mundo mora aqui o mês inteiro, e quem viaja é a exceção. As contas de luz e água têm ciclo próprio.",
    pago: true,

    presenca: "ausencia",
    faturas: true,
    calibragem: 0,
    moradores: 3,
    maximoDeMoradores: 20,
    itens: ["faxina", "geladeira", "maquina", "gas", "internet"],
    passos: PASSOS_COM_CONTAS,

    palavras: {
      pessoa: "morador",
      pessoas: "moradores",
      Pessoas: "Moradores",
      conjunto: "república",
      oConjunto: "a república",
      quemMora: "Quem mora aqui",
      semPessoas: "Diga quantas pessoas dividem a casa para montar a lista.",
    },

    nota: "O rateio do uso comum vai por dias em casa.",
  },

  temporada: {
    chave: "temporada",
    nome: "Multipropriedade",
    tipo: "Cotas",
    exemplo: "Casa de praia, chalé, lancha, imóvel de temporada",
    descricao:
      "Ninguém fica o mês inteiro. Marca-se quem foi e quando, não quem faltou. O que ninguém usou continua sendo de todos.",
    pago: true,

    presenca: "presenca",
    faturas: true,
    calibragem: 0,
    moradores: 4,
    maximoDeMoradores: 20,
    itens: ["faxina", "geladeira", "ar", "gas", "internet"],
    passos: PASSOS_COM_CONTAS,

    palavras: {
      pessoa: "cotista",
      pessoas: "cotistas",
      Pessoas: "Cotistas",
      conjunto: "propriedade",
      oConjunto: "a propriedade",
      quemMora: "Quem usa a propriedade",
      semPessoas: "Diga quantos cotistas dividem a propriedade para montar a lista.",
    },

    nota:
      "Aqui marca-se a estadia de cada um, não a ausência. Custo fixo que não depende de uso — condomínio, seguro, IPTU — ainda divide igual: não existe rateio por cota.",
  },

  familia: {
    chave: "familia",
    nome: "Casa ou família",
    tipo: "Família",
    exemplo: "Casal, família, duas ou três pessoas dividindo",
    descricao:
      "Pouca gente e pouca cerimônia. O que sobra das contas divide por igual, sem contar dia de ninguém.",
    pago: false,

    presenca: "ausencia",
    faturas: true,
    calibragem: 1,
    moradores: 2,
    maximoDeMoradores: 5,
    itens: ["gas", "internet", "faxina"],
    passos: PASSOS_COM_CONTAS,

    palavras: {
      pessoa: "pessoa",
      pessoas: "pessoas",
      Pessoas: "Pessoas",
      conjunto: "casa",
      oConjunto: "a casa",
      quemMora: "Quem mora aqui",
      semPessoas: "Diga quantas pessoas moram aqui para montar a lista.",
    },

    nota: "O uso comum divide por igual. Dá para mudar isso na régua do rateio.",
  },

  evento: {
    chave: "evento",
    nome: "Evento",
    tipo: "Evento",
    exemplo: "Churrasco, rolê, viagem, carona",
    descricao:
      "Sem fatura e sem ciclo: um punhado de despesas em reais e um grupo para dividir entre.",
    pago: false,

    presenca: "nenhuma",
    faturas: false,
    calibragem: 1,
    moradores: 4,
    maximoDeMoradores: 20,
    itens: ["outra", "outra"],
    passos: ["moradores", "itens", "calendario", "rateio"],

    palavras: {
      pessoa: "participante",
      pessoas: "participantes",
      Pessoas: "Participantes",
      conjunto: "evento",
      oConjunto: "o evento",
      quemMora: "Quem participou",
      semPessoas: "Diga quantas pessoas participaram para montar a lista.",
    },

    nota: "Sem fatura, sem ciclo, sem contagem de dias. Só as despesas e quem entrou em cada uma.",
  },
};

export const LISTA_DE_MODOS = Object.values(MODOS);

/** O modo de um conjunto, com o padrão para conjunto antigo sem modo. */
export const modoDe = (chave) => MODOS[chave] ?? MODOS[PADRAO];

/** As palavras deste modo, sempre completas. */
export const palavrasDe = (chave) => modoDe(chave).palavras;

/** Como este modo pergunta a presença. */
export const polaridadeDe = (chave) => modoDe(chave).presenca;

/** Este modo conta dias de alguma forma? */
export const contaDias = (chave) => polaridadeDe(chave) !== "nenhuma";

/** Os títulos dos passos deste modo, na ordem em que a navegação os mostra. */
export function passosDe(chave) {
  const modo = modoDe(chave);
  const titulo = {
    contas: "Contas",
    moradores: modo.palavras.Pessoas,
    itens: chave === "evento" ? "Despesas" : "Itens",
    calendario: chave === "evento" ? "Dias" : "Calendário",
    rateio: chave === "evento" ? "Divisão" : "Rateio",
  };

  return modo.passos.map((p) => ({ chave: p, titulo: titulo[p] }));
}
