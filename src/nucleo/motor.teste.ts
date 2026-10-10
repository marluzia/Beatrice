import { describe, expect, it } from "vitest";
import {
  calcular,
  conferir,
  conferirEmCentavos,
  consumoDeclaradoPorHora,
  diasDoPeriodo,
  rateiosPermitidos,
} from "./motor.ts";
import type { Estado, Item, Morador } from "./motor.ts";

const moradores = (fora: number[]): Morador[] =>
  fora.map((diasFora, i) => ({ id: `m${i}`, nome: `Pessoa ${i + 1}`, diasFora }));

const TODOS = (n: number) => Array.from({ length: n }, (_, i) => `m${i}`);

const casa = (parcial: Partial<Estado> = {}): Estado => ({
  periodo: { mes: 6, ano: 2025 },
  faturas: { luzKwh: 400, luzValor: 360, aguaM3: 20, aguaValor: 180 },
  moradores: moradores([0, 0, 0]),
  itens: [],
  ...parcial,
});

const somaDasFatias = (fatias: { total: number }[]) =>
  fatias.reduce((s, f) => s + f.total, 0);

describe("período", () => {
  it("conta os dias reais de cada mês", () => {
    expect(diasDoPeriodo({ mes: 2, ano: 2025 })).toBe(28);
    expect(diasDoPeriodo({ mes: 2, ano: 2024 })).toBe(29);
    expect(diasDoPeriodo({ mes: 4, ano: 2025 })).toBe(30);
    expect(diasDoPeriodo({ mes: 1, ano: 2025 })).toBe(31);
    expect(diasDoPeriodo({ mes: 12, ano: 2025 })).toBe(31);
  });

  it("limita dias contados entre zero e o tamanho do mês", () => {
    const r = calcular(casa({ moradores: moradores([-10, 999, 5]) }));
    expect(r.moradores[0].diasContados).toBe(30);
    expect(r.moradores[1].diasContados).toBe(0);
    expect(r.moradores[2].diasContados).toBe(25);
  });
});

describe("faturas", () => {
  it("deriva a tarifa dividindo valor por consumo", () => {
    const r = calcular(casa());
    expect(r.tarifaLuz).toBeCloseTo(0.9, 10);
    expect(r.tarifaAgua).toBeCloseTo(9, 10);
  });

  it("não produz NaN quando o consumo é zero mas o valor não é", () => {
    const r = calcular(
      casa({ faturas: { luzKwh: 0, luzValor: 200, aguaM3: 0, aguaValor: 0 } }),
    );
    expect(r.tarifaLuz).toBe(0);
    expect(Number.isFinite(r.somaCobrada)).toBe(true);
    expect(r.somaCobrada).toBeCloseTo(200, 10);
  });

  it("cobra a fatura inteira como uso comum quando não há item nenhum", () => {
    const r = calcular(casa());
    expect(r.sobraLuz).toBeCloseTo(360, 10);
    expect(r.sobraAgua).toBeCloseTo(180, 10);
    expect(r.somaCobrada).toBeCloseTo(540, 10);
  });

  it("aceita faturas zeradas sem quebrar", () => {
    const r = calcular(
      casa({ faturas: { luzKwh: 0, luzValor: 0, aguaM3: 0, aguaValor: 0 } }),
    );
    expect(r.somaCobrada).toBe(0);
    expect(conferir(r)).toBe(true);
  });
});

