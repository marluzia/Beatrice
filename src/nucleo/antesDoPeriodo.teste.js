import { describe, expect, it } from "vitest";
import { acertoDe } from "./acerto.js";
import { calcular } from "./adaptador.js";
import { limitesDeHoje, somarAnos } from "./calendario.js";
import { criarItem, modeloPorChave } from "./catalogo.js";
import { estadoDeCriacao } from "./estadoInicial.js";
import { antesDoPeriodo, estadoDaConta } from "./naConta.js";
import { balancoDasDespesas, statusDaDespesa, todasAsDespesas } from "./resumo.js";

/** Temporada de 01 a 10/07, Ana e Bia, uma casa paga por Ana e um sinal de antes. */
function ilha() {
  const e = estadoDeCriacao({ modo: "temporada", voce: "Ana", convidados: ["Bia"], desde: "2026-07-01", ate: "2026-07-10" });
  const ids = e.moradores.map((m) => m.id);
  const outra = modeloPorChave("outra");
  e.itens = [
    { ...criarItem(outra, ids), id: "sinal", nome: "Sinal", valor: "300", data: "2026-06-10", rateio: "igual" },
    { ...criarItem(outra, ids), id: "casa", nome: "Casa", valor: "1000", data: "2026-07-02", rateio: "igual", pagoPor: ids[0] },
  ];
  return e;
}

describe("o período tem limites contados de hoje", () => {
  it("o início vai até 40 dias para trás e o fim até 2 anos para a frente", () => {
    expect(limitesDeHoje("2026-11-12")).toEqual({ min: "2026-10-03", max: "2028-11-12" });
  });

  it("29 de fevereiro vira 28 num ano que não é bissexto", () => {
    expect(somarAnos("2028-02-29", 2)).toBe("2030-02-28");
  });
});

describe("despesas de antes do período", () => {
  it("a avulsa datada antes do início é de antes; a de dentro, não", () => {
    expect(antesDoPeriodo(ilha()).itens.map((i) => i.id)).toEqual(["sinal"]);
  });

  it("sem escolha, tudo entra na conta; 'fica de fora' tira do motor e do acerto", () => {
    const e = ilha();
    expect(calcular(e).somaDevida).toBeCloseTo(1300, 2);

    e.itens[0].naConta = false;
    const r = calcular(e);
    expect(r.somaDevida).toBeCloseTo(1000, 2);
    expect(r.moradores.map((m) => m.total)).toEqual([500, 500]);
    const acerto = acertoDe(e, r);
    expect(acerto.transferencias).toHaveLength(1);
    expect(acerto.transferencias[0].centavos).toBe(50000);
  });

  it("a escolha só vale enquanto a despesa continua antes do período", () => {
    const e = ilha();
    e.itens[0].naConta = false;
    e.corte = { de: "2026-06-01", ate: "2026-07-11" };
    expect(estadoDaConta(e)).toBe(e);
    expect(calcular(e).somaDevida).toBeCloseTo(1300, 2);
  });

  it("a lista marca o que está fora da conta e o balanço não conta", () => {
    const e = ilha();
    e.itens[0].naConta = false;
    const r = calcular(e);
    const sinal = todasAsDespesas(e, r, "2026-07-05").find((d) => d.id === "sinal");
    expect(sinal.naConta).toBe(false);
    expect(sinal.valor).toBe(300);
    expect(balancoDasDespesas(e, r, "2026-07-05")).toEqual({ aberto: 0, pago: 1000 });
  });
});

describe("o status de uma despesa", () => {
  const hoje = "2026-11-12";
  it("paga, se alguém pagou, venha quando vier", () => {
    expect(statusDaDespesa({ pagoPor: "m1", vencimento: "2026-01-01" }, hoje)).toBe("paga");
  });
  it("atrasada, se passou do vencimento sem pagamento", () => {
    expect(statusDaDespesa({ pagoPor: null, vencimento: "2026-11-11" }, hoje)).toBe("atrasada");
  });
  it("a vencer, de hoje até 3 dias", () => {
    expect(statusDaDespesa({ pagoPor: null, vencimento: "2026-11-12" }, hoje)).toBe("avencer");
    expect(statusDaDespesa({ pagoPor: null, vencimento: "2026-11-15" }, hoje)).toBe("avencer");
  });
  it("aberta, no resto e sem vencimento", () => {
    expect(statusDaDespesa({ pagoPor: null, vencimento: "2026-11-16" }, hoje)).toBe("aberta");
    expect(statusDaDespesa({ pagoPor: null }, hoje)).toBe("aberta");
  });
});
