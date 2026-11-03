// Modos: o que muda entre uma república, um espaço de temporada, uma
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
// quebrou   não de que falta um campo aqui.

export const PADRAO = "moradia";

/**
 * Como a tela pergunta quem estava em casa.
 *
 *  · ausencia   o normal é estar; marca-se quem saiu. (república)
 *  · presenca   o normal é não estar; marca-se quem foi. (temporada)
 *  · nenhuma    não há dias a contar. (rolê)
 */
export const POLARIDADES = ["ausencia", "presenca", "nenhuma"];

const PASSOS_COM_CONTAS = ["contas", "moradores", "itens", "calendario", "rateio"];

/**
 * Presets da República: o jeito da casa dividir o USO COMUM   a sobra da luz
 * e da água que nenhum aparelho explica   decidido uma vez, na criação, e não
 * de novo a cada fechamento.
 *
 * Um preset é um padrão, nunca um cálculo: ele só fixa a `calibragem` que já
 * existe (0 = tudo por dias, 1 = tudo por igual) e decide se a régua aparece no
 * rateio. Taxas fixas continuam por igual e cada item continua com a sua regra.
 *
 * Nos três presets fechados a régua some do rateio. Isso tem um efeito bom de
 * brinde: quem cede nunca é desfeito por alguém arrastando a régua depois.
 */
export const PRESETS_DA_REPUBLICA = {
  moderada: {
    chave: "moderada",
    nome: "República Moderada",
    curto: "Moderada",
    resumo: "Uso comum metade por igual, metade pelos dias em casa.",
    calibragem: 0.5,
    regua: false,
  },
  comunal: {
    chave: "comunal",
    nome: "República Comunal",
    curto: "Comunal",
    resumo: "Uso comum 100% por igual: os dias em casa não contam nele.",
    calibragem: 1,
    regua: false,
  },
  temporal: {
    chave: "temporal",
    nome: "República Temporal",
    curto: "Temporal",
    resumo: "Uso comum 100% pelos dias em casa: quem viajou paga menos.",
    calibragem: 0,
    regua: false,
  },
  livre: {
    chave: "livre",
    nome: "República Livre",
    curto: "Livre",
    resumo: "A república ajusta a régua do uso comum a cada fechamento.",
    // Só o ponto de partida: na Livre a régua aparece e a casa arrasta.
    calibragem: 0,
    regua: true,
  },
};

/** O preset de quem não tem preset gravado: nunca esconde uma régua que a casa usava. */
export const PRESET_DE_RESGATE = "livre";

