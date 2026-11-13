import { beforeEach, describe, expect, it } from "vitest";
import { comContasLigadas } from "./teste/conjuntoAntigo.js";
import { cicloPorId } from "./ciclos.js";
import {
  calibragemFixa,
  PRESETS_DA_REPUBLICA,
  presetDe,
  presetsDe,
  presetValido,
  reguaVisivel,
} from "./modos.js";
import { estadoInicial, proximoMes } from "./estadoInicial.js";
import { carregarConjunto, criarConjunto, sanear } from "./persistencia.js";
import { calcular } from "./adaptador.js";
import { dadosDoRelatorio, montarRelatorio } from "./relatorio.js";

beforeEach(() => window.localStorage.clear());

// A República com um uso comum de verdade: Ana passou 10 dias fora, então
// "por dias" e "por igual" dão números diferentes.
const republica = (preset) => {
  const e = comContasLigadas(estadoInicial("moradia", 3, preset));
  e.periodo = { mes: 6, ano: 2026 };
  e.moradores.forEach((m, i) => { m.nome = ["Ana", "Bruno", "Carla"][i]; });
  e.moradores[0].ausencias = Array.from({ length: 10 }, (_, i) => `2026-06-${String(i + 1).padStart(2, "0")}`);
  cicloPorId(e, "luz").janela = { de: "2026-06-01", ate: "2026-07-01" };
  cicloPorId(e, "luz").linhas = [
    { id: "l1", nome: "Energia", quantidade: "300", valor: "300", comportamento: "consumo" },
  ];
  cicloPorId(e, "agua").ativa = false;
  e.itens = [];
  return e;
};

const usoComumDe = (resultado, nome) =>
  resultado.itens.find((i) => i.id === "__luz").fatias.find((f) =>
    resultado.moradores.find((m) => m.moradorId === f.moradorId)?.nome === nome).total;

describe("os presets da República", () => {
  it("só a República tem presets, e na ordem da tela", () => {
    expect(presetsDe("moradia").map((p) => p.chave)).toEqual(["moderada", "comunal", "temporal", "livre"]);
    expect(presetsDe("moradia").map((p) => p.curto)).toEqual(["Moderado", "Comunal", "Temporal", "Livre"]);
    expect(presetsDe("multipro")).toEqual([]);
    expect(presetsDe("temporada")).toEqual([]);
    expect(presetsDe("familia")).toEqual([]);
    expect(presetsDe("evento")).toEqual([]);
  });

  it.each([
    ["moderada", 0.5],
    ["comunal", 1],
    ["temporal", 0],
  ])("%s fixa a régua em %s e a esconde", (chave, calibragem) => {
    const e = comContasLigadas(estadoInicial("moradia", 3, chave));
    expect(e.preset).toBe(chave);
    expect(e.calibragem).toBe(calibragem);
    expect(calibragemFixa(e)).toBe(calibragem);
    expect(reguaVisivel(e)).toBe(false);
  });

  it("a Livre mostra a régua e não fixa nada", () => {
    const e = comContasLigadas(estadoInicial("moradia", 3, "livre"));
    expect(calibragemFixa(e)).toBeNull();
    expect(reguaVisivel(e)).toBe(true);
  });

  it("sem escolha, a República nasce Moderada", () => {
    expect(comContasLigadas(estadoInicial("moradia")).preset).toBe("moderada");
  });

  it("modo sem presets fica com preset null e a régua de sempre", () => {
    const e = comContasLigadas(estadoInicial("familia"));
    expect(e.preset).toBeNull();
    expect(presetDe(e)).toBeNull();
    expect(reguaVisivel(e)).toBe(true);
    expect(reguaVisivel(comContasLigadas(estadoInicial("evento")))).toBe(false);
  });

  it("preset de outro modo não pega", () => {
    expect(presetValido("familia", "comunal")).toBeNull();
    expect(presetValido("moradia", "inventado")).toBe("livre");
  });
});

describe("o preset muda a conta só no uso comum", () => {
  it("Temporal: Ana, com 10 dias fora, paga menos uso comum", () => {
    const r = calcular(republica("temporal"));
    // 300 por dias: Ana 20, Bruno 30, Carla 30 → 75, 112,50, 112,50
    expect(usoComumDe(r, "Ana")).toBeCloseTo(75, 2);
    expect(usoComumDe(r, "Bruno")).toBeCloseTo(112.5, 2);
  });

  it("Comunal: todos pagam igual, dias fora não contam", () => {
    const r = calcular(republica("comunal"));
    expect(usoComumDe(r, "Ana")).toBeCloseTo(100, 2);
    expect(usoComumDe(r, "Carla")).toBeCloseTo(100, 2);
  });

  it("Moderada: exatamente a média das duas", () => {
    const r = calcular(republica("moderada"));
    expect(usoComumDe(r, "Ana")).toBeCloseTo((75 + 100) / 2, 2);
    expect(usoComumDe(r, "Bruno")).toBeCloseTo((112.5 + 100) / 2, 2);
  });

  it("em todos, a soma cobrada é a fatura", () => {
    for (const p of ["moderada", "comunal", "temporal", "livre"]) {
      expect(calcular(republica(p)).somaCobrada).toBeCloseTo(300, 2);
    }
  });
});

describe("o preset atravessa salvar, importar e virar o mês", () => {
  it("o mês seguinte herda o preset", () => {
    expect(proximoMes(republica("comunal")).preset).toBe("comunal");
  });

  it("República antiga, sem preset gravado, abre como Livre e mantém a régua", () => {
    const antiga = { ...republica("livre"), preset: undefined, calibragem: 0.35 };
    const limpa = sanear(antiga);
    expect(limpa.preset).toBe("livre");
    expect(limpa.calibragem).toBe(0.35);
    expect(reguaVisivel(limpa)).toBe(true);
  });

  it("arquivo com preset fechado e régua torta volta para a régua do preset", () => {
    const torta = { ...republica("moderada"), calibragem: 0.8 };
    expect(sanear(torta).calibragem).toBe(0.5);
  });

  it("salva e carrega com o preset", () => {
    const id = criarConjunto("Serra", republica("temporal"));
    expect(carregarConjunto(id).preset).toBe("temporal");
  });
});

describe("o relatório diz qual preset valeu", () => {
  it("no texto e nos dados", () => {
    const e = republica("comunal");
    const r = calcular(e);
    expect(dadosDoRelatorio(e, r).preset).toBe(PRESETS_DA_REPUBLICA.comunal.nome);
    expect(montarRelatorio(e, r)).toContain("República Comunal: uso comum calibrado em 100% por igual");
  });

  it("fora da República, nada muda", () => {
    const e = comContasLigadas(estadoInicial("familia"));
    expect(dadosDoRelatorio(e, calcular(e)).preset).toBeNull();
  });
});
