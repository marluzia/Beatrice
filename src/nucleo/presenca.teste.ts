import { describe, expect, it } from "vitest";
import { ausentesEntre, calcular, conferir } from "./motor.ts";
import type { Estado, Item, Morador } from "./motor.ts";

/**
 * Rateio por presença.
 *
 * A conta que este rateio faz: o custo de cada dia é dividido entre quem
 * estava em casa naquele dia. Os testes abaixo comparam sempre com o rateio
 * por dias, porque a diferença entre os dois é justamente a razão de o novo
 * existir.
 */

const moradores = (fora: number[]): Morador[] =>
  fora.map((diasFora, i) => ({ id: `m${i}`, nome: `Pessoa ${i + 1}`, diasFora }));

/** Abril tem 30 dias. Fatura de luz de R$ 300 com tarifa de R$ 1 por kWh. */
const quarto = (fora: number[], rateio: Item["rateio"], participantes: string[]): Estado => ({
  periodo: { mes: 4, ano: 2026 },
  faturas: { luzKwh: 1000, luzValor: 1000, aguaM3: 0, aguaValor: 0 },
  moradores: moradores(fora),
  itens: [
    {
      id: "ar",
      nome: "Ar-condicionado",
      custo: { tipo: "porHora", porHora: 1, horas: 300, unidade: "kwh" },
      participantes,
      rateio,
    },
  ],
});

const fatiaDe = (estado: Estado, id: string) => {
  const r = calcular(estado);
  const item = r.itens.find((i) => i.id === "ar");
  return item?.fatias.find((f) => f.moradorId === id)?.total ?? 0;
};

describe("uma pessoa viajou: o resultado é exato", () => {
  // Bia em casa os 30 dias, Cau em casa 10. O ar custa R$ 300 no mês.
  const fora = [0, 20, 0];
  const dupla = ["m0", "m1"];

  it("por dias divide na proporção da presença", () => {
    const estado = quarto(fora, { tipo: "dias" }, dupla);
    expect(fatiaDe(estado, "m0")).toBeCloseTo(225, 6); // 30/40
    expect(fatiaDe(estado, "m1")).toBeCloseTo(75, 6); // 10/40
  });

  it("por presença cobra os dias sozinha de quem estava sozinha", () => {
    const estado = quarto(fora, { tipo: "presenca" }, dupla);
    // 20 dias só a Bia: R$ 200 dela. 10 dias as duas: R$ 100 divididos.
    expect(fatiaDe(estado, "m0")).toBeCloseTo(250, 6);
    expect(fatiaDe(estado, "m1")).toBeCloseTo(50, 6);
  });

  it("a diferença entre os dois rateios é real e não some no arredondamento", () => {
    const porDias = fatiaDe(quarto(fora, { tipo: "dias" }, dupla), "m1");
    const porPresenca = fatiaDe(quarto(fora, { tipo: "presenca" }, dupla), "m1");
    expect(porDias - porPresenca).toBeCloseTo(25, 6);
  });

  it("não avisa nada: com uma ausência só, não há suposição", () => {
    const r = calcular(quarto(fora, { tipo: "presenca" }, dupla));
    expect(r.alertas.some((a) => a.texto.includes("não coincidiram"))).toBe(false);
  });

  it("quem não é do quarto não paga o ar", () => {
    expect(fatiaDe(quarto(fora, { tipo: "presenca" }, dupla), "m2")).toBe(0);
  });
});

describe("ninguém viajou: presença e igual dão o mesmo", () => {
  const fora = [0, 0, 0];
  const trio = ["m0", "m1", "m2"];

  it("três presentes o mês todo pagam um terço cada", () => {
    const estado = quarto(fora, { tipo: "presenca" }, trio);
    for (const id of trio) expect(fatiaDe(estado, id)).toBeCloseTo(100, 6);
  });

  it("bate com o rateio igual", () => {
    const igual = fatiaDe(quarto(fora, { tipo: "igual" }, trio), "m0");
    const presenca = fatiaDe(quarto(fora, { tipo: "presenca" }, trio), "m0");
    expect(presenca).toBeCloseTo(igual, 6);
  });
});

