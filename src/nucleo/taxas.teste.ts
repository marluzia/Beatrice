import { describe, expect, it } from "vitest";
import { calcular, conferir } from "./motor.ts";
import type { Estado, Item, Morador } from "./motor.ts";

const moradores = (fora: number[]): Morador[] =>
  fora.map((diasFora, i) => ({ id: `m${i}`, nome: `Pessoa ${i + 1}`, diasFora }));

const casa = (parcial: Partial<Estado> = {}): Estado => ({
  periodo: { mes: 4, ano: 2026 },
  faturas: { luzKwh: 400, luzValor: 400, aguaM3: 0, aguaValor: 0 },
  moradores: moradores([0, 0, 0, 0]),
  itens: [],
  ...parcial,
});

const geladeira: Item = {
  id: "gel",
  nome: "Geladeira",
  custo: { tipo: "consumo", quantidade: 100, unidade: "kwh" },
  participantes: ["m0", "m1", "m2", "m3"],
  rateio: { tipo: "igual" },
};

const itemDe = (estado: Estado, id: string) =>
  calcular(estado).itens.find((i) => i.id === id);

describe("a tarifa passa a refletir só o consumo", () => {
  it("sem taxa, a tarifa é o valor cheio dividido pelo consumo", () => {
    const r = calcular(casa());
    expect(r.tarifaLuz).toBeCloseTo(1, 10);
  });

  it("com taxa, a taxa sai antes de dividir", () => {
    const r = calcular(
      casa({ faturas: { luzKwh: 400, luzValor: 400, luzTaxasFixas: 40, aguaM3: 0, aguaValor: 0 } }),
    );
    expect(r.tarifaLuz).toBeCloseTo(0.9, 10);
  });

  it("a taxa não infla o custo dos aparelhos", () => {
    const semTaxa = casa({ itens: [geladeira] });
    const comTaxa = casa({
      itens: [geladeira],
      faturas: { luzKwh: 400, luzValor: 400, luzTaxasFixas: 40, aguaM3: 0, aguaValor: 0 },
    });
    expect(itemDe(semTaxa, "gel")?.custoTotal).toBeCloseTo(100, 10);
    expect(itemDe(comTaxa, "gel")?.custoTotal).toBeCloseTo(90, 10);
  });
});

describe("a taxa vira item próprio, dividido igual", () => {
  const comTaxa = casa({
    faturas: { luzKwh: 400, luzValor: 400, luzTaxasFixas: 40, aguaM3: 0, aguaValor: 0 },
  });

  it("aparece separada e com nome", () => {
    const taxa = itemDe(comTaxa, "__taxa_luz_0");
    expect(taxa?.nome).toBe("Taxas fixas da luz");
    expect(taxa?.custoTotal).toBeCloseTo(40, 10);
    expect(taxa?.automatico).toBe(true);
  });

  it("divide igual entre todo mundo", () => {
    const taxa = itemDe(comTaxa, "__taxa_luz_0");
    for (const fatia of taxa?.fatias ?? []) expect(fatia.total).toBeCloseTo(10, 10);
  });

  it("cobra também de quem viajou o mês inteiro", () => {
    const viajou = calcular(
      casa({
        moradores: moradores([0, 0, 0, 30]),
        faturas: { luzKwh: 400, luzValor: 400, luzTaxasFixas: 40, aguaM3: 0, aguaValor: 0 },
      }),
    );
    const taxa = viajou.itens.find((i) => i.id === "__taxa_luz_0");
    const ausente = taxa?.fatias.find((f) => f.moradorId === "m3");
    expect(ausente?.total).toBeCloseTo(10, 10);
  });

  it("não aparece quando não há taxa informada", () => {
    expect(itemDe(casa(), "__taxa_luz_0")).toBeUndefined();
  });
});

describe("quem gasta mais não paga mais taxa", () => {
  it("a taxa fica igual mesmo com consumo muito desigual", () => {
    const arDaAna: Item = {
      id: "ar",
      nome: "Ar da Ana",
      custo: { tipo: "consumo", quantidade: 300, unidade: "kwh" },
      participantes: ["m0"],
      rateio: { tipo: "igual" },
    };
    const r = calcular(
      casa({
        itens: [arDaAna],
        faturas: { luzKwh: 400, luzValor: 400, luzTaxasFixas: 40, aguaM3: 0, aguaValor: 0 },
      }),
    );
    const taxa = r.itens.find((i) => i.id === "__taxa_luz_0");
    for (const fatia of taxa?.fatias ?? []) expect(fatia.total).toBeCloseTo(10, 10);
    expect(r.moradores[0].total).toBeGreaterThan(r.moradores[1].total);
  });
});

