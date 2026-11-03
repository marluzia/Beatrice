import { describe, expect, it } from "vitest";
import { ausentesEntre, conferir } from "./motor.ts";
// Casos escritos com duas faturas (luz e água): ver teste/duasFaturas.ts.
import { calcular } from "./teste/duasFaturas.ts";
import type { Morador } from "./motor.ts";
import type { ItemDeDuasFaturas as Item } from "./teste/duasFaturas.ts";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Estado = any;

const moradores = (fora: number[]): Morador[] =>
  fora.map((diasFora, i) => ({ id: `m${i}`, nome: `Pessoa ${i + 1}`, diasFora }));

const quarto = (fora: number[], rateio: Item["rateio"], participantes: string[]): Estado => ({
  periodo: { mes: 4, ano: 2026 },
  faturas: { luzKwh: 1000, luzValor: 1000, aguaM3: 0, aguaValor: 0 },
  moradores: moradores(fora),
  itens: [
    {
      id: "ar",
      nome: "Ar-condicionado",
      custo: { tipo: "porHora", porHora: 1, horas: 300, unidade: "kwh" },
      participantes,
      rateio,
    },
  ],
});

const fatiaDe = (estado: Estado, id: string) => {
  const r = calcular(estado);
  const item = r.itens.find((i) => i.id === "ar");
  return item?.fatias.find((f) => f.moradorId === id)?.total ?? 0;
};

describe("uma pessoa viajou: o resultado é exato", () => {
  const fora = [0, 20, 0];
  const dupla = ["m0", "m1"];

  it("por dias divide na proporção da presença", () => {
    const estado = quarto(fora, { tipo: "dias" }, dupla);
    expect(fatiaDe(estado, "m0")).toBeCloseTo(225, 6);
    expect(fatiaDe(estado, "m1")).toBeCloseTo(75, 6);
  });

  it("por presença cobra os dias sozinha de quem estava sozinha", () => {
    const estado = quarto(fora, { tipo: "presenca" }, dupla);
    expect(fatiaDe(estado, "m0")).toBeCloseTo(250, 6);
    expect(fatiaDe(estado, "m1")).toBeCloseTo(50, 6);
  });

  it("a diferença entre os dois rateios é real e não some no arredondamento", () => {
    const porDias = fatiaDe(quarto(fora, { tipo: "dias" }, dupla), "m1");
    const porPresenca = fatiaDe(quarto(fora, { tipo: "presenca" }, dupla), "m1");
    expect(porDias - porPresenca).toBeCloseTo(25, 6);
  });

  it("não avisa nada: com uma ausência só, não há suposição", () => {
    const r = calcular(quarto(fora, { tipo: "presenca" }, dupla));
    expect(r.alertas.some((a) => a.texto.includes("não diz quais dias"))).toBe(false);
  });

  it("quem não é do quarto não paga o ar", () => {
    expect(fatiaDe(quarto(fora, { tipo: "presenca" }, dupla), "m2")).toBe(0);
  });
});

describe("ninguém viajou: presença e igual dão o mesmo", () => {
  const fora = [0, 0, 0];
  const trio = ["m0", "m1", "m2"];

  it("três presentes o mês todo pagam um terço cada", () => {
    const estado = quarto(fora, { tipo: "presenca" }, trio);
    for (const id of trio) expect(fatiaDe(estado, id)).toBeCloseTo(100, 6);
  });

  it("bate com o rateio igual", () => {
    const igual = fatiaDe(quarto(fora, { tipo: "igual" }, trio), "m0");
    const presenca = fatiaDe(quarto(fora, { tipo: "presenca" }, trio), "m0");
    expect(presenca).toBeCloseTo(igual, 6);
  });
});

