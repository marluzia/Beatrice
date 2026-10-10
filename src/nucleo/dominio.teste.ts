// Testes do domínio, uma CRC por bloco.
//
// Os outros testes do núcleo olham o fechamento de ponta a ponta. Estes olham
// cada responsabilidade sozinha, para que uma falha diga onde está o defeito,
// e não só que o total não bateu.

import { describe, expect, it } from "vitest";
import type { Estado, Item, Morador } from "./motor.ts";
import {
  alocar,
  calcular,
  conferir,
  conferirEmCentavos,
  consumoDe,
  custoDe,
  diasContadosEm,
  diasDoCiclo,
  diasDoPeriodo,
  medirFatura,
  origemDoCusto,
  pesosDe,
  rateiosPermitidos,
  regraDe,
  regraExata,
  REGRAS,
  usosTotaisDe,
} from "./motor.ts";

const moradores: Morador[] = [
  { id: "a", nome: "Ana", diasFora: 0 },
  { id: "b", nome: "Bia", diasFora: 15 },
];

const item = (parte: Partial<Item>): Item => ({
  id: "x",
  nome: "Item",
  custo: { tipo: "reais", valor: 100 },
  participantes: ["a", "b"],
  rateio: { tipo: "igual" },
  ...parte,
});

const faturasVazias = { luzKwh: 0, luzValor: 0, aguaM3: 0, aguaValor: 0 };

const casa = (parte: Partial<Estado> = {}): Estado => ({
  periodo: { mes: 4, ano: 2026 },
  faturas: faturasVazias,
  moradores,
  itens: [],
  ...parte,
});

// ── Ciclo ──────────────────────────────────────────────────────────────────

describe("Ciclo", () => {
  it("sem tamanho informado, o fechamento tem os dias do mês de referência", () => {
    expect(diasDoPeriodo({ mes: 2, ano: 2026 })).toBe(28);
    expect(diasDoPeriodo({ mes: 2, ano: 2028 })).toBe(29);
  });

  it("um ciclo de fatura sem tamanho segue o fechamento", () => {
    expect(diasDoCiclo(undefined, 30)).toBe(30);
    expect(diasDoCiclo(33, 30)).toBe(33);
  });

  it("recusa tamanho absurdo, que é dedo trocado", () => {
    expect(diasDoCiclo(400, 30)).toBe(90);
    expect(diasDoCiclo(-5, 30)).toBe(30);
  });
});

// ── Morador ────────────────────────────────────────────────────────────────

describe("Morador", () => {
  it("dias em casa são os dias do ciclo menos os dias fora", () => {
    expect(diasContadosEm(moradores, 30, (m) => m.diasFora)).toEqual({ a: 30, b: 15 });
  });

  it("não fica com dias negativos nem acima do ciclo", () => {
    const contados = diasContadosEm(
      [
        { id: "x", nome: "", diasFora: 40 },
        { id: "y", nome: "", diasFora: -3 },
      ],
      30,
      (m) => m.diasFora,
    );
    expect(contados).toEqual({ x: 0, y: 30 });
  });

  it("dias fora ilegíveis contam como zero", () => {
    expect(diasContadosEm([{ id: "x", nome: "", diasFora: NaN }], 30, (m) => m.diasFora)).toEqual({ x: 30 });
  });
});

// ── Fatura ─────────────────────────────────────────────────────────────────