describe("água segue a mesma regra", () => {
  it("separa a tarifa mínima e divide igual", () => {
    const r = calcular(
      casa({
        faturas: { luzKwh: 0, luzValor: 0, aguaM3: 20, aguaValor: 200, aguaTaxasFixas: 40 },
      }),
    );
    expect(r.tarifaAgua).toBeCloseTo(8, 10);
    const taxa = r.itens.find((i) => i.id === "__taxa_agua_0");
    expect(taxa?.custoTotal).toBeCloseTo(40, 10);
    for (const fatia of taxa?.fatias ?? []) expect(fatia.total).toBeCloseTo(10, 10);
  });
});

describe("entradas estranhas não quebram nada", () => {
  it("taxa maior que a fatura é limitada ao valor da fatura", () => {
    const r = calcular(
      casa({ faturas: { luzKwh: 400, luzValor: 100, luzTaxasFixas: 999, aguaM3: 0, aguaValor: 0 } }),
    );
    expect(r.tarifaLuz).toBe(0);
    expect(r.itens.find((i) => i.id === "__taxa_luz_0")?.custoTotal).toBeCloseTo(100, 10);
    expect(conferir(r)).toBe(true);
  });

  it("taxa negativa é tratada como zero", () => {
    const r = calcular(
      casa({ faturas: { luzKwh: 400, luzValor: 400, luzTaxasFixas: -50, aguaM3: 0, aguaValor: 0 } }),
    );
    expect(r.tarifaLuz).toBeCloseTo(1, 10);
    expect(r.itens.find((i) => i.id === "__taxa_luz_0")).toBeUndefined();
  });

  it("taxa igual à fatura inteira zera a tarifa e cobra só a taxa", () => {
    const r = calcular(
      casa({ faturas: { luzKwh: 400, luzValor: 400, luzTaxasFixas: 400, aguaM3: 0, aguaValor: 0 } }),
    );
    expect(r.tarifaLuz).toBe(0);
    for (const m of r.moradores) expect(m.total).toBeCloseTo(100, 10);
    expect(conferir(r)).toBe(true);
  });
});

describe("o invariante continua valendo", () => {
  it("a soma cobrada bate com a fatura cheia, taxa incluída", () => {
    const r = calcular(
      casa({
        itens: [geladeira],
        moradores: moradores([0, 10, 20, 30]),
        faturas: { luzKwh: 400, luzValor: 400, luzTaxasFixas: 40, aguaM3: 20, aguaValor: 200, aguaTaxasFixas: 25 },
      }),
    );
    expect(r.somaDevida).toBeCloseTo(600, 10);
    expect(r.somaCobrada).toBeCloseTo(600, 10);
    expect(conferir(r)).toBe(true);
  });
});

