// Ciclos além de luz e água, o dia de corte e a migração para a v10.

import { beforeEach, describe, expect, it } from "vitest";
import { comContasLigadas } from "./teste/conjuntoAntigo.js";
import {
  cicloDeFabrica,
  cicloPorId,
  ciclosLigados,
  ciclosMedidos,
  doCiclo,
  MAXIMO_DE_CICLOS,
  naOrdemDaTela,
  novoCiclo,
} from "./ciclos.js";
import {
  ciclosForaDoCorte,
  corteNosLimites,
  limitesDoCorte,
  corteValido,
  janelaDoCorte,
  janelaDoFechamento,
  janelaTotal,
  diasDaJanela,
} from "./calendario.js";
import { calcular, paraMotor } from "./adaptador.js";
import { estadoInicial, proximoMes } from "./estadoInicial.js";
import { carregarConjunto, conjuntoAtual, listarConjuntos, migrarEstado, sanear } from "./persistencia.js";
import { cicloDe, conferir } from "./motor.ts";
import { criarItem, modeloPorChave } from "./catalogo.js";
import { acertoDe } from "./acerto.js";
import { montarRelatorio } from "./relatorio.js";

beforeEach(() => window.localStorage.clear());

const linha = (nome, quantidade, valor, comportamento = "consumo") => ({
  id: `l-${nome}`,
  nome,
  quantidade,
  valor,
  comportamento,
});

/** Uma república de três, com luz e água lançadas e o mês de agosto. */
function republica() {
  const e = comContasLigadas(estadoInicial("moradia", 3));
  e.periodo = { mes: 8, ano: 2026 };
  e.moradores.forEach((m, i) => (m.nome = ["Ana", "Bia", "Cau"][i]));
  e.itens = [];
  cicloPorId(e, "luz").linhas = [linha("Energia", "300", "270")];
  cicloPorId(e, "agua").linhas = [linha("Água", "10", "90")];
  return e;
}

describe("a lista de ciclos", () => {
  it("todo conjunto nasce com luz e água, desligadas: o grupo liga as que tem", () => {
    const e = estadoInicial("moradia");
    expect(e.ciclos.map((c) => c.id)).toEqual(["luz", "agua"]);
    expect(ciclosLigados(e)).toHaveLength(0);
    expect(e.corte).toBeNull();
  });

  it("a tela mostra Água, Luz e depois os ciclos do grupo", () => {
    const e = estadoInicial("moradia");
    e.ciclos.push(novoCiclo("Gás", "m3"));
    expect(naOrdemDaTela(e.ciclos).map((c) => c.nome)).toEqual(["Água", "Luz", "Gás"]);
  });

  it("conta só de valor nasce dividindo por igual", () => {
    expect(novoCiclo("Aluguel", null).rateio).toBe("igual");
    expect(novoCiclo("Gás", "m3").rateio).toBeUndefined();
  });

  it("um ciclo novo ganha id próprio e uma linha que vira uso comum", () => {
    const gas = novoCiclo("Gás", "m3");
    expect(gas.id).not.toBe("luz");
    expect(gas.recurso).toBe("m3");
    expect(gas.linhas[0].comportamento).toBe("consumo");

    const aluguel = novoCiclo("Aluguel", "qualquer coisa");
    expect(aluguel.recurso).toBeNull();
  });

  it("só os ciclos medidos e ligados servem de origem para aparelho", () => {
    const e = republica();
    e.ciclos.push(novoCiclo("Aluguel", null), { ...novoCiclo("Gás", "m3"), ativa: false });
    expect(ciclosMedidos(e).map((c) => c.id)).toEqual(["luz", "agua"]);
  });

  it("as frases tratam os de fábrica com artigo e os da casa pelo nome", () => {
    expect(doCiclo(cicloDeFabrica("luz"))).toBe("da luz");
    expect(doCiclo(cicloDeFabrica("agua"))).toBe("da água");
    expect(doCiclo(novoCiclo("Condomínio"))).toBe("de Condomínio");
  });

  it("o limite é de oito ciclos", () => {
    expect(MAXIMO_DE_CICLOS).toBe(8);
  });
});

