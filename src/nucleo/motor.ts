

export type MoradorId = string;

export interface Morador {
  id: MoradorId;
  nome: string;
  diasFora: number;
  diasForaLuz?: number;
  diasForaAgua?: number;
}

export type Unidade = "kwh" | "m3";

export type Custo =
  | { tipo: "consumo"; quantidade: number; unidade: Unidade }
  | {
      tipo: "porUso";
      usosTotais?: number;
      usosTotaisLuz?: number;
      usosTotaisAgua?: number;
      unitario:
        | { origem: "fatura"; kwhPorUso: number; m3PorUso: number }
        | { origem: "reais"; valorPorUso: number };
    }
  | { tipo: "porHora"; porHora: number; horas: number; unidade: Unidade }
  | { tipo: "reais"; valor: number };

export type Rateio =
  | { tipo: "igual" }
  | { tipo: "dias" }
  | { tipo: "presenca" }
  | {
      tipo: "uso";
      usos: Record<MoradorId, number>;
      usosLuz?: Record<MoradorId, number>;
      usosAgua?: Record<MoradorId, number>;
    };

export interface Item {
  id: string;
  nome: string;
  custo: Custo;
  participantes: MoradorId[];
  rateio: Rateio;
  rateiosDoItem?: Rateio["tipo"][];
}

export interface TaxaFixa {
  nome: string;
  valor: number;
}

export interface Faturas {
  luzKwh: number;
  luzValor: number;
  luzTaxasFixas?: number;
  luzTaxas?: TaxaFixa[];
  aguaM3: number;
  aguaValor: number;
  aguaTaxasFixas?: number;
  aguaTaxas?: TaxaFixa[];
}

export interface Periodo {
  dias?: number;
  mes: number;
  ano: number;
  diasLuz?: number;
  diasAgua?: number;
}

export interface Estado {
  periodo: Periodo;
  faturas: Faturas;
  moradores: Morador[];
  itens: Item[];
}

export function diasDoPeriodo(periodo: Periodo): number {
  const informado = periodo.dias;
  if (typeof informado === "number" && Number.isFinite(informado) && informado > 0) {
    return Math.min(90, Math.round(informado));
  }
  return new Date(periodo.ano, periodo.mes, 0).getDate();
}

export function rateiosPermitidos(item: Item): Rateio["tipo"][] {
  const estrutural: Rateio["tipo"][] =
    item.custo.tipo === "porUso"
      ? ["igual", "uso"]
      : ["igual", "dias", "presenca", "uso"];
  const doItem = item.rateiosDoItem;
  return doItem ? estrutural.filter((r) => doItem.includes(r)) : estrutural;
}

export const NOMES_DOS_MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export interface Fatia {
  moradorId: MoradorId;
  peso: number;
  proporcao: number;
  total: number;
}

export interface ItemCalculado {
  id: string;
  nome: string;
  automatico: boolean;
  origem: "luz" | "agua" | "reais" | "mista";
  custoTotal: number;
  fatias: Fatia[];
}

export interface TotalMorador {
  moradorId: MoradorId;
  nome: string;
  diasContados: number;
  luz: number;
  agua: number;
  reais: number;
  total: number;
  linhas: { nome: string; valor: number }[];
}

export interface Alerta {
  nivel: "aviso" | "erro";
  texto: string;
}

export interface Resultado {
  diasNoPeriodo: number;
  diasNoPeriodoLuz: number;
  diasNoPeriodoAgua: number;
  tarifaLuz: number;
  tarifaAgua: number;
  diasContados: Record<MoradorId, number>;
  diasContadosLuz: Record<MoradorId, number>;
  diasContadosAgua: Record<MoradorId, number>;
  somaDiasContados: number;
  itens: ItemCalculado[];
  moradores: TotalMorador[];
  sobraLuz: number;
  sobraAgua: number;
  totalEmReais: number;
  somaCobrada: number;
  somaDevida: number;
  diferenca: number;
  somaCobradaArredondada: number;
  residuoDeCentavos: number;
  alertas: Alerta[];
}

const TOLERANCIA = 0.005;

const dividir = (a: number, b: number) => (b > 0 ? a / b : 0);

const emCentavos = (valor: number) => Math.round(valor * 100);

const escrito = (valor: number) => valor.toFixed(2).replace(".", ",");

const plural = (n: number, um: string, muitos: string) =>
  n === 1 ? `1 ${um}` : `${n} ${muitos}`;

