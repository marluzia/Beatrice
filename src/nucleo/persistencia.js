// Persistência: as casas salvas neste navegador.
//
// Duas chaves de natureza diferente:
//
//   cdr:casas      → o índice. Uma ficha por casa (nome, modo, mês) e qual
//                    delas está aberta. É o que o painel lê, sem abrir nenhuma.
//   cdr:casa:<id>  → o estado de uma casa. Só é lido quando ela abre.
//
// Guardar o índice separado é o que faz o painel abrir rápido com trinta casas
// salvas: listar não custa carregar.
//
// Tudo isto vive no localStorage deste navegador. Limpar os dados do site
// apaga as casas, e nenhum outro aparelho as vê — por isso `exportarCasa` e
// `importarCasa` existem, e por isso o painel oferece o download.

import { PADRAO } from "./modos.js";

const INDICE = "cdr:casas";
const PREFIXO = "cdr:casa:";
const CHAVE_ANTIGA = "cdr:casa";

const VERSAO = 6;

function deposito() {
  try {
    const teste = "cdr:teste";
    window.localStorage.setItem(teste, "1");
    window.localStorage.removeItem(teste);
    return window.localStorage;
  } catch {
    return null;
  }
}

const ler = (guarda, chave) => {
  try {
    const cru = guarda.getItem(chave);
    return cru ? JSON.parse(cru) : null;
  } catch {
    return null;
  }
};

