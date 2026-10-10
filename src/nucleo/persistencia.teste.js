import { beforeEach, describe, expect, it } from "vitest";
import {
  carregarCasa,
  casaAtual,
  criarCasa,
  definirCasaAtual,
  exportarCasa,
  importarCasa,
  listarCasas,
  removerCasa,
  renomearCasa,
  salvarCasa,
} from "./persistencia.js";
import { estadoInicial } from "./estadoInicial.js";

beforeEach(() => window.localStorage.clear());

describe("várias casas no mesmo navegador", () => {
  it("começa sem casa nenhuma", () => {
    expect(listarCasas()).toEqual([]);
    expect(casaAtual()).toBeNull();
  });

  it("guarda cada casa separada, com o próprio modo", () => {
    const serra = criarCasa("República da Serra", estadoInicial("moradia"));
    const buzios = criarCasa("Casa de Búzios", estadoInicial("temporada"));

    expect(listarCasas()).toHaveLength(2);
    expect(carregarCasa(serra).modo).toBe("moradia");
    expect(carregarCasa(buzios).modo).toBe("temporada");
  });

  it("salvar uma casa não encosta na outra", () => {
    const serra = criarCasa("Serra", estadoInicial("moradia"));
    const buzios = criarCasa("Búzios", estadoInicial("temporada"));

    const estado = carregarCasa(serra);
    estado.moradores[0].nome = "Marialuzia";
    salvarCasa(serra, estado);

    expect(carregarCasa(serra).moradores[0].nome).toBe("Marialuzia");
    expect(carregarCasa(buzios).moradores[0].nome).toBe("");
  });

  it("a ficha do painel acompanha o estado salvo", () => {
    const id = criarCasa("Serra", estadoInicial("moradia", 3));

    const estado = carregarCasa(id);
    estado.moradores.push({ id: "extra", nome: "Nova", diasFora: "", ausencias: [] });
    estado.periodo = { mes: 7, ano: 2027 };
    salvarCasa(id, estado);

    const ficha = listarCasas().find((c) => c.id === id);
    expect(ficha.pessoas).toBe(4);
    expect(ficha.mes).toBe(7);
    expect(ficha.ano).toBe(2027);
  });

  it("renomeia sem tocar no estado", () => {
    const id = criarCasa("Sem nome", estadoInicial("moradia"));
    renomearCasa(id, "República da Serra");

    expect(listarCasas().find((c) => c.id === id).nome).toBe("República da Serra");
    expect(carregarCasa(id)).not.toBeNull();
  });

  it("nome em branco não apaga o nome que já existia", () => {
    const id = criarCasa("Serra", estadoInicial("moradia"));
    renomearCasa(id, "   ");
    expect(listarCasas().find((c) => c.id === id).nome).toBe("Serra");
  });

  it("apagar tira a casa e o estado dela", () => {
    const id = criarCasa("Serra", estadoInicial("moradia"));
    removerCasa(id);

    expect(listarCasas()).toHaveLength(0);
    expect(carregarCasa(id)).toBeNull();
  });

  it("apagar a casa aberta deixa o painel sem casa atual", () => {
    const id = criarCasa("Serra", estadoInicial("moradia"));
    expect(casaAtual()).toBe(id);

    removerCasa(id);
    expect(casaAtual()).toBeNull();
  });

  it("a casa atual some se ela deixou de existir", () => {
    const id = criarCasa("Serra", estadoInicial("moradia"));
    definirCasaAtual(id);
    removerCasa(id);
    expect(casaAtual()).toBeNull();
  });

  it("casa que não existe carrega como null em vez de explodir", () => {
    expect(carregarCasa("c-inventada")).toBeNull();
    expect(carregarCasa(null)).toBeNull();
  });
});

describe("levar a casa para fora do navegador", () => {
  it("exporta e importa sem perder nada", () => {
    const id = criarCasa("Serra", estadoInicial("moradia"));
    const estado = carregarCasa(id);
    estado.moradores[0].nome = "Marialuzia";
    salvarCasa(id, estado);

    const texto = exportarCasa(id);
    const voltou = importarCasa(texto);

    expect(voltou).not.toBeNull();
    expect(voltou).not.toBe(id);
    expect(carregarCasa(voltou).moradores[0].nome).toBe("Marialuzia");
    expect(listarCasas()).toHaveLength(2);
  });

  it("arquivo que não é casa não vira casa", () => {
    expect(importarCasa("{não é json")).toBeNull();
    expect(importarCasa(JSON.stringify({ qualquer: "coisa" }))).toBeNull();
    expect(listarCasas()).toHaveLength(0);
  });
});

describe("a casa única que existia antes (v4 → v5)", () => {
  const casaAntiga = () => {
    const estado = estadoInicial("moradia");
    estado.moradores[0].nome = "Quem já usava";
    delete estado.modo; // v4 não sabia de modo
    return estado;
  };

  it("vira a primeira casa do índice, sem perder conteúdo", () => {
    window.localStorage.setItem(
      "cdr:casa",
      JSON.stringify({ versao: 4, estado: casaAntiga() }),
    );

    const casas = listarCasas();
    expect(casas).toHaveLength(1);
    expect(casas[0].modo).toBe("moradia");
    expect(carregarCasa(casas[0].id).moradores[0].nome).toBe("Quem já usava");
  });

  it("a chave antiga sai do caminho e a casa fica aberta", () => {
    window.localStorage.setItem(
      "cdr:casa",
      JSON.stringify({ versao: 4, estado: casaAntiga() }),
    );

    const casas = listarCasas();
    expect(window.localStorage.getItem("cdr:casa")).toBeNull();
    expect(casaAtual()).toBe(casas[0].id);
  });

  it("a adoção acontece uma vez só", () => {
    window.localStorage.setItem(
      "cdr:casa",
      JSON.stringify({ versao: 4, estado: casaAntiga() }),
    );

    listarCasas();
    listarCasas();
    listarCasas();

    expect(listarCasas()).toHaveLength(1);
  });

  it("chave antiga corrompida não impede o app de abrir", () => {
    window.localStorage.setItem("cdr:casa", "{lixo");
    expect(listarCasas()).toEqual([]);
  });
});
