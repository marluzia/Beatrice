import { describe, expect, it } from "vitest";
import { calcular, itemParaMotor, paraMotor, totalDeclaradoPorHora, diasContadosDe } from "./adaptador.js";
import { CATALOGO, criarItem, modeloPorChave, TODOS_OS_ITENS } from "./catalogo.js";
import { estadoInicial } from "./estadoInicial.js";

/**
 * O adaptador é a fronteira entre a tela e o motor. É o ponto mais frágil do
 * sistema: escrever `por_hora` onde o motor espera `porHora` não quebra o
 * build, não gera erro nenhum, e faz o item custar zero para todo mundo em
 * silêncio. Estes testes existem para esse erro fazer barulho.
 */

const MORADORES = ["m0", "m1", "m2"];

const casa = (itens) => ({
  periodo: { mes: 6, ano: 2025 },
  faturas: { luzKwh: "400", luzValor: "360", aguaM3: "20", aguaValor: "180" },
  moradores: MORADORES.map((id, i) => ({ id, nome: `Pessoa ${i + 1}`, diasFora: "0" })),
  itens,
});

/** Item da tela a partir de um modelo do catálogo, com os campos preenchidos. */
const doCatalogo = (chave, campos = {}) => ({
  ...criarItem(modeloPorChave(chave), MORADORES),
  ...campos,
});

describe("leitura de números vindos da tela", () => {
  it("aceita vírgula e ponto como separador decimal", () => {
    const comVirgula = calcular(casa([doCatalogo("gas", { valor: "99,90" })]));
    const comPonto = calcular(casa([doCatalogo("gas", { valor: "99.90" })]));
    expect(comVirgula.totalEmReais).toBeCloseTo(99.9, 10);
    expect(comPonto.totalEmReais).toBeCloseTo(99.9, 10);
  });

  it("trata campo vazio como zero em vez de contaminar tudo com NaN", () => {
    const r = calcular(casa([doCatalogo("gas", { valor: "" })]));
    expect(r.totalEmReais).toBe(0);
    expect(Number.isFinite(r.somaCobrada)).toBe(true);
  });

  it("trata texto sem sentido como zero", () => {
    const r = calcular(casa([doCatalogo("gas", { valor: "abc" })]));
    expect(r.totalEmReais).toBe(0);
  });

  it("dá um nome ao item que ficou sem nome", () => {
    const item = itemParaMotor(doCatalogo("gas", { nome: "   ", valor: "10" }));
    expect(item.nome).toBe("Item sem nome");
  });
});

describe("cada espécie da tela chega inteira ao motor", () => {
  it("consumo leva quantidade e unidade", () => {
    const item = itemParaMotor(doCatalogo("geladeira", { quantidade: "124,5", unidade: "kwh" }));
    expect(item.custo).toEqual({ tipo: "consumo", quantidade: 124.5, unidade: "kwh" });
  });

  it("por hora leva potência, horas e unidade", () => {
    const item = itemParaMotor(doCatalogo("ar", { porHora: "1,2", horas: "100", unidade: "kwh" }));
    expect(item.custo).toEqual({ tipo: "porHora", porHora: 1.2, horas: 100, unidade: "kwh" });
  });

  it("por uso vindo da fatura leva os dois consumos unitários", () => {
    const item = itemParaMotor(
      doCatalogo("maquina", { kwhPorUso: "0,46", m3PorUso: "0,188", origemUso: "fatura" }),
    );
    expect(item.custo.tipo).toBe("porUso");
    expect(item.custo.unitario).toEqual({ origem: "fatura", kwhPorUso: 0.46, m3PorUso: 0.188 });
  });

  it("por uso pago em reais leva o valor da diária", () => {
    const item = itemParaMotor(doCatalogo("faxina", { valorPorUso: "90", usos: "4" }));
    expect(item.custo.unitario).toEqual({ origem: "reais", valorPorUso: 90 });
    expect(item.custo.usosTotais).toBe(4);
  });

  it("reais leva o valor", () => {
    const item = itemParaMotor(doCatalogo("internet", { valor: "99,90" }));
    expect(item.custo).toEqual({ tipo: "reais", valor: 99.9 });
  });

  /**
   * O teste que pega o erro de nome de campo: se o adaptador deixar de
   * repassar qualquer campo de custo, o item passa a custar zero. Aqui todo
   * item do catálogo é preenchido e precisa custar mais que zero.
   */
  it("nenhum item do catálogo custa zero quando preenchido", () => {
    const preenchido = {
      quantidade: "100", porHora: "1.5", horas: "50",
      kwhPorUso: "0.5", m3PorUso: "0.2", valorPorUso: "80", usos: "3", valor: "120",
      // Itens que dividem por uso tiram o total do que cada um usou, não do
      // campo "usos". Sem isso o item custa zero — que é o comportamento
      // certo, e não o que este teste quer exercitar.
      usosPorPessoa: { m0: "2", m1: "1", m2: "1" },
    };
    for (const modelo of TODOS_OS_ITENS) {
      const item = doCatalogo(modelo.chave, preenchido);
      const r = calcular(casa([item]));
      const calculado = r.itens.find((i) => i.id === item.id);
      expect(
        calculado?.custoTotal,
        `"${modelo.nome}" (${modelo.chave}) custou zero mesmo com todos os campos preenchidos`,
      ).toBeGreaterThan(0);
    }
  });

  it("item que divide por uso custa zero quando ninguém registrou uso", () => {
    const item = doCatalogo("maquina", {
      kwhPorUso: "0.5", m3PorUso: "0.2", rateio: "uso", usosPorPessoa: {},
    });
    const r = calcular(casa([item]));
    expect(r.itens.find((i) => i.id === item.id)?.custoTotal).toBe(0);
  });

  it("todo modelo do catálogo é aceito pelo motor sem erro", () => {
    for (const modelo of TODOS_OS_ITENS) {
      expect(() => calcular(casa([doCatalogo(modelo.chave)]))).not.toThrow();
    }
  });
});