const escrever = (guarda, chave, valor) => {
  try {
    guarda.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
};

const agora = () => new Date().toISOString();

const novoIdDeCasa = () =>
  `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ── o índice ───────────────────────────────────────────────────────────────

const indiceVazio = () => ({ versao: VERSAO, atual: null, casas: [] });

function lerIndice(guarda) {
  const cru = ler(guarda, INDICE);
  if (!cru || !Array.isArray(cru.casas)) return null;

  return {
    versao: VERSAO,
    atual: typeof cru.atual === "string" ? cru.atual : null,
    casas: cru.casas.filter((c) => c && typeof c.id === "string"),
  };
}

/** A ficha que o painel mostra, derivada do estado da casa. */
function fichaDe(id, nome, estado, antes) {
  return {
    id,
    nome: nome || "Casa sem nome",
    modo: estado?.modo ?? PADRAO,
    mes: estado?.periodo?.mes ?? null,
    ano: estado?.periodo?.ano ?? null,
    pessoas: Array.isArray(estado?.moradores) ? estado.moradores.length : 0,
    criadaEm: antes?.criadaEm ?? agora(),
    salvaEm: agora(),
  };
}

function guardarIndice(guarda, indice) {
  return escrever(guarda, INDICE, { ...indice, versao: VERSAO });
}

// ── migração da chave única antiga ─────────────────────────────────────────
//
// Antes da v5 havia uma casa só, em `cdr:casa`. Ela vira a primeira casa do
// índice, com o nome que a pessoa reconheça, e a chave antiga sai do caminho.

function adotarCasaAntiga(guarda) {
  const pacote = ler(guarda, CHAVE_ANTIGA);
  if (!pacote) return null;

  const estado = migrar(pacote.estado, pacote.versao);
  if (!estado || !pareceUmaCasa(estado)) {
    try {
      guarda.removeItem(CHAVE_ANTIGA);
    } catch {}
    return null;
  }

  const limpo = sanear(estado);
  const id = novoIdDeCasa();

  escrever(guarda, PREFIXO + id, { versao: VERSAO, estado: limpo });

  try {
    guarda.removeItem(CHAVE_ANTIGA);
  } catch {}

  return fichaDe(id, "Minha casa", limpo, null);
}

/** O índice, criando-o e adotando a casa antiga se for a primeira vez. */
function indiceVivo(guarda) {
  const existente = lerIndice(guarda);
  if (existente) return existente;

  const indice = indiceVazio();
  const adotada = adotarCasaAntiga(guarda);

  if (adotada) {
    indice.casas = [adotada];
    indice.atual = adotada.id;
  }

  guardarIndice(guarda, indice);
  return indice;
}

// ── o que a tela usa ───────────────────────────────────────────────────────

/** As fichas de todas as casas salvas, da mais recente para a mais antiga. */
export function listarCasas() {
  const guarda = deposito();
  if (!guarda) return [];

  return [...indiceVivo(guarda).casas].sort((a, b) =>
    String(b.salvaEm ?? "").localeCompare(String(a.salvaEm ?? "")),
  );
}

/** Qual casa estava aberta da última vez. */
export function casaAtual() {
  const guarda = deposito();
  if (!guarda) return null;

  const indice = indiceVivo(guarda);
  return indice.casas.some((c) => c.id === indice.atual) ? indice.atual : null;
}

export function definirCasaAtual(id) {
  const guarda = deposito();
  if (!guarda) return;

  const indice = indiceVivo(guarda);
  guardarIndice(guarda, { ...indice, atual: id ?? null });
}

/** O estado de uma casa, ou null se ela não existe ou não presta. */
export function carregarCasa(id) {
  const guarda = deposito();
  if (!guarda || !id) return null;

  const pacote = ler(guarda, PREFIXO + id);
  if (!pacote) return null;

  const estado = migrar(pacote.estado, pacote.versao);
  if (!estado || !pareceUmaCasa(estado)) return null;

  return sanear(estado);
}

/** Salva o estado e atualiza a ficha. Devolve se conseguiu. */
export function salvarCasa(id, estado) {
  const guarda = deposito();
  if (!guarda || !id || !pareceUmaCasa(estado)) return false;

  const ok = escrever(guarda, PREFIXO + id, { versao: VERSAO, estado });
  if (!ok) return false;

  const indice = indiceVivo(guarda);
  const antes = indice.casas.find((c) => c.id === id);
  if (!antes) return false;

  guardarIndice(guarda, {
    ...indice,
    casas: indice.casas.map((c) =>
      c.id === id ? fichaDe(id, antes.nome, estado, antes) : c,
    ),
  });

  return true;
}

/** Cria uma casa a partir de um estado pronto. Devolve o id. */
export function criarCasa(nome, estado) {
  const guarda = deposito();
  const id = novoIdDeCasa();
  if (!guarda) return id;

  const indice = indiceVivo(guarda);
  const ficha = fichaDe(id, nome, estado, null);

  escrever(guarda, PREFIXO + id, { versao: VERSAO, estado });
  guardarIndice(guarda, {
    ...indice,
    atual: id,
    casas: [...indice.casas, ficha],
  });

  return id;
}

export function renomearCasa(id, nome) {
  const guarda = deposito();
  if (!guarda) return;

  const indice = indiceVivo(guarda);
  guardarIndice(guarda, {
    ...indice,
    casas: indice.casas.map((c) =>
      c.id === id ? { ...c, nome: nome.trim() || c.nome } : c,
    ),
  });
}

export function removerCasa(id) {
  const guarda = deposito();
  if (!guarda) return;

  const indice = indiceVivo(guarda);
  const restantes = indice.casas.filter((c) => c.id !== id);

  try {
    guarda.removeItem(PREFIXO + id);
  } catch {}

  guardarIndice(guarda, {
    ...indice,
    casas: restantes,
    atual: indice.atual === id ? null : indice.atual,
  });
}

// ── sair e voltar do navegador ─────────────────────────────────────────────

/** A casa num texto que dá para guardar em arquivo e trazer de volta. */
export function exportarCasa(id) {
  const estado = carregarCasa(id);
  if (!estado) return null;

  const ficha = listarCasas().find((c) => c.id === id);

  return JSON.stringify(
    {
      ceder: "casa",
      versao: VERSAO,
      exportadaEm: agora(),
      nome: ficha?.nome ?? "Casa",
      estado,
    },
    null,
    2,
  );
}

/** Traz de volta uma casa exportada. Devolve o id novo, ou null. */
export function importarCasa(texto) {
  let pacote;
  try {
    pacote = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!pacote || typeof pacote !== "object") return null;

  const estado = migrar(pacote.estado, pacote.versao);
  if (!estado || !pareceUmaCasa(estado)) return null;

  return criarCasa(pacote.nome ?? "Casa importada", sanear(estado));
}

// ── migração do estado de uma casa ─────────────────────────────────────────

function migrar(estado, versao) {
  if (!estado || typeof estado !== "object") return null;
  if (versao === VERSAO) return estado;

  const numero = (v) => Number(String(v ?? "").replace(",", ".")) || 0;

  if (versao === 1) {
    const f = estado.faturas ?? {};

    const converter = (unidade, consumo, valorTotal, taxaFixa, nomeDaTaxa) => {
      const total = numero(valorTotal);
      const fixa = numero(taxaFixa);
      const linhas = [];

      const consumoEmReais = total - fixa;
      if (consumoEmReais !== 0) {
        linhas.push({
          id: `l-migrada-${unidade}-consumo`,
          nome: unidade === "kwh" ? "Energia elétrica" : "Tarifa água",
          valor: String(consumoEmReais),
          comportamento: "consumo",
        });
      }
      if (fixa !== 0) {
        linhas.push({
          id: `l-migrada-${unidade}-taxa`,
          nome: nomeDaTaxa,
          valor: String(fixa),
          comportamento: "igual",
        });
      }
      return { unidade, consumo: consumo ?? "", linhas };
    };

    return migrar(
      {
        ...estado,
        faturas: {
          luz: converter("kwh", f.luzKwh, f.luzValor, f.luzTaxasFixas, "Iluminação pública"),
          agua: converter("m3", f.aguaM3, f.aguaValor, f.aguaTaxasFixas, "Custo mínimo fixo"),
        },
      },
      3,
    );
  }

  if (versao === 2) {
    const converter = (fatura, unidade) => {
      if (!fatura) return { unidade, consumo: "", linhas: [] };

      const linhas = [];
      const consumoEmReais =
        fatura.modo === "preco"
          ? numero(fatura.consumo) * numero(fatura.preco)
          : numero(fatura.valor);

      if (consumoEmReais !== 0) {
        linhas.push({
          id: `l-migrada-${unidade}-consumo`,
          nome: unidade === "kwh" ? "Energia elétrica" : "Tarifa água",
          valor: String(consumoEmReais),
          comportamento: "consumo",
        });
      }

      for (const taxa of fatura.taxas ?? []) {
        linhas.push({
          id: taxa.id ?? `l-migrada-${unidade}-${linhas.length}`,
          nome: taxa.nome ?? "",
          valor: taxa.valor ?? "",
          comportamento: "igual",
        });
      }

      return { unidade, consumo: fatura.consumo ?? "", linhas };
    };

    return migrar(
      {
        ...estado,
        faturas: {
          luz: converter(estado.faturas?.luz, "kwh"),
          agua: converter(estado.faturas?.agua, "m3"),
        },
      },
      3,
    );
  }

  if (versao === 3) {
    const converter = (fatura) => {
      if (!fatura) return fatura;
      const { consumo, ...resto } = fatura;
      const total = numero(consumo);
      if (total <= 0) return resto;

      const linhas = [...(resto.linhas ?? [])];
      const alvo = linhas.findIndex((l) => l.comportamento === "consumo");

      if (alvo >= 0) {
        linhas[alvo] = { ...linhas[alvo], quantidade: String(total) };
      } else {
        linhas.unshift({
          id: `l-migrada-${resto.unidade}-quantidade`,
          nome: resto.unidade === "kwh" ? "Energia elétrica" : "Tarifa água",
          quantidade: String(total),
          valor: "",
          comportamento: "consumo",
        });
      }

      return { ...resto, linhas };
    };

    return migrar(
      {
        ...estado,
        faturas: {
          luz: converter(estado.faturas?.luz),
          agua: converter(estado.faturas?.agua),
        },
      },
      4,
    );
  }

  // v4 → v5: o conjunto passa a saber de que modo ele é. Todo conjunto que já
  // existia foi preenchido como república, que é o que o app era até aqui.
  if (versao === 4) {
    return migrar({ ...estado, modo: estado.modo ?? PADRAO }, 5);
  }

  // v5 → v6: entram as tarefas (trabalho de quem mora, sem dinheiro). Conjunto
  // antigo não tinha nenhuma, e lista vazia é exatamente a verdade sobre ele.
  if (versao === 5) {
    return { ...estado, tarefas: Array.isArray(estado.tarefas) ? estado.tarefas : [] };
  }

  return null;
}

function eventosDeDiasAntigos(item) {
  const porPessoa = item.diasPorPessoa;
  if (!porPessoa || typeof porPessoa !== "object") return [];

  const eventos = [];
  for (const [id, dias] of Object.entries(porPessoa)) {
    if (!Array.isArray(dias)) continue;
    for (const data of dias) {
      if (typeof data === "string") {
        eventos.push({ id: `ev-${id}-${data}`, data, quantidade: "1", participantes: [id] });
      }
    }
  }

  return eventos.sort((a, b) => a.data.localeCompare(b.data));
}

const soDatas = (v) => (Array.isArray(v) ? v.filter((d) => typeof d === "string") : undefined);

export function sanear(estado) {
  return {
    ...estado,
    modo: typeof estado.modo === "string" ? estado.modo : PADRAO,
    moradores: estado.moradores.filter(Boolean).map((m) => ({
      ...m,
      nome: typeof m.nome === "string" ? m.nome : "",
      diasFora: typeof m.diasFora === "string" ? m.diasFora : "",
      ausencias: soDatas(m.ausencias),
      presencas: soDatas(m.presencas),
    })),
    tarefas: (Array.isArray(estado.tarefas) ? estado.tarefas : [])
      .filter(Boolean)
      .map((t) => ({
        ...t,
        nome: typeof t.nome === "string" ? t.nome : "",
        data: typeof t.data === "string" ? t.data : null,
        responsaveis: Array.isArray(t.responsaveis) ? t.responsaveis : [],
        observacao: typeof t.observacao === "string" ? t.observacao : "",
      })),
    itens: estado.itens.filter(Boolean).map((i) => ({
      ...i,
      participantes: Array.isArray(i.participantes) ? i.participantes : [],
      usosPorPessoa:
        i.usosPorPessoa && typeof i.usosPorPessoa === "object" ? i.usosPorPessoa : {},
      eventos: Array.isArray(i.eventos) ? i.eventos : eventosDeDiasAntigos(i),
      rateios: Array.isArray(i.rateios) ? i.rateios : ["igual", "dias", "uso"],
    })),
  };
}

function pareceUmaCasa(estado) {
  return Boolean(
    estado &&
      typeof estado === "object" &&
      estado.periodo &&
      typeof estado.periodo.mes === "number" &&
      typeof estado.periodo.ano === "number" &&
      estado.faturas &&
      typeof estado.faturas === "object" &&
      estado.faturas.luz &&
      Array.isArray(estado.faturas.luz.linhas) &&
      estado.faturas.agua &&
      Array.isArray(estado.faturas.agua.linhas) &&
      Array.isArray(estado.moradores) &&
      Array.isArray(estado.itens),
  );
}

export { pareceUmaCasa };
