// Persistência: os conjuntos salvos neste navegador.
//
// Duas chaves de natureza diferente:
//
//   ceder:conjuntos      → o índice. Uma ficha por conjunto (nome, modo, mês) e
//                          qual deles está aberto. É o que o painel lê, sem
//                          abrir nenhum.
//   ceder:conjunto:<id>  → o estado de um conjunto. Só é lido quando ele abre.
//
// Guardar o índice separado é o que faz o painel abrir rápido com trinta
// conjuntos salvos: listar não custa carregar.
//
// Até a v10 as chaves eram `cdr:casas` e `cdr:casa:<id>`. Na primeira leitura
// sem o índice novo, o índice antigo e cada conjunto são COPIADOS para as
// chaves novas, sem transformação (a migração do estado acontece ao abrir, como
// sempre). As chaves antigas ficam onde estavam, como cópia de segurança: uma
// falha aqui não pode custar o conjunto de ninguém.
//
// Tudo isto vive no localStorage deste navegador. Limpar os dados do site
// apaga os conjuntos, e nenhum outro aparelho os vê   por isso
// `exportarConjunto` e `importarConjunto` existem, e por isso o painel oferece
// o download.

import { calibragemFixa, PADRAO, presetValido } from "./modos.js";
import { RECURSOS, REGRAS_DO_CICLO } from "./ciclos.js";
import { corteValido } from "./calendario.js";
import { especiesDe } from "./catalogo.js";

const tabela = (t) => (t && typeof t === "object" && !Array.isArray(t) ? t : {});

const INDICE = "ceder:conjuntos";
const PREFIXO = "ceder:conjunto:";

/** As chaves de antes da v10, lidas uma vez para copiar e nunca apagadas. */
const INDICE_CDR = "cdr:casas";
const PREFIXO_CDR = "cdr:casa:";

/** A chave única de antes da v5, quando só existia uma casa. */
const CHAVE_ANTIGA = "cdr:casa";

const VERSAO = 11;

