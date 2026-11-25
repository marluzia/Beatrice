import { beforeEach, describe, expect, it } from "vitest";
import { cicloPorId } from "./ciclos.js";
import {
  carregarConjunto,
  criarConjunto,
  exportarConjunto,
  importarConjunto,
  listarConjuntos,
} from "./persistencia.js";
import { estadoInicial } from "./estadoInicial.js";
import { calcular } from "./adaptador.js";

const casa = () => {
  // República Livre: a régua em 25% só existe no preset que deixa a casa
  // arrastar. Nos fechados, a calibragem é a do preset.
  const e = estadoInicial("moradia", 3, "livre");
  e.periodo = { mes: 6, ano: 2026 };
  e.moradores.forEach((m, i) => { m.nome = ["Ana", "Bruno", "Carla"][i]; });
  const ids = e.moradores.map((m) => m.id);

  e.moradores[0].ausencias = ["2026-06-03", "2026-06-04"];
  cicloPorId(e, "luz").janela = { de: "2026-06-01", ate: "2026-07-01" };
  cicloPorId(e, "luz").pagoPor = ids[0];
  cicloPorId(e, "luz").linhas = [
    { id: "l1", nome: "Energia", quantidade: "312", valor: "268,40", comportamento: "consumo" },
  ];
  cicloPorId(e, "agua").ativa = false;
  e.calibragem = 0.25;
  e.quemCede = ids[2];
  e.tarefas = [{ id: "t1", data: "2026-06-07", nome: "Quintal", responsaveis: [ids[1]], observacao: "" }];
  e.itens = [
    { id: "net", nome: "Internet", especie: "reais", valor: "119,90", rateio: "igual",
      rateios: ["igual", "dias"], usosPorPessoa: {}, porcentagens: {}, valores: {},
      data: "2026-06-02", ate: "2026-07-01", pagoPor: ids[2], eventos: [], participantes: ids },
  ];
  return e;
};

beforeEach(() => window.localStorage.clear());

// O cliente recebe um .ceder.json por e-mail e traz no navegador dele. Se este
// caminho quebrar, o teste não serviu para nada.
describe("exportar e importar devolve a mesma casa", () => {
  it("o arquivo é JSON com cabeçalho reconhecível", () => {
    const pacote = JSON.parse(exportarConjunto(criarConjunto("Serra", casa())));
    expect(pacote.ceder).toBe("conjunto");
    expect(pacote.versao).toBe(13);
    expect(pacote.nome).toBe("Serra");
  });

  it("num navegador vazio, a casa volta inteira", () => {
    const json = exportarConjunto(criarConjunto("Serra", casa()));
    window.localStorage.clear();

    const id = importarConjunto(json);
    expect(id).not.toBeNull();

    const volta = carregarConjunto(id);
    expect(volta.moradores.map((m) => m.nome)).toEqual(["Ana", "Bruno", "Carla"]);
    expect(volta.moradores[0].ausencias).toEqual(["2026-06-03", "2026-06-04"]);
    expect(cicloPorId(volta, "luz").janela).toEqual({ de: "2026-06-01", ate: "2026-07-01" });
    expect(volta.calibragem).toBe(0.25);
    expect(volta.tarefas).toHaveLength(1);
    expect(volta.itens[0].data).toBe("2026-06-02");
    expect(volta.itens[0].ate).toBe("2026-07-01");
  });

  it("e as contas dão exatamente o mesmo", () => {
    const original = casa();
    const json = exportarConjunto(criarConjunto("Serra", original));
    window.localStorage.clear();

    const antes = calcular(original);
    const depois = calcular(carregarConjunto(importarConjunto(json)));

    expect(depois.somaDevida).toBeCloseTo(antes.somaDevida, 9);
    expect(depois.residuoDeCentavos).toBe(antes.residuoDeCentavos);
    antes.moradores.forEach((m, i) => {
      expect(depois.moradores[i].total, m.nome).toBeCloseTo(m.total, 9);
    });
  });
});

describe("arquivo que não é da CEDER é recusado, não quebra a tela", () => {
  it.each([
    "isso não é json",
    "",
    "{}",
    "null",
    "[1,2,3]",
    "%PDF-1.4",
    JSON.stringify({ ceder: "casa", versao: 9, nome: "x" }),
    JSON.stringify({ versao: 9, estado: { qualquer: "coisa" } }),
  ])("recusa %s", (texto) => {
    expect(importarConjunto(texto)).toBeNull();
  });

  it("recusa versão futura, que este app não sabe ler", () => {
    expect(importarConjunto(JSON.stringify({ ceder: "casa", versao: 99, nome: "x", estado: casa() }))).toBeNull();
  });
});

describe("arquivo de uma versão anterior sobe sozinho", () => {
  it("v8 (antes de o item ter período) importa com `ate` nulo", () => {
    const v8 = casa();
    v8.itens = v8.itens.map(({ ate, ...resto }) => resto);

    const id = importarConjunto(JSON.stringify({ ceder: "casa", versao: 8, nome: "Da v8", estado: v8 }));
    expect(id).not.toBeNull();
    expect(carregarConjunto(id).itens.every((i) => i.ate === null)).toBe(true);
  });
});

describe("importar o mesmo arquivo duas vezes", () => {
  it("não sobrescreve a casa que já estava lá", () => {
    const id = criarConjunto("Serra", casa());
    const json = exportarConjunto(id);

    importarConjunto(json);
    expect(carregarConjunto(id)).not.toBeNull();
  });

  it("a cópia ganha um número, para dar para distinguir no painel", () => {
    const json = exportarConjunto(criarConjunto("Serra", casa()));

    importarConjunto(json);
    importarConjunto(json);

    const nomes = listarConjuntos().map((c) => c.nome).sort();
    expect(nomes).toEqual(["Serra", "Serra (2)", "Serra (3)"]);
  });
});
