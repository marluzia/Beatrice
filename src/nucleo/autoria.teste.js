import { describe, expect, it } from "vitest";
import { autoriaDe, carimbo, podeEditar } from "./autoria.js";
import { destinoDoEvento } from "../telas/comum.js";

describe("quem lançou e quando", () => {
  it("lê lancadoPor/lancadoEm, e cai para autor/criadoEm dos lançamentos antigos", () => {
    expect(autoriaDe({ lancadoPor: "a", lancadoEm: "2026-11-01T10:00:00Z" })).toEqual({ por: "a", em: "2026-11-01T10:00:00Z" });
    expect(autoriaDe({ autor: "b", criadoEm: "2026-10-01T10:00:00Z" })).toEqual({ por: "b", em: "2026-10-01T10:00:00Z" });
    expect(autoriaDe({})).toEqual({ por: null, em: null });
  });

  it("o carimbo marca quem e a hora de agora", () => {
    const c = carimbo("a");
    expect(c.lancadoPor).toBe("a");
    expect(Number.isNaN(Date.parse(c.lancadoEm))).toBe(false);
  });
});

describe("quem pode editar um lançamento", () => {
  const estado = { admin: "adm" };
  it("quem lançou e o admin podem; os outros, não", () => {
    const l = { lancadoPor: "ana" };
    expect(podeEditar(estado, l, "ana")).toBe(true);
    expect(podeEditar(estado, l, "adm")).toBe(true);
    expect(podeEditar(estado, l, "bia")).toBe(false);
  });

  it("lançamento sem autor (dos dados antigos) qualquer um edita", () => {
    expect(podeEditar(estado, {}, "bia")).toBe(true);
  });

  it("sem saber quem é você: só pode quando o conjunto não tem admin", () => {
    expect(podeEditar({ admin: null }, { lancadoPor: "ana" }, null)).toBe(true);
    expect(podeEditar(estado, { lancadoPor: "ana" }, null)).toBe(false);
  });
});

describe("tocar num evento do dia abre o lançamento sozinho", () => {
  it("vencimento, registro, lembrete e despesa", () => {
    expect(destinoDoEvento({ tipo: "vencimento", ciclo: "c1" })).toEqual({ tela: "lancamento", tipo: "ciclica", id: "c1" });
    expect(destinoDoEvento({ tipo: "atraso", ciclo: "c2" })).toEqual({ tela: "lancamento", tipo: "ciclica", id: "c2" });
    expect(destinoDoEvento({ tipo: "registro", item: "i1", registro: "r1" })).toEqual({
      tela: "lancamento",
      tipo: "registro",
      item: "i1",
      id: "r1",
    });
    expect(destinoDoEvento({ tipo: "lembrete", lembrete: "l1" })).toEqual({ tela: "lancamento", tipo: "lembrete", id: "l1" });
    expect(destinoDoEvento({ tipo: "despesa", item: "i9" })).toEqual({ tela: "lancamento", tipo: "avulsa", id: "i9" });
  });
});

describe("a edição entra na atividade", () => {
  it("diz quem editou o quê, e o último lançamento de dinheiro não é ela", async () => {
    const { atividadeDe } = await import("./resumo.js");
    const { ultimoLancamento } = await import("../telas/comum.js");
    const estado = {
      moradores: [{ id: "a", nome: "Ana" }],
      voce: "a",
      itens: [{ id: "i1", nome: "Gás", valor: "80", criadoEm: "2026-11-20T10:00:00.000Z", pagoPor: "a", participantes: ["a"] }],
      ciclos: [],
      lembretes: [],
      pagamentos: {},
      edicoes: [
        {
          id: "ed1",
          ref: { tipo: "avulsa", id: "i1" },
          nome: "Gás",
          mudancas: [{ campo: "Valor", antes: "R$ 80,00", depois: "R$ 95,00" }],
          lancadoPor: "a",
          lancadoEm: "2026-11-22T10:00:00.000Z",
        },
      ],
    };
    const atividade = atividadeDe(estado);
    expect(atividade[0]).toMatchObject({ tipo: "edicao", texto: "Ana editou a despesa Gás", ref: { tipo: "edicao", id: "ed1" } });
    expect(ultimoLancamento({ atividade }).tipo).toBe("despesa");
  });
});
