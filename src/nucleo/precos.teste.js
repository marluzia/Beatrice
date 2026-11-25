import { describe, expect, it } from "vitest";
import { calcular } from "./adaptador.js";
import { despesasPagaveis } from "./acerto.js";
import { parteNoRegistro } from "./traducao/uso.js";
import { criarItem, modeloPorChave } from "./catalogo.js";
import { estadoDeCriacao } from "./estadoInicial.js";
import { janelaDoFechamento } from "./calendario.js";
import {
  emDinheiroPorRegistro,
  precosDe,
  quantidadeNaUnidade,
  unidadeDoRegistro,
  unidadesDe,
  valorDoRegistro,
} from "./precos.js";

const embarcacao = (precos, registros = []) => ({
  ...criarItem(modeloPorChave("embarcacao"), ["a", "b"]),
  precos,
  registrosDeUso: registros,
});

describe("os preços de um item avulso", () => {
  it("a embarcação nasce cobrada por hora, ainda sem valor", () => {
    const item = criarItem(modeloPorChave("embarcacao"), ["a"]);
    expect(precosDe(item)).toEqual({ hora: "" });
  });

  it("um item antigo, sem preços, tem o preço único da medida dele", () => {
    const antigo = { ...criarItem(modeloPorChave("equipamento"), ["a"]), valorPorUso: "40" };
    delete antigo.precos;
    expect(precosDe(antigo)).toEqual({ uso: "40" });
  });

  it("as unidades ligadas saem na ordem mês, dia, hora, uso", () => {
    expect(unidadesDe(embarcacao({ uso: "1", mes: "2", hora: "3" }))).toEqual(["mes", "hora", "uso"]);
  });

  it("cada registro vale o preço da unidade dele vezes a quantidade", () => {
    const item = embarcacao({ hora: "150", dia: "900" });
    expect(valorDoRegistro(item, { unidade: "hora", quantidade: "3" })).toBe(450);
    expect(valorDoRegistro(item, { unidade: "dia", quantidade: "2" })).toBe(1800);
    expect(quantidadeNaUnidade(item, { unidade: "dia", quantidade: "2" })).toBe("2 dias");
  });

  it("registro numa unidade que foi desligada cai na primeira ligada", () => {
    const item = embarcacao({ dia: "900" });
    expect(unidadeDoRegistro(item, { unidade: "hora" })).toBe("dia");
    expect(valorDoRegistro(item, { unidade: "hora", quantidade: "1" })).toBe(900);
  });

  it("para o motor, o registro sem preço não vale nada", () => {
    const item = embarcacao({ hora: "" }, [{ id: "r", data: "2026-11-02", quantidade: "2", participantes: ["a"] }]);
    expect(emDinheiroPorRegistro(item).registrosDeUso).toEqual([]);
  });

  it("no fechamento, o custo é a soma dos registros e cada um paga o que usou", () => {
    const e = estadoDeCriacao({ modo: "multipro", voce: "Ana", convidados: ["Bia"] });
    const [ana, bia] = e.moradores.map((m) => m.id);
    const janela = janelaDoFechamento(e.ciclos, e.periodo, e.corte);
    const dia = janela.de;
    e.itens = [
      {
        ...criarItem(modeloPorChave("embarcacao"), [ana, bia]),
        id: "barco",
        rateio: "uso",
        precos: { hora: "100", dia: "500" },
        registrosDeUso: [
          { id: "r1", data: dia, unidade: "hora", quantidade: "2", participantes: [ana] },
          { id: "r2", data: dia, unidade: "dia", quantidade: "1", participantes: [bia] },
        ],
      },
    ];
    const r = calcular(e);
    const barco = r.itens.find((i) => i.id === "barco");
    expect(barco.custoTotal).toBeCloseTo(700);
    const parte = (id) => barco.fatias.find((f) => f.moradorId === id)?.total;
    expect(parte(ana)).toBeCloseTo(200);
    expect(parte(bia)).toBeCloseTo(500);
  });

  it("cada registro divide pelo próprio 'como divide': percentual e cotas", () => {
    const r = { quantidade: "10", participantes: ["a", "b"], divisao: { tipo: "porcentagem", pesos: { a: "70", b: "30" } } };
    expect(parteNoRegistro(r, "a")).toBeCloseTo(7);
    expect(parteNoRegistro(r, "b")).toBeCloseTo(3);
    const cotas = { quantidade: "3", participantes: ["a", "b"], divisao: { tipo: "cotas", pesos: { a: "2", b: "" } } };
    expect(parteNoRegistro(cotas, "a")).toBeCloseTo(2);
    expect(parteNoRegistro({ quantidade: "4", participantes: ["a", "b"] }, "b")).toBe(2);
  });

  it("no acerto, cada uso do avulso é pago por quem o registro diz", () => {
    const e = estadoDeCriacao({ modo: "multipro", voce: "Ana", convidados: ["Bia"] });
    const [ana, bia] = e.moradores.map((m) => m.id);
    const dia = janelaDoFechamento(e.ciclos, e.periodo, e.corte).de;
    e.itens = [
      {
        ...criarItem(modeloPorChave("embarcacao"), [ana, bia]),
        id: "barco",
        rateio: "horas",
        precos: { hora: "100" },
        registrosDeUso: [
          { id: "r1", data: dia, unidade: "hora", quantidade: "2", participantes: [ana, bia], pagoPor: ana },
          { id: "r2", data: dia, unidade: "hora", quantidade: "1", participantes: [bia], pagoPor: bia },
        ],
      },
    ];
    const despesas = despesasPagaveis(e, calcular(e)).filter((d) => d.id.startsWith("barco"));
    expect(despesas.map((d) => [d.pagoPor, d.centavos])).toEqual([
      [ana, 20000],
      [bia, 10000],
    ]);
    expect(despesas[0].porPessoa[bia]).toBeCloseTo(100);
  });
});
