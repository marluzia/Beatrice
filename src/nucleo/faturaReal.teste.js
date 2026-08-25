// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { calcular } from "./adaptador.js";
import { conferir } from "./motor.ts";

/** A fatura real: 141 kWh, energia 168,61, CIP 21,65, total 190,26, 35 dias. */
const linha = (id, nome, valor, comportamento) => ({ id, nome, valor, comportamento });

describe("fatura CEMIG real", () => {
  const casa = {
    periodo: { mes: 9, ano: 2025, dias: 35 },
    faturas: {
      luz: {
        unidade: "kwh",
        consumo: "141",
        linhas: [
          linha("l1", "Energia elétrica", "168,61", "consumo"),
          linha("l2", "Contrib Ilum Pública Municipal", "21,65", "igual"),
        ],
      },
      agua: { unidade: "m3", consumo: "", linhas: [] },
    },
    moradores: [
      { id: "m0", nome: "Ana", diasFora: "0" },
      { id: "m1", nome: "Bia", diasFora: "12" },
      { id: "m2", nome: "Cau", diasFora: "35" },
    ],
    itens: [],
  };

  it("o total das linhas bate com o valor a pagar impresso", () => {
    const r = calcular(casa);
    expect(r.somaDevida).toBeCloseTo(190.26, 2);
  });

  it("a tarifa deduzida bate com o preço impresso", () => {
    const r = calcular(casa);
    // 168,61 ÷ 141 = 1,1958
    expect(r.tarifaLuz).toBeCloseTo(168.61 / 141, 6);
  });

  it("os 35 dias do ciclo mandam na presença", () => {
    const r = calcular(casa);
    expect(r.diasNoPeriodo).toBe(35);
    expect(r.moradores[1].diasContados).toBe(23);
    expect(r.moradores[2].diasContados).toBe(0);
  });

  it("a iluminação pública divide igual, inclusive para quem ficou fora", () => {
    const r = calcular(casa);
    const cip = r.itens.find((i) => i.nome === "Contrib Ilum Pública Municipal");
    expect(cip.custoTotal).toBeCloseTo(21.65, 6);
    for (const f of cip.fatias) expect(f.total).toBeCloseTo(21.65 / 3, 6);
  });

  it("quem ficou o mês fora paga só a iluminação pública", () => {
    const r = calcular(casa);
    expect(r.moradores[2].total).toBeCloseTo(21.65 / 3, 6);
  });

  it("a conta fecha", () => {
    const r = calcular(casa);
    expect(conferir(r)).toBe(true);
    expect(r.somaCobrada).toBeCloseTo(190.26, 2);
  });
});
