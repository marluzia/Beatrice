import { describe, expect, it } from "vitest";
import { montarMensagemDeColeta } from "./coleta.js";
import { criarItem, modeloPorChave } from "./catalogo.js";

/**
 * A mensagem tem uma regra que vale mais que a redação: ela pergunta o que os
 * itens configurados exigem, e só isso. Perguntar sobre lavagem numa casa sem
 * máquina faz a pessoa desconfiar do resto.
 */

const MORADORES = [
  { id: "m0", nome: "Ana", diasFora: "" },
  { id: "m1", nome: "Bia", diasFora: "" },
  { id: "m2", nome: "", diasFora: "" },
];

const IDS = MORADORES.map((m) => m.id);

const FATURAS_CHEIAS = { luzKwh: "400", luzValor: "360", aguaM3: "20", aguaValor: "180" };

const casa = ({ itens = [], moradores = MORADORES, faturas = FATURAS_CHEIAS } = {}) => ({
  periodo: { mes: 8, ano: 2026 },
  faturas,
  moradores,
  itens,
});

const item = (chave, campos = {}) => ({
  ...criarItem(modeloPorChave(chave), IDS),
  ...campos,
});

describe("cabeçalho", () => {
  it("nomeia o mês por extenso", () => {
    expect(montarMensagemDeColeta(casa())).toContain("Fechamento de agosto de 2026");
  });

  it("chama todo mundo pelo nome e liga os últimos com 'e'", () => {
    const m = montarMensagemDeColeta(casa());
    expect(m).toContain("Ana, Bia e Pessoa 3");
  });

  it("diz que a resposta é no grupo, à vista de todos", () => {
    expect(montarMensagemDeColeta(casa())).toContain("todo mundo poder conferir");
  });

  it("avisa quando não há morador para perguntar", () => {
    const m = montarMensagemDeColeta(casa({ moradores: [] }));
    expect(m).toContain("Nenhum morador cadastrado");
  });
});

describe("pergunta sempre os dias fora, com o tamanho certo do mês", () => {
  it("agosto tem 31", () => {
    expect(montarMensagemDeColeta(casa())).toContain("o mês tem 31");
  });

  it("fevereiro bissexto tem 29", () => {
    const m = montarMensagemDeColeta({ ...casa(), periodo: { mes: 2, ano: 2024 } });
    expect(m).toContain("o mês tem 29");
  });
});

describe("pergunta só o que os itens exigem", () => {
  it("sem item por uso, não pergunta sobre usos individuais", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("geladeira", { quantidade: "124.5" })] }));
    expect(m).not.toContain("quantos usos foram seus");
  });

  it("com máquina dividida por uso, pergunta as lavagens de cada um", () => {
    const m = montarMensagemDeColeta(
      casa({ itens: [item("maquina", { kwhPorUso: "0.46", m3PorUso: "0.188", rateio: "uso" })] }),
    );
    expect(m).toContain("Máquina de lavar: quantos usos foram seus");
  });

  it("com ar-condicionado sem horas, pergunta as horas à casa", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("ar", { porHora: "1.2", horas: "" })] }));
    expect(m).toContain("Ar-condicionado: quantas horas ficou ligado no mês");
  });

  it("não pergunta o que já está preenchido", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("ar", { porHora: "1.2", horas: "90" })] }));
    expect(m).not.toContain("quantas horas ficou ligado");
  });

  it("com faxina dividida igual, pergunta quantas diárias à casa", () => {
    const m = montarMensagemDeColeta(
      casa({ itens: [item("faxina", { valorPorUso: "90", usos: "", rateio: "igual" })] }),
    );
    expect(m).toContain("Faxina: quantos usos no mês");
  });

  it("pede as faturas quando estão em branco", () => {
    const m = montarMensagemDeColeta(
      casa({ faturas: { luzKwh: "", luzValor: "", aguaM3: "", aguaValor: "" } }),
    );
    expect(m).toContain("faturas de luz e água");
  });

  it("não pede as faturas quando já estão preenchidas", () => {
    expect(montarMensagemDeColeta(casa())).not.toContain("faturas de luz e água");
  });

  it("ignora item sem ninguém marcado", () => {
    const m = montarMensagemDeColeta(
      casa({ itens: [item("ar", { porHora: "1.2", horas: "", participantes: [] })] }),
    );
    expect(m).not.toContain("Ar-condicionado");
  });
});

describe("itens que não são de todo mundo", () => {
  it("diz de quem é o item quando o grupo é parcial", () => {
    const m = montarMensagemDeColeta(
      casa({ itens: [item("ar", { porHora: "1.2", horas: "90", participantes: ["m0", "m1"] })] }),
    );
    expect(m).toContain("Ar-condicionado é só de Ana e Bia.");
  });

  it("não diz nada quando o item é da casa inteira", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("geladeira", { quantidade: "124.5" })] }));
    expect(m).not.toContain("é só de");
  });
});

describe("forma da mensagem", () => {
  it("cabe num grupo: não passa de vinte linhas numa casa comum", () => {
    const m = montarMensagemDeColeta(
      casa({
        itens: [
          item("geladeira", { quantidade: "124.5" }),
          item("maquina", { kwhPorUso: "0.46", m3PorUso: "0.188", rateio: "uso" }),
          item("faxina", { valorPorUso: "90", usos: "4" }),
          item("gas", { valor: "130" }),
          item("internet", { valor: "99.90" }),
        ],
      }),
    );
    expect(m.split("\n").length).toBeLessThanOrEqual(20);
  });

  it("não deixa marcação de código nem placeholder solto", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("maquina", { rateio: "uso" })] }));
    expect(m).not.toMatch(/undefined|NaN|\[object|\{\{/);
  });

  it("termina dizendo o que acontece depois", () => {
    expect(montarMensagemDeColeta(casa())).toContain("mando o detalhamento");
  });
});