describe("tipos de custo", () => {
  it("consumo em kWh sai da fatura de luz", () => {
    const item: Item = {
      id: "i", nome: "Geladeira",
      custo: { tipo: "consumo", quantidade: 100, unidade: "kwh" },
      participantes: TODOS(3), rateio: { tipo: "igual" },
    };
    const r = calcular(casa({ itens: [item] }));
    expect(r.itens[0].custoTotal).toBeCloseTo(90, 10);
    expect(r.sobraLuz).toBeCloseTo(270, 10);
    expect(r.sobraAgua).toBeCloseTo(180, 10);
    expect(r.totalEmReais).toBe(0);
  });

  it("consumo em m³ sai da fatura de água", () => {
    const item: Item = {
      id: "i", nome: "Mangueira",
      custo: { tipo: "consumo", quantidade: 2, unidade: "m3" },
      participantes: TODOS(3), rateio: { tipo: "igual" },
    };
    const r = calcular(casa({ itens: [item] }));
    expect(r.itens[0].custoTotal).toBeCloseTo(18, 10);
    expect(r.sobraLuz).toBeCloseTo(360, 10);
    expect(r.sobraAgua).toBeCloseTo(162, 10);
  });

  it("por hora multiplica potência por horas e cai na fatura", () => {
    expect(consumoDeclaradoPorHora({ porHora: 1.2, horas: 100 })).toBeCloseTo(120, 10);

    const item: Item = {
      id: "ar", nome: "Ar-condicionado",
      custo: { tipo: "porHora", porHora: 1.2, horas: 100, unidade: "kwh" },
      participantes: TODOS(3), rateio: { tipo: "igual" },
    };
    const r = calcular(casa({ itens: [item] }));
    expect(r.itens[0].custoTotal).toBeCloseTo(108, 10);
  });

  it("por hora com zero horas custa zero", () => {
    const item: Item = {
      id: "ar", nome: "Ar-condicionado",
      custo: { tipo: "porHora", porHora: 1.2, horas: 0, unidade: "kwh" },
      participantes: TODOS(3), rateio: { tipo: "igual" },
    };
    const r = calcular(casa({ itens: [item] }));
    expect(r.itens[0].custoTotal).toBe(0);
    expect(r.sobraLuz).toBeCloseTo(360, 10);
  });

  it("por uso vindo da fatura cobra luz e água por ciclo", () => {
    const item: Item = {
      id: "maq", nome: "Máquina",
      custo: {
        tipo: "porUso",
        unitario: { origem: "fatura", kwhPorUso: 0.5, m3PorUso: 0.2 },
      },
      participantes: TODOS(3),
      rateio: { tipo: "uso", usos: { m0: 4, m1: 2, m2: 0 } },
    };
    const r = calcular(casa({ itens: [item] }));
    expect(r.itens[0].custoTotal).toBeCloseTo(13.5, 10);
    expect(r.itens[0].origem).toBe("mista");
    expect(r.totalEmReais).toBe(0);
  });

  it("por uso pago em reais soma por cima das faturas", () => {
    const item: Item = {
      id: "fax", nome: "Faxina",
      custo: { tipo: "porUso", usosTotais: 4, unitario: { origem: "reais", valorPorUso: 90 } },
      participantes: TODOS(3), rateio: { tipo: "igual" },
    };
    const r = calcular(casa({ itens: [item] }));
    expect(r.itens[0].custoTotal).toBeCloseTo(360, 10);
    expect(r.totalEmReais).toBeCloseTo(360, 10);
    expect(r.somaDevida).toBeCloseTo(900, 10);
    expect(r.sobraLuz).toBeCloseTo(360, 10);
  });

  it("item em reais entra fora das faturas", () => {
    const item: Item = {
      id: "net", nome: "Internet",
      custo: { tipo: "reais", valor: 120 },
      participantes: TODOS(3), rateio: { tipo: "igual" },
    };
    const r = calcular(casa({ itens: [item] }));
    expect(r.totalEmReais).toBeCloseTo(120, 10);
    expect(r.moradores[0].reais).toBeCloseTo(40, 10);
  });
});

