import { describe, expect, it } from "vitest";
import { calcular } from "./adaptador.js";
import { criarItem, modeloPorChave } from "./catalogo.js";
import { comRateioDoModo, estadoDeCriacao } from "./estadoInicial.js";
import { modoDe } from "./modos.js";
import { atrasosDe } from "./resumo.js";

const TEMPORADA = modoDe("temporada");

/** Uma temporada de 1 a 10 de julho, com Ana e Bruno e uma despesa de 1.000. */
function paraty(rateio = "dias") {
  const e = estadoDeCriacao({ modo: "temporada", voce: "Ana", convidados: ["Bruno"], desde: "2026-07-01", ate: "2026-07-10" });
  const ids = e.moradores.map((m) => m.id);
  const casa = { ...comRateioDoModo(criarItem(modeloPorChave("outra"), ids), TEMPORADA), nome: "Casa", valor: "1000", rateio };
  e.itens = [casa];
  return e;
}

const dias = (de, n) => Array.from({ length: n }, (_, i) => `2026-07-${String(Number(de) + i).padStart(2, "0")}`);
const parteDe = (e, r, nome) => {
  const m = e.moradores.find((x) => x.nome === nome);
  return r.moradores.find((x) => x.moradorId === m.id)?.total;
};

describe("a temporada pesa as estadias dentro do período", () => {
  it("nasce sem despesas e com o período escolhido", () => {
    const e = estadoDeCriacao({ modo: "temporada", voce: "Ana", desde: "2026-07-01", ate: "2026-07-10" });
    expect(e.itens).toHaveLength(0);
    expect(e.corte).toEqual({ de: "2026-07-01", ate: "2026-07-11" });
  });

  it("por dias: quem ficou o dobro paga o dobro", () => {
    const e = paraty("dias");
    e.moradores[0].presencas = dias("01", 10);
    e.moradores[1].presencas = dias("01", 5);
    const r = calcular(e);
    expect(r.diasContados[e.moradores[0].id]).toBe(10);
    const ana = parteDe(e, r, "Ana");
    const bruno = parteDe(e, r, "Bruno");
    expect(ana + bruno).toBeCloseTo(1000, 2);
    expect(ana).toBeCloseTo((1000 * 10) / 15, 1);
  });

  it("estadia fora do período não conta", () => {
    const e = paraty("dias");
    e.moradores[0].presencas = [...dias("01", 5), "2026-07-20", "2026-07-21"];
    e.moradores[1].presencas = dias("01", 5);
    const r = calcular(e);
    expect(parteDe(e, r, "Ana")).toBeCloseTo(500, 1);
  });

  it("temporada não tem fatura, então não tem atraso", () => {
    expect(atrasosDe(paraty(), "2030-01-01")).toEqual([]);
  });
});