export function consumoDeclaradoPorHora(custo: {
  porHora: number;
  horas: number;
}): number {
  return custo.porHora * custo.horas;
}

type Mundo = "luz" | "agua" | null;

function usosTotaisDe(item: Item, mundo: Mundo = null): number {
  if (item.custo.tipo !== "porUso") return 0;

  if (item.rateio.tipo === "uso") {
    const datados =
      mundo === "luz" ? item.rateio.usosLuz : mundo === "agua" ? item.rateio.usosAgua : undefined;
    const usos = datados ?? item.rateio.usos;
    return item.participantes.reduce((s, id) => s + (usos[id] ?? 0), 0);
  }

  const datado =
    mundo === "luz"
      ? item.custo.usosTotaisLuz
      : mundo === "agua"
        ? item.custo.usosTotaisAgua
        : undefined;
  return datado ?? item.custo.usosTotais ?? 0;
}

function custoDe(
  item: Item,
  tarifaLuz: number,
  tarifaAgua: number,
): { luz: number; agua: number; reais: number } {
  const { custo } = item;
  switch (custo.tipo) {
    case "consumo":
      return custo.unidade === "kwh"
        ? { luz: custo.quantidade * tarifaLuz, agua: 0, reais: 0 }
        : { luz: 0, agua: custo.quantidade * tarifaAgua, reais: 0 };
    case "porHora": {
      const quantidade = consumoDeclaradoPorHora(custo);
      return custo.unidade === "kwh"
        ? { luz: quantidade * tarifaLuz, agua: 0, reais: 0 }
        : { luz: 0, agua: quantidade * tarifaAgua, reais: 0 };
    }
    case "porUso": {
      if (custo.unitario.origem !== "fatura") {
        return { luz: 0, agua: 0, reais: usosTotaisDe(item) * custo.unitario.valorPorUso };
      }
      return {
        luz: usosTotaisDe(item, "luz") * custo.unitario.kwhPorUso * tarifaLuz,
        agua: usosTotaisDe(item, "agua") * custo.unitario.m3PorUso * tarifaAgua,
        reais: 0,
      };
    }
    case "reais":
      return { luz: 0, agua: 0, reais: custo.valor };
  }
}

const MAXIMO_PARA_PRESENCA = 12;

export function ausentesEntre(
  participantes: MoradorId[],
  diasContados: Record<MoradorId, number>,
  diasNoPeriodo: number,
): number {
  return participantes.filter((id) => (diasContados[id] ?? 0) < diasNoPeriodo).length;
}

function fatiasPorPresenca(
  participantes: MoradorId[],
  diasContados: Record<MoradorId, number>,
  diasNoPeriodo: number,
): Record<MoradorId, number> {
  const fatias: Record<MoradorId, number> = {};
  for (const id of participantes) fatias[id] = 0;

  const quantos = participantes.length;
  if (quantos === 0) return fatias;
  if (diasNoPeriodo <= 0) {
    for (const id of participantes) fatias[id] = 1 / quantos;
    return fatias;
  }

  const presenca = participantes.map((id) =>
    Math.min(1, Math.max(0, (diasContados[id] ?? 0) / diasNoPeriodo)),
  );

  let ninguem = 0;
  const combinacoes = 1 << quantos;

  for (let mascara = 0; mascara < combinacoes; mascara++) {
    let probabilidade = 1;
    let presentes = 0;
    for (let i = 0; i < quantos; i++) {
      const estaPresente = (mascara >> i) & 1;
      probabilidade *= estaPresente ? presenca[i] : 1 - presenca[i];
      if (estaPresente) presentes++;
    }
    if (probabilidade === 0) continue;
    if (presentes === 0) {
      ninguem += probabilidade;
      continue;
    }
    const porCabeca = probabilidade / presentes;
    for (let i = 0; i < quantos; i++) {
      if ((mascara >> i) & 1) fatias[participantes[i]] += porCabeca;
    }
  }

  if (ninguem > 0) {
    for (const id of participantes) fatias[id] += ninguem / quantos;
  }

  return fatias;
}