function deposito() {
  try {
    const teste = "ceder:teste";
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

const novoIdDeConjunto = () =>
  `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ── o índice ───────────────────────────────────────────────────────────────

const indiceVazio = () => ({ versao: VERSAO, atual: null, conjuntos: [] });

/** Lê um índice, novo (`conjuntos`) ou antigo (`casas`), na forma nova. */
function lerIndice(guarda, chave = INDICE) {
  const cru = ler(guarda, chave);
  const lista = Array.isArray(cru?.conjuntos) ? cru.conjuntos : Array.isArray(cru?.casas) ? cru.casas : null;
  if (!lista) return null;

  return {
    versao: VERSAO,
    atual: typeof cru.atual === "string" ? cru.atual : null,
    conjuntos: lista.filter((c) => c && typeof c.id === "string"),
  };
}

/** A ficha que o painel mostra, derivada do estado do conjunto. */
function fichaDe(id, nome, estado, antes) {
  return {
    id,
    nome: nome || "Conjunto sem nome",
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

// ── as chaves antigas ──────────────────────────────────────────────────────

/**
 * Copia o índice `cdr:casas` e cada `cdr:casa:<id>` para as chaves novas.
 * Devolve o índice copiado, ou null se não havia índice antigo. Um conjunto
 * cuja cópia falhar sai do índice novo, mas continua inteiro na chave antiga.
 */
function copiarChavesCdr(guarda) {
  const antigo = lerIndice(guarda, INDICE_CDR);
  if (!antigo) return null;

  const copiados = antigo.conjuntos.filter((ficha) => {
    try {
      const cru = guarda.getItem(PREFIXO_CDR + ficha.id);
      if (cru === null) return false;
      guarda.setItem(PREFIXO + ficha.id, cru);
      return true;
    } catch {
      return false;
    }
  });

  return {
    ...antigo,
    conjuntos: copiados,
    atual: copiados.some((c) => c.id === antigo.atual) ? antigo.atual : null,
  };
}

// Antes da v5 havia uma casa só, em `cdr:casa`. Ela vira o primeiro conjunto
// do índice, com um nome que a pessoa reconheça, e a chave antiga sai do
// caminho (isso já era assim antes das chaves novas).

function adotarCasaAntiga(guarda) {
  const pacote = ler(guarda, CHAVE_ANTIGA);
  if (!pacote) return null;

  const estado = migrar(pacote.estado, pacote.versao);
  if (!estado || !pareceUmConjunto(estado)) {
    try {
      guarda.removeItem(CHAVE_ANTIGA);
    } catch {}
    return null;
  }

  const limpo = sanear(estado);
  const id = novoIdDeConjunto();

  escrever(guarda, PREFIXO + id, { versao: VERSAO, estado: limpo });

  try {
    guarda.removeItem(CHAVE_ANTIGA);
  } catch {}

  return fichaDe(id, "Meu conjunto", limpo, null);
}

/** O índice, criando-o (e trazendo o que houver nas chaves antigas) se for a primeira vez. */
function indiceVivo(guarda) {
  const existente = lerIndice(guarda);
  if (existente) return existente;

  const copiado = copiarChavesCdr(guarda);
  if (copiado) {
    guardarIndice(guarda, copiado);
    return copiado;
  }

  const indice = indiceVazio();
  const adotada = adotarCasaAntiga(guarda);

  if (adotada) {
    indice.conjuntos = [adotada];
    indice.atual = adotada.id;
  }

  guardarIndice(guarda, indice);
  return indice;
}

// ── o que a tela usa ───────────────────────────────────────────────────────

/** As fichas de todos os conjuntos salvos, do mais recente para o mais antigo. */
export function listarConjuntos() {
  const guarda = deposito();
  if (!guarda) return [];

  return [...indiceVivo(guarda).conjuntos].sort((a, b) =>
    String(b.salvaEm ?? "").localeCompare(String(a.salvaEm ?? "")),
  );
}

/** Qual conjunto estava aberto da última vez. */
export function conjuntoAtual() {
  const guarda = deposito();
  if (!guarda) return null;

  const indice = indiceVivo(guarda);
  return indice.conjuntos.some((c) => c.id === indice.atual) ? indice.atual : null;
}

export function definirConjuntoAtual(id) {
  const guarda = deposito();
  if (!guarda) return;

  const indice = indiceVivo(guarda);
  guardarIndice(guarda, { ...indice, atual: id ?? null });
}

/** O estado de um conjunto, ou null se ele não existe ou não presta. */
export function carregarConjunto(id) {
  const guarda = deposito();
  if (!guarda || !id) return null;

  const pacote = ler(guarda, PREFIXO + id);
  if (!pacote) return null;

  const estado = migrar(pacote.estado, pacote.versao);
  if (!estado || !pareceUmConjunto(estado)) return null;

  return sanear(estado);
}

/** Salva o estado e atualiza a ficha. Devolve se conseguiu. */
export function salvarConjunto(id, estado) {
  const guarda = deposito();
  if (!guarda || !id || !pareceUmConjunto(estado)) return false;

  const ok = escrever(guarda, PREFIXO + id, { versao: VERSAO, estado });
  if (!ok) return false;

  const indice = indiceVivo(guarda);
  const antes = indice.conjuntos.find((c) => c.id === id);
  if (!antes) return false;

  guardarIndice(guarda, {
    ...indice,
    conjuntos: indice.conjuntos.map((c) =>
      c.id === id ? fichaDe(id, antes.nome, estado, antes) : c,
    ),
  });

  return true;
}

/** Cria um conjunto a partir de um estado pronto. Devolve o id. */
export function criarConjunto(nome, estado) {
  const guarda = deposito();
  const id = novoIdDeConjunto();
  if (!guarda) return id;

  const indice = indiceVivo(guarda);
  const ficha = fichaDe(id, nome, estado, null);

  escrever(guarda, PREFIXO + id, { versao: VERSAO, estado });
  guardarIndice(guarda, {
    ...indice,
    atual: id,
    conjuntos: [...indice.conjuntos, ficha],
  });

  return id;
}

export function renomearConjunto(id, nome) {
  const guarda = deposito();
  if (!guarda) return;

  const indice = indiceVivo(guarda);
  guardarIndice(guarda, {
    ...indice,
    conjuntos: indice.conjuntos.map((c) =>
      c.id === id ? { ...c, nome: nome.trim() || c.nome } : c,
    ),
  });
}

export function removerConjunto(id) {
  const guarda = deposito();
  if (!guarda) return;

  const indice = indiceVivo(guarda);
  const restantes = indice.conjuntos.filter((c) => c.id !== id);

  try {
    guarda.removeItem(PREFIXO + id);
  } catch {}

  guardarIndice(guarda, {
    ...indice,
    conjuntos: restantes,
    atual: indice.atual === id ? null : indice.atual,
  });
}

// ── sair e voltar do navegador ─────────────────────────────────────────────

/** O conjunto num texto que dá para guardar em arquivo e trazer de volta. */
export function exportarConjunto(id) {
  const estado = carregarConjunto(id);
  if (!estado) return null;

  const ficha = listarConjuntos().find((c) => c.id === id);

  return JSON.stringify(
    {
      // Arquivos de antes da v10 dizem "casa"; os dois são aceitos na volta.
      ceder: "conjunto",
      versao: VERSAO,
      exportadoEm: agora(),
      nome: ficha?.nome ?? "Conjunto",
      estado,
    },
    null,
    2,
  );
}

/** Traz de volta um conjunto exportado. Devolve o id novo, ou null. */
export function importarConjunto(texto) {
  let pacote;
  try {
    pacote = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!pacote || typeof pacote !== "object") return null;

  const estado = migrar(pacote.estado, pacote.versao);
  if (!estado || !pareceUmConjunto(estado)) return null;

  return criarConjunto(nomeLivre(pacote.nome ?? "Conjunto importado"), sanear(estado));
}

/**
 * Um nome que ainda não está em uso no painel.
 *
 * Importar o mesmo arquivo duas vezes é fácil de fazer sem querer, e antes
 * deixava três linhas chamadas "República da Serra" sem jeito de saber qual
 * era qual. A cópia ganha um número; o original fica como está.
 */
function nomeLivre(nome) {
  const usados = new Set(listarConjuntos().map((c) => c.nome));
  if (!usados.has(nome)) return nome;

  for (let n = 2; n < 100; n++) {
    const tentativa = `${nome} (${n})`;
    if (!usados.has(tentativa)) return tentativa;
  }

  return `${nome} (${Date.now()})`;
}

// ── migração do estado de um conjunto ──────────────────────────────────────

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
    return migrar({ ...estado, tarefas: Array.isArray(estado.tarefas) ? estado.tarefas : [] }, 6);
  }

  // v6 → v7: faturas e itens passam a saber quem pagou. Conjunto antigo não
  // declarou ninguém, e `null` é exatamente isso: ninguém declarado ainda.
  // O acerto mostra o buraco em vez de inventar um pagador.
  if (versao === 6) {
    const comPagador = (o) => ({ ...o, pagoPor: o?.pagoPor ?? null });

    return migrar({
      ...estado,
      faturas: {
        luz: comPagador(estado.faturas?.luz),
        agua: comPagador(estado.faturas?.agua),
      },
      itens: (estado.itens ?? []).map(comPagador),
    }, 7);
  }

  // v7 → v8: a casa passa a poder escolher quem fica com o centavo que sobra.
  // Conjunto antigo não escolheu, e null é exatamente isso.
  if (versao === 7) {
    return migrar({ ...estado, quemCede: estado.quemCede ?? null }, 8);
  }

  // v8 → v9: a data do item deixa de ser só um dia e passa a poder ser um
  // período. Item antigo tem no máximo um dia marcado, e `ate: null` quer
  // dizer exatamente isso   dia único, não período de um dia só.
  if (versao === 8) {
    return migrar({
      ...estado,
      itens: (estado.itens ?? []).map((i) => ({ ...i, ate: i?.ate ?? null })),
    }, 9);
  }

  // v9 → v10: luz e água deixam de ser duas faturas fixas e viram os dois
  // primeiros ciclos de uma lista, com os ids "luz" e "agua". Nada no valor
  // muda: o mesmo conjunto fecha com os mesmos números. Junto vêm o corte
  // (null: ninguém escolheu ainda) e os nomes novos dos itens   o ciclo de
  // onde sai o consumo, o consumo por uso de cada ciclo e os registros de uso,
  // que antes se chamavam `eventos`.
  if (versao === 9) {
    const f = estado.faturas ?? {};
    const ciclo = (id, nome, recurso, fatura) => ({
      id,
      nome,
      recurso,
      ativa: fatura?.ativa !== false,
      janela: fatura?.janela ?? null,
      vencimento: null,
      pagoPor: fatura?.pagoPor ?? null,
      linhas: Array.isArray(fatura?.linhas) ? fatura.linhas : [],
    });

    const { faturas: _faturas, ...resto } = estado;

    return migrar({
      ...resto,
      ciclos: [ciclo("luz", "Luz", "kwh", f.luz), ciclo("agua", "Água", "m3", f.agua)],
      corte: null,
      itens: (estado.itens ?? []).map((i) => {
        if (!i || typeof i !== "object") return i;
        const { unidade, kwhPorUso, m3PorUso, eventos, ...item } = i;
        // Um item da v9 tem `unidade` e `kwhPorUso`; se ele já vier com os
        // campos novos (um arquivo meio editado à mão), os novos ficam.
        const temUnidade = unidade !== undefined;
        const temPorUso = kwhPorUso !== undefined || m3PorUso !== undefined;
        return {
          ...item,
          ciclo: temUnidade ? (unidade === "m3" ? "agua" : "luz") : (item.ciclo ?? "luz"),
          porUsoPorCiclo: temPorUso
            ? { luz: kwhPorUso ?? "", agua: m3PorUso ?? "" }
            : (item.porUsoPorCiclo ?? { luz: "", agua: "" }),
          ...(Array.isArray(eventos) ? { registrosDeUso: eventos } : {}),
        };
      }),
    }, 10);
  }

  // v10 → v11: um aparelho pode puxar de mais de um ciclo (o chuveiro gasta
  // luz e água). O consumo deixa de ser um número com um ciclo e vira uma
  // tabela por ciclo, uma por jeito de medir. Item migrado ganha a escolha de
  // ciclos livre: nada do que ele fazia some da tela. Conta só de valor criada
  // na v10 dividia pela régua do uso comum, e continua assim ("comum"). O
  // evento ganha o interruptor de evento longo, desligado.
  if (versao === 10) {
    return migrar({
      ...estado,
      eventoLongo: Boolean(estado.eventoLongo),
      ciclos: (estado.ciclos ?? []).map((c) =>
        c && c.recurso == null && !c.rateio ? { ...c, rateio: "comum" } : c,
      ),
      itens: (estado.itens ?? []).map((i) => {
        if (!i || typeof i !== "object") return i;
        const { ciclo, quantidade, porHora, ...item } = i;
        const medido = i.especie === "consumo" || i.especie === "porHora";
        const naTabela = (valor) => (medido && ciclo ? { [ciclo]: valor ?? "" } : {});
        return {
          ...item,
          especies: medido ? ["consumo", "porHora"] : [i.especie],
          ciclosLivres: medido || (i.especie === "porUso" && i.origemUso !== "reais"),
          consumoPorCiclo: item.consumoPorCiclo ?? naTabela(quantidade),
          porHoraPorCiclo: item.porHoraPorCiclo ?? naTabela(porHora),
          porUsoPorCiclo: item.porUsoPorCiclo ?? {},
        };
      }),
    }, 11);
  }

  return null;
}

function registrosDeDiasAntigos(item) {
  const porPessoa = item.diasPorPessoa;
  if (!porPessoa || typeof porPessoa !== "object") return [];

  const registros = [];
  for (const [id, dias] of Object.entries(porPessoa)) {
    if (!Array.isArray(dias)) continue;
    for (const data of dias) {
      if (typeof data === "string") {
        registros.push({ id: `ev-${id}-${data}`, data, quantidade: "1", participantes: [id] });
      }
    }
  }

  return registros.sort((a, b) => a.data.localeCompare(b.data));
}

const soDatas = (v) => (Array.isArray(v) ? v.filter((d) => typeof d === "string") : undefined);

export function sanear(estado) {
  const modo = typeof estado.modo === "string" ? estado.modo : PADRAO;

  // Preset ausente ou desconhecido vira Livre (`presetValido` com null), que
  // mantém a régua visível e a calibragem gravada: um conjunto antigo abre
  // exatamente como estava. Preset fechado manda na calibragem, para um
  // arquivo editado à mão não esconder uma régua torta.
  const preset = presetValido(modo, typeof estado.preset === "string" ? estado.preset : null);
  const fixa = calibragemFixa({ modo, preset });

  return {
    ...estado,
    modo,
    preset,
    ...(fixa === null ? {} : { calibragem: fixa }),
    quemCede: typeof estado.quemCede === "string" ? estado.quemCede : null,
    // O corte é um período { de, ate } escolhido pelo grupo; da v11 pode vir
    // ainda como um dia do mês, que continua valendo.
    corte: corteValido(estado.corte)
      ? typeof estado.corte === "object"
        ? { de: estado.corte.de, ate: estado.corte.ate }
        : estado.corte
      : null,
    eventoLongo: Boolean(estado.eventoLongo),
    ciclos: estado.ciclos.filter(Boolean).map((c, i) => ({
      ...c,
      id: typeof c.id === "string" && c.id ? c.id : `c-sem-id-${i}`,
      nome: typeof c.nome === "string" ? c.nome : "",
      recurso: RECURSOS[c.recurso] ? c.recurso : null,
      ativa: c.ativa !== false,
      janela: c.janela && typeof c.janela === "object" ? c.janela : null,
      vencimento: typeof c.vencimento === "string" ? c.vencimento : null,
      pagoPor: typeof c.pagoPor === "string" ? c.pagoPor : null,
      linhas: Array.isArray(c.linhas) ? c.linhas.filter(Boolean) : [],
      // Só conta só de valor tem regra própria; sem regra válida, segue a régua.
      ...(RECURSOS[c.recurso]
        ? {}
        : {
            rateio: REGRAS_DO_CICLO.includes(c.rateio) ? c.rateio : "comum",
            porcentagens: c.porcentagens && typeof c.porcentagens === "object" ? c.porcentagens : {},
          }),
    })),
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
      pagoPor: typeof i.pagoPor === "string" ? i.pagoPor : null,
      data: typeof i.data === "string" ? i.data : null,
      // Fim do período. Só vale com um começo: `ate` sem `data` seria um
      // período que não começa, e isso não é uma data nem é nada.
      ate: typeof i.data === "string" && typeof i.ate === "string" ? i.ate : null,
      usosPorPessoa:
        i.usosPorPessoa && typeof i.usosPorPessoa === "object" ? i.usosPorPessoa : {},
      especies: Array.isArray(i.especies) && i.especies.length > 0 ? i.especies : especiesDe(i),
      ciclosLivres: Boolean(i.ciclosLivres),
      consumoPorCiclo: tabela(i.consumoPorCiclo),
      porHoraPorCiclo: tabela(i.porHoraPorCiclo),
      porUsoPorCiclo: tabela(i.porUsoPorCiclo),
      registrosDeUso: Array.isArray(i.registrosDeUso) ? i.registrosDeUso : registrosDeDiasAntigos(i),
      rateios: Array.isArray(i.rateios) ? i.rateios : ["igual", "dias", "uso"],
    })),
  };
}

function pareceUmConjunto(estado) {
  return Boolean(
    estado &&
      typeof estado === "object" &&
      estado.periodo &&
      typeof estado.periodo.mes === "number" &&
      typeof estado.periodo.ano === "number" &&
      Array.isArray(estado.ciclos) &&
      estado.ciclos.every((c) => !c || Array.isArray(c.linhas)) &&
      Array.isArray(estado.moradores) &&
      Array.isArray(estado.itens),
  );
}

export { pareceUmConjunto };

/**
 * A migração do estado, exposta para os testes: um conjunto escrito numa
 * versão antiga sobe para a atual exatamente como subiria ao ser aberto.
 */
export const migrarEstado = (estado, versao) => migrar(estado, versao);
