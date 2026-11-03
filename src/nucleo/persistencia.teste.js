import { beforeEach, describe, expect, it } from "vitest";
import {
  carregarConjunto,
  conjuntoAtual,
  criarConjunto,
  definirConjuntoAtual,
  exportarConjunto,
  importarConjunto,
  listarConjuntos,
  removerConjunto,
  renomearConjunto,
  salvarConjunto,
} from "./persistencia.js";
import { estadoInicial } from "./estadoInicial.js";

beforeEach(() => window.localStorage.clear());

describe("várias casas no mesmo navegador", () => {
  it("começa sem casa nenhuma", () => {
    expect(listarConjuntos()).toEqual([]);
    expect(conjuntoAtual()).toBeNull();
  });

  it("guarda cada casa separada, com o próprio modo", () => {
    const serra = criarConjunto("República da Serra", estadoInicial("moradia"));
    const buzios = criarConjunto("Casa de Búzios", estadoInicial("temporada"));

    expect(listarConjuntos()).toHaveLength(2);
    expect(carregarConjunto(serra).modo).toBe("moradia");
    expect(carregarConjunto(buzios).modo).toBe("temporada");
  });

  it("salvar uma casa não encosta na outra", () => {
    const serra = criarConjunto("Serra", estadoInicial("moradia"));
    const buzios = criarConjunto("Búzios", estadoInicial("temporada"));

    const estado = carregarConjunto(serra);
    estado.moradores[0].nome = "Marialuzia";
    salvarConjunto(serra, estado);

    expect(carregarConjunto(serra).moradores[0].nome).toBe("Marialuzia");
    expect(carregarConjunto(buzios).moradores[0].nome).toBe("");
  });

  it("a ficha do painel acompanha o estado salvo", () => {
    const id = criarConjunto("Serra", estadoInicial("moradia", 3));

    const estado = carregarConjunto(id);
    estado.moradores.push({ id: "extra", nome: "Nova", diasFora: "", ausencias: [] });
    estado.periodo = { mes: 7, ano: 2027 };
    salvarConjunto(id, estado);

    const ficha = listarConjuntos().find((c) => c.id === id);
    expect(ficha.pessoas).toBe(4);
    expect(ficha.mes).toBe(7);
    expect(ficha.ano).toBe(2027);
  });

  it("renomeia sem tocar no estado", () => {
    const id = criarConjunto("Sem nome", estadoInicial("moradia"));
    renomearConjunto(id, "República da Serra");

    expect(listarConjuntos().find((c) => c.id === id).nome).toBe("República da Serra");
    expect(carregarConjunto(id)).not.toBeNull();
  });

  it("nome em branco não apaga o nome que já existia", () => {
    const id = criarConjunto("Serra", estadoInicial("moradia"));
    renomearConjunto(id, "   ");
    expect(listarConjuntos().find((c) => c.id === id).nome).toBe("Serra");
  });

  it("apagar tira a casa e o estado dela", () => {
    const id = criarConjunto("Serra", estadoInicial("moradia"));
    removerConjunto(id);

    expect(listarConjuntos()).toHaveLength(0);
    expect(carregarConjunto(id)).toBeNull();
  });

  it("apagar a casa aberta deixa o painel sem casa atual", () => {
    const id = criarConjunto("Serra", estadoInicial("moradia"));
    expect(conjuntoAtual()).toBe(id);

    removerConjunto(id);
    expect(conjuntoAtual()).toBeNull();
  });

  it("a casa atual some se ela deixou de existir", () => {
    const id = criarConjunto("Serra", estadoInicial("moradia"));
    definirConjuntoAtual(id);
    removerConjunto(id);
    expect(conjuntoAtual()).toBeNull();
  });

  it("casa que não existe carrega como null em vez de explodir", () => {
    expect(carregarConjunto("c-inventada")).toBeNull();
    expect(carregarConjunto(null)).toBeNull();
  });
});

describe("levar a casa para fora do navegador", () => {
  it("exporta e importa sem perder nada", () => {
    const id = criarConjunto("Serra", estadoInicial("moradia"));
    const estado = carregarConjunto(id);
    estado.moradores[0].nome = "Marialuzia";
    salvarConjunto(id, estado);

    const texto = exportarConjunto(id);
    const voltou = importarConjunto(texto);

    expect(voltou).not.toBeNull();
    expect(voltou).not.toBe(id);
    expect(carregarConjunto(voltou).moradores[0].nome).toBe("Marialuzia");
    expect(listarConjuntos()).toHaveLength(2);
  });

  it("arquivo que não é casa não vira casa", () => {
    expect(importarConjunto("{não é json")).toBeNull();
    expect(importarConjunto(JSON.stringify({ qualquer: "coisa" }))).toBeNull();
    expect(listarConjuntos()).toHaveLength(0);
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

    const casas = listarConjuntos();
    expect(casas).toHaveLength(1);
    expect(casas[0].modo).toBe("moradia");
    expect(carregarConjunto(casas[0].id).moradores[0].nome).toBe("Quem já usava");
  });

  it("a chave antiga sai do caminho e a casa fica aberta", () => {
    window.localStorage.setItem(
      "cdr:casa",
      JSON.stringify({ versao: 4, estado: casaAntiga() }),
    );

    const casas = listarConjuntos();
    expect(window.localStorage.getItem("cdr:casa")).toBeNull();
    expect(conjuntoAtual()).toBe(casas[0].id);
  });

  it("a adoção acontece uma vez só", () => {
    window.localStorage.setItem(
      "cdr:casa",
      JSON.stringify({ versao: 4, estado: casaAntiga() }),
    );

    listarConjuntos();
    listarConjuntos();
    listarConjuntos();

    expect(listarConjuntos()).toHaveLength(1);
  });

  it("chave antiga corrompida não impede o app de abrir", () => {
    window.localStorage.setItem("cdr:casa", "{lixo");
    expect(listarConjuntos()).toEqual([]);
  });
});
