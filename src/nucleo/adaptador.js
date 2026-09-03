import {
  calcular as calcularNoMotor,
  rateiosPermitidos,
  diasDoPeriodo,
  consumoDeclaradoPorHora,
} from "./motor.ts";
import { nomeOu, num } from "./formato.js";
import {
  dentroDaJanela,
  diasDaJanela,
  diasNaJanela,
  cicloValido,
  faturaAtiva,
  janelaDoFechamento,
  janelaDoMes,
  janelaValida,
} from "./calendario.js";

export const eventosDe = (item) => (Array.isArray(item.eventos) ? item.eventos : []);

export const temUsoDatado = (item) => eventosDe(item).length > 0;

export function parteNoEvento(evento, id) {
  const participantes = evento?.participantes ?? [];
  if (!participantes.includes(id)) return 0;

  const quantidade = num(evento.quantidade);
  return (quantidade > 0 ? quantidade : 1) / participantes.length;
}

const usosDe = (item, id) => {
  const eventos = eventosDe(item);
  if (eventos.length === 0) return num(item.usosPorPessoa?.[id]);
  return eventos.reduce((soma, e) => soma + parteNoEvento(e, id), 0);
};

const usosPorJanela = (item, janela) =>
  Object.fromEntries(
    (item.participantes ?? []).map((id) => {
      const eventos = eventosDe(item);
      if (eventos.length === 0) return [id, num(item.usosPorPessoa?.[id])];

      const dentro = eventos
        .filter((e) => dentroDaJanela(e.data, janela))
        .reduce((soma, e) => soma + parteNoEvento(e, id), 0);
      return [id, dentro];
    }),
  );

export function orfasDoItem(item, faturas, periodo) {
  if (item.especie !== "porUso" || item.origemUso !== "fatura") return [];

  const ciclos = [
    ["luz", faturas.luz],
    ["agua", faturas.agua],
  ]
    .filter(([, fatura]) => faturaAtiva(fatura))
    .map(([qual, fatura]) => [qual, janelaDaFatura(fatura, periodo)]);

  const achados = [];

  for (const evento of eventosDe(item)) {
    for (const [qual, janela] of ciclos) {
      if (dentroDaJanela(evento.data, janela)) continue;

      achados.push({
        itemId: item.id,
        item: item.nome,
        eventoId: evento.id,
        dia: evento.data,
        quantidade: num(evento.quantidade) || 1,
        participantes: evento.participantes ?? [],
        faltando: qual,
        quando: evento.data < janela.de ? "passado" : "futuro",
      });
    }
  }

  return achados.sort((a, b) => String(a.dia).localeCompare(String(b.dia)));
}

export const lavagensForaDoCiclo = (estado) =>
  estado.itens.flatMap((item) => orfasDoItem(item, estado.faturas, estado.periodo));

export const unidadeDoItem = (item) => item.unidade;

export function faltaParaItem(item, faturas) {
  const precisa = new Set();

  if (item.especie === "consumo" || item.especie === "porHora") {
    precisa.add(item.unidade);
  }
  if (item.especie === "porUso" && item.origemUso === "fatura") {
    if (faturaAtiva(faturas?.luz)) precisa.add("kwh");
    if (faturaAtiva(faturas?.agua)) precisa.add("m3");
    if (precisa.size === 0) precisa.add("kwh");
  }

  const faltando = [];

  for (const unidade of precisa) {
    const qual = unidade === "kwh" ? "luz" : "agua";
    const nome = unidade === "kwh" ? "luz" : "água";
    const fatura = faturas?.[qual];

    if (!faturaAtiva(fatura)) {
      faltando.push(`a conta de ${nome} não está neste fechamento`);
      continue;
    }
    if (consumoDaFatura(fatura) <= 0) {
      faltando.push(`o consumo da ${nome}, em ${unidade === "kwh" ? "kWh" : "m³"}`);
    }
    if (valorDoConsumo(fatura) === 0) {
      faltando.push(`as linhas de consumo da fatura de ${nome}`);
    }
  }

  return faltando;
}

export function itemParaMotor(item, janelas, faturas) {
  const custo =
    item.especie === "consumo"
      ? { tipo: "consumo", quantidade: num(item.quantidade), unidade: item.unidade }
      : item.especie === "porHora"
      ? {
          tipo: "porHora",
          porHora: num(item.porHora),
          horas: num(item.horas),
          unidade: item.unidade,
        }
      : item.especie === "porUso"
        ? {
            tipo: "porUso",
            usosTotais: num(item.usos),
            unitario:
              item.origemUso === "reais"
                ? { origem: "reais", valorPorUso: num(item.valorPorUso) }
                : {
                    origem: "fatura",
                    kwhPorUso: num(item.kwhPorUso),
                    m3PorUso: num(item.m3PorUso),
                  },
          }
        : { tipo: "reais", valor: num(item.valor) };

  const rateio =
    item.rateio === "uso"
      ? {
          tipo: "uso",
          usos: Object.fromEntries(
            (item.participantes ?? []).map((id) => [id, usosDe(item, id)]),
          ),
          ...(temUsoDatado(item) && janelas
            ? {
                usosLuz: usosPorJanela(item, janelas.luz),
                usosAgua: usosPorJanela(item, janelas.agua),
              }
            : {}),
        }
      : { tipo: item.rateio };

  return {
    id: item.id,
    nome: item.nome?.trim() || "Item sem nome",
    custo,
    participantes: item.participantes ?? [],
    rateio,
    rateiosDoItem: item.rateios,
  };
}

export function linhasPorComportamento(fatura, comportamento) {
  return (fatura?.linhas ?? []).filter(
    (l) => l.comportamento === comportamento && num(l.valor) !== 0,
  );
}

