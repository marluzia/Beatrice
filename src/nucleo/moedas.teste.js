import { describe, expect, it } from "vitest";
import { calcular } from "./adaptador.js";
import { criarItem, modeloPorChave } from "./catalogo.js";
import { estadoDeCriacao } from "./estadoInicial.js";
import { definirMoedaAtual, emMoeda, moedaAtual, moedaValida, nomeDaMoeda, simboloDe, trocarSimbolo } from "./moedas.js";
import { sanear } from "./persistencia.js";

describe("a moeda do conjunto", () => {
  it("escreve o valor com o símbolo da moeda e o número no jeito brasileiro", () => {
    expect(emMoeda(1234.5, "BRL")).toBe("R$ 1.234,50");
    expect(emMoeda(1234.5, "USD")).toBe("US$ 1.234,50");
    expect(emMoeda(9.9, "EUR")).toBe("€ 9,90");
    expect(nomeDaMoeda("GBP")).toBe("Libra esterlina (£)");
  });

  it("moeda desconhecida vira real", () => {
    expect(moedaValida("XYZ")).toBe("BRL");
    expect(simboloDe("XYZ")).toBe("R$");
  });

  it("a tela escreve na moeda do conjunto aberto", () => {
    definirMoedaAtual("EUR");
    expect(moedaAtual()).toBe("EUR");
    expect(simboloDe()).toBe("€");
    definirMoedaAtual(null);
    expect(simboloDe()).toBe("R$");
  });

  it("o conjunto nasce com a moeda escolhida; o que veio antes é real", () => {
    expect(estadoDeCriacao({ modo: "evento", voce: "Ana", moeda: "USD" }).moeda).toBe("USD");
    const antigo = estadoDeCriacao({ modo: "evento", voce: "Ana" });
    delete antigo.moeda;
    expect(sanear(antigo).moeda).toBe("BRL");
  });

  it("os avisos do motor saem com o símbolo da moeda", () => {
    expect(trocarSimbolo("Faltam R$ 3,00 sem dono.", "USD")).toBe("Faltam US$ 3,00 sem dono.");
    expect(trocarSimbolo("Faltam R$ 3,00 sem dono.", "BRL")).toBe("Faltam R$ 3,00 sem dono.");

    const e = estadoDeCriacao({ modo: "evento", voce: "Ana", convidados: ["Bia"], moeda: "EUR" });
    const ids = e.moradores.map((m) => m.id);
    e.itens = [{ ...criarItem(modeloPorChave("outra"), ids), nome: "Jantar", valor: "100", rateio: "valor", valores: { [ids[0]]: "30" } }];
    const textos = calcular(e).alertas.map((a) => a.texto).join(" ");
    expect(textos).toMatch(/€ 100,00/);
    expect(textos).not.toMatch(/R\$/);
  });
});