describe("duas ou mais viajaram sem datas: vira estimativa, e o motor diz isso", () => {
  const fora = [0, 15, 15];
  const trio = ["m0", "m1", "m2"];

  it("avisa que não sabe se as ausências coincidiram", () => {
    const r = calcular(quarto(fora, { tipo: "presenca" }, trio));
    const aviso = r.alertas.find((a) => a.texto.includes("não diz quais dias"));
    expect(aviso).toBeDefined();
    expect(aviso?.nivel).toBe("aviso");
    expect(aviso?.texto).toContain("Ar-condicionado");
  });

  it("mesmo estimando, continua fechando com o custo do item", () => {
    const r = calcular(quarto(fora, { tipo: "presenca" }, trio));
    const item = r.itens.find((i) => i.id === "ar");
    const soma = item?.fatias.reduce((s, f) => s + f.total, 0) ?? 0;
    expect(soma).toBeCloseTo(item?.custoTotal ?? -1, 6);
    expect(conferir(r)).toBe(true);
  });

  it("quem ficou o mês todo paga mais que pelo rateio por dias", () => {
    const porDias = fatiaDe(quarto(fora, { tipo: "dias" }, trio), "m0");
    const porPresenca = fatiaDe(quarto(fora, { tipo: "presenca" }, trio), "m0");
    expect(porPresenca).toBeGreaterThan(porDias);
  });

  it("não avisa quando o item não usa presença", () => {
    const r = calcular(quarto(fora, { tipo: "dias" }, trio));
    expect(r.alertas.some((a) => a.texto.includes("não diz quais dias"))).toBe(false);
  });
});

describe("casos extremos", () => {
  it("um participante só paga tudo, mesmo tendo viajado", () => {
    const estado = quarto([25, 0, 0], { tipo: "presenca" }, ["m0"]);
    expect(fatiaDe(estado, "m0")).toBeCloseTo(300, 6);
  });

  it("todo mundo do quarto fora o mês todo divide igual", () => {
    const estado = quarto([30, 30, 0], { tipo: "presenca" }, ["m0", "m1"]);
    expect(fatiaDe(estado, "m0")).toBeCloseTo(150, 6);
    expect(fatiaDe(estado, "m1")).toBeCloseTo(150, 6);
  });

  it("as fatias sempre somam o custo do item, em qualquer combinação", () => {
    for (let a = 0; a <= 30; a += 5) {
      for (let b = 0; b <= 30; b += 5) {
        const estado = quarto([a, b, 0], { tipo: "presenca" }, ["m0", "m1"]);
        const r = calcular(estado);
        const item = r.itens.find((i) => i.id === "ar");
        const soma = item?.fatias.reduce((s, f) => s + f.total, 0) ?? 0;
        expect(soma, `dias fora ${a} e ${b}`).toBeCloseTo(300, 6);
      }
    }
  });

  it("presença nunca cobra menos de quem ficou mais tempo", () => {
    for (let b = 0; b <= 30; b += 3) {
      const estado = quarto([0, b, 0], { tipo: "presenca" }, ["m0", "m1"]);
      expect(fatiaDe(estado, "m0")).toBeGreaterThanOrEqual(fatiaDe(estado, "m1") - 1e-9);
    }
  });
});

