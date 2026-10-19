// As três divisões novas: porcentagem, valor em reais e horas.
//
// Duas delas são proporções como todas as outras. A terceira, valor, é a
// única regra do motor em que o número digitado é o valor final   e por isso
// é a única que pode "não fechar". O teste existe principalmente para provar
// que quando ela não fecha o motor reclama, em vez de ajustar em silêncio.

import { describe, expect, it } from "vitest";
import {
  calcular,
  conferir,
  conferirEmCentavos,
  pesosDe,
  rateiosPermitidos,
  somaDeclarada,
  type Estado,
  type Item,
} from "./motor.ts";

const SEM_FATURA = { luzKwh: 0, luzValor: 0, aguaM3: 0, aguaValor: 0 };

const casa = (itens: Item[], quantos = 3): Estado => ({
  periodo: { mes: 9, ano: 2026 },
  faturas: SEM_FATURA,
  moradores: Array.from({ length: quantos }, (_, i) => ({
    id: `m${i}`,
    nome: `P${i}`,
    diasFora: 0,
  })),
  itens,
});

const emReais = (valor: number, rateio: Item["rateio"]): Item => ({
  id: "i",
  nome: "Despesa",
  custo: { tipo: "reais", valor },
  participantes: ["m0", "m1", "m2"],
  rateio,
});

const totais = (e: Estado) => calcular(e).moradores.map((m) => m.total);

// ── porcentagem ────────────────────────────────────────────────────────────

describe("divisão por porcentagem", () => {
  it("divide na porcentagem declarada", () => {
    const r = calcular(
      casa([emReais(300, { tipo: "porcentagem", porcentagens: { m0: 50, m1: 30, m2: 20 } })]),
    );

    expect(r.moradores.map((m) => m.total)).toEqual([150, 90, 60]);
    expect(conferir(r)).toBe(true);
    expect(conferirEmCentavos(r)).toBe(true);
  });

  it("avisa quando as porcentagens não somam 100, e divide na proporção escrita", () => {
    const e = casa([
      emReais(300, { tipo: "porcentagem", porcentagens: { m0: 30, m1: 30, m2: 30 } }),
    ]);
    const r = calcular(e);

    // 30/30/30 é a mesma proporção que 1/1/1: o item continua fechando.
    expect(r.moradores.map((m) => m.total)).toEqual([100, 100, 100]);
    expect(conferir(r)).toBe(true);

    const aviso = r.alertas.find((a) => a.texto.includes("somam"));
    expect(aviso).toBeDefined();
    expect(aviso!.nivel).toBe("aviso");
    expect(aviso!.texto).toContain("90,00%");
  });

  it("não avisa quando fecha em 100", () => {
    const r = calcular(
      casa([emReais(300, { tipo: "porcentagem", porcentagens: { m0: 50, m1: 30, m2: 20 } })]),
    );
    expect(r.alertas.some((a) => a.texto.includes("não 100%"))).toBe(false);
  });

  it("só conta a porcentagem de quem participa do item", () => {
    const item = {
      ...emReais(100, { tipo: "porcentagem", porcentagens: { m0: 50, m1: 50, m2: 999 } }),
      participantes: ["m0", "m1"],
    };
    expect(somaDeclarada(item)).toBe(100);
    expect(totais(casa([item]))).toEqual([50, 50, 0]);
  });

  it("porcentagem toda zerada não faz o item sumir: cai em partes iguais", () => {
    const r = calcular(
      casa([emReais(90, { tipo: "porcentagem", porcentagens: { m0: 0, m1: 0, m2: 0 } })]),
    );
    expect(r.moradores.map((m) => m.total)).toEqual([30, 30, 30]);
    expect(conferir(r)).toBe(true);
  });
});

// ── valor em reais ─────────────────────────────────────────────────────────

describe("divisão por valor em reais", () => {
  it("cobra exatamente o que foi declarado quando a soma bate", () => {
    const r = calcular(
      casa([emReais(100, { tipo: "valor", valores: { m0: 50, m1: 30, m2: 20 } })]),
    );

    expect(r.moradores.map((m) => m.total)).toEqual([50, 30, 20]);
    expect(conferir(r)).toBe(true);
    expect(r.alertas.some((a) => a.nivel === "erro")).toBe(false);
  });

  it("falta dinheiro: erro vermelho dizendo quanto ficou sem dono", () => {
    const r = calcular(
      casa([emReais(100, { tipo: "valor", valores: { m0: 50, m1: 30, m2: 0 } })]),
    );

    const erro = r.alertas.find((a) => a.nivel === "erro");
    expect(erro).toBeDefined();
    expect(erro!.texto).toContain("faltam R$ 20,00");
  });

  it("sobra dinheiro: erro vermelho dizendo quanto passou", () => {
    const r = calcular(
      casa([emReais(100, { tipo: "valor", valores: { m0: 60, m1: 50, m2: 20 } })]),
    );

    const erro = r.alertas.find((a) => a.nivel === "erro");
    expect(erro).toBeDefined();
    expect(erro!.texto).toContain("sobram R$ 30,00");
  });

  it("mesmo com erro, a soma cobrada continua fechando com a devida", () => {
    // O alerta é para a pessoa consertar o lançamento. Enquanto ela não
    // conserta, o motor não pode inventar nem perder dinheiro: ele divide na
    // proporção do que foi escrito e o invariante continua de pé.
    const r = calcular(
      casa([emReais(100, { tipo: "valor", valores: { m0: 50, m1: 30, m2: 0 } })]),
    );

    expect(conferir(r)).toBe(true);
    expect(r.somaDevida).toBeCloseTo(100, 10);
    expect(r.moradores.reduce((s, m) => s + m.total, 0)).toBeCloseTo(100, 10);
  });

  it("um centavo de diferença não dispara o erro", () => {
    const r = calcular(
      casa([emReais(100, { tipo: "valor", valores: { m0: 50, m1: 30, m2: 20.001 } })]),
    );
    expect(r.alertas.some((a) => a.nivel === "erro")).toBe(false);
  });
});

