// Num evento não existe fatura de luz nem de água, então os itens que saem
// dela não têm de onde tirar dinheiro: custariam zero e ficariam na tela
// ocupando espaço e confundindo quem está lançando um churrasco.

import { describe, expect, it } from "vitest";
import { CATALOGO, CATALOGO_DOS_EQUIPAMENTOS, catalogoDe, ehEmReais, ehEquipamento, grupoDoItem } from "./catalogo.js";
import { criarItem, modeloPorChave } from "./catalogo.js";
import { MODOS } from "./modos.js";

describe("o catálogo que cada modo vê", () => {
  it("quem tem fatura vê o catálogo inteiro", () => {
    for (const chave of ["moradia", "familia"]) {
      expect(catalogoDe(MODOS[chave]), chave).toEqual(CATALOGO);
    }
  });

  it("a Multi vê também os equipamentos fora das faturas", () => {
    expect(catalogoDe(MODOS.multipro)).toEqual([...CATALOGO, CATALOGO_DOS_EQUIPAMENTOS]);
    const nomes = CATALOGO_DOS_EQUIPAMENTOS.itens.map((i) => i.nome);
    expect(nomes).toEqual(["Embarcação", "Equipamento"]);
    // A embarcação saiu das avulsas da casa: é equipamento, com registro.
    expect(CATALOGO.flatMap((g) => g.itens).some((i) => i.chave === "embarcacao")).toBe(false);
    const lancha = criarItem(modeloPorChave("embarcacao"), ["a"]);
    expect(ehEquipamento(lancha)).toBe(true);
    expect(grupoDoItem(lancha)).toBe(CATALOGO_DOS_EQUIPAMENTOS.grupo);
    expect(lancha.medida).toBe("hora");
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
