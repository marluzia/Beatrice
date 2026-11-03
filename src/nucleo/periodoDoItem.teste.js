import { describe, expect, it } from "vitest";
import { agendaDe, ehDespesaDatada, fimDoItem } from "./agenda.js";
import { carregarConjunto, listarConjuntos } from "./persistencia.js";
import { estadoInicial } from "./estadoInicial.js";

const item = (extra = {}) => ({
  id: "i1",
  nome: "Diária da casa",
  especie: "reais",
  valor: "400",
  rateio: "igual",
  participantes: ["m1"],
  usosPorPessoa: {},
  eventos: [],
  data: null,
  ate: null,
  ...extra,
});

const casa = (itens) => ({
  modo: "moradia",
  periodo: { mes: 6, ano: 2026 },
  moradores: [{ id: "m1", nome: "Ana", ausencias: [], presencas: [] }],
  tarefas: [],
  itens,
});

describe("a data do item pode ser um dia ou um período", () => {
  it("sem data, o item não entra na agenda", () => {
    expect(ehDespesaDatada(item())).toBe(false);
    expect(agendaDe(casa([item()]))).toHaveLength(0);
  });

  it("com um dia só, entra uma vez e não tem fim", () => {
    const i = item({ data: "2026-06-12" });
    expect(fimDoItem(i)).toBeNull();

    const agenda = agendaDe(casa([i]));
    expect(agenda).toHaveLength(1);
    expect(agenda[0].dia).toBe("2026-06-12");
    expect(agenda[0].ate).toBeNull();
  });

  it("com período, entra uma vez só e diz até quando vai", () => {
    const i = item({ data: "2026-06-02", ate: "2026-06-09" });
    expect(fimDoItem(i)).toBe("2026-06-09");

    // Espalhar a mesma despesa por oito dias encheria o calendário de
    // repetição sem acrescentar informação nenhuma.
    const agenda = agendaDe(casa([i]));
    expect(agenda).toHaveLength(1);
    expect(agenda[0].dia).toBe("2026-06-02");
    expect(agenda[0].detalhe).toContain("até 09/06");
  });

  it("fim igual ou anterior ao começo não é período", () => {
    expect(fimDoItem(item({ data: "2026-06-10", ate: "2026-06-10" }))).toBeNull();
    expect(fimDoItem(item({ data: "2026-06-10", ate: "2026-06-03" }))).toBeNull();
  });

  it("item que não é em reais também pode ter data", () => {
    const i = item({ especie: "consumo", quantidade: "40", unidade: "kwh", data: "2026-06-07" });
    expect(ehDespesaDatada(i)).toBe(true);
    expect(agendaDe(casa([i]))[0].titulo).toBe("Diária da casa");
  });
});

describe("conjunto antigo sobe para a versão 9", () => {
  // Item da v8 não conhecia `ate`. Null é a verdade sobre ele: dia único,
  // não período de um dia só.
  it("item sem `ate` recebe null ao ser lido", () => {
    window.localStorage.clear();

    const antigo = estadoInicial("moradia");
    antigo.itens = [{ ...item(), data: "2026-06-12", ate: undefined }];

    window.localStorage.setItem(
      "cdr:casa",
      JSON.stringify({ versao: 8, estado: antigo }),
    );

    const casas = listarConjuntos();
    const subida = carregarConjunto(casas[0].id);
    expect(subida.itens[0].ate).toBeNull();
    expect(subida.itens[0].data).toBe("2026-06-12");
  });
});