export function valorDoConsumo(fatura) {
  const linhas = fatura?.linhas ?? [];
  return linhas
    .filter((l) => l.comportamento === "consumo" || l.comportamento === "abatimento")
    .reduce((s, l) => s + num(l.valor), 0);
}

export function consumoMedido(fatura) {
  return linhasPorComportamento(fatura, "consumo").reduce((s, l) => s + num(l.quantidade), 0);
}

export function consumoDaFatura(fatura) {
  return consumoMedido(fatura);
}

export function totalDasTaxas(fatura) {
  return linhasPorComportamento(fatura, "igual").reduce((s, l) => s + num(l.valor), 0);
}

export function totalDaFatura(fatura) {
  return valorDoConsumo(fatura) + totalDasTaxas(fatura);
}

export function tarifaDaFatura(fatura) {
  const quantidade = consumoDaFatura(fatura);
  return quantidade > 0 ? valorDoConsumo(fatura) / quantidade : 0;
}

function faturaParaMotor(fatura, qual) {
  if (!faturaAtiva(fatura)) {
    return qual === "luz"
      ? { luzKwh: 0, luzValor: 0, luzTaxas: [] }
      : { aguaM3: 0, aguaValor: 0, aguaTaxas: [] };
  }

  const consumo = consumoDaFatura(fatura);
  const taxas = linhasPorComportamento(fatura, "igual").map((l) => ({
    nome: l.nome ?? "",
    valor: num(l.valor),
  }));

  const total = totalDaFatura(fatura);

  return qual === "luz"
    ? { luzKwh: consumo, luzValor: total, luzTaxas: taxas }
    : { aguaM3: consumo, aguaValor: total, aguaTaxas: taxas };
}

export function diasForaNaJanela(morador, janela) {
  if (Array.isArray(morador.ausencias)) return diasNaJanela(morador.ausencias, janela);
  return num(morador.diasFora);
}

export const janelaDaFatura = (fatura, periodo) =>
  cicloValido(fatura?.janela) ? fatura.janela : janelaDoMes(periodo);

export function paraMotor(estado) {
  const { periodo } = estado;
  const doFechamento = janelaDoFechamento(estado.faturas, periodo);
  const daLuz = janelaDaFatura(estado.faturas.luz, periodo);
  const daAgua = janelaDaFatura(estado.faturas.agua, periodo);

  return {
    periodo: {
      ...periodo,
      dias: diasDaJanela(doFechamento, periodo),
      diasLuz: diasDaJanela(daLuz, periodo),
      diasAgua: diasDaJanela(daAgua, periodo),
    },
    faturas: {
      ...faturaParaMotor(estado.faturas.luz, "luz"),
      ...faturaParaMotor(estado.faturas.agua, "agua"),
    },
    moradores: estado.moradores.map((m) => ({
      id: m.id,
      nome: m.nome,
      diasFora: diasForaNaJanela(m, doFechamento),
      diasForaLuz: diasForaNaJanela(m, daLuz),
      diasForaAgua: diasForaNaJanela(m, daAgua),
    })),
    itens: estado.itens.map((i) => itemParaMotor(i, { luz: daLuz, agua: daAgua }, estado.faturas)),
  };
}

function alertaDeLavagens(estado) {
  const foras = lavagensForaDoCiclo(estado);
  if (foras.length === 0) return [];

  const nome = (id) => {
    const i = estado.moradores.findIndex((m) => m.id === id);
    return i < 0 ? "alguém" : nomeOu(estado.moradores[i].nome, i);
  };
  const curto = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  const futuras = foras.filter((f) => f.quando === "futuro");
  const passadas = foras.filter((f) => f.quando === "passado");
  const alertas = [];

  if (futuras.length > 0) {
    const quais = futuras
      .map((f) => `${nome(f.moradorId)} em ${curto(f.dia)} (${f.faltando === "luz" ? "luz" : "água"})`)
      .join("; ");
    alertas.push({
      nivel: "aviso",
      texto: `Estas lavagens caíram depois do fim de um dos ciclos: ${quais}. Essa parte vem na próxima fatura, então não está cobrada aqui. Marque os mesmos dias no fechamento do mês que vem.`,
    });
  }

  if (passadas.length > 0) {
    const quais = passadas
      .map((f) => `${nome(f.moradorId)} em ${curto(f.dia)} (${f.faltando === "luz" ? "luz" : "água"})`)
      .join("; ");
    alertas.push({
      nivel: "aviso",
      texto: `Estas lavagens aconteceram antes de um dos ciclos começar: ${quais}. Essa parte entrou na fatura anterior, que já foi fechada — aqui ela não é cobrada de novo.`,
    });
  }

  return alertas;
}

export const calcular = (estado) => {
  const resultado = calcularNoMotor(paraMotor(estado));
  const extras = alertaDeLavagens(estado);
  return extras.length ? { ...resultado, alertas: [...resultado.alertas, ...extras] } : resultado;
};

export const rateiosDoItem = (item) => rateiosPermitidos(itemParaMotor(item));

export function diasContadosNaFatura(morador, fatura, periodo) {
  const janela = janelaDaFatura(fatura, periodo);
  const dias = diasDaJanela(janela, periodo);
  return Math.max(0, Math.min(dias, dias - diasForaNaJanela(morador, janela)));
}

export function diasContadosDe(morador, periodo, faturas) {
  const janela = faturas ? janelaDoFechamento(faturas, periodo) : janelaDoMes(periodo);
  const dias = diasDaJanela(janela, periodo);
  return Math.max(0, Math.min(dias, dias - diasForaNaJanela(morador, janela)));
}

export const totalDeclaradoPorHora = (item) =>
  consumoDeclaradoPorHora({ porHora: num(item.porHora), horas: num(item.horas) });

export { diasDoPeriodo };
