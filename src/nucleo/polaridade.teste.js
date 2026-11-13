// A mesma casa, perguntada de dois jeitos.
//
// Numa república marcam-se os dias FORA; numa casa de temporada, os dias de
// ESTADIA. O domínio recebe a mesma coisa nos dois casos   quantos dias a
// pessoa ficou fora   e o teste existe para garantir que a inversão mora só na
// tradução, e que o padrão de cada modo é o certo: república vazia quer dizer
// "todo mundo ficou", temporada vazia quer dizer "ninguém foi".

import { describe, expect, it } from "vitest";
import { comContasLigadas } from "./teste/conjuntoAntigo.js";
import { cicloPorId } from "./ciclos.js";
import { estadoInicial } from "./estadoInicial.js";
import { calcular, diasContadosNaFatura, polaridadeDoConjunto } from "./adaptador.js";
import { conferir, conferirEmCentavos } from "./motor.ts";

const CICLO = { de: "2026-09-01", ate: "2026-10-01" }; // 30 dias

function casa(modo, quantas = 2) {
  const estado = comContasLigadas(estadoInicial(modo, quantas));
  estado.periodo = { mes: 9, ano: 2026 };
  cicloPorId(estado, "luz").janela = { ...CICLO };
  cicloPorId(estado, "agua").janela = { ...CICLO };
  return estado;
}

const diasEmCasa = (estado, morador) =>
  diasContadosNaFatura(morador, cicloPorId(estado, "luz"), estado.periodo, polaridadeDoConjunto(estado));

const corrido = (inicio, quantos) => {
  const [ano, mes, dia] = inicio.split("-").map(Number);
  return Array.from({ length: quantos }, (_, i) =>
    new Date(Date.UTC(ano, mes - 1, dia + i)).toISOString().slice(0, 10),
  );
};

describe("o padrão de cada modo quando ninguém respondeu nada", () => {
  it("república vazia: todo mundo ficou o ciclo inteiro", () => {
    const estado = casa("moradia");
    expect(diasEmCasa(estado, estado.moradores[0])).toBe(30);
  });

  it("temporada vazia: ninguém foi", () => {
    const estado = casa("temporada");
    expect(diasEmCasa(estado, estado.moradores[0])).toBe(0);
  });
});

describe("república: marcam-se os dias fora", () => {
  it("três dias fora deixam 27 contados", () => {
    const estado = casa("moradia");
    estado.moradores[0].ausencias = corrido("2026-09-10", 3);
    expect(diasEmCasa(estado, estado.moradores[0])).toBe(27);
  });

  it("dia fora que cai antes do ciclo não desconta nada", () => {
    const estado = casa("moradia");
    estado.moradores[0].ausencias = ["2026-08-20"];
    expect(diasEmCasa(estado, estado.moradores[0])).toBe(30);
  });
});

describe("temporada: marcam-se os dias de estadia", () => {
  it("três dias de estadia contam três", () => {
    const estado = casa("temporada");
    estado.moradores[0].presencas = corrido("2026-09-10", 3);
    expect(diasEmCasa(estado, estado.moradores[0])).toBe(3);
  });

  it("estadia fora do ciclo não conta", () => {
    const estado = casa("temporada");
    estado.moradores[0].presencas = ["2026-09-10", "2026-08-20", "2026-10-05"];
    expect(diasEmCasa(estado, estado.moradores[0])).toBe(1);
  });

  it("estadia do ciclo inteiro conta o ciclo inteiro", () => {
    const estado = casa("temporada");
    estado.moradores[0].presencas = corrido("2026-09-01", 30);
    expect(diasEmCasa(estado, estado.moradores[0])).toBe(30);
  });

  it("uma república e uma temporada com a mesma resposta dão o mesmo número", () => {
    // 10 dias na casa, dito dos dois jeitos.
    const republica = casa("moradia");
    republica.moradores[0].ausencias = corrido("2026-09-11", 20);

    const temporada = casa("temporada");
    temporada.moradores[0].presencas = corrido("2026-09-01", 10);

    expect(diasEmCasa(republica, republica.moradores[0])).toBe(10);
    expect(diasEmCasa(temporada, temporada.moradores[0])).toBe(10);
  });
});

describe("o fechamento de uma multipropriedade", () => {
  const fechada = () => {
    const estado = casa("multipro", 3);
    estado.moradores[0] = { ...estado.moradores[0], nome: "Ana", presencas: corrido("2026-09-05", 10) };
    estado.moradores[1] = { ...estado.moradores[1], nome: "Bruno", presencas: corrido("2026-09-20", 4) };
    estado.moradores[2] = { ...estado.moradores[2], nome: "Célia", presencas: [] };

    const ids = estado.moradores.map((m) => m.id);
    cicloPorId(estado, "luz").linhas = [
      { id: "l1", nome: "Energia", quantidade: "300", valor: "300", comportamento: "consumo" },
      { id: "l2", nome: "Iluminação pública", quantidade: "", valor: "30", comportamento: "igual" },
    ];
    cicloPorId(estado, "agua").linhas = [
      { id: "a1", nome: "Tarifa água", quantidade: "10", valor: "120", comportamento: "consumo" },
    ];
    estado.itens = estado.itens.map((i) => ({ ...i, participantes: ids }));

    return { estado, resultado: calcular(estado) };
  };

  it("fecha, e fecha no centavo", () => {
    const { resultado } = fechada();
    expect(conferir(resultado)).toBe(true);
    expect(conferirEmCentavos(resultado)).toBe(true);
    expect(resultado.somaDevida).toBeCloseTo(450, 2);
  });

  it("quem ficou mais paga mais", () => {
    const { resultado } = fechada();
    const [ana, bruno, celia] = resultado.moradores;
    expect(ana.total).toBeGreaterThan(bruno.total);
    expect(bruno.total).toBeGreaterThan(celia.total);
  });

  it("quem não foi ainda paga a taxa fixa, que não depende de uso", () => {
    const { resultado } = fechada();
    const celia = resultado.moradores[2];
    expect(celia.diasContados).toBe(0);
    expect(celia.total).toBeCloseTo(10, 2); // 30 de iluminação pública, em três
  });

  it("nada vira NaN com gente de zero dia na casa", () => {
    const { resultado } = fechada();
    for (const m of resultado.moradores) expect(Number.isFinite(m.total)).toBe(true);
  });
});

describe("o fechamento de um evento", () => {
  it("divide despesas em reais sem fatura nenhuma", () => {
    const estado = comContasLigadas(estadoInicial("evento", 3));
    const ids = estado.moradores.map((m) => m.id);

    estado.itens = [
      { ...estado.itens[0], nome: "Carne", especie: "reais", valor: "180", rateio: "igual", participantes: ids },
      { ...estado.itens[1], nome: "Bebida", especie: "reais", valor: "90", rateio: "igual", participantes: ids.slice(0, 2) },
    ];

    const resultado = calcular(estado);

    expect(conferir(resultado)).toBe(true);
    expect(conferirEmCentavos(resultado)).toBe(true);
    expect(resultado.somaDevida).toBeCloseTo(270, 2);
    // quem não entrou na bebida paga só a sua parte da carne
    expect(resultado.moradores[2].total).toBeCloseTo(60, 2);
  });
});
