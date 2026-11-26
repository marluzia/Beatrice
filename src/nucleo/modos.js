// Modos: o que muda entre um evento, uma temporada, uma família, uma
// república e uma multipropriedade.
//
// A CEDER divide despesas de CONJUNTOS. Os cinco modos são o mesmo objeto em
// escalas diferentes: a multipropriedade é a calculadora completa (n contas,
// cada uma com seu ciclo, régua livre) e o evento é o degenerado (nenhuma
// conta, nenhum ciclo, nenhum dia contado). Entre os dois muda o que o
// conjunto abre, não o cálculo:
//
//   modo        agenda  despesa cíclica  régua do uso comum
//   evento      não         não              não
//   temporada   sim         não              não
//   familia     sim         sim              sim, começa por igual
//   moradia     sim         sim              presets: moderada, comunal, temporal
//   multipro    sim         sim              livre
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

// A ordem do "Fechar contas": quem, as contas, os itens, os dias e o rateio.
const PASSOS_COM_CONTAS = ["moradores", "contas", "itens", "agenda", "rateio"];

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
    curto: "Moderado",
    gratis: true,
    resumo: "Uso comum metade por igual, metade pelos dias em casa.",
    calibragem: 0.5,
    regua: false,
  },
  comunal: {
    chave: "comunal",
    nome: "República Comunal",
    curto: "Comunal",
    gratis: true,
    resumo: "Uso comum 100% por igual: os dias em casa não contam nele.",
    calibragem: 1,
    regua: false,
  },
  temporal: {
    chave: "temporal",
    nome: "República Temporal",
    curto: "Temporal",
    gratis: true,
    resumo: "Uso comum 100% pelos dias em casa: quem viajou paga menos.",
    calibragem: 0,
    regua: false,
  },
  livre: {
    chave: "livre",
    nome: "República Livre",
    curto: "Livre",
    gratis: false,
    resumo: "A régua do uso comum é ajustável a cada fechamento.",
    // Só o ponto de partida: na Livre a régua aparece e a casa arrasta.
    calibragem: 0,
    regua: true,
  },
};

/** O preset de quem não tem preset gravado: nunca esconde uma régua que a casa usava. */
export const PRESET_DE_RESGATE = "livre";

/**
 * A ordem em que a tela de criação mostra os tipos de conjunto. É a ordem do
 * mais simples para o mais completo.
 */
export const ORDEM_DOS_MODOS = ["evento", "temporada", "familia", "moradia", "multipro"];