describe("um terceiro ciclo no fechamento", () => {
  it("gás medido entra na conta, com uso comum próprio e item que sai dele", () => {
    const e = republica();
    const gas = { ...novoCiclo("Gás", "m3"), linhas: [linha("Gás", "20", "100")] };
    e.ciclos.push(gas);
    e.itens = [{ ...criarItem(modeloPorChave("livre"), e.moradores.map((m) => m.id)), nome: "Fogão", consumoPorCiclo: { [gas.id]: "8" }, rateio: "igual" }];

    const r = calcular(e);
    expect(r.somaDevida).toBeCloseTo(270 + 90 + 100, 10);
    expect(cicloDe(r, gas.id).tarifa).toBeCloseTo(5, 10);
    expect(cicloDe(r, gas.id).sobra).toBeCloseTo(100 - 40, 10);
    expect(conferir(r)).toBe(true);
  });

  it("aluguel só monetário divide pela régua; taxa do aluguel, por igual", () => {
    const e = republica();
    e.preset = "temporal";
    e.calibragem = 0;
    e.moradores[0].ausencias = Array.from({ length: 10 }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")}`);
    const aluguel = {
      ...novoCiclo("Aluguel", null),
      rateio: "comum",
      linhas: [linha("Aluguel", "", "3000"), linha("Seguro", "", "90", "igual")],
    };
    e.ciclos.push(aluguel);

    const r = calcular(e);
    const comum = r.itens.find((i) => i.id === `__${aluguel.id}`);
    expect(comum.nome).toBe("Aluguel");
    const ana = comum.fatias.find((f) => f.moradorId === e.moradores[0].id);
    // Agosto, sem datas de leitura: 31 dias. Ana 21, Bia 31, Cau 31.
    expect(ana.total).toBeCloseTo(3000 * (21 / 83), 6);
    const seguro = r.itens.find((i) => i.id === `__taxa_${aluguel.id}_0`);
    expect(seguro.fatias.every((f) => Math.abs(f.total - 30) < 1e-9)).toBe(true);
    expect(conferir(r)).toBe(true);
  });

  it("aluguel só de valor por porcentagem divide pelas cotas escritas", () => {
    const e = republica();
    const [ana, bia, cau] = e.moradores.map((m) => m.id);
    const aluguel = {
      ...novoCiclo("Aluguel", null),
      rateio: "porcentagem",
      porcentagens: { [ana]: "50", [bia]: "30", [cau]: "20" },
      linhas: [linha("Aluguel", "", "2000")],
    };
    e.ciclos.push(aluguel);
    const comum = calcular(e).itens.find((i) => i.id === `__${aluguel.id}`);
    expect(comum.fatias.map((f) => Math.round(f.total))).toEqual([1000, 600, 400]);
  });

  it("ciclo desligado não entra em nada", () => {
    const e = republica();
    e.ciclos.push({ ...novoCiclo("Gás", "m3"), ativa: false, linhas: [linha("Gás", "20", "100")] });
    const r = calcular(e);
    expect(r.somaDevida).toBeCloseTo(360, 10);
    expect(paraMotor(e).faturas).toHaveLength(2);
  });

  it("a conta do ciclo novo entra no acerto com quem pagou", () => {
    const e = republica();
    const gas = { ...novoCiclo("Gás", "m3"), linhas: [linha("Gás", "20", "90")], pagoPor: e.moradores[2].id };
    e.ciclos.push(gas);
    const acerto = acertoDe(e, calcular(e));
    const despesa = acerto.despesas.find((d) => d.id === `fatura-${gas.id}`);
    expect(despesa.nome).toBe("Conta de Gás");
    expect(despesa.centavos).toBe(9000);
    expect(acerto.centralizadas.map((d) => d.id)).toContain(`fatura-${gas.id}`);
  });

  it("o relatório lista o ciclo novo com o nome dele", () => {
    const e = republica();
    e.ciclos.push({ ...novoCiclo("Condomínio", null), linhas: [linha("Condomínio", "", "600")] });
    const texto = montarRelatorio(e, calcular(e));
    expect(texto).toContain("CONDOMÍNIO");
    expect(texto).toContain("vai para o uso comum");
  });
});

describe("o dia de corte", () => {
  const periodo = { mes: 8, ano: 2026 };

  it("corte 22 em agosto: de 23/07 a 22/08, 31 dias", () => {
    const janela = janelaDoCorte(periodo, 22);
    expect(janela).toEqual({ de: "2026-07-23", ate: "2026-08-23" });
    expect(diasDaJanela(janela, periodo)).toBe(31);
  });

  it("corte 31 em fevereiro usa o último dia do mês", () => {
    const janela = janelaDoCorte({ mes: 3, ano: 2026 }, 31);
    expect(janela).toEqual({ de: "2026-03-01", ate: "2026-04-01" });
    expect(janelaDoCorte({ mes: 2, ano: 2026 }, 31)).toEqual({ de: "2026-02-01", ate: "2026-03-01" });
  });

  it("períodos seguidos encostam um no outro", () => {
    const agosto = janelaDoCorte({ mes: 8, ano: 2026 }, 10);
    const setembro = janelaDoCorte({ mes: 9, ano: 2026 }, 10);
    expect(agosto.ate).toBe(setembro.de);
  });

  it("corte inválido é ignorado", () => {
    expect(corteValido(0)).toBe(false);
    expect(corteValido(32)).toBe(false);
    expect(corteValido(15)).toBe(true);
  });

  it("sem corte, o período vai do ciclo que começa primeiro ao que termina por último", () => {
    const e = republica();
    cicloPorId(e, "luz").janela = { de: "2026-07-25", ate: "2026-08-21" };
    cicloPorId(e, "agua").janela = { de: "2026-07-14", ate: "2026-08-12" };

    expect(janelaDoFechamento(e.ciclos, e.periodo, null)).toEqual({ de: "2026-07-14", ate: "2026-08-21" });
    cicloPorId(e, "luz").ativa = false;
    expect(janelaDoFechamento(e.ciclos, e.periodo, null)).toEqual({ de: "2026-07-14", ate: "2026-08-12" });
  });

  it("com período de corte, o período é ele mesmo", () => {
    const e = republica();
    cicloPorId(e, "luz").janela = { de: "2026-07-25", ate: "2026-08-21" };
    const corte = { de: "2026-07-20", ate: "2026-08-20" };
    expect(janelaDoFechamento(e.ciclos, e.periodo, corte)).toEqual(corte);
    e.corte = corte;
    expect(calcular(e).diasNoPeriodo).toBe(31);
    expect(sanear(e).corte).toEqual(corte);
  });

  it("o corte vai de 30 dias antes do primeiro ciclo a 30 dias depois do último", () => {
    const e = republica();
    cicloPorId(e, "luz").janela = { de: "2026-07-25", ate: "2026-08-21" };
    cicloPorId(e, "agua").janela = { de: "2026-07-14", ate: "2026-08-12" };
    // A água começa primeiro (14/07); a luz termina por último (20/08).
    const limites = limitesDoCorte(e.ciclos, e.periodo);
    expect(limites).toEqual({ de: "2026-06-14", ate: "2026-09-20" });

    expect(corteNosLimites({ de: "2026-06-01", ate: "2026-07-01" }, limites)).toEqual({ de: "2026-06-14", ate: "2026-07-01" });
    expect(corteNosLimites({ de: "2026-09-01", ate: "2026-10-01" }, limites)).toEqual({ de: "2026-09-01", ate: "2026-09-20" });
    expect(corteNosLimites({ de: "2026-07-20", ate: "2026-08-20" }, limites)).toEqual({ de: "2026-07-20", ate: "2026-08-20" });
    expect(corteNosLimites({ de: "2026-10-01", ate: "2026-10-10" }, limites)).toBeNull();
  });

  it("sem ciclo com datas, os limites partem do mês de referência", () => {
    const e = republica();
    expect(limitesDoCorte(e.ciclos, e.periodo)).toEqual({ de: "2026-07-02", ate: "2026-10-01" });
  });

  it("período de corte inválido é ignorado", () => {
    expect(corteValido({ de: "2026-08-20", ate: "2026-08-01" })).toBe(false);
    expect(corteValido({ de: "2026-08-01", ate: "2026-08-20" })).toBe(true);
  });

  it("o corte antigo, de um dia do mês, continua valendo", () => {
    const e = republica();
    expect(janelaDoFechamento(e.ciclos, e.periodo, 22)).toEqual({ de: "2026-07-23", ate: "2026-08-23" });
  });

  it("o corte muda os dias do período no fechamento", () => {
    const e = republica();
    cicloPorId(e, "luz").janela = { de: "2026-07-25", ate: "2026-08-21" };
    expect(calcular(e).diasNoPeriodo).toBe(27);
    e.corte = 22;
    expect(calcular(e).diasNoPeriodo).toBe(31);
  });

  it("a janela de presença cobre o período do corte e os ciclos", () => {
    const e = republica();
    cicloPorId(e, "agua").janela = { de: "2026-07-14", ate: "2026-08-12" };
    expect(janelaTotal(e.ciclos, e.periodo, 22)).toEqual({ de: "2026-07-14", ate: "2026-08-23" });
  });

  it("ciclo que termina depois do corte é apontado como do período seguinte", () => {
    const e = republica();
    e.corte = 22;
    cicloPorId(e, "luz").janela = { de: "2026-07-25", ate: "2026-08-21" };
    cicloPorId(e, "agua").janela = { de: "2026-08-13", ate: "2026-09-12" };

    const fora = ciclosForaDoCorte(e.ciclos, e.periodo, e.corte);
    expect(fora.map((f) => [f.ciclo.id, f.quando])).toEqual([["agua", "seguinte"]]);

    const alerta = calcular(e).alertas.find((a) => a.texto.includes("depois do corte"));
    expect(alerta.texto).toContain("ciclo da água");
    expect(alerta.texto).toContain("11/09");
  });

  it("o corte atravessa o mês seguinte", () => {
    const e = republica();
    e.corte = 22;
    expect(proximoMes(e).corte).toBe(22);
  });
});

describe("migração da v9 até a atual", () => {
  const v9 = () => ({
    modo: "moradia",
    periodo: { mes: 8, ano: 2026 },
    faturas: {
      luz: { unidade: "kwh", ativa: true, janela: { de: "2026-07-25", ate: "2026-08-21" }, pagoPor: "m0",
        linhas: [{ id: "a", nome: "Energia", quantidade: "300", valor: "270", comportamento: "consumo" }] },
      agua: { unidade: "m3", ativa: false, janela: null, pagoPor: null,
        linhas: [{ id: "b", nome: "Água", quantidade: "10", valor: "90", comportamento: "consumo" }] },
    },
    moradores: [{ id: "m0", nome: "Ana", diasFora: "" }, { id: "m1", nome: "Bia", diasFora: "" }],
    itens: [
      { id: "g", nome: "Geladeira", especie: "consumo", unidade: "kwh", quantidade: "30", rateio: "igual", participantes: ["m0", "m1"] },
      { id: "x", nome: "Mangueira", especie: "consumo", unidade: "m3", quantidade: "1", rateio: "igual", participantes: ["m0"] },
      { id: "m", nome: "Máquina", especie: "porUso", origemUso: "fatura", kwhPorUso: "0,5", m3PorUso: "0,1",
        rateio: "uso", usosPorPessoa: {}, participantes: ["m0", "m1"],
        eventos: [{ id: "e", data: "2026-08-01", quantidade: "1", participantes: ["m0"] }] },
    ],
  });

  it("luz e água viram os dois primeiros ciclos, com tudo o que tinham", () => {
    const e = sanear(migrarEstado(v9(), 9));
    expect(e.faturas).toBeUndefined();
    expect(e.ciclos.map((c) => [c.id, c.nome, c.recurso, c.ativa])).toEqual([
      ["luz", "Luz", "kwh", true],
      ["agua", "Água", "m3", false],
    ]);
    expect(cicloPorId(e, "luz").pagoPor).toBe("m0");
    expect(cicloPorId(e, "luz").janela).toEqual({ de: "2026-07-25", ate: "2026-08-21" });
    expect(e.corte).toBeNull();
  });

  it("os itens apontam para o ciclo, e os usos com data viram registros", () => {
    const e = sanear(migrarEstado(v9(), 9));
    expect(e.itens[0].consumoPorCiclo).toEqual({ luz: "30" });
    expect(e.itens[1].consumoPorCiclo).toEqual({ agua: "1" });
    expect(e.itens[2].porUsoPorCiclo).toEqual({ luz: "0,5", agua: "0,1" });
    expect(e.itens[0].ciclosLivres).toBe(true);
    expect(e.itens[2].registrosDeUso).toHaveLength(1);
    expect(e.itens[2].eventos).toBeUndefined();
    expect(e.itens[0].unidade).toBeUndefined();
  });

  it("migrar não muda nenhum número", () => {
    const e = sanear(migrarEstado(v9(), 9));
    const r = calcular(e);
    expect(r.somaDevida).toBeCloseTo(270, 10);
    // Geladeira 30 kWh a R$ 0,90; a máquina, 1 uso de 0,5 kWh dentro do ciclo.
    expect(cicloDe(r, "luz").sobra).toBeCloseTo(270 - 27 - 0.45, 10);
  });
});

describe("as chaves antigas do navegador", () => {
  const pacote = (nome) => ({
    versao: 9,
    estado: {
      modo: "moradia",
      periodo: { mes: 8, ano: 2026 },
      faturas: {
        luz: { unidade: "kwh", ativa: true, linhas: [] },
        agua: { unidade: "m3", ativa: true, linhas: [] },
      },
      moradores: [{ id: "m0", nome, diasFora: "" }],
      itens: [],
    },
  });

  it("o índice e os conjuntos de cdr:casas são copiados, e o original fica", () => {
    const indice = { versao: 9, atual: "c-1", casas: [{ id: "c-1", nome: "Serra", modo: "moradia" }] };
    window.localStorage.setItem("cdr:casas", JSON.stringify(indice));
    window.localStorage.setItem("cdr:casa:c-1", JSON.stringify(pacote("Quem já usava")));

    const lista = listarConjuntos();
    expect(lista.map((c) => c.nome)).toEqual(["Serra"]);
    expect(conjuntoAtual()).toBe("c-1");
    expect(carregarConjunto("c-1").moradores[0].nome).toBe("Quem já usava");
    expect(carregarConjunto("c-1").ciclos).toHaveLength(2);

    // A cópia de segurança continua onde estava.
    expect(window.localStorage.getItem("cdr:casas")).not.toBeNull();
    expect(window.localStorage.getItem("cdr:casa:c-1")).not.toBeNull();
    expect(window.localStorage.getItem("ceder:conjunto:c-1")).not.toBeNull();
  });

  it("conjunto do índice antigo sem dados não é inventado", () => {
    const indice = { versao: 9, atual: null, casas: [{ id: "c-1", nome: "Serra" }, { id: "c-2", nome: "Sumiu" }] };
    window.localStorage.setItem("cdr:casas", JSON.stringify(indice));
    window.localStorage.setItem("cdr:casa:c-1", JSON.stringify(pacote("Ana")));
    expect(listarConjuntos().map((c) => c.id)).toEqual(["c-1"]);
  });

  it("depois da cópia, o índice novo manda", () => {
    window.localStorage.setItem("cdr:casas", JSON.stringify({ casas: [{ id: "c-1", nome: "Serra" }] }));
    window.localStorage.setItem("cdr:casa:c-1", JSON.stringify(pacote("Ana")));
    listarConjuntos();
    window.localStorage.setItem("cdr:casas", JSON.stringify({ casas: [] }));
    expect(listarConjuntos()).toHaveLength(1);
  });
});

describe("migração da v10 para a v11", () => {
  const v10 = () => ({
    modo: "moradia",
    periodo: { mes: 8, ano: 2026 },
    corte: null,
    ciclos: [
      { id: "luz", nome: "Luz", recurso: "kwh", ativa: true, janela: null, linhas: [{ id: "a", nome: "E", quantidade: "100", valor: "90", comportamento: "consumo" }] },
      { id: "agua", nome: "Água", recurso: "m3", ativa: false, janela: null, linhas: [] },
      { id: "c1", nome: "Aluguel", recurso: null, ativa: true, janela: null, linhas: [{ id: "b", nome: "Aluguel", quantidade: "", valor: "1000", comportamento: "consumo" }] },
    ],
    moradores: [{ id: "m0", nome: "Ana", diasFora: "" }],
    itens: [
      { id: "g", nome: "Geladeira", especie: "consumo", ciclo: "luz", quantidade: "30", rateio: "igual", participantes: ["m0"] },
      { id: "a", nome: "Ar", especie: "porHora", ciclo: "luz", porHora: "1,2", horas: "10", rateio: "igual", participantes: ["m0"] },
    ],
  });

  it("o consumo de um ciclo vira a tabela por ciclo, sem perder o número", () => {
    const e = sanear(migrarEstado(v10(), 10));
    expect(e.itens[0].consumoPorCiclo).toEqual({ luz: "30" });
    expect(e.itens[1].porHoraPorCiclo).toEqual({ luz: "1,2" });
    expect(e.itens[0].ciclo).toBeUndefined();
    expect(e.itens[0].ciclosLivres).toBe(true);
  });

  it("conta só de valor da v10 continua pela régua", () => {
    const e = sanear(migrarEstado(v10(), 10));
    expect(cicloPorId(e, "c1").rateio).toBe("comum");
    expect(e.eventoLongo).toBe(false);
  });

  it("os números não mudam", () => {
    const r = calcular(sanear(migrarEstado(v10(), 10)));
    // Geladeira 30 kWh + ar 12 kWh a R$ 0,90; o aluguel inteiro no uso comum.
    expect(cicloDe(r, "luz").sobra).toBeCloseTo(90 - 27 - 10.8, 10);
    expect(r.somaDevida).toBeCloseTo(1090, 10);
  });
});

describe("evento longo", () => {
  it("pesa os dias marcados de cada pessoa na divisão por dias", () => {
    const e = estadoInicial("evento", 2);
    e.periodo = { mes: 1, ano: 2027 };
    e.eventoLongo = true;
    const [ana, bia] = e.moradores;
    ana.presencas = ["2027-01-10", "2027-01-11", "2027-01-12"];
    bia.presencas = ["2027-01-12"];
    e.itens = [{ ...criarItem(modeloPorChave("comida"), [ana.id, bia.id]), valor: "400", rateio: "dias" }];

    const fatias = calcular(e).itens[0].fatias;
    expect(fatias.find((f) => f.moradorId === ana.id).total).toBeCloseTo(300, 10);
    expect(fatias.find((f) => f.moradorId === bia.id).total).toBeCloseTo(100, 10);
  });

  it("sem evento longo, o evento não conta dias", () => {
    const e = estadoInicial("evento", 2);
    e.itens = [{ ...criarItem(modeloPorChave("comida"), e.moradores.map((m) => m.id)), valor: "400", rateio: "dias" }];
    e.moradores[0].presencas = ["2027-01-10"];
    const fatias = calcular(e).itens[0].fatias;
    expect(fatias[0].total).toBeCloseTo(200, 10);
  });
});