// Com o calendário preenchido, "presença" deixa de ser estimativa e vira uma
// conta direta: percorre os dias do ciclo e divide cada dia entre quem estava.
// A diferença não é cosmética   ela muda quanto cada um paga, e é exatamente
// por isso que o aviso de estimativa não pode mais aparecer aqui.
describe("com as datas marcadas: presença é exata, não estimada", () => {
  const trio = ["m0", "m1", "m2"];

  /** 30 dias; `fora` lista, por pessoa, os índices de dia em que ela não estava. */
  const comDatas = (fora: number[][]): Estado => {
    const presentes = Array.from({ length: 30 }, (_, dia) =>
      trio.filter((_id, pessoa) => !fora[pessoa].includes(dia)),
    );

    const estado = quarto(
      fora.map((f) => f.length),
      { tipo: "presenca" },
      trio,
    );

    return { ...estado, presencas: { mes: presentes, luz: presentes, agua: presentes } };
  };

  const diasDe = (de: number, ate: number) =>
    Array.from({ length: ate - de + 1 }, (_, i) => de + i);

  it("ausências que coincidem cobram os dias sozinha de quem ficou", () => {
    // m0 e m1 fora nos MESMOS 5 dias: m2 fica sozinha 5 dias e paga por eles.
    const estado = comDatas([diasDe(0, 4), diasDe(0, 4), []]);

    expect(fatiaDe(estado, "m2")).toBeCloseTo(300 * ((5 + 25 / 3) / 30), 6);
    expect(fatiaDe(estado, "m0")).toBeCloseTo(300 * (25 / 3 / 30), 6);
    expect(fatiaDe(estado, "m1")).toBeCloseTo(fatiaDe(estado, "m0"), 6);
  });

  it("ausências que não coincidem dão outro número, e esse é o ponto", () => {
    // Mesmos 5 dias fora para cada um, em semanas diferentes.
    const estado = comDatas([diasDe(0, 4), diasDe(5, 9), []]);

    // 10 dias com duas pessoas (2,5 cada), 20 dias com três (6,667 cada).
    expect(fatiaDe(estado, "m0")).toBeCloseTo(300 * ((2.5 + 20 / 3) / 30), 6);
    expect(fatiaDe(estado, "m2")).toBeCloseTo(300 * ((5 + 20 / 3) / 30), 6);
  });

  it("coincidir ou não muda o valor de quem ficou", () => {
    const juntas = fatiaDe(comDatas([diasDe(0, 4), diasDe(0, 4), []]), "m2");
    const separadas = fatiaDe(comDatas([diasDe(0, 4), diasDe(5, 9), []]), "m2");
    expect(juntas).toBeGreaterThan(separadas);
  });

  it("não avisa mais que supôs: com o calendário, não supôs nada", () => {
    const r = calcular(comDatas([diasDe(0, 4), diasDe(0, 4), []]));
    expect(r.alertas.some((a) => a.texto.includes("não diz quais dias"))).toBe(false);
  });

  it("continua fechando com o custo do item", () => {
    const r = calcular(comDatas([diasDe(0, 9), diasDe(3, 14), diasDe(20, 25)]));
    const item = r.itens.find((i) => i.id === "ar");
    const soma = item?.fatias.reduce((s, f) => s + f.total, 0) ?? 0;
    expect(soma).toBeCloseTo(item?.custoTotal ?? -1, 6);
    expect(conferir(r)).toBe(true);
  });

  it("dia em que ninguém do grupo estava divide igual, em vez de sumir", () => {
    const estado = comDatas([[0], [0], [0]]);
    const r = calcular(estado);
    const item = r.itens.find((i) => i.id === "ar");
    const soma = item?.fatias.reduce((s, f) => s + f.total, 0) ?? 0;
    expect(soma).toBeCloseTo(300, 6);
    for (const id of trio) expect(fatiaDe(estado, id)).toBeCloseTo(100, 6);
  });

  it("lista de dias incompleta não passa por exata: volta a estimar e avisa", () => {
    const estado = quarto([15, 15, 0], { tipo: "presenca" }, trio);
    // Só 10 dias de um ciclo de 30: aceitar isso cobraria o custo inteiro
    // dentro desses dez.
    const parcial = Array.from({ length: 10 }, () => trio);

    const r = calcular({ ...estado, presencas: { mes: parcial, luz: parcial, agua: parcial } });
    expect(r.alertas.some((a) => a.texto.includes("não diz quais dias"))).toBe(true);
  });
});

describe("contagem de ausentes", () => {
  const dias = { m0: 30, m1: 10, m2: 30 };

  it("conta quem não ficou o mês inteiro", () => {
    expect(ausentesEntre(["m0", "m1", "m2"], dias, 30)).toBe(1);
    expect(ausentesEntre(["m0", "m2"], dias, 30)).toBe(0);
  });

  it("morador desconhecido conta como ausente", () => {
    expect(ausentesEntre(["m9"], dias, 30)).toBe(1);
  });
});