export const MODOS = {
  evento: {
    chave: "evento",
    nome: "Evento",
    tipo: "Evento",
    exemplo: "Compra, festa, vaquinha, transporte",
    descricao: "Algumas despesas pontuais para dividir entre um grupo. Sem ciclos.",
    pago: false,

    presenca: "nenhuma",
    faturas: false,
    calibragem: 1,
    moradores: 4,
    maximoDeMoradores: 30,
    // Nasce sem despesa nenhuma: cada uma é lançada com o nome dela.
    itens: [],
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

  temporada: {
    chave: "temporada",
    nome: "Temporada",
    tipo: "Temporada",
    exemplo: "Viagem, acampamento, espaço alugado",
    descricao:
      "Cada um fica dias diferentes. Tem agenda para pesar os dias. Sem ciclos de fatura.",
    pago: false,

    // Marca-se quem esteve: o normal é não estar.
    presenca: "presenca",
    faturas: false,
    calibragem: 1,
    // As despesas nascem divididas por dias: é o motivo de existir o tipo.
    rateioPadrao: "dias",
    moradores: 4,
    maximoDeMoradores: 30,
    // Nasce sem despesa nenhuma: cada uma é lançada com o nome dela.
    itens: [],
    passos: ["moradores", "itens", "agenda", "rateio"],

    palavras: {
      pessoa: "pessoa",
      pessoas: "pessoas",
      Pessoas: "Pessoas",
      conjunto: "temporada",
      oConjunto: "a temporada",
      quemMora: "Quem foi",
      noLugar: "na temporada",
      semPessoas: "Diga quantas pessoas foram para montar a lista.",
    },

    nota:
      "A temporada tem um período (início e fim). Marque na agenda os dias de estadia de cada pessoa: dentro do período, eles dão o peso das divisões por dias e por presença.",
  },

  familia: {
    chave: "familia",
    nome: "Familiar",
    tipo: "Família",
    exemplo: "Casal, família, amig@s",
    descricao: "Contexto amigável para até 5 pessoas. Comporta ciclos de fatura.",
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

  moradia: {
    chave: "moradia",
    nome: "Moradia",
    tipo: "Moradia",
    exemplo: "República, coliving, alojamento, flat dividido",
    descricao:
      "Todos moram aqui o mês inteiro e quem viaja é a exceção. Comporta ciclos de fatura.",
    pago: true,

    presenca: "ausencia",
    faturas: true,
    calibragem: 0,
    moradores: 3,
    maximoDeMoradores: 30,
    itens: ["faxina", "geladeira", "maquina", "gas", "internet"],
    passos: PASSOS_COM_CONTAS,
    // Quatro jeitos de dividir o uso comum. Mesmo na Livre, a república marca
    // sempre os dias FORA: é isso que a separa da Multi, onde se escolhe.
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

    nota: "O uso comum segue o jeito da república: moderado, comunal, temporal ou livre. Marca-se sempre quem saiu.",
  },

  multipro: {
    chave: "multipro",
    nome: "Multi",
    tipo: "Multi",
    exemplo: "Imóvel de temporada, negócios, embarcações",
    descricao:
      "Ninguém costuma ficar o mês inteiro. Possui maior catálogo. Comporta ciclos de fatura.",
    pago: true,

    // Marca-se a estadia por padrão; o conjunto pode trocar para dias fora
    // (`estado.marcacao`), em Configurar ou na própria agenda.
    presenca: "presenca",
    marcacaoEscolhida: true,
    faturas: true,
    // Lancha, jet ski, gerador: itens com uso registrado que não saem de fatura.
    equipamentos: true,
    calibragem: 0,
    moradores: 4,
    maximoDeMoradores: 30,
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
      "Calculadora completa: a régua do uso comum é livre a cada fechamento. Aqui marca-se a estadia de cada um, não a ausência. Custo fixo que não depende de uso   condomínio, seguro, IPTU   divide por porcentagem: a cota de cada pessoa vai no próprio item.",
  },
};

/**
 * Chaves de antes da v12. A Multipropriedade se chamava `temporada`; a chave
 * passou a ser do tipo novo (o antigo evento longo). Só a migração lê isto.
 */
export const CHAVES_ANTIGAS = { temporada: "multipro" };

export const LISTA_DE_MODOS = ORDEM_DOS_MODOS.map((chave) => MODOS[chave]);

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
  // Um preset que o modo já ofereceu e não oferece mais continua valendo para
  // quem o tem gravado: tirar a régua de uma casa que a usava mudaria a conta.
  if ((modoDe(chaveDoModo).presetsLegados ?? []).includes(chaveDoPreset)) return chaveDoPreset;
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
  const semFaturas = modo.faturas === false;
  const titulo = {
    contas: "Contas",
    moradores: modo.palavras.Pessoas,
    itens: semFaturas ? "Despesas" : "Itens",
    agenda: "Agenda",
    rateio: "Rateio",
  };

  return modo.passos.map((p) => ({ chave: p, titulo: titulo[p] }));
}

/**
 * O modo como ESTE conjunto o usa. Um evento salvo como "evento longo" antes
 * da v12 é uma temporada: conta os dias marcados de cada pessoa e tem o passo
 * da agenda. A migração já troca o modo gravado; isto cobre um estado que
 * chegue sem passar por ela.
 */
export function modoDoConjunto(estado) {
  const modo = modoDe(estado?.modo ?? PADRAO);
  if (modo.chave === "evento" && estado?.eventoLongo) return MODOS.temporada;
  // Na Multi, o conjunto escolhe o que a agenda marca: a estadia (o
  // padrão) ou os dias fora. Nos outros tipos a marcação é a do tipo.
  if (modo.marcacaoEscolhida && MARCACOES.includes(estado?.marcacao) && estado.marcacao !== modo.presenca) {
    return { ...modo, presenca: estado.marcacao };
  }
  return modo;
}

/** O que a agenda de um conjunto pode marcar: a estadia ou os dias fora. */
export const MARCACOES = ["presenca", "ausencia"];

/** Como este conjunto pergunta a presença, considerando o evento longo. */
export const polaridadeDoConjuntoNoModo = (estado) => modoDoConjunto(estado).presenca;
