import { describe, expect, it } from "vitest";
import {
  calcular,
  diasContadosDe,
  itemParaMotor,
  consumoDaFatura,
  consumoMedido,
  faltaParaItem,
  lavagensForaDoCiclo,
  orfasDoItem,
  parteNoEvento,
  tarifaDaFatura,
  totalDaFatura,
  valorDoConsumo,
  paraMotor,
  totalDeclaradoPorHora,
} from "./adaptador.js";
import { sanear } from "./persistencia.js";
import { CATALOGO, criarItem, modeloPorChave, TODOS_OS_ITENS } from "./catalogo.js";
import { estadoInicial } from "./estadoInicial.js";

const MORADORES = ["m0", "m1", "m2"];

const FATURAS_CHEIAS = {
  luz: {
    unidade: "kwh",
    linhas: [
      { id: "l1", nome: "Energia elétrica", quantidade: "400", valor: "360", comportamento: "consumo" },
    ],
  },
  agua: {
    unidade: "m3",
    linhas: [
      { id: "l2", nome: "Tarifa água", quantidade: "20", valor: "180", comportamento: "consumo" },
    ],
  },
};

const casa = (itens) => ({
  periodo: { mes: 6, ano: 2025 },
  faturas: FATURAS_CHEIAS,
  moradores: MORADORES.map((id, i) => ({ id, nome: `Pessoa ${i + 1}`, diasFora: "0" })),
  itens,
});

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

  it("nenhum item do catálogo custa zero quando preenchido", () => {
    const preenchido = {
      quantidade: "100", porHora: "1.5", horas: "50",
      kwhPorUso: "0.5", m3PorUso: "0.2", valorPorUso: "80", usos: "3", valor: "120",
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

describe("estado maltratado não derruba a tela", () => {
  const casaCrua = (itens) => ({
    periodo: { mes: 8, ano: 2026 },
    faturas: {
      luz: {
        unidade: "kwh",
        linhas: [{ id: "cl", nome: "Energia", quantidade: "400", valor: "360", comportamento: "consumo" }],
      },
      agua: {
        unidade: "m3",
        linhas: [{ id: "ca", nome: "Água", quantidade: "14", valor: "126", comportamento: "consumo" }],
      },
    },
    moradores: [
      { id: "m0", nome: "Ana", diasFora: "" },
      { id: "m1", nome: "Bia", diasFora: "" },
    ],
    itens,
  });

  it("item por uso sem usosPorPessoa não explode", () => {
    const casa = casaCrua([
      {
        id: "i0",
        nome: "Máquina",
        especie: "porUso",
        unidade: "kwh",
        origemUso: "fatura",
        kwhPorUso: "0.46",
        m3PorUso: "0.188",
        rateio: "uso",
        participantes: ["m0", "m1"],
      },
    ]);
    expect(() => paraMotor(casa)).not.toThrow();
  });

  it("item sem participantes vira item de ninguém, não erro", () => {
    const casa = casaCrua([{ id: "i0", nome: "Gás", especie: "reais", valor: "100", rateio: "igual" }]);
    expect(paraMotor(casa).itens[0].participantes).toEqual([]);
  });

  it("sanear completa o que falta sem descartar a casa", () => {
    const remendada = sanear(casaCrua([{ id: "i0", nome: "Máquina", rateio: "uso" }]));
    expect(remendada.itens[0].usosPorPessoa).toEqual({});
    expect(remendada.itens[0].participantes).toEqual([]);
    expect(remendada.itens[0].nome).toBe("Máquina");
  });

  it("sanear joga fora buraco na lista, não a lista", () => {
    const casa = casaCrua([{ id: "i0", nome: "Gás", rateio: "igual" }, null]);
    expect(sanear(casa).itens).toHaveLength(1);
  });
});

describe("lavagens que caem fora do ciclo de uma das faturas", () => {
  const evento = (data, quantidade, participantes) => ({
    id: `ev-${data}-${participantes.join("-")}`,
    data,
    quantidade: String(quantidade),
    participantes,
  });

  const casa = (eventos) => ({
    periodo: { mes: 8, ano: 2026 },
    faturas: {
      luz: {
        unidade: "kwh",
        consumo: "400",
        janela: { de: "2026-08-02", ate: "2026-09-02" },
        linhas: [{ id: "l", nome: "Energia", valor: "360", comportamento: "consumo" }],
      },
      agua: {
        unidade: "m3",
        consumo: "14",
        janela: { de: "2026-08-13", ate: "2026-09-08" },
        linhas: [{ id: "a", nome: "Água", valor: "180", comportamento: "consumo" }],
      },
    },
    moradores: [
      { id: "m0", nome: "Ana", diasFora: "", ausencias: [] },
      { id: "m1", nome: "Bia", diasFora: "", ausencias: [] },
    ],
    itens: [
      {
        id: "maq",
        nome: "Máquina de lavar",
        especie: "porUso",
        unidade: "kwh",
        origemUso: "fatura",
        kwhPorUso: "0.46",
        m3PorUso: "0.188",
        rateio: "uso",
        usosPorPessoa: {},
        eventos,
        participantes: ["m0", "m1"],
      },
    ],
  });

  it("dia fora das duas faturas rende dois avisos, não um", () => {
    const disjunta = casa([evento("2026-07-03", 1, ["m0"])]);
    disjunta.faturas.luz.janela = { de: "2026-06-01", ate: "2026-07-01" };
    disjunta.faturas.agua.janela = { de: "2026-07-05", ate: "2026-08-05" };

    const foras = lavagensForaDoCiclo(disjunta);
    expect(foras).toHaveLength(2);
    expect(foras.map((f) => f.faltando).sort()).toEqual(["agua", "luz"]);
  });

  it("o dia entre os ciclos é passado para uma fatura e futuro para a outra", () => {
    const disjunta = casa([evento("2026-07-03", 1, ["m0"])]);
    disjunta.faturas.luz.janela = { de: "2026-06-01", ate: "2026-07-01" };
    disjunta.faturas.agua.janela = { de: "2026-07-05", ate: "2026-08-05" };

    const foras = lavagensForaDoCiclo(disjunta);
    expect(foras.find((f) => f.faltando === "luz").quando).toBe("futuro");
    expect(foras.find((f) => f.faltando === "agua").quando).toBe("passado");
  });

  it("lava na véspera do ciclo da água começar", () => {
    const vespera = casa([evento("2026-08-03", 1, ["m0"])]);
    vespera.faturas.luz.janela = { de: "2026-08-01", ate: "2026-09-01" };
    vespera.faturas.agua.janela = { de: "2026-08-04", ate: "2026-09-04" };

    const foras = lavagensForaDoCiclo(vespera);
    expect(foras).toHaveLength(1);
    expect(foras[0].faltando).toBe("agua");
    expect(foras[0].quando).toBe("passado");
  });

  it("acha a lavagem anterior ao começo do ciclo da água", () => {
    const foras = lavagensForaDoCiclo(casa([evento("2026-08-05", 1, ["m0"])]));
    expect(foras).toHaveLength(1);
    expect(foras[0].faltando).toBe("agua");
    expect(foras[0].quando).toBe("passado");
  });

  it("acha a lavagem posterior ao fim do ciclo da luz", () => {
    const foras = lavagensForaDoCiclo(casa([evento("2026-09-05", 1, ["m1"])]));
    expect(foras[0].faltando).toBe("luz");
    expect(foras[0].quando).toBe("futuro");
  });

  it("lavagem dentro dos dois ciclos não vira alerta", () => {
    expect(lavagensForaDoCiclo(casa([evento("2026-08-20", 1, ["m0"]), evento("2026-08-25", 1, ["m1"])]))).toEqual([]);
  });

  it("a fatura só conta as lavagens do próprio ciclo", () => {
    const motor = paraMotor(casa([evento("2026-08-05", 1, ["m0"]), evento("2026-08-20", 1, ["m0"]), evento("2026-08-20", 1, ["m1"])]));
    const { rateio } = motor.itens[0];
    expect(rateio.usosLuz.m0).toBe(2);
    expect(rateio.usosAgua.m0).toBe(1);
  });

  it("a conta continua fechando com lavagem órfã", () => {
    const r = calcular(casa([evento("2026-08-05", 1, ["m0"]), evento("2026-08-08", 1, ["m0"]), evento("2026-09-05", 1, ["m1"])]));
    expect(Math.abs(r.diferenca)).toBeCloseTo(0, 6);
  });

  it("quem só digitou a quantidade continua valendo nas duas faturas", () => {
    const semData = casa([]);
    semData.itens[0].usosPorPessoa = { m0: "3", m1: "1" };
    const { rateio } = paraMotor(semData).itens[0];
    expect(rateio.usos.m0).toBe(3);
    expect(rateio.usosLuz).toBe(undefined);
  });
});

describe("uso como evento, não como dia", () => {
  const item = (eventos, usosPorPessoa = {}) => ({
    id: "maq",
    nome: "Máquina de lavar",
    especie: "porUso",
    unidade: "kwh",
    origemUso: "fatura",
    kwhPorUso: "0.46",
    m3PorUso: "0.188",
    rateio: "uso",
    usosPorPessoa,
    eventos,
    participantes: ["m0", "m1"],
  });

  const ev = (data, quantidade, participantes) => ({
    id: `${data}-${participantes.join("")}`,
    data,
    quantidade: String(quantidade),
    participantes,
  });

  it("um evento de dois usos conta dois para quem o fez", () => {
    expect(parteNoEvento(ev("2026-08-20", 2, ["m0"]), "m0")).toBe(2);
  });

  it("uso dividido entre dois conta meio para cada", () => {
    const compartilhado = ev("2026-08-20", 1, ["m0", "m1"]);
    expect(parteNoEvento(compartilhado, "m0")).toBe(0.5);
    expect(parteNoEvento(compartilhado, "m1")).toBe(0.5);
  });

  it("quem não participou não paga nada daquele uso", () => {
    expect(parteNoEvento(ev("2026-08-20", 4, ["m1"]), "m0")).toBe(0);
  });

  it("quantidade em branco vale um uso", () => {
    expect(parteNoEvento({ data: "2026-08-20", quantidade: "", participantes: ["m0"] }, "m0")).toBe(1);
  });

  it("dois eventos no mesmo dia somam, em vez de um sobrescrever o outro", () => {
    const eventos = [ev("2026-08-20", 2, ["m0"]), ev("2026-08-20", 1, ["m0", "m1"])];
    const usos = eventos.reduce((s, e) => s + parteNoEvento(e, "m0"), 0);
    expect(usos).toBe(2.5);
  });

  it("a soma das participações de um evento é a quantidade dele", () => {
    const compartilhado = ev("2026-08-20", 3, ["m0", "m1"]);
    const soma = ["m0", "m1"].reduce((s, id) => s + parteNoEvento(compartilhado, id), 0);
    expect(soma).toBeCloseTo(3, 10);
  });

  it("sem evento nenhum, o total por pessoa continua valendo", () => {
    const semData = paraMotor({
      periodo: { mes: 8, ano: 2026 },
      faturas: {
        luz: { unidade: "kwh", consumo: "400", linhas: [] },
        agua: { unidade: "m3", consumo: "14", linhas: [] },
      },
      moradores: [
        { id: "m0", nome: "João", diasFora: "" },
        { id: "m1", nome: "Maria", diasFora: "" },
      ],
      itens: [item([], { m0: "4", m1: "6" })],
    });
    expect(semData.itens[0].rateio.usos).toEqual({ m0: 4, m1: 6 });
  });
});

describe("quantidade nas linhas da fatura", () => {
  const linha = (nome, quantidade, valor, comportamento) => ({
    id: nome,
    nome,
    quantidade,
    valor,
    comportamento,
  });

  const faturaGD = {
    unidade: "kwh",
    linhas: [
      linha("Energia Elétrica", "50", "57.41", "consumo"),
      linha("Energia SCEE isenta", "148", "86.36", "consumo"),
      linha("Energia compensada GD", "148", "-86.36", "abatimento"),
      linha("Iluminação pública", "", "14.73", "igual"),
    ],
  };

  it("soma só as quantidades que são consumo de verdade", () => {
    expect(consumoMedido(faturaGD)).toBe(198);
  });

  it("o abatimento entra no dinheiro, mesmo ficando fora da quantidade", () => {
    expect(valorDoConsumo(faturaGD)).toBeCloseTo(57.41, 2);
  });

  it("o total continua batendo com o valor a pagar da fatura", () => {
    expect(totalDaFatura(faturaGD)).toBeCloseTo(72.14, 2);
  });

  it("a tarifa efetiva sai do consumo somado", () => {
    expect(tarifaDaFatura(faturaGD)).toBeCloseTo(0.2899, 4);
  });

  it("sem quantidade nas linhas, não há consumo nem tarifa", () => {
    const semQuantidade = {
      unidade: "kwh",
      linhas: [linha("Energia", "", "57.41", "consumo")],
    };
    expect(consumoDaFatura(semQuantidade)).toBe(0);
    expect(tarifaDaFatura(semQuantidade)).toBe(0);
  });
});

describe("item que depende de fatura ainda não lançada", () => {
  const linha = (q, v) => ({ id: "l", nome: "Energia", quantidade: q, valor: v, comportamento: "consumo" });

  const contas = (luz, agua) => ({
    luz: { ativa: true, unidade: "kwh", linhas: luz ? [linha("198", "57.41")] : [] },
    agua: { ativa: true, unidade: "m3", linhas: agua ? [linha("7", "49.89")] : [] },
  });

  it("aparelho em kWh reclama do que falta na luz", () => {
    const falta = faltaParaItem({ especie: "consumo", unidade: "kwh" }, contas(false, true));
    expect(falta).toHaveLength(2);
    expect(falta[0]).toContain("consumo da luz");
  });

  it("com a fatura lançada, nada falta", () => {
    expect(faltaParaItem({ especie: "consumo", unidade: "kwh" }, contas(true, true))).toEqual([]);
  });

  it("a máquina precisa das duas quando as duas estão no fechamento", () => {
    const falta = faltaParaItem({ especie: "porUso", origemUso: "fatura" }, contas(true, false));
    expect(falta.some((f) => f.includes("água"))).toBe(true);
  });

  it("conta desligada é dita como ausente, não como vazia", () => {
    const semAgua = contas(true, true);
    semAgua.agua.ativa = false;
    const falta = faltaParaItem({ especie: "consumo", unidade: "m3" }, semAgua);
    expect(falta[0]).toContain("não está neste fechamento");
  });

  it("despesa em reais não depende de fatura nenhuma", () => {
    expect(faltaParaItem({ especie: "reais" }, contas(false, false))).toEqual([]);
  });

  it("item por uso em reais também não depende", () => {
    expect(faltaParaItem({ especie: "porUso", origemUso: "reais" }, contas(false, false))).toEqual([]);
  });
});