// ── horas ──────────────────────────────────────────────────────────────────

describe("divisão por horas", () => {
  it("pesa igual a uso: a mesma tabela produz a mesma divisão", () => {
    const tabela = { m0: 2, m1: 14, m2: 24 };

    const porUso = totais(casa([emReais(4000, { tipo: "uso", usos: tabela })]));
    const porHoras = totais(casa([emReais(4000, { tipo: "horas", usos: tabela })]));

    expect(porHoras).toEqual(porUso);
  });

  it("aceita hora quebrada", () => {
    const r = calcular(
      casa([emReais(100, { tipo: "horas", usos: { m0: 2.5, m1: 2.5, m2: 5 } })]),
    );

    expect(r.moradores.map((m) => m.total)).toEqual([25, 25, 50]);
    expect(conferir(r)).toBe(true);
  });

  it("custo por uso cobrado por hora: R$ por hora de motor", () => {
    const lancha: Item = {
      id: "comb",
      nome: "Combustível",
      custo: { tipo: "porUso", unitario: { origem: "reais", valorPorUso: 100 } },
      participantes: ["m0", "m1", "m2"],
      rateio: { tipo: "horas", usos: { m0: 2, m1: 14, m2: 24 } },
    };

    const r = calcular(casa([lancha]));

    // 40 horas × R$ 100 = R$ 4.000, repartidos na proporção das horas.
    expect(r.somaDevida).toBeCloseTo(4000, 10);
    expect(r.moradores.map((m) => m.total)).toEqual([200, 1400, 2400]);
    expect(conferir(r)).toBe(true);
  });

  it("horas zeradas não fazem o item sumir", () => {
    const r = calcular(
      casa([emReais(90, { tipo: "horas", usos: { m0: 0, m1: 0, m2: 0 } })]),
    );
    expect(r.moradores.map((m) => m.total)).toEqual([30, 30, 30]);
  });
});

// ── as sete juntas ─────────────────────────────────────────────────────────

describe("as sete divisões", () => {
  it("o resíduo de centavos continua aparecendo nas regras novas", () => {
    // R$ 100 entre três não fecha em dinheiro em nenhuma regra proporcional.
    const r = calcular(
      casa([emReais(100, { tipo: "porcentagem", porcentagens: { m0: 1, m1: 1, m2: 1 } })]),
    );
    expect(conferir(r)).toBe(true);
    expect(conferirEmCentavos(r)).toBe(false);
    expect(r.alertas.some((a) => a.texto.includes("centavo"))).toBe(true);
  });

  it("todas aparecem para qualquer item", () => {
    expect(rateiosPermitidos(emReais(1, { tipo: "igual" }))).toEqual([
      "igual",
      "dias",
      "presenca",
      "uso",
      "horas",
      "porcentagem",
      "valor",
    ]);
  });

  it("cada uma fecha a conta, sozinha", () => {
    // R$ 180 entre três divide redondo em todas as sete, para o teste medir a
    // regra e não o resíduo de centavos (que tem teste próprio).
    const tabela = { m0: 1, m1: 2, m2: 3 };
    const rateios: Item["rateio"][] = [
      { tipo: "igual" },
      { tipo: "dias" },
      { tipo: "presenca" },
      { tipo: "uso", usos: tabela },
      { tipo: "horas", usos: tabela },
      { tipo: "porcentagem", porcentagens: { m0: 20, m1: 30, m2: 50 } },
      { tipo: "valor", valores: { m0: 36, m1: 54, m2: 90 } },
    ];

    for (const rateio of rateios) {
      const r = calcular(casa([emReais(180, rateio)]));
      expect(conferir(r), rateio.tipo).toBe(true);
      expect(conferirEmCentavos(r), rateio.tipo).toBe(true);
      expect(r.moradores.every((m) => Number.isFinite(m.total)), rateio.tipo).toBe(true);
    }
  });

  it("nenhuma regra nova produz peso negativo", () => {
    const item = emReais(100, { tipo: "valor", valores: { m0: -50, m1: 100, m2: 50 } });
    const { pesos } = pesosDe({
      item,
      diasContados: { m0: 30, m1: 30, m2: 30 },
      diasNoCiclo: 30,
      mundo: null,
    });

    expect(Object.values(pesos).every((p) => p >= 0)).toBe(true);
  });
});
