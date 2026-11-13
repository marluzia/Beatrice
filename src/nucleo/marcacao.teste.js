import { describe, expect, it } from "vitest";
import { comContasLigadas } from "./teste/conjuntoAntigo.js";
import { cicloPorId } from "./ciclos.js";
import { estadoInicial } from "./estadoInicial.js";
import { comMarcacao } from "./marcacao.js";
import { calcular, diasContadosNaFatura, polaridadeDoConjunto } from "./adaptador.js";

/** Uma Multi de três pessoas, luz de 01/06 a 30/06. */
function multi() {
  const e = comContasLigadas(estadoInicial("multipro", 3));
  e.periodo = { mes: 6, ano: 2026 };
  const luz = cicloPorId(e, "luz");
  luz.janela = { de: "2026-06-01", ate: "2026-07-01" };
  luz.linhas = [{ id: "l1", nome: "Energia", quantidade: "300", valor: "300", comportamento: "consumo" }];
  cicloPorId(e, "agua").ativa = false;
  e.itens = [];
  return e;
}

const dias = (de, n) => Array.from({ length: n }, (_, i) => `2026-06-${String(Number(de) + i).padStart(2, "0")}`);

describe("na Multi, trocar estadia por dias fora", () => {
  it("converte as marcas sem mudar os dias de ninguém", () => {
    const e = multi();
    e.moradores[0].presencas = dias("01", 10);
    e.moradores[1].presencas = dias("11", 20);
    const antes = calcular(e).moradores.map((m) => m.total);

    const fora = comMarcacao(e, "ausencia");
    expect(polaridadeDoConjunto(fora)).toBe("ausencia");
    expect(fora.moradores[0].ausencias).toHaveLength(20);
    expect(fora.moradores[2].ausencias).toHaveLength(30);
    const luz = cicloPorId(fora, "luz");
    expect(diasContadosNaFatura(fora.moradores[0], luz, fora.periodo, "ausencia")).toBe(10);

    const depois = calcular(fora).moradores.map((m) => m.total);
    depois.forEach((v, i) => expect(v).toBeCloseTo(antes[i], 6));
  });

  it("ida e volta devolve as mesmas estadias", () => {
    const e = multi();
    e.moradores[0].presencas = dias("05", 3);
    const volta = comMarcacao(comMarcacao(e, "ausencia"), "presenca");
    expect(volta.moradores[0].presencas).toEqual(dias("05", 3));
  });

  it("sem nada marcado, a lista nova começa vazia", () => {
    const fora = comMarcacao(multi(), "ausencia");
    expect(fora.moradores.every((m) => m.ausencias.length === 0)).toBe(true);
  });

  it("nos outros tipos a troca não faz nada", () => {
    const rep = estadoInicial("moradia", 2);
    expect(comMarcacao(rep, "presenca")).toBe(rep);
  });
});
