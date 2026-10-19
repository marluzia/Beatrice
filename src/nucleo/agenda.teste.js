// A agenda junta quatro origens de evento datado numa lista só. O teste existe
// porque cada origem mora numa entidade diferente do estado, e esquecer uma
// delas não quebra nada   só faz o dia sumir do calendário em silêncio.

import { describe, expect, it } from "vitest";
import { estadoInicial, novaTarefa } from "./estadoInicial.js";
import { agendaDe, agendaPorDia, contagemPorNatureza, historicoEmTexto } from "./agenda.js";
import { calcular } from "./adaptador.js";
import { conferir } from "./motor.ts";

const CICLO = { de: "2026-09-01", ate: "2026-10-01" };

function conjunto(modo = "moradia", quantos = 2) {
  const estado = estadoInicial(modo, quantos);
  estado.periodo = { mes: 9, ano: 2026 };
  estado.faturas.luz.janela = { ...CICLO };
  estado.faturas.agua.janela = { ...CICLO };
  estado.moradores[0].nome = "Ana";
  if (estado.moradores[1]) estado.moradores[1].nome = "Bruno";
  return estado;
}

describe("as quatro origens entram na agenda", () => {
  it("dia fora de um morador vira evento de presença", () => {
    const e = conjunto();
    e.moradores[0].ausencias = ["2026-09-10"];

    const agenda = agendaDe(e);
    expect(agenda).toHaveLength(1);
    expect(agenda[0].natureza).toBe("presenca");
    expect(agenda[0].dia).toBe("2026-09-10");
    expect(agenda[0].titulo).toBe("Ana");
    expect(agenda[0].moradorId).toBe(e.moradores[0].id);
  });

  it("na temporada o evento de presença é a estadia, não a ausência", () => {
    const e = conjunto("temporada");
    e.moradores[0].presencas = ["2026-09-10"];
    e.moradores[0].ausencias = ["2026-09-20"]; // campo da outra polaridade: ignorado

    const agenda = agendaDe(e);
    expect(agenda).toHaveLength(1);
    expect(agenda[0].dia).toBe("2026-09-10");
    expect(agenda[0].detalhe).toContain("esteve");
  });

  it("uso com data vira evento de uso, com quem participou", () => {
    const e = conjunto();
    const ids = e.moradores.map((m) => m.id);
    e.itens = [
      {
        ...e.itens[0],
        nome: "Máquina de lavar",
        especie: "porUso",
        participantes: ids,
        eventos: [{ id: "ev1", data: "2026-09-12", quantidade: "2", participantes: [ids[0]] }],
      },
    ];

    const [evento] = agendaDe(e);
    expect(evento.natureza).toBe("uso");
    expect(evento.titulo).toBe("Máquina de lavar");
    expect(evento.detalhe).toContain("2 usos");
    expect(evento.detalhe).toContain("Ana");
  });

  it("item em reais com data vira despesa; sem data não entra", () => {
    const e = conjunto();
    const ids = e.moradores.map((m) => m.id);
    e.itens = [
      { ...e.itens[0], nome: "Galão", especie: "reais", valor: "15", data: "2026-09-05", participantes: ids },
      { ...e.itens[1], nome: "Internet", especie: "reais", valor: "100", participantes: ids },
    ];

    const agenda = agendaDe(e);
    expect(agenda).toHaveLength(1);
    expect(agenda[0].natureza).toBe("despesa");
    expect(agenda[0].titulo).toBe("Galão");
    expect(agenda[0].detalhe).toContain("15,00");
  });

  it("tarefa vira evento de tarefa, com quem fez", () => {
    const e = conjunto();
    e.tarefas = [
      { ...novaTarefa("2026-09-03"), nome: "Lavar louça", responsaveis: [e.moradores[1].id] },
    ];

    const [evento] = agendaDe(e);
    expect(evento.natureza).toBe("tarefa");
    expect(evento.titulo).toBe("Lavar louça");
    expect(evento.detalhe).toBe("Bruno");
  });
});