describe("Fatura", () => {
  it("separa taxa de consumo e acha a tarifa do que sobra", () => {
    const luz = medirFatura(
      { ...faturasVazias, luzKwh: 100, luzValor: 120, luzTaxas: [{ nome: "Iluminação", valor: 20 }] },
      "luz",
    );
    expect(luz.taxasCobradas).toBe(20);
    expect(luz.consumoEmReais).toBe(100);
    expect(luz.tarifa).toBe(1);
  });

  it("taxa sem nome ganha o nome genérico da conta", () => {
    const agua = medirFatura({ ...faturasVazias, aguaValor: 50, aguaTaxas: [{ nome: " ", valor: 10 }] }, "agua");
    expect(agua.taxas).toEqual([{ nome: "Taxas fixas da água", valor: 10 }]);
  });

  it("na forma antiga, a taxa não passa do valor da fatura", () => {
    const luz = medirFatura({ ...faturasVazias, luzValor: 30, luzTaxasFixas: 50 }, "luz");
    expect(luz.taxasCobradas).toBe(30);
    expect(luz.consumoEmReais).toBe(0);
  });

  it("fatura sem consumo tem tarifa zero, não infinita", () => {
    expect(medirFatura({ ...faturasVazias, luzValor: 80 }, "luz").tarifa).toBe(0);
  });
});

// ── Uso ────────────────────────────────────────────────────────────────────

describe("Uso", () => {
  const maquina = item({
    custo: { tipo: "porUso", usosTotais: 9, unitario: { origem: "fatura", kwhPorUso: 1, m3PorUso: 0.1 } },
    rateio: { tipo: "uso", usos: { a: 3, b: 1 }, usosLuz: { a: 2, b: 1 }, usosAgua: { a: 3, b: 0 } },
  });

  it("quem divide por uso tem como total a soma dos usos de cada um", () => {
    expect(usosTotaisDe(maquina)).toBe(4);
  });

  it("cada ciclo conta os usos que caíram dentro dele", () => {
    expect(usosTotaisDe(maquina, "luz")).toBe(3);
    expect(usosTotaisDe(maquina, "agua")).toBe(3);
  });

  it("quem não divide por uso informa só o total", () => {
    expect(usosTotaisDe({ ...maquina, rateio: { tipo: "igual" } })).toBe(9);
  });
});

// ── Consumo e Custo ────────────────────────────────────────────────────────

describe("Consumo e Custo", () => {
  it("o consumo é físico: uma lavagem é kWh e m³, qualquer que seja a tarifa", () => {
    const lavagens = item({
      custo: { tipo: "porUso", usosTotais: 10, unitario: { origem: "fatura", kwhPorUso: 0.8, m3PorUso: 0.05 } },
    });
    const consumo = consumoDe(lavagens);
    expect(consumo.kwh).toBeCloseTo(8, 10);
    expect(consumo.m3).toBeCloseTo(0.5, 10);
    expect(consumo.reais).toBeUndefined();
  });

  it("item de água não tem kWh, nem mesmo zero", () => {
    expect(consumoDe(item({ custo: { tipo: "consumo", quantidade: 3, unidade: "m3" } }))).toEqual({ m3: 3 });
  });

  it("o custo é o consumo vezes a tarifa, separado por conta", () => {
    const chuveiro = item({ custo: { tipo: "porHora", porHora: 5, horas: 10, unidade: "kwh" } });
    expect(custoDe(chuveiro, { luz: 0.9, agua: 7 })).toEqual({ luz: 45, agua: 0, reais: 0 });
  });

  it("despesa em reais não passa por tarifa nenhuma", () => {
    expect(custoDe(item({}), { luz: 0.9, agua: 7 })).toEqual({ luz: 0, agua: 0, reais: 100 });
  });

  it("rotula de onde o custo saiu", () => {
    expect(origemDoCusto({ luz: 1, agua: 0, reais: 0 })).toBe("luz");
    expect(origemDoCusto({ luz: 0, agua: 1, reais: 0 })).toBe("agua");
    expect(origemDoCusto({ luz: 1, agua: 1, reais: 0 })).toBe("mista");
    expect(origemDoCusto({ luz: 1, agua: 0, reais: 1 })).toBe("reais");
  });
});

// ── Regra de alocação ──────────────────────────────────────────────────────