export const MODOS = {
  moradia: {
    chave: "moradia",
    nome: "Moradia compartilhada",
    tipo: "Moradia",
    exemplo: "República, coliving, alojamento, flat dividido",
    descricao:
      "Todo mundo mora aqui o mês inteiro e quem viaja é a exceção. Comporta ciclos de fatura.",
    pago: true,

    presenca: "ausencia",
    faturas: true,
    calibragem: 0,
    moradores: 3,
    maximoDeMoradores: 20,
    itens: ["faxina", "geladeira", "maquina", "gas", "internet"],
    passos: PASSOS_COM_CONTAS,
    presets: ["moderada", "comunal", "temporal", "livre"],
    presetPadrao: "moderada",

    palavras: {
      pessoa: "pessoa",
      pessoas: "pessoas",
      Pessoas: "Pessoas",
      conjunto: "república",
      oConjunto: "a república",
      quemMora: "Quem mora aqui",
      noLugar: "em casa",
      semPessoas: "Diga quantas pessoas moram na república para montar a lista.",
    },

    nota: "O rateio do uso comum vai por dias em casa.",
  },

  temporada: {
    chave: "temporada",
    nome: "Multipropriedade",
    tipo: "Cotas",
    exemplo: "Imóvel de temporada, chalé, embarcações",
    descricao:
      "Ninguém costuma ficar o mês inteiro. Possui maior catálogo. Comporta ciclos de fatura. ",
    pago: true,

    presenca: "presenca",
    faturas: true,
    calibragem: 0,
    moradores: 4,
    maximoDeMoradores: 20,
    itens: ["faxina", "geladeira", "ar", "gas", "internet"],
    passos: PASSOS_COM_CONTAS,

    palavras: {
      pessoa: "pessoa",
      pessoas: "pessoas",
      Pessoas: "Pessoas",
      conjunto: "espaço",
      oConjunto: "o espaço",
      quemMora: "Quem usa o espaço",
      semPessoas: "Diga quantas pessoas dividem o espaço para montar a lista.",
      noLugar: "no espaço",
    },

    nota:
      "Aqui marca-se a estadia de cada um, não a ausência. Custo fixo que não depende de uso   condomínio, seguro, IPTU   divide por porcentagem: a cota de cada pessoa vai no próprio item.",
  },

  familia: {
    chave: "familia",
    nome: "Moradia familiar",
    tipo: "Família",
    exemplo: "Casal, família, amig@s",
    descricao:
      "Contexto mais amigável e igualitário para até 5 pessoas. Comporta ciclos de fatura.",
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
      noLugar: "em casa",
      semPessoas: "Diga quantas pessoas moram aqui para montar a lista.",
    },

    nota: "O uso comum divide por igual. Dá para mudar isso na régua do rateio.",
  },

  evento: {
    chave: "evento",
    nome: "Evento",
    tipo: "Evento",
    exemplo: "Compras, rolê, viagem, carona",
    descricao:
      "Um punhado de despesas em reais e um grupo para dividir entre. Sem ciclos.",
    pago: false,

    presenca: "nenhuma",
    faturas: false,
    calibragem: 1,
    moradores: 4,
    maximoDeMoradores: 20,
    itens: ["outra", "outra"],
    // O calendário só entra num evento longo (ver `modoDoConjunto`).
    passos: ["moradores", "itens", "rateio"],

    palavras: {
      pessoa: "pessoa",
      pessoas: "pessoas",
      Pessoas: "Pessoas",
      conjunto: "evento",
      oConjunto: "o evento",
      quemMora: "Quem participou",
      noLugar: "no evento",
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

/** Os presets que este modo oferece, na ordem da tela. Lista vazia = modo sem presets. */
export const presetsDe = (chave) =>
  (modoDe(chave).presets ?? []).map((p) => PRESETS_DA_REPUBLICA[p]).filter(Boolean);

/**
 * A chave de preset que vale para um modo, a partir do que veio.
 *
 *  · modo sem presets          → null
 *  · chave válida para o modo  → ela mesma
 *  · `undefined` (criação)     → o padrão do modo
 *  · qualquer outra coisa      → livre, que não esconde nada
 */
export function presetValido(chaveDoModo, chaveDoPreset) {
  const oferecidos = modoDe(chaveDoModo).presets ?? [];
  if (oferecidos.length === 0) return null;
  if (oferecidos.includes(chaveDoPreset)) return chaveDoPreset;
  if (chaveDoPreset === undefined) return modoDe(chaveDoModo).presetPadrao ?? oferecidos[0];
  return PRESET_DE_RESGATE;
}

/**
 * O preset de um conjunto, ou null se o modo dele não tem presets. Conjunto
 * antigo, sem preset gravado, é lido como Livre: ele vinha usando a régua.
 */
export function presetDe(estado) {
  const chave = presetValido(estado?.modo ?? PADRAO, estado?.preset ?? null);
  return chave ? PRESETS_DA_REPUBLICA[chave] : null;
}

/** A calibragem que o preset impõe, ou null quando quem decide é a régua. */
export function calibragemFixa(estado) {
  const preset = presetDe(estado);
  return preset && !preset.regua ? preset.calibragem : null;
}

/** A régua do uso comum aparece no rateio deste conjunto? */
export function reguaVisivel(estado) {
  if (modoDe(estado?.modo ?? PADRAO).faturas === false) return false;
  return calibragemFixa(estado) === null;
}

/** Os títulos dos passos deste modo, na ordem em que a navegação os mostra. */
export function passosDe(modoOuChave) {
  const modo = typeof modoOuChave === "string" ? modoDe(modoOuChave) : modoOuChave ?? modoDe(PADRAO);
  const evento = modo.chave === "evento";
  const titulo = {
    contas: "Contas",
    moradores: modo.palavras.Pessoas,
    itens: evento ? "Despesas" : "Itens",
    calendario: "Calendário",
    rateio: "Rateio",
  };

  return modo.passos.map((p) => ({ chave: p, titulo: titulo[p] }));
}

/**
 * O modo como ESTE conjunto o usa. Hoje só o evento muda: um evento longo
 * (uma viagem, um acampamento) passa a contar os dias de cada pessoa   marca-
 * se o dia em que cada uma esteve, como numa multipropriedade   e ganha o
 * passo do calendário. Um evento curto continua sem dias.
 */
export function modoDoConjunto(estado) {
  const modo = modoDe(estado?.modo ?? PADRAO);
  if (modo.chave !== "evento" || !estado?.eventoLongo) return modo;

  return {
    ...modo,
    presenca: "presenca",
    passos: ["moradores", "itens", "calendario", "rateio"],
    eventoLongo: true,
    nota: "Evento longo: marque os dias em que cada pessoa esteve. A divisão por dias pesa quem ficou mais.",
  };
}

/** Como este conjunto pergunta a presença, considerando o evento longo. */
export const polaridadeDoConjuntoNoModo = (estado) => modoDoConjunto(estado).presenca;
