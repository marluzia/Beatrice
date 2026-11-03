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
  cicloDe,
} from "./motor.ts";
import type { Fatura } from "./motor.ts";

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

const LUZ: Fatura = { id: "luz", nome: "Luz", recurso: "kwh", quantidade: 0, valor: 0 };
const AGUA: Fatura = { id: "agua", nome: "Água", recurso: "m3", quantidade: 0, valor: 0 };
const faturasVazias: Fatura[] = [LUZ, AGUA];

/** Luz e água com o que o caso precisa; o resto zerado. */
const faturas = (luz: Partial<Fatura> = {}, agua: Partial<Fatura> = {}): Fatura[] => [
  { ...LUZ, ...luz },
  { ...AGUA, ...agua },
];

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
    const luz = medirFatura({ ...LUZ, quantidade: 100, valor: 120, taxas: [{ nome: "Iluminação", valor: 20 }] });
    expect(luz.taxasCobradas).toBe(20);
    expect(luz.consumoEmReais).toBe(100);
    expect(luz.tarifa).toBe(1);
  });

  it("taxa sem nome ganha o nome genérico da conta", () => {
    const agua = medirFatura({ ...AGUA, valor: 50, taxas: [{ nome: " ", valor: 10 }] });
    expect(agua.taxas).toEqual([{ nome: "Taxas fixas da água", valor: 10 }]);
    const gas = medirFatura({ id: "g1", nome: "Gás", recurso: "m3", quantidade: 0, valor: 50, taxas: [{ nome: "", valor: 5 }] });
    expect(gas.taxas).toEqual([{ nome: "Taxas fixas de Gás", valor: 5 }]);
  });

  it("na forma antiga, a taxa não passa do valor da fatura", () => {
    const luz = medirFatura({ ...LUZ, valor: 30, taxasFixas: 50 });
    expect(luz.taxasCobradas).toBe(30);
    expect(luz.consumoEmReais).toBe(0);
  });

  it("fatura sem consumo tem tarifa zero, não infinita", () => {
    expect(medirFatura({ ...LUZ, valor: 80 }).tarifa).toBe(0);
  });

  it("ciclo sem recurso não tem quantidade nem tarifa, mesmo que alguém escreva uma", () => {
    const aluguel = medirFatura({ id: "al", nome: "Aluguel", recurso: null, quantidade: 7, valor: 3000 });
    expect(aluguel.quantidade).toBe(0);
    expect(aluguel.tarifa).toBe(0);
    expect(aluguel.consumoEmReais).toBe(3000);
  });
});

// ── Uso ────────────────────────────────────────────────────────────────────

describe("Uso", () => {
  const maquina = item({
    custo: { tipo: "porUso", usosTotais: 9, unitario: { origem: "fatura", porCiclo: { luz: 1, agua: 0.1 } } },
    rateio: { tipo: "uso", usos: { a: 3, b: 1 }, usosPorCiclo: { luz: { a: 2, b: 1 }, agua: { a: 3, b: 0 } } },
  });

  it("quem divide por uso tem como total a soma dos usos de cada um", () => {
    expect(usosTotaisDe(maquina)).toBe(4);
  });

  it("cada ciclo conta os usos que caíram dentro dele", () => {
    expect(usosTotaisDe(maquina, "luz")).toBe(3);
    expect(usosTotaisDe(maquina, "agua")).toBe(3);
  });

  it("ciclo sem usos separados usa os usos do período", () => {
    expect(usosTotaisDe(maquina, "gas")).toBe(4);
  });

  it("quem não divide por uso informa só o total", () => {
    expect(usosTotaisDe({ ...maquina, rateio: { tipo: "igual" } })).toBe(9);
  });
});

// ── Consumo e Custo ────────────────────────────────────────────────────────