describe("Regra de alocação", () => {
  const contexto = (rateio: Item["rateio"], participantes = ["a", "b"]) => ({
    item: item({ rateio, participantes }),
    diasContados: { a: 30, b: 15, c: 15 },
    diasNoCiclo: 30,
    mundo: null,
  });

  it("toda regra do registro se declara pela chave em que mora", () => {
    for (const [chave, regra] of Object.entries(REGRAS)) expect(regra.chave).toBe(chave);
  });

  it("regra desconhecida cai em igual em vez de estourar", () => {
    expect(regraDe("inventada" as never).chave).toBe("igual");
  });

  it("igual pesa 1 para cada, tenha ficado em casa ou não", () => {
    expect(pesosDe(contexto({ tipo: "igual" })).pesos).toEqual({ a: 1, b: 1 });
  });

  it("por dias pesa os dias em casa", () => {
    expect(pesosDe(contexto({ tipo: "dias" })).pesos).toEqual({ a: 30, b: 15 });
  });

  it("por presença: quem ficou sozinho paga aqueles dias inteiros", () => {
    // Bia em casa metade do tempo: metade dos dias é dividida por dois, a outra metade é só da Ana.
    const { pesos, soma } = pesosDe(contexto({ tipo: "presenca" }));
    expect(pesos.a / soma).toBeCloseTo(0.75, 10);
    expect(pesos.b / soma).toBeCloseTo(0.25, 10);
  });

  it("por presença com uma pessoa fora é exata; com duas, é estimativa", () => {
    expect(regraExata(contexto({ tipo: "presenca" }))).toBe(true);
    expect(regraExata(contexto({ tipo: "presenca" }, ["a", "b", "c"]))).toBe(false);
    expect(regraExata(contexto({ tipo: "dias" }, ["a", "b", "c"]))).toBe(true);
  });

  it("o misto fica entre por igual e por dias", () => {
    const meio = pesosDe(contexto({ tipo: "misto", igual: 0.5 }));
    expect(meio.pesos.a / meio.soma).toBeCloseTo(0.5 * (30 / 45) + 0.5 * 0.5, 10);
  });

  it("grupo sem peso nenhum divide por igual, para o item não sumir", () => {
    const { pesos, soma } = pesosDe(contexto({ tipo: "uso", usos: {} }));
    expect(pesos).toEqual({ a: 1, b: 1 });
    expect(soma).toBe(2);
  });

  it("o misto existe, mas não é oferecido item a item", () => {
    expect(rateiosPermitidos(item({}))).toEqual(["igual", "dias", "presenca", "uso"]);
    expect(
      rateiosPermitidos(item({ custo: { tipo: "porUso", unitario: { origem: "reais", valorPorUso: 1 } } })),
    ).toEqual(["igual", "uso"]);
  });
});

// ── Alocação ───────────────────────────────────────────────────────────────

describe("Alocação", () => {
  const janela = { dias: 30, contados: { a: 30, b: 15 } };
  const janelas = { mes: janela, luz: janela, agua: janela, luzSegueOMes: true, aguaSegueOMes: true };

  it("as parcelas de um item somam o custo dele", () => {
    const { parcelas, calculado } = alocar(item({ rateio: { tipo: "dias" } }), { luz: 30, agua: 12, reais: 60 }, janelas, false);
    const soma = parcelas.reduce((s, p) => s + p.total, 0);
    expect(soma).toBeCloseTo(102, 10);
    expect(calculado.custoTotal).toBe(102);
  });

  it("cada conta é dividida com os dias do seu próprio ciclo", () => {
    // No ciclo da luz, a Bia esteve em casa o tempo todo; no fechamento, só metade.
    const luzInteira = { dias: 30, contados: { a: 30, b: 30 } };
    const { parcelas } = alocar(
      item({ rateio: { tipo: "dias" } }),
      { luz: 100, agua: 0, reais: 90 },
      { ...janelas, luz: luzInteira, luzSegueOMes: false },
      false,
    );
    const bia = parcelas.find((p) => p.moradorId === "b")!;
    expect(bia.luz).toBeCloseTo(50, 10);
    expect(bia.reais).toBeCloseTo(30, 10);
  });

  it("guarda o peso e a proporção de cada um, para a tela explicar", () => {
    const { calculado } = alocar(item({ rateio: { tipo: "dias" } }), { luz: 0, agua: 0, reais: 90 }, janelas, false);
    const [ana, bia] = calculado.fatias;
    expect([ana.peso, bia.peso]).toEqual([30, 15]);
    expect(ana.proporcao).toBeCloseTo(2 / 3, 10);
    expect(bia.proporcao).toBeCloseTo(1 / 3, 10);
  });
});

