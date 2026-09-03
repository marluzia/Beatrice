import { describe, expect, it } from "vitest";
import { montarMensagemDeColeta } from "./coleta.js";
import { criarItem, modeloPorChave } from "./catalogo.js";

const MORADORES = [
  { id: "m0", nome: "Ana", diasFora: "" },
  { id: "m1", nome: "Bia", diasFora: "" },
  { id: "m2", nome: "", diasFora: "" },
];

const IDS = MORADORES.map((m) => m.id);

const fatura = (unidade, consumo, valor) => ({
  unidade,
  consumo,
  linhas: [{ id: `l${unidade}`, nome: "Tarifa", valor, comportamento: "consumo" }],
});

const FATURAS_CHEIAS = { luz: fatura("kwh", "400", "360"), agua: fatura("m3", "20", "180") };
const FATURAS_VAZIAS = { luz: fatura("kwh", "", ""), agua: fatura("m3", "", "") };

const casa = ({ itens = [], moradores = MORADORES, faturas = FATURAS_CHEIAS } = {}) => ({
  periodo: { mes: 8, ano: 2026 },
  faturas,
  moradores,
  itens,
});

const item = (chave, campos = {}) => ({
  ...criarItem(modeloPorChave(chave), IDS),
  ...campos,
});

const secao = (mensagem, titulo) => {
  const linhas = mensagem.split("\n");
  const inicio = linhas.findIndex((l) => l.startsWith(titulo));
  if (inicio < 0) return "";
  const resto = linhas.slice(inicio + 1);
  const fim = resto.findIndex((l) => l.trim() === "");
  return (fim < 0 ? resto : resto.slice(0, fim)).join("\n");
};

const lancado = (m) => secao(m, "JÁ LANÇADO");
const falta = (m) => secao(m, "FALTA");

describe("cabeçalho", () => {
  it("nomeia o mês por extenso", () => {
    expect(montarMensagemDeColeta(casa())).toContain("Fechamento de agosto de 2026");
  });

  it("chama todo mundo pelo nome e liga os últimos com 'e'", () => {
    expect(montarMensagemDeColeta(casa())).toContain("Ana, Bia e Pessoa 3");
  });

  it("diz que a resposta é no grupo, à vista de todos", () => {
    expect(montarMensagemDeColeta(casa())).toMatch(/no grupo.*conferir/);
  });

  it("avisa quando não há morador para perguntar", () => {
    expect(montarMensagemDeColeta(casa({ moradores: [] }))).toContain("Nenhum morador cadastrado");
  });
});

describe("as duas seções", () => {
  it("separa o que já está lançado do que falta", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("gas", { valor: "130" })] }));
    expect(m).toContain("JÁ LANÇADO");
    expect(m).toContain("FALTA");
    expect(m.indexOf("JÁ LANÇADO")).toBeLessThan(m.indexOf("FALTA"));
  });

  it("não abre a seção de lançados numa casa em que nada foi preenchido", () => {
    const m = montarMensagemDeColeta(casa({ faturas: FATURAS_VAZIAS }));
    expect(m).not.toContain("JÁ LANÇADO");
  });

  it("diz que dá para fechar quando não falta nada", () => {
    const moradores = MORADORES.map((m) => ({ ...m, diasFora: "0" }));
    const m = montarMensagemDeColeta(casa({ moradores, itens: [item("gas", { valor: "130" })] }));
    expect(m).not.toContain("FALTA:");
    expect(m).toContain("já dá para fechar");
  });
});

describe("seção do que já está lançado", () => {
  it("mostra a fatura de luz com consumo e valor", () => {
    expect(lancado(montarMensagemDeColeta(casa()))).toContain("Luz: 400 kWh, R$ 360,00");
  });

  it("mostra a fatura de água com consumo e valor", () => {
    expect(lancado(montarMensagemDeColeta(casa()))).toContain("Água: 20 m³, R$ 180,00");
  });

  it("soma as linhas da fatura em vez de mostrar uma delas", () => {
    const luz = fatura("kwh", "400", "330");
    luz.linhas.push({ id: "l2", nome: "Iluminação", valor: "30", comportamento: "igual" });
    const m = montarMensagemDeColeta(casa({ faturas: { ...FATURAS_CHEIAS, luz } }));
    expect(lancado(m)).toContain("R$ 360,00");
  });

  it("escreve dinheiro em reais, com centavos", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("internet", { valor: "99.9" })] }));
    expect(lancado(m)).toContain("Internet: R$ 99,90");
  });

  it("escreve consumo com vírgula decimal", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("geladeira", { quantidade: "124.5" })] }));
    expect(lancado(m)).toContain("Geladeira: 124,5 kWh");
  });

  it("lista quem já respondeu os dias fora", () => {
    const moradores = [{ ...MORADORES[0], diasFora: "3" }, MORADORES[1], MORADORES[2]];
    expect(lancado(montarMensagemDeColeta(casa({ moradores })))).toContain("Dias fora: Ana 3");
  });

  it("não lança o que está em branco", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("gas", { valor: "" })] }));
    expect(lancado(m)).not.toContain("Gás");
  });

  it("não lança o total de um item que divide por uso: ele vem das respostas", () => {
    const m = montarMensagemDeColeta(
      casa({ itens: [item("faxina", { usos: "4", rateio: "uso" })] }),
    );
    expect(lancado(m)).not.toContain("Faxina: 4 usos");
  });
});

