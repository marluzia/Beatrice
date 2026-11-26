import { describe, expect, it } from "vitest";
import { dataAgendada, lembreteParaMim, registrosDaNota, vinculosNosRegistros } from "./lembretes.js";
import { sanear } from "./persistencia.js";
import { estadoDeCriacao } from "./estadoInicial.js";
import { eventosDoDia } from "./resumo.js";

describe("as datas de um lembrete", () => {
  it("a data agendada é a da agenda; sem ela, vale o dia do lançamento", () => {
    expect(dataAgendada({ data: "2026-12-01", lancadoEm: "2026-11-26T10:00:00Z" })).toBe("2026-12-01");
    expect(dataAgendada({ data: null, lancadoEm: "2026-11-26T10:00:00Z" })).toBe("2026-11-26");
    expect(dataAgendada({ criadoEm: "2026-11-20T10:00:00Z" })).toBe("2026-11-20");
  });

  it("sem data agendada, o lembrete aparece na agenda no dia em que foi lançado", () => {
    const e = estadoDeCriacao({ modo: "evento", voce: "Ana" });
    e.lembretes = [{ id: "l1", tipo: "nota", texto: "Gelo", data: null, lancadoEm: "2026-11-26T10:00:00Z", pessoas: [] }];
    expect(eventosDoDia(e, "2026-11-26").map((ev) => ev.tipo)).toContain("lembrete");
    expect(eventosDoDia(e, "2026-11-27").map((ev) => ev.tipo)).not.toContain("lembrete");
  });
});

describe("as pessoas marcadas", () => {
  it("o lembrete é de quem foi marcado; sem ninguém, de todos", () => {
    expect(lembreteParaMim({ pessoas: ["a"] }, "a")).toBe(true);
    expect(lembreteParaMim({ pessoas: ["a"] }, "b")).toBe(false);
    expect(lembreteParaMim({ pessoas: [] }, "b")).toBe(true);
  });

  it("sanear guarda as pessoas e tira o vínculo antigo da nota", () => {
    const e = estadoDeCriacao({ modo: "evento", voce: "Ana" });
    e.lembretes = [{ id: "l1", tipo: "nota", texto: "x", pessoas: ["m1", 3], registro: "i1", criadoEm: "2026-11-26T10:00:00Z" }];
    const [l] = sanear(e).lembretes;
    expect(l.pessoas).toEqual(["m1"]);
    expect(l).not.toHaveProperty("registro");
  });
});

describe("o vínculo mora no registro", () => {
  const notas = [{ id: "n1", tipo: "nota" }];
  const itens = [{ id: "i1", registrosDeUso: [{ id: "r1", data: "2026-11-10" }, { id: "r2", data: "2026-11-11" }] }];

  it("a nota antiga que apontava para um item passa para o registro daquele dia", () => {
    const [item] = vinculosNosRegistros(itens, [{ id: "n1", tipo: "nota", registro: "i1", data: "2026-11-10" }], notas);
    expect(item.registrosDeUso.map((r) => r.nota ?? null)).toEqual(["n1", null]);
  });

  it("vínculo para uma nota que não existe mais some", () => {
    const [item] = vinculosNosRegistros([{ id: "i1", registrosDeUso: [{ id: "r1", nota: "sumiu" }] }], [], notas);
    expect(item.registrosDeUso[0]).not.toHaveProperty("nota");
  });

  it("a nota sabe quais registros apontam para ela", () => {
    const estado = { itens: [{ id: "i1", nome: "Lavadora", registrosDeUso: [{ id: "r1", nota: "n1" }, { id: "r2" }] }] };
    expect(registrosDaNota(estado, "n1").map((x) => x.registro.id)).toEqual(["r1"]);
  });
});