describe("usos por pessoa", () => {
  it("chegam ao motor apenas para quem participa", () => {
    const item = itemParaMotor(
      doCatalogo("maquina", {
        participantes: ["m0", "m1"],
        rateio: "uso",
        usosPorPessoa: { m0: "5", m1: "3", m2: "99" },
      }),
    );
    expect(item.rateio).toEqual({ tipo: "uso", usos: { m0: 5, m1: 3 } });
  });

  it("pessoa sem uso registrado vira zero, não NaN", () => {
    const item = itemParaMotor(
      doCatalogo("maquina", { rateio: "uso", usosPorPessoa: { m0: "5" } }),
    );
    expect(item.rateio.usos).toEqual({ m0: 5, m1: 0, m2: 0 });
  });
});

describe("apoio à tela", () => {
  it("o total por hora mostrado na tela é o mesmo que o motor usa", () => {
    const item = doCatalogo("ar", { porHora: "1,2", horas: "100" });
    expect(totalDeclaradoPorHora(item)).toBeCloseTo(120, 10);

    const r = calcular(casa([item]));
    // 120 kWh × tarifa de 0,90
    expect(r.itens.find((i) => i.id === item.id)?.custoTotal).toBeCloseTo(108, 10);
  });

  it("os dias contados mostrados batem com os do resultado", () => {
    const periodo = { mes: 2, ano: 2024 };
    const morador = { id: "m0", nome: "Ana", diasFora: "10" };
    expect(diasContadosDe(morador, periodo)).toBe(19);
  });

  it("dias fora maiores que o mês não viram número negativo", () => {
    expect(diasContadosDe({ id: "m0", nome: "", diasFora: "500" }, { mes: 2, ano: 2024 })).toBe(0);
  });
});

describe("estado inicial", () => {
  it("abre com itens válidos e todo mundo marcado", () => {
    const estado = estadoInicial(4);
    expect(estado.moradores).toHaveLength(4);
    expect(estado.itens.length).toBeGreaterThan(0);
    for (const item of estado.itens) {
      expect(item.participantes).toHaveLength(4);
    }
  });

  it("calcula sem erro e sem alerta de erro logo na abertura", () => {
    const r = calcular(estadoInicial(3));
    expect(r.alertas.filter((a) => a.nivel === "erro")).toHaveLength(0);
    expect(Number.isFinite(r.somaCobrada)).toBe(true);
  });

  it("converte para o formato do motor sem campo perdido", () => {
    const doMotor = paraMotor(estadoInicial(3));
    expect(doMotor.moradores.every((m) => typeof m.diasFora === "number")).toBe(true);
    expect(doMotor.itens.every((i) => typeof i.custo.tipo === "string")).toBe(true);
  });
});

describe("catálogo", () => {
  it("não tem chave repetida", () => {
    const chaves = TODOS_OS_ITENS.map((i) => i.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("todo modelo declara ao menos uma divisão possível", () => {
    for (const modelo of TODOS_OS_ITENS) {
      expect(modelo.rateios?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("a divisão inicial de cada modelo está entre as que ele permite", () => {
    for (const modelo of TODOS_OS_ITENS) {
      expect(modelo.rateios).toContain(modelo.rateio);
    }
  });

  it("os grupos existem e nenhum está vazio", () => {
    expect(CATALOGO.length).toBeGreaterThan(0);
    for (const grupo of CATALOGO) {
      expect(grupo.itens.length).toBeGreaterThan(0);
    }
  });
});
