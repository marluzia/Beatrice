
const CHAVE = "cdr:casa";

const VERSAO = 4;

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

export function salvarCasa(estado) {
  const guarda = deposito();
  if (!guarda) return false;
  try {
    guarda.setItem(CHAVE, JSON.stringify({ versao: VERSAO, estado }));
    return true;
  } catch {
    return false;
  }
}

export function carregarCasa() {
  const guarda = deposito();
  if (!guarda) return null;

  let cru;
  try {
    cru = guarda.getItem(CHAVE);
  } catch {
    return null;
  }
  if (!cru) return null;

  try {
    const pacote = JSON.parse(cru);
    if (!pacote) return null;

    const estado = migrar(pacote.estado, pacote.versao);
    if (!estado) return null;

    return pareceUmaCasa(estado) ? sanear(estado) : null;
  } catch {
    return null;
  }
}

export function limparCasa() {
  const guarda = deposito();
  if (!guarda) return;
  try {
    guarda.removeItem(CHAVE);
  } catch {}
}

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

    return {
      ...estado,
      faturas: {
        luz: converter(estado.faturas?.luz),
        agua: converter(estado.faturas?.agua),
      },
    };
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

export function sanear(estado) {
  return {
    ...estado,
    moradores: estado.moradores.filter(Boolean).map((m) => ({
      ...m,
      nome: typeof m.nome === "string" ? m.nome : "",
      diasFora: typeof m.diasFora === "string" ? m.diasFora : "",
      ausencias: Array.isArray(m.ausencias)
        ? m.ausencias.filter((d) => typeof d === "string")
        : undefined,
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
