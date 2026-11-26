import { describe, expect, it } from "vitest";
import { aceitaItens, divisaoDoCiclo, quemDivideOCiclo } from "./ciclos.js";
import { calcular } from "./adaptador.js";
import { estadoDeCriacao } from "./estadoInicial.js";
import { criarItem, modeloPorChave } from "./catalogo.js";

/** Uma moradia de Ana, Bia e Caio com a luz de R$ 300 (100 kWh) e uma geladeira de 30 kWh. */
function moradia() {
  const e = estadoDeCriacao({ modo: "moradia", voce: "Ana", convidados: ["Bia", "Caio"] });
  const luz = e.ciclos.find((c) => c.id === "luz");
  luz.ativa = true;
  luz.linhas = luz.linhas.map((l, i) => (i === 0 ? { ...l, valor: "300", quantidade: "100" } : { ...l, valor: "" }));
  const ids = e.moradores.map((m) => m.id);
  e.itens = [{ ...criarItem(modeloPorChave("geladeira") ?? modeloPorChave("livre"), [ids[0]]), id: "g", especie: "consumo", consumoPorCiclo: { luz: "30" }, rateio: "igual" }];
  return { e, luz, ids };
}
const totalDe = (r, id) => r.moradores.find((m) => m.moradorId === id)?.total ?? 0;

describe("como uma cíclica divide", () => {
  it("conta antiga: medida ou na régua é registros + régua; só de valor com regra própria, calculadora", () => {
    expect(divisaoDoCiclo({ recurso: "kwh" })).toBe("registros");
    expect(divisaoDoCiclo({ recurso: null, rateio: "comum" })).toBe("registros");
    expect(divisaoDoCiclo({ recurso: null, rateio: "igual" })).toBe("calculadora");
    expect(divisaoDoCiclo({ recurso: "kwh", divisao: "calculadora" })).toBe("calculadora");
  });

  it("só registros + régua aceita itens", () => {
    expect(aceitaItens({ recurso: "kwh", divisao: "registros" })).toBe(true);
    expect(aceitaItens({ recurso: "kwh", divisao: "calculadora" })).toBe(false);
  });

  it("na calculadora, a fatura inteira vai pela regra e o item vinculado não tira nada dela", () => {
    const { e, luz, ids } = moradia();
    luz.divisao = "calculadora";
    luz.rateio = "igual";
    const r = calcular(e);
    for (const id of ids) expect(totalDe(r, id)).toBeCloseTo(100, 2);
  });

  it("quem divide: só os marcados entram na conta", () => {
    const { e, luz, ids } = moradia();
    luz.divisao = "calculadora";
    luz.rateio = "igual";
    luz.participantes = [ids[0], ids[1]];
    const r = calcular(e);
    expect(totalDe(r, ids[0])).toBeCloseTo(150, 2);
    expect(totalDe(r, ids[2])).toBeCloseTo(0, 2);
    expect(quemDivideOCiclo(luz, e)).toEqual([ids[0], ids[1]]);
  });
});

describe("a calculadora da cíclica", () => {
  it("as teclas, na ordem: igual, cotas, percentual, valor, ajuste, dias, horas, uso", async () => {
    const { REGRAS_DA_CALCULADORA } = await import("./ciclos.js");
    expect(REGRAS_DA_CALCULADORA).toEqual(["igual", "cotas", "porcentagem", "valor", "ajuste", "dias", "horas", "uso"]);
  });

  it("cotas, valor e uso dividem a fatura inteira", () => {
    const casos = [
      { rateio: "cotas", tabela: "cotas", valores: { 0: "2" }, esperado: [150, 75, 75] },
      { rateio: "valor", tabela: "valores", valores: { 0: "200", 1: "60", 2: "40" }, esperado: [200, 60, 40] },
      { rateio: "uso", tabela: "usosPorPessoa", valores: { 0: "1", 1: "1", 2: "4" }, esperado: [50, 50, 200] },
    ];
    for (const caso of casos) {
      const { e, luz, ids } = moradia();
      luz.divisao = "calculadora";
      luz.rateio = caso.rateio;
      luz[caso.tabela] = Object.fromEntries(Object.entries(caso.valores).map(([i, v]) => [ids[i], v]));
      const r = calcular(e);
      ids.forEach((id, i) => expect(totalDe(r, id), caso.rateio).toBeCloseTo(caso.esperado[i], 2));
    }
  });
});