describe("rateios", () => {
  const emReais = (valor: number, participantes: string[], rateio: Item["rateio"]): Item => ({
    id: "x", nome: "Item", custo: { tipo: "reais", valor }, participantes, rateio,
  });

  it("igual dá a mesma fatia para todo mundo do grupo", () => {
    const r = calcular(casa({ itens: [emReais(90, TODOS(3), { tipo: "igual" })] }));
    r.moradores.forEach((m) => expect(m.reais).toBeCloseTo(30, 10));
  });

  it("por dias pesa quem ficou mais tempo em casa", () => {
    const r = calcular(
      casa({
        moradores: moradores([0, 15, 30]),
        itens: [emReais(90, TODOS(3), { tipo: "dias" })],
      }),
    );
    expect(r.moradores[0].reais).toBeCloseTo(60, 10);
    expect(r.moradores[1].reais).toBeCloseTo(30, 10);
    expect(r.moradores[2].reais).toBeCloseTo(0, 10);
  });

  it("por uso pesa quantas vezes cada um usou", () => {
    const r = calcular(
      casa({ itens: [emReais(90, TODOS(3), { tipo: "uso", usos: { m0: 3, m1: 1, m2: 2 } })] }),
    );
    expect(r.moradores[0].reais).toBeCloseTo(45, 10);
    expect(r.moradores[1].reais).toBeCloseTo(15, 10);
    expect(r.moradores[2].reais).toBeCloseTo(30, 10);
  });

  it("cobra só de quem participa", () => {
    const r = calcular(casa({ itens: [emReais(90, ["m0", "m1"], { tipo: "igual" })] }));
    expect(r.moradores[0].reais).toBeCloseTo(45, 10);
    expect(r.moradores[1].reais).toBeCloseTo(45, 10);
    expect(r.moradores[2].reais).toBe(0);
  });

  it("um participante só paga o item inteiro", () => {
    const r = calcular(casa({ itens: [emReais(90, ["m2"], { tipo: "dias" })] }));
    expect(r.moradores[2].reais).toBeCloseTo(90, 10);
  });

  it("ignora item sem ninguém marcado e avisa", () => {
    const r = calcular(casa({ itens: [emReais(90, [], { tipo: "igual" })] }));
    expect(r.totalEmReais).toBe(0);
    expect(r.alertas.some((a) => a.texto.includes("sem ninguém marcado"))).toBe(true);
  });

  it("cai para divisão igual quando todos os usos são zero", () => {
    const r = calcular(
      casa({ itens: [emReais(90, TODOS(3), { tipo: "uso", usos: { m0: 0, m1: 0, m2: 0 } })] }),
    );
    r.moradores.forEach((m) => expect(m.reais).toBeCloseTo(30, 10));
    expect(conferir(r)).toBe(true);
  });

  it("cai para divisão igual e avisa quando a casa ficou vazia o mês todo", () => {
    const r = calcular(
      casa({
        moradores: moradores([30, 30, 30]),
        itens: [emReais(90, TODOS(3), { tipo: "dias" })],
      }),
    );
    r.moradores.forEach((m) => expect(m.reais).toBeCloseTo(30, 10));
    expect(r.alertas.some((a) => a.texto.includes("nenhum dia em casa"))).toBe(true);
  });
});

