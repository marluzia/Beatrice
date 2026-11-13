import { describe, expect, it } from "vitest";
import { comContasLigadas } from "./teste/conjuntoAntigo.js";
import { cicloPorId } from "./ciclos.js";
import { estadoInicial } from "./estadoInicial.js";
import { criarItem, modeloPorChave } from "./catalogo.js";
import { calcular, horasDoAparelho, registravel } from "./adaptador.js";

// Luz de 01/06 a 30/06, 300 kWh por R$ 300: R$ 1 por kWh.
function casa() {
  const e = comContasLigadas(estadoInicial("moradia", 2, "temporal"));
  e.periodo = { mes: 6, ano: 2026 };
  const luz = cicloPorId(e, "luz");
  luz.janela = { de: "2026-06-01", ate: "2026-07-01" };
  luz.linhas = [{ id: "l1", nome: "Energia", quantidade: "300", valor: "300", comportamento: "consumo" }];
  cicloPorId(e, "agua").ativa = false;
  const ids = e.moradores.map((m) => m.id);
  const ar = { ...criarItem(modeloPorChave("ar"), ids), id: "ar", porHoraPorCiclo: { luz: "1.1" }, horas: "100", rateio: "igual" };
  e.itens = [ar];
  return e;
}

const custoDoAr = (e) => calcular(e).itens.find((i) => i.id === "ar").custoTotal;

describe("registros de um aparelho por hora", () => {
  it("só entram em Registros os itens que consomem kWh ou m³ por uso ou por hora", () => {
    const e = casa();
    const ids = e.moradores.map((m) => m.id);
    const faxina = criarItem(modeloPorChave("faxina"), ids);
    const geladeira = criarItem(modeloPorChave("geladeira"), ids);
    const maquina = { ...criarItem(modeloPorChave("maquina"), ids), porUsoPorCiclo: { luz: "0.3" } };
    expect(registravel(e.itens[0], e)).toBe(true);
    expect(registravel(maquina, e)).toBe(true);
    expect(registravel(faxina, e)).toBe(false);
    expect(registravel(geladeira, e)).toBe(false);
  });

  it("sem registro, valem as horas declaradas", () => {
    expect(custoDoAr(casa())).toBeCloseTo(110, 6);
  });

  it("com registros, as horas vêm deles, só as de dentro do ciclo", () => {
    const e = casa();
    const [a, b] = e.moradores.map((m) => m.id);
    e.itens[0].registrosDeUso = [
      { id: "r1", data: "2026-06-03", quantidade: "5", participantes: [a, b] },
      { id: "r2", data: "2026-06-20", quantidade: "2.5", participantes: [a] },
      // Depois do ciclo da luz: vem na próxima fatura.
      { id: "r3", data: "2026-07-02", quantidade: "4", participantes: [b] },
    ];
    // 7,5 h dentro do ciclo × 1,1 kWh/h × R$ 1 = R$ 8,25
    expect(custoDoAr(e)).toBeCloseTo(8.25, 6);
    expect(horasDoAparelho(e.itens[0])).toBeCloseTo(11.5, 6);
    // A fatura continua fechando: o resto vira uso comum.
    const r = calcular(e);
    expect(r.somaCobrada).toBeCloseTo(300, 6);
  });
});
