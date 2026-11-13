import { beforeEach, describe, expect, it } from "vitest";
import { comContasLigadas } from "./teste/conjuntoAntigo.js";
import { rateiosDoItem } from "./adaptador.js";
import { montarMensagemDeColeta } from "./coleta.js";
import { criarItem, modeloPorChave } from "./catalogo.js";
import { comRateioDoModo, estadoInicial } from "./estadoInicial.js";
import { modoDe } from "./modos.js";

const EVENTO = modoDe("evento");
const MORADIA = modoDe("moradia");

const evento = () => {
  const e = comContasLigadas(estadoInicial("evento", 3));
  e.periodo = { mes: 6, ano: 2026 };
  e.moradores.forEach((m, i) => { m.nome = ["Ana", "Bruno", "Carla"][i]; });
  // O evento nasce sem despesas; estas duas são as que a pessoa lançou.
  const ids = e.moradores.map((m) => m.id);
  if (e.itens.length === 0) e.itens = [1, 2].map(() => comRateioDoModo(criarItem(modeloPorChave("outra"), ids), EVENTO));
  e.itens.forEach((i, n) => { i.nome = `Despesa ${n + 1}`; i.valor = "60"; });
  return e;
};

const item = (extra = {}) => ({
  id: "i1", nome: "Churrasco", especie: "reais", valor: "120",
  rateio: "igual", rateios: ["igual", "dias", "uso"],
  usosPorPessoa: {}, porcentagens: {}, valores: {},
  data: null, ate: null, pagoPor: null, eventos: [], participantes: ["m1"],
  ...extra,
});

beforeEach(() => window.localStorage.clear());

// Num evento ninguém mora em lugar nenhum: não há ciclo nem dia contado, e as
// divisões por tempo não teriam de onde tirar peso.
describe("evento não oferece divisão por tempo", () => {
  it("por dias e por presença não aparecem", () => {
    const oferecidas = rateiosDoItem(item(), EVENTO);
    expect(oferecidas).not.toContain("dias");
    expect(oferecidas).not.toContain("presenca");
  });

  it("as outras continuam todas lá", () => {
    const oferecidas = rateiosDoItem(item(), EVENTO);
    for (const r of ["igual", "uso", "horas", "porcentagem", "valor"]) {
      expect(oferecidas, r).toContain(r);
    }
  });

  it("numa moradia elas continuam disponíveis", () => {
    const oferecidas = rateiosDoItem(item(), MORADIA);
    expect(oferecidas).toContain("dias");
    expect(oferecidas).toContain("presenca");
  });

  it("sem modo informado, nada é escondido", () => {
    expect(rateiosDoItem(item())).toContain("dias");
  });

  // Esconder a regra em vigor deixaria a barra sem nada marcado.
  it("item antigo já dividido por dias ainda mostra a regra dele", () => {
    const oferecidas = rateiosDoItem(item({ rateio: "dias" }), EVENTO);
    expect(oferecidas[0]).toBe("dias");
    expect(oferecidas.filter((r) => r === "dias")).toHaveLength(1);
  });
});

describe("a mensagem de juntar dados de um evento", () => {
  it("não pergunta quantos dias cada um ficou", () => {
    const m = montarMensagemDeColeta(evento());
    expect(m).not.toContain("quantos dias");
    expect(m).not.toContain("ficou fora");
    expect(m).not.toContain("na propriedade");
  });

  it("não lista dias fora nem dias de estadia", () => {
    const m = montarMensagemDeColeta(evento());
    expect(m).not.toContain("Dias fora");
    expect(m).not.toContain("Dias de estadia");
  });

  it("não pede consumo de luz nem de água: evento não tem fatura", () => {
    const m = montarMensagemDeColeta(evento());
    expect(m).not.toContain("kWh");
    expect(m).not.toContain("m³");
    expect(m).not.toContain("linhas da fatura");
  });

  it("numa moradia a fatura continua sendo pedida", () => {
    const casa = comContasLigadas(estadoInicial("moradia", 3));
    casa.periodo = { mes: 6, ano: 2026 };
    expect(montarMensagemDeColeta(casa)).toContain("linhas da fatura");
  });

  it("continua perguntando o que o evento de fato precisa", () => {
    const e = evento();
    e.itens[0].valor = "";
    expect(montarMensagemDeColeta(e)).toContain("quanto foi no mês");
  });

  it("numa moradia a pergunta dos dias continua", () => {
    const casa = comContasLigadas(estadoInicial("moradia", 3));
    casa.periodo = { mes: 6, ano: 2026 };
    expect(montarMensagemDeColeta(casa)).toContain("quantos dias");
  });
});