describe("divisões oferecidas", () => {
  const comCusto = (custo: Item["custo"], rateiosDoItem?: Item["rateiosDoItem"]): Item => ({
    id: "x", nome: "Item", custo, participantes: TODOS(3), rateio: { tipo: "igual" },
    ...(rateiosDoItem ? { rateiosDoItem } : {}),
  });

  it("nunca oferece 'por dias' para item cobrado por uso", () => {
    const porUso = comCusto({
      tipo: "porUso", unitario: { origem: "reais", valorPorUso: 90 },
    });
    expect(rateiosPermitidos(porUso)).toEqual(["igual", "uso"]);
  });

  it("oferece as quatro para consumo e para reais", () => {
    expect(rateiosPermitidos(comCusto({ tipo: "consumo", quantidade: 1, unidade: "kwh" })))
      .toEqual(["igual", "dias", "presenca", "uso"]);
    expect(rateiosPermitidos(comCusto({ tipo: "reais", valor: 1 })))
      .toEqual(["igual", "dias", "presenca", "uso"]);
  });

  it("nunca oferece 'por presença' para item cobrado por uso", () => {
    const porUso = comCusto({
      tipo: "porUso", unitario: { origem: "reais", valorPorUso: 90 },
    });
    expect(rateiosPermitidos(porUso)).not.toContain("presenca");
  });

  it("permite 'por dias' em consumo declarado por hora, que é um fluxo", () => {
    const ar = comCusto({ tipo: "porHora", porHora: 1.2, horas: 100, unidade: "kwh" });
    expect(rateiosPermitidos(ar)).toContain("dias");
  });

  it("respeita a restrição declarada pelo catálogo", () => {
    const geladeira = comCusto(
      { tipo: "consumo", quantidade: 124.5, unidade: "kwh" },
      ["igual", "dias"],
    );
    expect(rateiosPermitidos(geladeira)).toEqual(["igual", "dias"]);
  });

  it("a restrição do catálogo não vence a regra estrutural", () => {
    const porUso = comCusto(
      { tipo: "porUso", unitario: { origem: "reais", valorPorUso: 90 } },
      ["igual", "dias", "uso"],
    );
    expect(rateiosPermitidos(porUso)).not.toContain("dias");
  });
});

describe("teto das faturas", () => {
  it("desconta os itens de consumo antes do uso comum", () => {
    const item: Item = {
      id: "i", nome: "Ar",
      custo: { tipo: "consumo", quantidade: 100, unidade: "kwh" },
      participantes: ["m0"], rateio: { tipo: "igual" },
    };
    const r = calcular(casa({ itens: [item] }));
    const usoComum = r.itens.find((i) => i.id === "__luz");
    expect(usoComum?.custoTotal).toBeCloseTo(270, 10);
    expect(usoComum?.automatico).toBe(true);
  });

  it("avisa quando os itens estouram a fatura, sem parar de fechar", () => {
    const item: Item = {
      id: "i", nome: "Ar absurdo",
      custo: { tipo: "consumo", quantidade: 10000, unidade: "kwh" },
      participantes: TODOS(3), rateio: { tipo: "igual" },
    };
    const r = calcular(casa({ itens: [item] }));
    expect(r.sobraLuz).toBeLessThan(0);
    expect(r.alertas.some((a) => a.nivel === "erro")).toBe(true);
    expect(conferir(r)).toBe(true);
  });
});

describe("invariantes", () => {
  const completa = casa({
    moradores: moradores([0, 12, 30]),
    itens: [
      { id: "gel", nome: "Geladeira",
        custo: { tipo: "consumo", quantidade: 124.5, unidade: "kwh" },
        participantes: TODOS(3), rateio: { tipo: "igual" } },
      { id: "ar", nome: "Ar",
        custo: { tipo: "porHora", porHora: 1.2, horas: 90, unidade: "kwh" },
        participantes: ["m0", "m1"], rateio: { tipo: "dias" } },
      { id: "maq", nome: "Máquina",
        custo: { tipo: "porUso", unitario: { origem: "fatura", kwhPorUso: 0.46, m3PorUso: 0.188 } },
        participantes: TODOS(3), rateio: { tipo: "uso", usos: { m0: 5, m1: 3, m2: 0 } } },
      { id: "fax", nome: "Faxina",
        custo: { tipo: "porUso", usosTotais: 4, unitario: { origem: "reais", valorPorUso: 90 } },
        participantes: ["m0", "m1"], rateio: { tipo: "igual" } },
      { id: "net", nome: "Internet",
        custo: { tipo: "reais", valor: 99.9 },
        participantes: TODOS(3), rateio: { tipo: "igual" } },
    ],
  });

  it("a soma cobrada é igual ao total devido", () => {
    const r = calcular(completa);
    expect(r.somaCobrada).toBeCloseTo(r.somaDevida, 8);
    expect(conferir(r)).toBe(true);
  });

  it("as fatias de cada item somam o custo daquele item", () => {
    const r = calcular(completa);
    for (const item of r.itens) {
      expect(somaDasFatias(item.fatias)).toBeCloseTo(item.custoTotal, 8);
    }
  });

  it("ninguém recebe NaN nem Infinity", () => {
    const r = calcular(completa);
    for (const m of r.moradores) {
      for (const valor of [m.luz, m.agua, m.reais, m.total]) {
        expect(Number.isFinite(valor)).toBe(true);
      }
    }
  });

  it("as três origens somam o total de cada pessoa", () => {
    const r = calcular(completa);
    for (const m of r.moradores) {
      expect(m.luz + m.agua + m.reais).toBeCloseTo(m.total, 8);
    }
  });
});