function pesosDe(
  item: Item,
  diasContados: Record<MoradorId, number>,
  diasNoPeriodo: number,
  mundo: Mundo = null,
): { pesos: Record<MoradorId, number>; soma: number } {
  const pesos: Record<MoradorId, number> = {};

  const porPresenca =
    item.rateio.tipo === "presenca" && item.participantes.length <= MAXIMO_PARA_PRESENCA;

  if (porPresenca) {
    const fatias = fatiasPorPresenca(item.participantes, diasContados, diasNoPeriodo);
    for (const id of item.participantes) pesos[id] = fatias[id];
  } else {
    for (const id of item.participantes) {
      if (item.rateio.tipo === "dias" || item.rateio.tipo === "presenca") {
        pesos[id] = diasContados[id] ?? 0;
      } else if (item.rateio.tipo === "uso") {
        const datados =
          mundo === "luz"
            ? item.rateio.usosLuz
            : mundo === "agua"
              ? item.rateio.usosAgua
              : undefined;
        pesos[id] = (datados ?? item.rateio.usos)[id] ?? 0;
      } else {
        pesos[id] = 1;
      }
    }
  }

  let soma = Object.values(pesos).reduce((a, b) => a + b, 0);
  if (soma <= 0 && item.participantes.length > 0) {
    for (const id of item.participantes) pesos[id] = 1;
    soma = item.participantes.length;
  }
  return { pesos, soma };
}

function normalizarTaxas(
  lista: TaxaFixa[] | undefined,
  total: number | undefined,
  nomeGenerico: string,
): TaxaFixa[] {
  if (lista && lista.length > 0) {
    return lista
      .filter((t) => Number.isFinite(t.valor) && t.valor !== 0)
      .map((t) => ({ nome: t.nome.trim() || nomeGenerico, valor: t.valor }));
  }
  const soma = total ?? 0;
  return soma > 0 ? [{ nome: nomeGenerico, valor: soma }] : [];
}

const somaDeTaxas = (lista: TaxaFixa[]) => lista.reduce((s, t) => s + t.valor, 0);

