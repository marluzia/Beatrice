import { describe, expect, it } from "vitest";
import { criarItem, modeloPorChave } from "../nucleo/catalogo.js";
import { estadoDeCriacao } from "../nucleo/estadoInicial.js";
import { atividadeDe, resumoDoConjunto } from "../nucleo/resumo.js";
import { EH_DESPESA_DE_HOJE, hojeEmTudo, novidadesDe } from "./comum.js";

const HOJE = "2026-11-26";

/** Um evento de Ana (você), Bia e Caio, com as despesas pedidas lançadas hoje. */
function panoramaCom(despesas) {
  const e = estadoDeCriacao({ modo: "evento", voce: "Ana", convidados: ["Bia", "Caio"] });
  const [ana, bia, caio] = e.moradores.map((m) => m.id);
  const ids = { ana, bia, caio };
  e.voce = ana;
  e.itens = despesas.map((d, i) => ({
    ...criarItem(modeloPorChave("comida"), d.entre.map((n) => ids[n])),
    id: `d${i}`,
    nome: d.nome,
    valor: String(d.valor),
    data: HOJE,
    pagoPor: ids[d.pagou],
    rateio: "igual",
  }));
  const resumo = resumoDoConjunto(e);
  return [{ ficha: { id: "c1", nome: "Churrasco" }, estado: e, resumo, atividade: atividadeDe(e, { resultado: resumo.resultado }) }];
}

describe("o Hoje do Início, em Despesas", () => {
  it("só as despesas que envolvem você, mais o Pix que você deve fazer", () => {
    const panorama = panoramaCom([
      { nome: "Carne", valor: 90, pagou: "bia", entre: ["ana", "bia", "caio"] },
      { nome: "Cerveja do Caio", valor: 40, pagou: "caio", entre: ["bia", "caio"] },
    ]);
    const despesas = hojeEmTudo(panorama, HOJE).filter((ev) => EH_DESPESA_DE_HOJE.has(ev.tipo));
    expect(despesas.map((d) => d.titulo)).toEqual(["Pix para Bia", "Carne"]);
    expect(despesas[0]).toMatchObject({ tipo: "transferencia", valor: 30 });
  });
});

describe("as novidades de cada conjunto", () => {
  const atividade = [{ quando: "2026-11-26T10:00:00.000Z" }, { quando: "2026-11-25T10:00:00.000Z" }, { quando: "2026-11-20T10:00:00.000Z" }];

  it("conta o que aconteceu depois da última vez que o conjunto foi aberto", () => {
    expect(novidadesDe({ ficha: { vistoEm: "2026-11-24T00:00:00.000Z" }, atividade })).toBe(2);
    expect(novidadesDe({ ficha: { vistoEm: "2026-11-27T00:00:00.000Z" }, atividade })).toBe(0);
  });

  it("conjunto nunca aberto neste aparelho não mostra número", () => {
    expect(novidadesDe({ ficha: {}, atividade })).toBe(0);
  });
});