describe("Consumo e Custo", () => {
  it("o consumo é físico: uma lavagem é kWh e m³, qualquer que seja a tarifa", () => {
    const lavagens = item({
      custo: { tipo: "porUso", usosTotais: 10, unitario: { origem: "fatura", porCiclo: { luz: 0.8, agua: 0.05 } } },
    });
    const consumo = consumoDe(lavagens);
    expect(consumo.porCiclo.luz).toBeCloseTo(8, 10);
    expect(consumo.porCiclo.agua).toBeCloseTo(0.5, 10);
    expect(consumo.reais).toBeUndefined();
  });

  it("item de água não tem kWh, nem mesmo zero", () => {
    expect(consumoDe(item({ custo: { tipo: "consumo", porCiclo: { agua: 3 } } }))).toEqual({ porCiclo: { agua: 3 } });
  });

  it("o custo é o consumo vezes a tarifa, separado por conta", () => {
    const chuveiro = item({ custo: { tipo: "porHora", horas: 10, porCiclo: { luz: 5 } } });
    expect(custoDe(chuveiro, { luz: 0.9, agua: 7 })).toEqual({ porCiclo: { luz: 45 }, reais: 0 });
  });

  it("um chuveiro elétrico puxa kWh da luz e m³ da água ao mesmo tempo", () => {
    const chuveiro = item({ custo: { tipo: "porHora", horas: 20, porCiclo: { luz: 5.5, agua: 0.36 } } });
    expect(consumoDe(chuveiro).porCiclo.luz).toBeCloseTo(110, 10);
    expect(consumoDe(chuveiro).porCiclo.agua).toBeCloseTo(7.2, 10);
    const custo = custoDe(chuveiro, { luz: 0.9, agua: 10 });
    expect(custo.porCiclo.luz).toBeCloseTo(99, 10);
    expect(custo.porCiclo.agua).toBeCloseTo(72, 10);
  });

  it("um item pode sair de um ciclo criado pela casa", () => {
    const fogao = item({ custo: { tipo: "consumo", porCiclo: { gas: 4 } } });
    expect(custoDe(fogao, { luz: 0.9, gas: 6.5 })).toEqual({ porCiclo: { gas: 26 }, reais: 0 });
  });

  it("item de um ciclo que não está no fechamento custa zero", () => {
    const fogao = item({ custo: { tipo: "consumo", porCiclo: { gas: 4 } } });
    expect(custoDe(fogao, { luz: 0.9 })).toEqual({ porCiclo: { gas: 0 }, reais: 0 });
  });

  it("despesa em reais não passa por tarifa nenhuma", () => {
    expect(custoDe(item({}), { luz: 0.9, agua: 7 })).toEqual({ porCiclo: {}, reais: 100 });
  });

  it("rotula de onde o custo saiu", () => {
    expect(origemDoCusto({ porCiclo: { luz: 1 }, reais: 0 })).toBe("luz");
    expect(origemDoCusto({ porCiclo: { agua: 1 }, reais: 0 })).toBe("agua");
    expect(origemDoCusto({ porCiclo: { luz: 1, agua: 1 }, reais: 0 })).toBe("mista");
    expect(origemDoCusto({ porCiclo: { luz: 1 }, reais: 1 })).toBe("reais");
    expect(origemDoCusto({ porCiclo: { gas: 0 }, reais: 0 })).toBe("gas");
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
    expect(rateiosPermitidos(item({}))).not.toContain("misto");
  });

  it("as sete divisões valem para todo item, qualquer que seja o custo", () => {
    const sete = ["igual", "dias", "presenca", "uso", "horas", "porcentagem", "valor"];
    expect(rateiosPermitidos(item({}))).toEqual(sete);
    expect(
      rateiosPermitidos(item({ custo: { tipo: "porUso", unitario: { origem: "reais", valorPorUso: 1 } } })),
    ).toEqual(sete);
  });
});

// ── Alocação ───────────────────────────────────────────────────────────────

