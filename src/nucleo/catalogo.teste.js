// Num evento não existe fatura de luz nem de água, então os itens que saem
// dela não têm de onde tirar dinheiro: custariam zero e ficariam na tela
// ocupando espaço e confundindo quem está lançando um churrasco.

import { describe, expect, it } from "vitest";
import { CATALOGO, catalogoDe, ehEmReais } from "./catalogo.js";
import { MODOS } from "./modos.js";

describe("o catálogo que cada modo vê", () => {
  it("quem tem fatura vê o catálogo inteiro", () => {
    for (const chave of ["moradia", "temporada", "familia"]) {
      expect(catalogoDe(MODOS[chave]), chave).toEqual(CATALOGO);
    }
  });

  it("evento só vê despesa em reais", () => {
    const grupos = catalogoDe(MODOS.evento);

    expect(grupos.length).toBeLessThan(CATALOGO.length);
    for (const g of grupos) {
      for (const item of g.itens) {
        expect(ehEmReais(item), item.chave).toBe(true);
      }
    }
  });

  it("evento não vê geladeira, máquina nem chuveiro", () => {
    const chaves = catalogoDe(MODOS.evento).flatMap((g) => g.itens.map((i) => i.chave));

    for (const fora of ["geladeira", "maquina", "chuveiro", "ar", "freezer"]) {
      expect(chaves, fora).not.toContain(fora);
    }
  });

  it("as categorias do evento são comida, bebida, transporte e outra despesa", () => {
    const chaves = catalogoDe(MODOS.evento).flatMap((g) => g.itens.map((i) => i.chave));
    expect(chaves).toEqual(["comida", "bebida", "transporte", "outra"]);
  });

  it("modo desconhecido não quebra: devolve o catálogo inteiro", () => {
    expect(catalogoDe(undefined)).toEqual(CATALOGO);
  });
});