describe("a agenda em ordem", () => {
  const cheio = () => {
    const e = conjunto();
    const ids = e.moradores.map((m) => m.id);
    e.moradores[0].ausencias = ["2026-09-20"];
    e.tarefas = [{ ...novaTarefa("2026-09-03"), nome: "Lixo", responsaveis: [ids[0]] }];
    e.itens = [
      {
        ...e.itens[0], nome: "Máquina", especie: "porUso", participantes: ids,
        eventos: [{ id: "ev1", data: "2026-09-12", quantidade: "1", participantes: ids }],
      },
      { ...e.itens[1], nome: "Galão", especie: "reais", valor: "15", data: "2026-09-03", participantes: ids },
    ];
    return e;
  };

  it("ordena por dia", () => {
    expect(agendaDe(cheio()).map((e) => e.dia)).toEqual([
      "2026-09-03",
      "2026-09-03",
      "2026-09-12",
      "2026-09-20",
    ]);
  });

  it("dentro do mesmo dia, presença vem antes de uso, despesa e tarefa", () => {
    const doDia = agendaDe(cheio()).filter((e) => e.dia === "2026-09-03");
    expect(doDia.map((e) => e.natureza)).toEqual(["despesa", "tarefa"]);
  });

  it("agrupa por dia sem perder evento", () => {
    const porDia = agendaPorDia(cheio());
    expect(Object.keys(porDia)).toHaveLength(3);
    expect(porDia["2026-09-03"]).toHaveLength(2);
    expect(Object.values(porDia).flat()).toHaveLength(agendaDe(cheio()).length);
  });

  it("conta por natureza", () => {
    expect(contagemPorNatureza(cheio())).toEqual({
      presenca: 1,
      uso: 1,
      despesa: 1,
      tarefa: 1,
    });
  });

  it("data inválida não entra na agenda", () => {
    const e = cheio();
    e.tarefas.push({ ...novaTarefa("não é data"), nome: "Quebrada" });
    e.tarefas.push({ ...novaTarefa(null), nome: "Sem data" });
    expect(agendaDe(e).filter((x) => x.natureza === "tarefa")).toHaveLength(1);
  });
});

describe("o histórico em texto", () => {
  it("sai vazio quando não há nada lançado", () => {
    expect(historicoEmTexto(conjunto())).toEqual([]);
  });

  it("escreve um cabeçalho por dia e uma linha por evento", () => {
    const e = conjunto();
    e.tarefas = [{ ...novaTarefa("2026-09-03"), nome: "Lixo", responsaveis: [e.moradores[0].id] }];
    e.moradores[1].ausencias = ["2026-09-03"];

    const texto = historicoEmTexto(e).join("\n");
    expect(texto).toContain("3 de setembro");
    expect(texto).toContain("Lixo");
    expect(texto).toContain("Bruno");
  });
});

describe("a agenda não mexe no cálculo", () => {
  it("tarefa não muda valor nenhum", () => {
    const e = conjunto();
    const ids = e.moradores.map((m) => m.id);
    e.faturas.luz.linhas = [
      { id: "l1", nome: "Energia", quantidade: "200", valor: "200", comportamento: "consumo" },
    ];
    e.itens = e.itens.map((i) => ({ ...i, participantes: ids }));

    const semTarefa = calcular(e);
    const comTarefa = calcular({
      ...e,
      tarefas: [
        { ...novaTarefa("2026-09-03"), nome: "Faxina pesada", responsaveis: [ids[0]] },
        { ...novaTarefa("2026-09-04"), nome: "Passar pano", responsaveis: [ids[1]] },
      ],
    });

    expect(comTarefa.somaDevida).toBe(semTarefa.somaDevida);
    expect(comTarefa.moradores.map((m) => m.total)).toEqual(
      semTarefa.moradores.map((m) => m.total),
    );
    expect(conferir(comTarefa)).toBe(true);
  });

  it("despesa datada é cobrada como qualquer item em reais", () => {
    const e = conjunto();
    const ids = e.moradores.map((m) => m.id);
    e.itens = [
      { ...e.itens[0], nome: "Galão", especie: "reais", valor: "30", data: "2026-09-05", rateio: "igual", participantes: ids },
    ];

    const r = calcular(e);
    expect(r.somaDevida).toBeCloseTo(30, 2);
    expect(r.moradores[0].total).toBeCloseTo(15, 2);
    expect(conferir(r)).toBe(true);
  });
});