describe("Alocação", () => {
  const janela = { dias: 30, contados: { a: 30, b: 15 } };
  const janelas = {
    mes: janela,
    porCiclo: { luz: janela, agua: janela },
    segueOMes: { luz: true, agua: true },
  };

  it("as parcelas de um item somam o custo dele", () => {
    const { parcelas, calculado } = alocar(item({ rateio: { tipo: "dias" } }), { porCiclo: { luz: 30, agua: 12 }, reais: 60 }, janelas, false);
    const soma = parcelas.reduce((s, p) => s + p.total, 0);
    expect(soma).toBeCloseTo(102, 10);
    expect(calculado.custoTotal).toBe(102);
  });

  it("cada conta é dividida com os dias do seu próprio ciclo", () => {
    // No ciclo da luz, a Bia esteve em casa o tempo todo; no fechamento, só metade.
    const luzInteira = { dias: 30, contados: { a: 30, b: 30 } };
    const { parcelas } = alocar(
      item({ rateio: { tipo: "dias" } }),
      { porCiclo: { luz: 100, agua: 0 }, reais: 90 },
      { ...janelas, porCiclo: { ...janelas.porCiclo, luz: luzInteira }, segueOMes: { luz: false, agua: true } },
      false,
    );
    const bia = parcelas.find((p) => p.moradorId === "b")!;
    expect(bia.porCiclo.luz).toBeCloseTo(50, 10);
    expect(bia.reais).toBeCloseTo(30, 10);
  });

  it("guarda o peso e a proporção de cada um, para a tela explicar", () => {
    const { calculado } = alocar(item({ rateio: { tipo: "dias" } }), { porCiclo: {}, reais: 90 }, janelas, false);
    const [ana, bia] = calculado.fatias;
    expect([ana.peso, bia.peso]).toEqual([30, 15]);
    expect(ana.proporcao).toBeCloseTo(2 / 3, 10);
    expect(bia.proporcao).toBeCloseTo(1 / 3, 10);
  });
});

// ── Explicação e Fechamento ────────────────────────────────────────────────

