import { describe, expect, it } from "vitest";
import { estadoInicial } from "../nucleo/estadoInicial.js";
import { modoDoConjunto, passosDe } from "../nucleo/modos.js";
import { mostra, secoesDaEtapa, vizinha } from "./secoes.js";

const contagem = (estado) => {
  const modo = modoDoConjunto(estado);
  return passosDe(modo).map((p) => secoesDaEtapa(p.chave, estado, modo).length);
};

describe("as macrosseções de cada etapa", () => {
  it("as contas têm faturas cíclicas e período, nessa ordem", () => {
    const e = estadoInicial("moradia", 3);
    expect(secoesDaEtapa("contas", e, modoDoConjunto(e)).map((s) => s.chave)).toEqual(["faturas", "periodo"]);
  });

  it("os itens separam o que sai da fatura do que não sai", () => {
    const e = estadoInicial("moradia", 3);
    expect(secoesDaEtapa("itens", e, modoDoConjunto(e)).map((s) => s.chave)).toEqual([
      "fatura",
      "independente",
      "coleta",
    ]);
  });

  it("num evento as despesas são um grupo só", () => {
    const e = estadoInicial("evento", 3);
    expect(secoesDaEtapa("itens", e, modoDoConjunto(e)).map((s) => s.chave)).toEqual(["despesas", "coleta"]);
  });

  it("só a república tem a seção do preset nas pessoas", () => {
    const rep = estadoInicial("moradia", 3);
    const tem = estadoInicial("multipro", 3);
    expect(secoesDaEtapa("moradores", rep, modoDoConjunto(rep)).map((s) => s.chave)).toEqual(["pessoas", "preset"]);
    expect(secoesDaEtapa("moradores", tem, modoDoConjunto(tem)).map((s) => s.chave)).toEqual(["pessoas"]);
  });

  it("sem seção escolhida, tudo aparece", () => {
    expect(mostra(undefined, "faturas")).toBe(true);
    expect(mostra("periodo", "faturas")).toBe(false);
    expect(mostra("fatura", "despesas", "fatura")).toBe(true);
  });
});

describe("Continuar e Voltar", () => {
  const quantas = [2, 2, 3, 2, 3];

  it("Continuar anda de seção em seção e só depois muda de etapa", () => {
    expect(vizinha({ passo: 0, secao: 0 }, 1, quantas)).toEqual({ passo: 0, secao: 1 });
    expect(vizinha({ passo: 0, secao: 1 }, 1, quantas)).toEqual({ passo: 1, secao: 0 });
  });

  it("Voltar da primeira seção cai na última seção da etapa anterior", () => {
    expect(vizinha({ passo: 2, secao: 0 }, -1, quantas)).toEqual({ passo: 1, secao: 1 });
    expect(vizinha({ passo: 2, secao: 2 }, -1, quantas)).toEqual({ passo: 2, secao: 1 });
  });

  it("nas pontas não há para onde ir", () => {
    expect(vizinha({ passo: 0, secao: 0 }, -1, quantas)).toBeNull();
    expect(vizinha({ passo: 4, secao: 2 }, 1, quantas)).toBeNull();
  });

  it("percorrer a república inteira passa por todas as seções, uma vez cada", () => {
    const e = estadoInicial("moradia", 3);
    const n = contagem(e);
    let pos = { passo: 0, secao: 0 };
    let passos = 1;
    while ((pos = vizinha(pos, 1, n))) passos++;
    expect(passos).toBe(n.reduce((a, b) => a + b, 0));
  });
});
