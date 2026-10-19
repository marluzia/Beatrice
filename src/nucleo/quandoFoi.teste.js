import { describe, expect, it } from "vitest";
import {
  aoMudarFim,
  aoMudarInicio,
  formatoDoItem,
  telaDoQuando,
  trocaDeFormato,
} from "./quandoFoi.js";

const semData = { data: null, ate: null };
const comDia = { data: "2026-06-12", ate: null };
const comPeriodo = { data: "2026-06-02", ate: "2026-06-09" };

describe("em que formato o item está", () => {
  it("sem data nenhuma", () => expect(formatoDoItem(semData)).toBe("sem"));
  it("com um dia só", () => expect(formatoDoItem(comDia)).toBe("dia"));
  it("com começo e fim", () => expect(formatoDoItem(comPeriodo)).toBe("periodo"));
  it("item sem os campos não quebra", () => expect(formatoDoItem({})).toBe("sem"));
});

// O bug que esta seção existe para não deixar voltar: a tela deduzia o formato
// dos campos do item, então escolher "dia" num item ainda sem data não mudava
// nada, e os campos para digitar a data nunca apareciam.
describe("escolher um formato mostra os campos daquele formato", () => {
  it("escolher dia num item SEM data já mostra o campo de data", () => {
    const t = telaDoQuando(semData, "dia");
    expect(t.formato).toBe("dia");
    expect(t.mostraInicio).toBe(true);
    expect(t.mostraFim).toBe(false);
  });

  it("escolher período num item SEM data mostra os dois campos", () => {
    const t = telaDoQuando(semData, "periodo");
    expect(t.formato).toBe("periodo");
    expect(t.mostraInicio).toBe(true);
    expect(t.mostraFim).toBe(true);
  });

  it("escolher sem data esconde os campos, mesmo com data lançada", () => {
    const t = telaDoQuando(comPeriodo, "sem");
    expect(t.mostraInicio).toBe(false);
    expect(t.mostraFim).toBe(false);
  });

  it("sem escolha nenhuma, vale o que o item guarda", () => {
    expect(telaDoQuando(comDia).formato).toBe("dia");
    expect(telaDoQuando(comPeriodo).mostraFim).toBe(true);
    expect(telaDoQuando(semData).mostraInicio).toBe(false);
  });

  it("escolha inválida não derruba a tela", () => {
    expect(telaDoQuando(comDia, "banana").formato).toBe("dia");
  });

  it("todo formato escolhido se reflete na tela", () => {
    for (const f of ["sem", "dia", "periodo"]) {
      expect(telaDoQuando(semData, f).formato, f).toBe(f);
    }
  });
});

describe("trocar de formato mexe só no que precisa", () => {
  it("para sem data, apaga os dois campos", () => {
    expect(trocaDeFormato(comPeriodo, "sem")).toEqual({ data: null, ate: null });
  });

  it("de período para dia, apaga o fim e preserva o começo", () => {
    const mudanca = trocaDeFormato(comPeriodo, "dia");
    expect(mudanca).toEqual({ ate: null });
    expect(mudanca.data).toBeUndefined();
  });

  it("para período, o fim nasce vazio em vez de copiar o começo", () => {
    // Um período de um dia só é um dia. Igualar os dois seria inventar um
    // valor que a pessoa não digitou.
    expect(trocaDeFormato(comDia, "periodo")).toEqual({ ate: null });
  });

  it("para período, um fim que já existia é mantido", () => {
    expect(trocaDeFormato(comPeriodo, "periodo")).toEqual({ ate: "2026-06-09" });
  });
});

describe("digitar as datas não deixa o período virar do avesso", () => {
  it("começo depois do fim empurra o fim junto", () => {
    expect(aoMudarInicio(comPeriodo, "2026-06-20")).toEqual({
      data: "2026-06-20",
      ate: "2026-06-20",
    });
  });

  it("começo antes do fim não mexe no fim", () => {
    expect(aoMudarInicio(comPeriodo, "2026-06-01")).toEqual({ data: "2026-06-01" });
  });

  it("apagar o começo apaga o fim: período sem começo não é período", () => {
    expect(aoMudarInicio(comPeriodo, "")).toEqual({ data: null, ate: null });
  });

  it("fim antes do começo é recusado e volta para o começo", () => {
    expect(aoMudarFim(comPeriodo, "2026-05-30")).toEqual({ ate: "2026-06-02" });
  });

  it("fim depois do começo passa", () => {
    expect(aoMudarFim(comPeriodo, "2026-06-15")).toEqual({ ate: "2026-06-15" });
  });

  it("apagar o fim é permitido: vira dia único", () => {
    expect(aoMudarFim(comPeriodo, "")).toEqual({ ate: null });
  });
});
