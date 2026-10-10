import { describe, expect, it } from "vitest";
import { calcular } from "./adaptador.js";
import { conferir } from "./motor.ts";

const linha = (id, nome, valor, comportamento, quantidade = "") => ({
  id,
  nome,
  valor,
  comportamento,
  quantidade,
});

describe("fatura CEMIG real", () => {
  const casa = {
    periodo: { mes: 9, ano: 2025 },
    faturas: {
      luz: {
        unidade: "kwh",
        ativa: true,
        janela: { de: "2025-08-05", ate: "2025-09-09" },
        linhas: [
          linha("l1", "Energia elétrica", "168,61", "consumo", "141"),
          linha("l2", "Contrib Ilum Pública Municipal", "21,65", "igual"),
        ],
      },
      agua: { unidade: "m3", ativa: false, janela: null, linhas: [] },
    },
    moradores: [
      { id: "m0", nome: "Ana", diasFora: "", ausencias: [] },
      {
        id: "m1",
        nome: "Bia",
        diasFora: "",
        ausencias: Array.from({ length: 12 }, (_, i) => `2025-08-${String(6 + i).padStart(2, "0")}`),
      },
      {
        id: "m2",
        nome: "Cau",
        diasFora: "",
        ausencias: Array.from({ length: 35 }, (_, i) => {
          const d = new Date(Date.UTC(2025, 7, 5 + i));
          return d.toISOString().slice(0, 10);
        }),
      },
    ],
    itens: [],
  };

  it("o total das linhas bate com o valor a pagar impresso", () => {
    const r = calcular(casa);
    expect(r.somaDevida).toBeCloseTo(190.26, 2);
  });

  it("a tarifa deduzida bate com o preço impresso", () => {
    const r = calcular(casa);
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