export function calcular(estado: Estado): Resultado {
  const { moradores, faturas, itens } = estado;
  const alertas: Alerta[] = [];
  const diasNoPeriodo = diasDoPeriodo(estado.periodo);

  const listaTaxasLuz = normalizarTaxas(faturas.luzTaxas, faturas.luzTaxasFixas, "Taxas fixas da luz");
  const listaTaxasAgua = normalizarTaxas(faturas.aguaTaxas, faturas.aguaTaxasFixas, "Taxas fixas da água");

  const recortar = (lista: TaxaFixa[], valorDaFatura: number, veioDeLista: boolean) => {
    const soma = somaDeTaxas(lista);
    return veioDeLista ? soma : Math.max(0, Math.min(valorDaFatura, soma));
  };

  const taxasLuz = recortar(listaTaxasLuz, faturas.luzValor, Boolean(faturas.luzTaxas?.length));
  const taxasAgua = recortar(listaTaxasAgua, faturas.aguaValor, Boolean(faturas.aguaTaxas?.length));

  const consumoLuz = faturas.luzValor - taxasLuz;
  const consumoAgua = faturas.aguaValor - taxasAgua;

  const tarifaLuz = dividir(consumoLuz, faturas.luzKwh);
  const tarifaAgua = dividir(consumoAgua, faturas.aguaM3);

  const tamanhoDaJanela = (informado: number | undefined) =>
    typeof informado === "number" && Number.isFinite(informado) && informado > 0
      ? Math.min(90, Math.round(informado))
      : diasNoPeriodo;

  const diasNoPeriodoLuz = tamanhoDaJanela(estado.periodo.diasLuz);
  const diasNoPeriodoAgua = tamanhoDaJanela(estado.periodo.diasAgua);

  const presencaEm = (dias: number, fora: (m: Morador) => number) => {
    const contados: Record<MoradorId, number> = {};
    for (const m of moradores) {
      const ausente = Number.isFinite(fora(m)) ? fora(m) : 0;
      contados[m.id] = Math.max(0, Math.min(dias, dias - ausente));
    }
    return contados;
  };

  const diasContados = presencaEm(diasNoPeriodo, (m) => m.diasFora);
  const diasContadosLuz = presencaEm(diasNoPeriodoLuz, (m) => m.diasForaLuz ?? m.diasFora);
  const diasContadosAgua = presencaEm(diasNoPeriodoAgua, (m) => m.diasForaAgua ?? m.diasFora);

  const janelaIgual = (dias: number, contados: Record<MoradorId, number>) =>
    dias === diasNoPeriodo && moradores.every((m) => contados[m.id] === diasContados[m.id]);

  const luzSegueOMes = janelaIgual(diasNoPeriodoLuz, diasContadosLuz);
  const aguaSegueOMes = janelaIgual(diasNoPeriodoAgua, diasContadosAgua);

  const somaDiasContados = moradores.reduce((s, m) => s + diasContados[m.id], 0);
  const todos = moradores.map((m) => m.id);

  const validos = itens.filter((i) => i.participantes.length > 0);
  const orfaos = itens.length - validos.length;
  if (orfaos > 0) {
    alertas.push({
      nivel: "aviso",
      texto:
        orfaos === 1
          ? "Um item está sem ninguém marcado e ficou de fora do rateio."
          : `${orfaos} itens estão sem ninguém marcado e ficaram de fora do rateio.`,
    });
  }

  const custos = validos.map((i) => custoDe(i, tarifaLuz, tarifaAgua));
  const sobraLuz = consumoLuz - custos.reduce((s, c) => s + c.luz, 0);
  const sobraAgua = consumoAgua - custos.reduce((s, c) => s + c.agua, 0);
  const totalEmReais = custos.reduce((s, c) => s + c.reais, 0);

  if (sobraLuz < -TOLERANCIA) {
    alertas.push({
      nivel: "erro",
      texto: `Os itens de consumo elétrico passam em R$ ${escrito(Math.abs(sobraLuz))} o valor da fatura de luz. Revise os kWh informados.`,
    });
  }
  if (sobraAgua < -TOLERANCIA) {
    alertas.push({
      nivel: "erro",
      texto: `Os itens de consumo de água passam em R$ ${escrito(Math.abs(sobraAgua))} o valor da fatura de água. Revise os m³ informados.`,
    });
  }
  if (somaDiasContados === 0 && moradores.length > 0) {
    alertas.push({
      nivel: "aviso",
      texto: "Ninguém passou nenhum dia em casa no período. O uso comum foi dividido em partes iguais.",
    });
  }

  const totais: Record<MoradorId, TotalMorador> = {};
  for (const m of moradores) {
    totais[m.id] = {
      moradorId: m.id, nome: m.nome, diasContados: diasContados[m.id],
      luz: 0, agua: 0, reais: 0, total: 0, linhas: [],
    };
  }

  const calculados: ItemCalculado[] = [];

  const processar = (
    item: Item,
    bruto: { luz: number; agua: number; reais: number },
    automatico: boolean,
  ) => {
    const usoDatado =
      item.rateio.tipo === "uso" && Boolean(item.rateio.usosLuz || item.rateio.usosAgua);

    const noMes = pesosDe(item, diasContados, diasNoPeriodo);
    const naLuz =
      luzSegueOMes && !usoDatado
        ? noMes
        : pesosDe(item, diasContadosLuz, diasNoPeriodoLuz, "luz");
    const naAgua =
      aguaSegueOMes && !usoDatado
        ? noMes
        : pesosDe(item, diasContadosAgua, diasNoPeriodoAgua, "agua");

    const custoTotal = bruto.luz + bruto.agua + bruto.reais;
    const fatias: Fatia[] = [];

    for (const id of item.participantes) {
      const luz = bruto.luz * dividir(naLuz.pesos[id], naLuz.soma);
      const agua = bruto.agua * dividir(naAgua.pesos[id], naAgua.soma);
      const emReais = bruto.reais * dividir(noMes.pesos[id], noMes.soma);
      const total = luz + agua + emReais;

      const proporcao =
        Math.abs(custoTotal) > 1e-12 ? total / custoTotal : dividir(noMes.pesos[id], noMes.soma);

      fatias.push({ moradorId: id, peso: noMes.pesos[id], proporcao, total });

      const alvo = totais[id];
      if (!alvo) continue;
      alvo.luz += luz;
      alvo.agua += agua;
      alvo.reais += emReais;
      alvo.total += total;
      if (Math.abs(total) > 1e-9) alvo.linhas.push({ nome: item.nome, valor: total });
    }

    const origem: ItemCalculado["origem"] =
      bruto.reais !== 0 ? "reais"
        : bruto.luz !== 0 && bruto.agua !== 0 ? "mista"
        : bruto.agua !== 0 ? "agua"
        : "luz";

    calculados.push({ id: item.id, nome: item.nome, automatico, origem, custoTotal, fatias });
  };

  validos.forEach((item, i) => processar(item, custos[i], false));

  const estimados = validos.filter(
    (item) =>
      item.rateio.tipo === "presenca" &&
      ausentesEntre(item.participantes, diasContados, diasNoPeriodo) > 1,
  );

  for (const item of estimados) {
    alertas.push({
      nivel: "aviso",
      texto: `"${item.nome}" divide por presença e mais de uma pessoa do grupo viajou. Sem saber quais dias cada um ficou fora, o CDR supôs que as viagens não coincidiram. Se elas coincidiram, quem ficou em casa sozinho pagou menos do que devia.`,
    });
  }

  if (todos.length > 0) {
    const comum = { participantes: todos, rateio: { tipo: "dias" } as Rateio };
    processar(
      { ...comum, id: "__luz", nome: "Uso comum de luz", custo: { tipo: "reais", valor: sobraLuz } },
      { luz: sobraLuz, agua: 0, reais: 0 },
      true,
    );
    processar(
      { ...comum, id: "__agua", nome: "Uso comum de água", custo: { tipo: "reais", valor: sobraAgua } },
      { luz: 0, agua: sobraAgua, reais: 0 },
      true,
    );

    const taxaIgual = { participantes: todos, rateio: { tipo: "igual" } as Rateio };

    const publicar = (
      lista: TaxaFixa[],
      permitido: number,
      prefixo: string,
      origem: "luz" | "agua",
    ) => {
      const soma = somaDeTaxas(lista);
      if (soma === 0 || permitido === 0) return;
      const ajuste = permitido / soma;

      lista.forEach((taxa, i) => {
        const valor = taxa.valor * ajuste;
        processar(
          {
            ...taxaIgual,
            id: `${prefixo}${i}`,
            nome: taxa.nome,
            custo: { tipo: "reais", valor },
          },
          origem === "luz"
            ? { luz: valor, agua: 0, reais: 0 }
            : { luz: 0, agua: valor, reais: 0 },
          true,
        );
      });
    };

    publicar(listaTaxasLuz, taxasLuz, "__taxa_luz_", "luz");
    publicar(listaTaxasAgua, taxasAgua, "__taxa_agua_", "agua");
  }

  const lista = moradores.map((m) => totais[m.id]);
  const somaCobrada = lista.reduce((s, t) => s + t.total, 0);
  const somaDevida = faturas.luzValor + faturas.aguaValor + totalEmReais;

  const centavosCobrados = lista.reduce((s, t) => s + emCentavos(t.total), 0);
  const residuoDeCentavos = emCentavos(somaDevida) - centavosCobrados;
  const somaCobradaArredondada = centavosCobrados / 100;

  const casaVazia = moradores.length === 0 && Math.abs(somaDevida) > TOLERANCIA;

  if (casaVazia) {
    alertas.push({
      nivel: "erro",
      texto: `Há R$ ${escrito(somaDevida)} a dividir e nenhum morador cadastrado. Cadastre quem morou na casa no período para o rateio existir.`,
    });
  }

  if (!casaVazia && residuoDeCentavos !== 0) {
    const quanto = plural(Math.abs(residuoDeCentavos), "centavo", "centavos");
    alertas.push({
      nivel: "aviso",
      texto:
        residuoDeCentavos > 0
          ? `Arredondando cada pessoa ao centavo, a soma dá R$ ${escrito(somaCobradaArredondada)} e não os R$ ${escrito(somaDevida)} devidos: ${quanto} de menos. Não existe divisão exata aqui. combinem quem cobre a diferença.`
          : `Arredondando cada pessoa ao centavo, a soma dá R$ ${escrito(somaCobradaArredondada)} contra os R$ ${escrito(somaDevida)} devidos: ${quanto} de sobra. Não existe divisão exata aqui. combinem quem fica com a diferença.`,
    });
  }

  return {
    diasNoPeriodo, diasNoPeriodoLuz, diasNoPeriodoAgua,
    tarifaLuz, tarifaAgua,
    diasContados, diasContadosLuz, diasContadosAgua, somaDiasContados,
    itens: calculados, moradores: lista, sobraLuz, sobraAgua, totalEmReais,
    somaCobrada, somaDevida, diferenca: somaCobrada - somaDevida,
    somaCobradaArredondada, residuoDeCentavos, alertas,
  };
}

export function conferir(resultado: Resultado): boolean {
  if (resultado.moradores.length === 0) {
    return Math.abs(resultado.somaDevida) < TOLERANCIA;
  }
  return Math.abs(resultado.diferenca) < TOLERANCIA;
}

export function conferirEmCentavos(resultado: Resultado): boolean {
  return resultado.residuoDeCentavos === 0;
}