describe("centavos", () => {
  it("fecha exatamente quando a divisão é redonda", () => {
    const item: Item = {
      id: "x", nome: "Internet", custo: { tipo: "reais", valor: 90 },
      participantes: TODOS(3), rateio: { tipo: "igual" },
    };
    const r = calcular(
      casa({ faturas: { luzKwh: 0, luzValor: 0, aguaM3: 0, aguaValor: 0 }, itens: [item] }),
    );
    expect(r.residuoDeCentavos).toBe(0);
    expect(conferirEmCentavos(r)).toBe(true);
  });

  it("acusa o centavo que some quando a divisão não é exata", () => {
    const item: Item = {
      id: "x", nome: "Internet", custo: { tipo: "reais", valor: 100 },
      participantes: TODOS(3), rateio: { tipo: "igual" },
    };
    const r = calcular(
      casa({ faturas: { luzKwh: 0, luzValor: 0, aguaM3: 0, aguaValor: 0 }, itens: [item] }),
    );
    expect(r.somaCobradaArredondada).toBeCloseTo(99.99, 10);
    expect(r.residuoDeCentavos).toBe(1);
    expect(conferirEmCentavos(r)).toBe(false);
    expect(r.alertas.some((a) => a.texto.includes("centavo"))).toBe(true);
  });

  it("o resíduo nunca passa de um centavo por morador", () => {
    const item: Item = {
      id: "x", nome: "Internet", custo: { tipo: "reais", valor: 100 },
      participantes: TODOS(7), rateio: { tipo: "igual" },
    };
    const r = calcular(casa({ moradores: moradores([0, 0, 0, 0, 0, 0, 0]), itens: [item] }));
    expect(Math.abs(r.residuoDeCentavos)).toBeLessThanOrEqual(r.moradores.length);
  });
});

describe("casos degenerados", () => {
  it("acusa erro quando há conta a pagar e nenhum morador", () => {
    const r = calcular(casa({ moradores: [], itens: [] }));
    expect(r.moradores).toEqual([]);
    expect(r.somaCobrada).toBe(0);
    expect(r.somaDevida).toBeCloseTo(540, 10);
    expect(r.alertas.some((a) => a.nivel === "erro")).toBe(true);
    expect(r.alertas.some((a) => a.texto.includes("Arredondando"))).toBe(false);
  });

  it("casa sem morador e sem conta não acusa nada", () => {
    const r = calcular(
      casa({
        moradores: [],
        itens: [],
        faturas: { luzKwh: 0, luzValor: 0, aguaM3: 0, aguaValor: 0 },
      }),
    );
    expect(r.alertas.filter((a) => a.nivel === "erro")).toHaveLength(0);
    expect(conferir(r)).toBe(true);
  });

  it("aguenta um morador só", () => {
    const r = calcular(casa({ moradores: moradores([5]) }));
    expect(r.moradores[0].total).toBeCloseTo(540, 10);
    expect(conferir(r)).toBe(true);
  });
});