// ── Explicação e Fechamento ────────────────────────────────────────────────

describe("Explicação e Fechamento", () => {
  const completa = casa({
    faturas: {
      luzKwh: 100,
      luzValor: 110,
      luzTaxas: [{ nome: "Iluminação", valor: 10 }],
      aguaM3: 10,
      aguaValor: 50,
    },
    itens: [
      item({ id: "g", nome: "Geladeira", custo: { tipo: "consumo", quantidade: 40, unidade: "kwh" } }),
      item({ id: "i", nome: "Internet", custo: { tipo: "reais", valor: 100 }, rateio: { tipo: "dias" } }),
    ],
  });

  it("conserva o custo: o cobrado é luz + água + despesas em reais", () => {
    const r = calcular(completa);
    expect(r.somaDevida).toBe(110 + 50 + 100);
    expect(conferir(r)).toBe(true);
  });

  it("o total de cada pessoa se desmonta item a item", () => {
    const r = calcular(completa);
    for (const pessoa of r.moradores) {
      const soma = pessoa.linhas.reduce((s, l) => s + l.valor, 0);
      expect(soma).toBeCloseTo(pessoa.total, 10);
    }
    expect(r.moradores[0].linhas.map((l) => l.nome)).toEqual([
      "Geladeira",
      "Internet",
      "Uso comum de luz",
      "Uso comum de água",
      "Iluminação",
    ]);
  });

  it("o que a fatura cobrou e nenhum item explicou vira uso comum", () => {
    const r = calcular(completa);
    expect(r.sobraLuz).toBeCloseTo(100 - 40, 10);
    expect(r.sobraAgua).toBeCloseTo(50, 10);
  });

  it("item de consumo acima da fatura é erro, não sobra negativa silenciosa", () => {
    const r = calcular(
      casa({
        faturas: { ...faturasVazias, luzKwh: 10, luzValor: 10 },
        itens: [item({ custo: { tipo: "consumo", quantidade: 30, unidade: "kwh" } })],
      }),
    );
    expect(r.alertas.some((a) => a.nivel === "erro" && a.texto.includes("fatura de luz"))).toBe(true);
  });

  it("não esconde o arredondamento: diz quantos centavos sobram ou faltam", () => {
    const tres = casa({
      moradores: [...moradores, { id: "c", nome: "Cadu", diasFora: 0 }],
      itens: [item({ participantes: ["a", "b", "c"] })],
    });
    const r = calcular(tres);
    expect(conferir(r)).toBe(true);
    expect(conferirEmCentavos(r)).toBe(false);
    expect(r.residuoDeCentavos).toBe(1);
    expect(r.alertas.some((a) => a.texto.includes("1 centavo de menos"))).toBe(true);
  });

  it("casa sem morador com conta a pagar é erro, e não um rateio vazio", () => {
    const r = calcular(casa({ moradores: [], itens: [item({ participantes: [] })], faturas: { ...faturasVazias, luzValor: 50 } }));
    expect(r.alertas.some((a) => a.nivel === "erro")).toBe(true);
    expect(conferir(r)).toBe(false);
  });

  it("presença estimada é dita na tela", () => {
    const r = calcular(
      casa({
        moradores: [...moradores, { id: "c", nome: "Cadu", diasFora: 10 }],
        itens: [item({ nome: "Ar", participantes: ["a", "b", "c"], rateio: { tipo: "presenca" } })],
      }),
    );
    expect(r.alertas.some((a) => a.texto.startsWith('"Ar" divide por presença'))).toBe(true);
  });
});
