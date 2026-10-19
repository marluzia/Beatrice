import { describe, expect, it } from "vitest";
import { cessaoDe, fechouRedondo, quemCedeDe } from "./cessao.js";

/** Um resultado de motor reduzido ao que a cessão lê. */
const resultado = (totais, residuo) => ({
  moradores: totais.map(([moradorId, nome, total]) => ({ moradorId, nome, total })),
  residuoDeCentavos: residuo,
});

const TRES = [
  ["a", "Ana", 33.333333],
  ["b", "Bruno", 33.333333],
  ["c", "Carla", 33.333333],
];

describe("cem reais entre três", () => {
  // 33,33 três vezes são 99,99: falta um centavo que divisão nenhuma produz.
  const r = resultado(TRES, 1);

  // Não existe padrão. A calculadora não escolhe quem cede: enquanto a casa
  // não decide, o centavo fica sem dono e a conta fica declaradamente aberta.
  it("sem escolha, ninguém fica com o centavo", () => {
    const c = cessaoDe({ quemCede: null }, r);
    expect(c.quemCede).toBeNull();
    expect(c.precisaEscolher).toBe(true);
    for (const p of c.lista) expect(p.cedeu).toBe(0);
  });

  it("sem escolha, a soma fica diferente do devido, e é isso mesmo", () => {
    const c = cessaoDe({ quemCede: null }, r);
    const soma = c.lista.reduce((s, p) => s + p.deve, 0);
    expect(soma).toBe(9999);
  });

  it("escolhendo alguém, a soma passa a bater exatamente com o devido", () => {
    const c = cessaoDe({ quemCede: "a" }, r);
    const soma = c.lista.reduce((s, p) => s + p.deve, 0);
    expect(soma).toBe(10000);
    expect(c.precisaEscolher).toBe(false);
  });

  it("quem cede paga o centavo a mais, e só essa pessoa", () => {
    const c = cessaoDe({ quemCede: "b" }, r);
    expect(c.porMorador.b).toBe(3334);
    expect(c.porMorador.a).toBe(3333);
    expect(c.porMorador.c).toBe(3333);
  });

  it("trocar quem cede move o centavo, sem mexer no total", () => {
    const comA = cessaoDe({ quemCede: "a" }, r);
    const comC = cessaoDe({ quemCede: "c" }, r);

    expect(comA.porMorador.a).toBe(3334);
    expect(comC.porMorador.a).toBe(3333);
    expect(comC.porMorador.c).toBe(3334);

    const soma = (c) => c.lista.reduce((s, p) => s + p.deve, 0);
    expect(soma(comA)).toBe(soma(comC));
  });

  it("escolha de quem não mora mais na casa volta a ser ninguém", () => {
    const c = cessaoDe({ quemCede: "zz" }, r);
    expect(c.quemCede).toBeNull();
    expect(c.precisaEscolher).toBe(true);
  });
});

describe("quando sobra em vez de faltar", () => {
  // Resíduo negativo: a soma arredondada passou do devido.
  const r = resultado(TRES, -1);

  it("quem cede paga um centavo a menos", () => {
    const c = cessaoDe({ quemCede: "b" }, r);
    expect(c.porMorador.b).toBe(3332);
    expect(c.lista.reduce((s, p) => s + p.deve, 0)).toBe(9998);
  });
});

describe("quando o sistema monetário cede", () => {
  const r = resultado([["a", "Ana", 50], ["b", "Bruno", 50]], 0);

  it("fechouRedondo reconhece que não há o que ceder", () => {
    expect(fechouRedondo(r)).toBe(true);
  });

  it("ninguém cede nada, e não há o que escolher", () => {
    const c = cessaoDe({ quemCede: null }, r);
    for (const p of c.lista) expect(p.cedeu).toBe(0);
    expect(c.porMorador.a).toBe(5000);
    expect(c.precisaEscolher).toBe(false);
  });
});

describe("casos extremos", () => {
  it("casa sem morador não quebra", () => {
    const c = cessaoDe({ quemCede: null }, resultado([], 3));
    expect(c.lista).toHaveLength(0);
    expect(c.quemCede).toBeNull();
  });

  it("resíduo de vários centavos vai inteiro para uma pessoa só", () => {
    const c = cessaoDe({ quemCede: "b" }, resultado(TRES, 4));
    expect(c.porMorador.b).toBe(3337);
    expect(c.lista.find((p) => p.moradorId === "b").cedeu).toBe(4);
  });

  it("quemCedeDe não inventa dono quando ninguém escolheu", () => {
    expect(quemCedeDe({ quemCede: null }, [
      { moradorId: "a", deve: 1000 },
      { moradorId: "b", deve: 9000 },
    ])).toEqual({ id: null, escolhido: false });
  });

  it("casa sem morador não precisa de escolha nenhuma", () => {
    expect(cessaoDe({ quemCede: null }, resultado([], 3)).precisaEscolher).toBe(false);
  });
});