describe("seção do que falta", () => {
  it("pede consumo e linhas quando a fatura está em branco", () => {
    const m = falta(montarMensagemDeColeta(casa({ faturas: FATURAS_VAZIAS })));
    expect(m).toContain("Luz: consumo em kWh e as linhas da fatura");
    expect(m).toContain("Água: consumo em m³ e as linhas da fatura");
  });

  it("pede só o consumo quando os valores já estão lá", () => {
    const luz = fatura("kwh", "", "360");
    const m = falta(montarMensagemDeColeta(casa({ faturas: { ...FATURAS_CHEIAS, luz } })));
    expect(m).toContain("Luz: consumo em kWh");
    expect(m).not.toContain("e as linhas da fatura");
  });

  it("não pede a fatura quando ela está completa", () => {
    expect(falta(montarMensagemDeColeta(casa()))).not.toContain("Luz:");
  });

  it("pergunta os dias fora com o tamanho certo do mês", () => {
    expect(falta(montarMensagemDeColeta(casa()))).toContain("o mês tem 31");
  });

  it("fevereiro bissexto tem 29", () => {
    const m = montarMensagemDeColeta({ ...casa(), periodo: { mes: 2, ano: 2024 } });
    expect(falta(m)).toContain("o mês tem 29");
  });

  it("nomeia só quem ainda não respondeu os dias", () => {
    const moradores = [{ ...MORADORES[0], diasFora: "3" }, MORADORES[1], MORADORES[2]];
    const m = falta(montarMensagemDeColeta(casa({ moradores })));
    expect(m).toContain("Bia e Pessoa 3");
    expect(m).not.toContain("Ana, Bia");
  });

  it("marca o que cada um responde por si", () => {
    const m = falta(montarMensagemDeColeta(casa()));
    expect(m).toMatch(/dias.*\(cada um responde\)/);
  });

  it("com máquina dividida por uso, pergunta as lavagens de cada um", () => {
    const m = montarMensagemDeColeta(
      casa({ itens: [item("maquina", { kwhPorUso: "0.46", m3PorUso: "0.188", rateio: "uso" })] }),
    );
    expect(falta(m)).toContain("Máquina de lavar: quantos usos foram seus");
  });

  it("sem item por uso, não pergunta sobre usos individuais", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("geladeira", { quantidade: "124.5" })] }));
    expect(m).not.toContain("quantos usos foram seus");
  });

  it("com ar-condicionado sem horas, pergunta as horas à casa", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("ar", { porHora: "1.2", horas: "" })] }));
    expect(falta(m)).toContain("Ar-condicionado: quantas horas ficou ligado no mês");
  });

  it("não pergunta o que já está preenchido", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("ar", { porHora: "1.2", horas: "90" })] }));
    expect(m).not.toContain("quantas horas ficou ligado");
  });

  it("com faxina dividida igual, pergunta quantas diárias à casa", () => {
    const m = montarMensagemDeColeta(
      casa({ itens: [item("faxina", { valorPorUso: "90", usos: "", rateio: "igual" })] }),
    );
    expect(falta(m)).toContain("Faxina: quantos usos no mês");
  });

  it("pergunta o valor de uma despesa em reais ainda em branco", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("gas", { valor: "" })] }));
    expect(falta(m)).toContain("Gás: quanto foi no mês");
  });

  it("ignora item sem ninguém marcado", () => {
    const m = montarMensagemDeColeta(
      casa({ itens: [item("ar", { porHora: "1.2", horas: "", participantes: [] })] }),
    );
    expect(m).not.toContain("Ar-condicionado");
  });
});

describe("itens que não são de todo mundo", () => {
  it("diz de quem é o item quando o grupo é parcial", () => {
    const m = montarMensagemDeColeta(
      casa({ itens: [item("ar", { porHora: "1.2", horas: "90", participantes: ["m0", "m1"] })] }),
    );
    expect(m).toContain("Ar-condicionado é só de Ana e Bia.");
  });

  it("não diz nada quando o item é da casa inteira", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("geladeira", { quantidade: "124.5" })] }));
    expect(m).not.toContain("é só de");
  });
});

describe("forma da mensagem", () => {
  it("cabe num grupo: não passa de vinte e cinco linhas numa casa comum", () => {
    const m = montarMensagemDeColeta(
      casa({
        itens: [
          item("geladeira", { quantidade: "124.5" }),
          item("maquina", { kwhPorUso: "0.46", m3PorUso: "0.188", rateio: "uso" }),
          item("faxina", { valorPorUso: "90", usos: "4" }),
          item("gas", { valor: "130" }),
          item("internet", { valor: "99.90" }),
        ],
      }),
    );
    expect(m.split("\n").length).toBeLessThanOrEqual(25);
  });

  it("não deixa marcação de código nem placeholder solto", () => {
    const m = montarMensagemDeColeta(casa({ itens: [item("maquina", { rateio: "uso" })] }));
    expect(m).not.toMatch(/undefined|NaN|\[object|\{\{/);
  });

  it("termina dizendo o que acontece depois", () => {
    expect(montarMensagemDeColeta(casa())).toContain("mando o detalhamento");
  });
});