describe("duas ou mais viajaram: vira estimativa, e o motor diz isso", () => {
  const fora = [0, 15, 15];
  const trio = ["m0", "m1", "m2"];

  it("avisa que supôs que as viagens não coincidiram", () => {
    const r = calcular(quarto(fora, { tipo: "presenca" }, trio));
    const aviso = r.alertas.find((a) => a.texto.includes("não coincidiram"));
    expect(aviso).toBeDefined();
    expect(aviso?.nivel).toBe("aviso");
    expect(aviso?.texto).toContain("Ar-condicionado");
  });

  it("mesmo estimando, continua fechando com o custo do item", () => {
    const r = calcular(quarto(fora, { tipo: "presenca" }, trio));
    const item = r.itens.find((i) => i.id === "ar");
    const soma = item?.fatias.reduce((s, f) => s + f.total, 0) ?? 0;
    expect(soma).toBeCloseTo(item?.custoTotal ?? -1, 6);
    expect(conferir(r)).toBe(true);
  });

  it("quem ficou o mês todo paga mais que pelo rateio por dias", () => {
    const porDias = fatiaDe(quarto(fora, { tipo: "dias" }, trio), "m0");
    const porPresenca = fatiaDe(quarto(fora, { tipo: "presenca" }, trio), "m0");
    expect(porPresenca).toBeGreaterThan(porDias);
  });

  it("não avisa quando o item não usa presença", () => {
    const r = calcular(quarto(fora, { tipo: "dias" }, trio));
    expect(r.alertas.some((a) => a.texto.includes("não coincidiram"))).toBe(false);
  });
});

describe("casos extremos", () => {
  it("um participante só paga tudo, mesmo tendo viajado", () => {
    const estado = quarto([25, 0, 0], { tipo: "presenca" }, ["m0"]);
    expect(fatiaDe(estado, "m0")).toBeCloseTo(300, 6);
  });

  it("todo mundo do quarto fora o mês todo divide igual", () => {
    const estado = quarto([30, 30, 0], { tipo: "presenca" }, ["m0", "m1"]);
    expect(fatiaDe(estado, "m0")).toBeCloseTo(150, 6);
    expect(fatiaDe(estado, "m1")).toBeCloseTo(150, 6);
  });

  it("as fatias sempre somam o custo do item, em qualquer combinação", () => {
    for (let a = 0; a <= 30; a += 5) {
      for (let b = 0; b <= 30; b += 5) {
        const estado = quarto([a, b, 0], { tipo: "presenca" }, ["m0", "m1"]);
        const r = calcular(estado);
        const item = r.itens.find((i) => i.id === "ar");
        const soma = item?.fatias.reduce((s, f) => s + f.total, 0) ?? 0;
        expect(soma, `dias fora ${a} e ${b}`).toBeCloseTo(300, 6);
      }
    }
  });

  it("presença nunca cobra menos de quem ficou mais tempo", () => {
    for (let b = 0; b <= 30; b += 3) {
      const estado = quarto([0, b, 0], { tipo: "presenca" }, ["m0", "m1"]);
      expect(fatiaDe(estado, "m0")).toBeGreaterThanOrEqual(fatiaDe(estado, "m1") - 1e-9);
    }
  });
});

describe("contagem de ausentes", () => {
  const dias = { m0: 30, m1: 10, m2: 30 };

  it("conta quem não ficou o mês inteiro", () => {
    expect(ausentesEntre(["m0", "m1", "m2"], dias, 30)).toBe(1);
    expect(ausentesEntre(["m0", "m2"], dias, 30)).toBe(0);
  });

  it("morador desconhecido conta como ausente", () => {
    expect(ausentesEntre(["m9"], dias, 30)).toBe(1);
  });
});
