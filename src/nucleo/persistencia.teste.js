// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { carregarCasa, limparCasa, salvarCasa } from "./persistencia.js";
import { estadoInicial } from "./estadoInicial.js";

/**
 * Persistência tem uma regra acima de todas: nunca derrubar a aplicação.
 * Navegador anônimo, cota estourada, dado corrompido por outra aba — em
 * qualquer desses casos o CDR abre vazio, que é ruim mas utilizável. Metade
 * destes testes existe só para garantir que nada aqui lança exceção.
 */

afterEach(() => {
  limparCasa();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("ida e volta", () => {
  it("salva e devolve a casa inteira", () => {
    const casa = estadoInicial(4);
    expect(salvarCasa(casa)).toBe(true);

    const voltou = carregarCasa();
    expect(voltou.moradores).toHaveLength(4);
    expect(voltou.itens).toHaveLength(casa.itens.length);
    expect(voltou.periodo).toEqual(casa.periodo);
  });

  it("preserva o que foi digitado, não só a estrutura", () => {
    const casa = estadoInicial(2);
    casa.moradores[0].nome = "Ana";
    casa.moradores[0].diasFora = "12";
    casa.faturas.luzValor = "360,50";
    salvarCasa(casa);

    const voltou = carregarCasa();
    expect(voltou.moradores[0].nome).toBe("Ana");
    expect(voltou.moradores[0].diasFora).toBe("12");
    expect(voltou.faturas.luzValor).toBe("360,50");
  });

  it("devolve null quando não há nada salvo", () => {
    expect(carregarCasa()).toBeNull();
  });

  it("limpar apaga de verdade", () => {
    salvarCasa(estadoInicial(3));
    limparCasa();
    expect(carregarCasa()).toBeNull();
  });

  it("salvar de novo substitui, não acumula", () => {
    salvarCasa(estadoInicial(2));
    salvarCasa(estadoInicial(5));
    expect(carregarCasa().moradores).toHaveLength(5);
  });
});

describe("dado que não dá para confiar", () => {
  it("ignora JSON quebrado", () => {
    window.localStorage.setItem("cdr:casa", "{isso não é json");
    expect(carregarCasa()).toBeNull();
  });

  it("ignora versão diferente da atual", () => {
    window.localStorage.setItem(
      "cdr:casa",
      JSON.stringify({ versao: 999, estado: estadoInicial(3) }),
    );
    expect(carregarCasa()).toBeNull();
  });

  it("ignora objeto que não tem cara de casa", () => {
    window.localStorage.setItem(
      "cdr:casa",
      JSON.stringify({ versao: 1, estado: { qualquer: "coisa" } }),
    );
    expect(carregarCasa()).toBeNull();
  });

  it("ignora casa pela metade", () => {
    const casa = estadoInicial(3);
    delete casa.itens;
    window.localStorage.setItem("cdr:casa", JSON.stringify({ versao: 1, estado: casa }));
    expect(carregarCasa()).toBeNull();
  });

  it("ignora null e string vazia", () => {
    window.localStorage.setItem("cdr:casa", "null");
    expect(carregarCasa()).toBeNull();
    window.localStorage.setItem("cdr:casa", "");
    expect(carregarCasa()).toBeNull();
  });
});

describe("navegador hostil", () => {
  it("não lança quando não dá para escrever", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => salvarCasa(estadoInicial(3))).not.toThrow();
    expect(salvarCasa(estadoInicial(3))).toBe(false);
  });

  it("não lança quando não dá para ler", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => carregarCasa()).not.toThrow();
    expect(carregarCasa()).toBeNull();
  });

  it("não lança quando não dá para apagar", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => limparCasa()).not.toThrow();
  });

  it("não lança com estado que não vira JSON", () => {
    const circular = estadoInicial(2);
    circular.euMesmo = circular;
    expect(() => salvarCasa(circular)).not.toThrow();
    expect(salvarCasa(circular)).toBe(false);
  });
});
