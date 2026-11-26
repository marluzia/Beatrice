import { describe, expect, it } from "vitest";
import { quandoNaLista } from "./resumo.js";
import { fraseDoConjunto } from "../telas/comum.js";

describe("a frase de cada conjunto na lista", () => {
  const hoje = "2026-11-26";

  it("hoje só a hora, ontem por extenso, antes a data inteira", () => {
    expect(quandoNaLista("2026-11-26T10:42:00", hoje)).toBe("10:42");
    expect(quandoNaLista("2026-11-26", hoje)).toBe("hoje");
    expect(quandoNaLista("2026-11-25T23:00:00", hoje)).toBe("ontem");
    expect(quandoNaLista("2026-10-12T08:00:00", hoje)).toBe("12/10/2026");
  });

  it("é o nome de quem lançou e quando", () => {
    const p = { ficha: {}, atividade: [{ tipo: "despesa", autor: "Bia", texto: "Bia pagou Mercado", quando: "2026-11-25T09:00:00" }] };
    expect(fraseDoConjunto(p, hoje)).toBe("Bia · ontem");
  });
});

import { comMovimento, textoDoMovimento } from "./movimentos.js";
import { atividadeDe } from "./resumo.js";
import { estadoDeCriacao } from "./estadoInicial.js";

describe("os movimentos do conjunto", () => {
  const base = () => estadoDeCriacao({ modo: "evento", voce: "Ana", convidados: ["Bia"] });

  it("criar, adicionar, entrar e sair entram na atividade com quem fez", () => {
    let e = base();
    const [ana, bia] = e.moradores.map((m) => m.id);
    e = comMovimento(e, { tipo: "criou", quem: ana, quando: "2026-11-20T10:00:00" });
    e = comMovimento(e, { tipo: "adicionou", quem: ana, alvo: bia, quando: "2026-11-21T10:00:00" });
    expect(atividadeDe(e).map((a) => a.texto)).toEqual(["Ana adicionou Bia", "Ana criou o conjunto"]);
    e = comMovimento(e, { tipo: "saiu", quem: bia, alvo: bia, quando: "2026-11-22T10:00:00" });
    expect(atividadeDe(e)[0]).toMatchObject({ texto: "Bia saiu do conjunto", autor: "Bia" });
  });

  it("entrar sobrepõe ter sido adicionado por outra pessoa", () => {
    let e = base();
    const [ana, bia] = e.moradores.map((m) => m.id);
    e = comMovimento(e, { tipo: "adicionou", quem: ana, alvo: bia, quando: "2026-11-21T10:00:00" });
    e = comMovimento(e, { tipo: "entrou", quem: bia, alvo: bia, quando: "2026-11-22T10:00:00" });
    expect(e.movimentos.map(textoDoMovimento)).toEqual(["Bia entrou no conjunto"]);
    // Entrar de novo não repete.
    expect(comMovimento(e, { tipo: "entrou", quem: bia, alvo: bia }).movimentos).toHaveLength(1);
  });

  it("conjunto antigo, sem movimentos, mostra quem administra e quando foi criado", () => {
    const e = base();
    const p = { ficha: { criadaEm: "2026-10-12T08:00:00" }, estado: e, atividade: [] };
    expect(fraseDoConjunto(p, "2026-11-26")).toBe("Ana · 12/10/2026");
  });
});