describe("Explicação e Fechamento", () => {
  const completa = casa({
    faturas: faturas(
      { quantidade: 100, valor: 110, taxas: [{ nome: "Iluminação", valor: 10 }] },
      { quantidade: 10, valor: 50 },
    ),
    itens: [
      item({ id: "g", nome: "Geladeira", custo: { tipo: "consumo", porCiclo: { luz: 40 } } }),
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
    expect(cicloDe(r, "luz")!.sobra).toBeCloseTo(100 - 40, 10);
    expect(cicloDe(r, "agua")!.sobra).toBeCloseTo(50, 10);
  });

  it("item de consumo acima da fatura é erro, não sobra negativa silenciosa", () => {
    const r = calcular(
      casa({
        faturas: faturas({ quantidade: 10, valor: 10 }),
        itens: [item({ custo: { tipo: "consumo", porCiclo: { luz: 30 } } })],
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
    const r = calcular(casa({ moradores: [], itens: [item({ participantes: [] })], faturas: faturas({ valor: 50 }) }));
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

// ── Ciclos além de luz e água ──────────────────────────────────────────────

describe("Ciclos", () => {
  const gas: Fatura = { id: "gas", nome: "Gás", recurso: "m3", quantidade: 20, valor: 130, taxas: [{ nome: "Assinatura", valor: 30 }] };
  const aluguel: Fatura = { id: "aluguel", nome: "Aluguel", recurso: null, quantidade: 0, valor: 3000, taxas: [{ nome: "Seguro", valor: 60 }] };

  it("um ciclo a mais entra na soma devida e no resultado, com o seu nome", () => {
    const r = calcular(casa({ faturas: [...faturas({ valor: 100, quantidade: 100 }), gas] }));
    expect(r.somaDevida).toBe(100 + 130);
    expect(r.ciclos.map((c) => c.id)).toEqual(["luz", "agua", "gas"]);
    expect(cicloDe(r, "gas")!.tarifa).toBeCloseTo(5, 10);
    expect(r.itens.map((i) => i.nome)).toContain("Uso comum de Gás");
    expect(r.itens.map((i) => i.nome)).toContain("Assinatura");
    expect(conferir(r)).toBe(true);
  });

  it("item de consumo de gás tira da sobra do gás, não da luz", () => {
    const r = calcular(
      casa({
        faturas: [...faturas({ valor: 100, quantidade: 100 }), gas],
        itens: [item({ id: "f", nome: "Fogão", custo: { tipo: "consumo", porCiclo: { gas: 8 } } })],
      }),
    );
    expect(cicloDe(r, "gas")!.sobra).toBeCloseTo(100 - 40, 10);
    expect(cicloDe(r, "luz")!.sobra).toBeCloseTo(100, 10);
    expect(r.moradores[0].porCiclo.gas).toBeGreaterThan(0);
  });

  it("ciclo sem recurso divide o valor pela régua e as taxas por igual", () => {
    const r = calcular(casa({ faturas: [aluguel], calibragem: 0 }));
    const comum = r.itens.find((i) => i.id === "__aluguel")!;
    expect(comum.nome).toBe("Aluguel");
    expect(comum.custoTotal).toBeCloseTo(2940, 10);
    // Por dias: Ana 30, Bia 15.
    expect(comum.fatias[0].total).toBeCloseTo(2940 * (30 / 45), 10);
    expect(r.itens.find((i) => i.id === "__taxa_aluguel_0")!.fatias[1].total).toBeCloseTo(30, 10);
    expect(conferir(r)).toBe(true);
  });

  it("cada ciclo usa os dias do seu próprio intervalo", () => {
    const r = calcular(
      casa({
        faturas: [{ ...gas, taxas: [], dias: 10 }],
        moradores: [
          { id: "a", nome: "Ana", diasFora: 0 },
          { id: "b", nome: "Bia", diasFora: 15, diasForaPorCiclo: { gas: 0 } },
        ],
        calibragem: 0,
      }),
    );
    // No ciclo do gás, as duas ficaram os 10 dias: metade para cada.
    const comum = r.itens.find((i) => i.id === "__gas")!;
    expect(comum.fatias[1].total).toBeCloseTo(65, 10);
    expect(cicloDe(r, "gas")!.dias).toBe(10);
  });

  it("um ciclo com regra própria divide a sobra por ela, e não pela régua", () => {
    const r = calcular(
      casa({
        faturas: [{ ...aluguel, taxas: [], rateio: { tipo: "porcentagem", porcentagens: { a: 70, b: 30 } } }],
        calibragem: 1,
      }),
    );
    const comum = r.itens.find((i) => i.id === "__aluguel")!;
    expect(comum.fatias[0].total).toBeCloseTo(2100, 10);
    expect(comum.fatias[1].total).toBeCloseTo(900, 10);
  });

  it("porcentagem do ciclo que não soma 100 avisa com o nome dele", () => {
    const r = calcular(
      casa({ faturas: [{ ...aluguel, taxas: [], rateio: { tipo: "porcentagem", porcentagens: { a: 70, b: 20 } } }] }),
    );
    expect(r.alertas.some((a) => a.texto.includes('"Aluguel"') && a.texto.includes("90"))).toBe(true);
  });

  it("dois ciclos com o mesmo id contam uma vez só", () => {
    const r = calcular(casa({ faturas: [gas, { ...gas, valor: 999 }] }));
    expect(r.somaDevida).toBe(130);
    expect(r.ciclos).toHaveLength(1);
  });

  it("sem ciclo nenhum, sobram as despesas em reais", () => {
    const r = calcular(casa({ faturas: [], itens: [item({})] }));
    expect(r.ciclos).toEqual([]);
    expect(r.somaDevida).toBe(100);
    expect(conferir(r)).toBe(true);
  });

  it("item de gás acima da fatura do gás é erro com o nome do ciclo", () => {
    const r = calcular(
      casa({
        faturas: [{ ...gas, taxas: [] }],
        itens: [item({ custo: { tipo: "consumo", porCiclo: { gas: 40 } } })],
      }),
    );
    expect(r.alertas.some((a) => a.nivel === "erro" && a.texto.includes("Gás"))).toBe(true);
  });
});