describe("taxas discriminadas linha por linha", () => {
  const comLinhas = casa({
    faturas: {
      luzKwh: 122,
      luzValor: 116.41,
      luzTaxas: [
        { nome: "Iluminação pública", valor: 12.73 },
        { nome: "Bandeira amarela", valor: 2.67 },
      ],
      aguaM3: 0,
      aguaValor: 0,
    },
  });

  it("cada taxa vira um item com o nome da fatura", () => {
    const r = calcular(comLinhas);
    const nomes = r.itens.map((i) => i.nome);
    expect(nomes).toContain("Iluminação pública");
    expect(nomes).toContain("Bandeira amarela");
    expect(nomes).not.toContain("Taxas fixas da luz");
  });

  it("cada uma divide igual, com o próprio valor", () => {
    const r = calcular(comLinhas);
    const cip = r.itens.find((i) => i.nome === "Iluminação pública");
    expect(cip?.custoTotal).toBeCloseTo(12.73, 8);
    for (const fatia of cip?.fatias ?? []) expect(fatia.total).toBeCloseTo(12.73 / 4, 8);
  });

  it("a tarifa desconta a soma das duas", () => {
    const r = calcular(comLinhas);
    expect(r.tarifaLuz).toBeCloseTo(101.01 / 122, 8);
  });

  it("linha em branco ou zerada não vira item", () => {
    const r = calcular(
      casa({
        faturas: {
          luzKwh: 122, luzValor: 113.74,
          luzTaxas: [
            { nome: "Iluminação pública", valor: 12.73 },
            { nome: "", valor: 0 },
          ],
          aguaM3: 0, aguaValor: 0,
        },
      }),
    );
    const taxas = r.itens.filter((i) => i.id.startsWith("__taxa_luz_"));
    expect(taxas).toHaveLength(1);
  });

  it("taxa sem nome recebe um nome genérico em vez de ficar vazia", () => {
    const r = calcular(
      casa({
        faturas: {
          luzKwh: 100, luzValor: 110,
          luzTaxas: [{ nome: "   ", valor: 10 }],
          aguaM3: 0, aguaValor: 0,
        },
      }),
    );
    expect(r.itens.find((i) => i.id === "__taxa_luz_0")?.nome).toBe("Taxas fixas da luz");
  });

  it("a soma das linhas manda, sem recorte pelo total da fatura", () => {
    const r = calcular(
      casa({
        faturas: {
          luzKwh: 100, luzValor: 60,
          luzTaxas: [
            { nome: "Uma", valor: 60 },
            { nome: "Outra", valor: 60 },
          ],
          aguaM3: 0, aguaValor: 0,
        },
      }),
    );
    const soma = r.itens
      .filter((i) => i.id.startsWith("__taxa_luz_"))
      .reduce((s, i) => s + i.custoTotal, 0);
    expect(soma).toBeCloseTo(120, 8);
    expect(conferir(r)).toBe(true);
  });

  it("o invariante vale com taxas discriminadas", () => {
    const r = calcular(comLinhas);
    expect(r.somaCobrada).toBeCloseTo(r.somaDevida, 8);
    expect(conferir(r)).toBe(true);
  });
});

describe("dias do ciclo de faturamento", () => {
  it("sem informar, usa o tamanho do mês", () => {
    const r = calcular(casa({ periodo: { mes: 4, ano: 2026 } }));
    expect(r.diasNoPeriodo).toBe(30);
  });

  it("informando 33, usa 33", () => {
    const r = calcular(casa({ periodo: { mes: 4, ano: 2026, dias: 33 } }));
    expect(r.diasNoPeriodo).toBe(33);
  });

  it("o ciclo maior muda os dias contados de quem viajou", () => {
    const viagem = { moradores: moradores([0, 10, 0, 0]) };
    const mes = calcular(casa({ ...viagem, periodo: { mes: 4, ano: 2026 } }));
    const ciclo = calcular(casa({ ...viagem, periodo: { mes: 4, ano: 2026, dias: 33 } }));
    expect(mes.moradores[1].diasContados).toBe(20);
    expect(ciclo.moradores[1].diasContados).toBe(23);
  });

  it("valores absurdos não passam", () => {
    expect(calcular(casa({ periodo: { mes: 4, ano: 2026, dias: 0 } })).diasNoPeriodo).toBe(30);
    expect(calcular(casa({ periodo: { mes: 4, ano: 2026, dias: -5 } })).diasNoPeriodo).toBe(30);
    expect(calcular(casa({ periodo: { mes: 4, ano: 2026, dias: 9999 } })).diasNoPeriodo).toBe(90);
  });
});

describe("crédito na fatura", () => {
  it("linha negativa abate em vez de ser ignorada", () => {
    const r = calcular(
      casa({
        faturas: {
          luzKwh: 100,
          luzValor: 80,
          luzTaxas: [
            { nome: "Iluminação pública", valor: 20 },
            { nome: "Bônus Itaipu", valor: -10 },
          ],
          aguaM3: 0,
          aguaValor: 0,
        },
      }),
    );
    const bonus = r.itens.find((i) => i.nome === "Bônus Itaipu");
    expect(bonus?.custoTotal).toBeCloseTo(-10, 8);
    for (const fatia of bonus?.fatias ?? []) expect(fatia.total).toBeCloseTo(-2.5, 8);
    expect(conferir(r)).toBe(true);
  });
});
