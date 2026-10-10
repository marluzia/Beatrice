import { describe, expect, it } from "vitest";
import { calcular, orfasDoItem } from "./adaptador.js";
import { criarItem, modeloPorChave } from "./catalogo.js";

const IDS = ["m0", "m1"];

const maquina = (eventos) => ({
  ...criarItem(modeloPorChave("maquina"), IDS),
  kwhPorUso: "0,44",
  m3PorUso: "0,88",
  rateio: "uso",
  eventos,
});

const casa = ({ luzAtiva = true, aguaAtiva = true, eventos = [] } = {}) => ({
  periodo: { mes: 8, ano: 2026 },
  faturas: {
    luz: {
      unidade: "kwh",
      ativa: luzAtiva,
      janela: { de: "2026-07-25", ate: "2026-08-21" },
      linhas: [
        { id: "l1", nome: "Energia elétrica", quantidade: "100", valor: "100", comportamento: "consumo" },
      ],
    },
    agua: {
      unidade: "m3",
      ativa: aguaAtiva,
      janela: { de: "2026-07-14", ate: "2026-08-12" },
      linhas: [
        { id: "l2", nome: "Tarifa água", quantidade: "10", valor: "90", comportamento: "consumo" },
      ],
    },
  },
  moradores: IDS.map((id, i) => ({ id, nome: `Pessoa ${i + 1}`, diasFora: "", ausencias: [] })),
  itens: [maquina(eventos)],
});

const USO_TARDIO = [{ id: "e1", data: "2026-09-01", quantidade: "1", participantes: ["m0"] }];

describe("usos fora do ciclo", () => {
  it("com as duas faturas, acusa as duas", () => {
    const estado = casa({ eventos: USO_TARDIO });
    const orfas = orfasDoItem(estado.itens[0], estado.faturas, estado.periodo);
    expect(orfas.map((o) => o.faltando).sort()).toEqual(["agua", "luz"]);
  });

  it("com a água desligada, acusa só a luz", () => {
    const estado = casa({ aguaAtiva: false, eventos: USO_TARDIO });
    const orfas = orfasDoItem(estado.itens[0], estado.faturas, estado.periodo);
    expect(orfas.map((o) => o.faltando)).toEqual(["luz"]);
  });

  it("com a luz desligada, acusa só a água", () => {
    const estado = casa({ luzAtiva: false, eventos: USO_TARDIO });
    const orfas = orfasDoItem(estado.itens[0], estado.faturas, estado.periodo);
    expect(orfas.map((o) => o.faltando)).toEqual(["agua"]);
  });

  it("sem nenhuma fatura, não acusa nada", () => {
    const estado = casa({ luzAtiva: false, aguaAtiva: false, eventos: USO_TARDIO });
    expect(orfasDoItem(estado.itens[0], estado.faturas, estado.periodo)).toEqual([]);
  });

  it("o alerta do rateio some junto com a fatura desligada", () => {
    const comAgua = calcular(casa({ eventos: USO_TARDIO }));
    expect(comAgua.alertas.some((a) => a.texto.includes("água"))).toBe(true);

    const semNada = calcular(casa({ luzAtiva: false, aguaAtiva: false, eventos: USO_TARDIO }));
    expect(semNada.alertas.some((a) => a.texto.includes("próxima fatura"))).toBe(false);
  });

  it("uso dentro dos dois ciclos não gera aviso nenhum", () => {
    const dentro = [{ id: "e1", data: "2026-08-05", quantidade: "1", participantes: ["m0"] }];
    const estado = casa({ eventos: dentro });
    expect(orfasDoItem(estado.itens[0], estado.faturas, estado.periodo)).toEqual([]);
  });

  it("uso na folga entre os ciclos acusa só a fatura que não cobre", () => {
    const naFolga = [{ id: "e1", data: "2026-08-15", quantidade: "1", participantes: ["m0"] }];
    const estado = casa({ eventos: naFolga });
    const orfas = orfasDoItem(estado.itens[0], estado.faturas, estado.periodo);
    expect(orfas.map((o) => o.faltando)).toEqual(["agua"]);
    expect(orfas[0].quando).toBe("futuro");
  });
});

describe("a conta continua fechando", () => {
  it("com as duas faturas", () => {
    const r = calcular(casa({ eventos: USO_TARDIO }));
    expect(Math.abs(r.diferenca)).toBeLessThan(0.005);
  });

  it("com a água desligada", () => {
    const r = calcular(casa({ aguaAtiva: false, eventos: USO_TARDIO }));
    expect(Math.abs(r.diferenca)).toBeLessThan(0.005);
  });

  it("sem fatura nenhuma, sobram só as despesas em reais", () => {
    const r = calcular(casa({ luzAtiva: false, aguaAtiva: false, eventos: USO_TARDIO }));
    expect(r.somaDevida).toBe(0);
    expect(Math.abs(r.diferenca)).toBeLessThan(0.005);
  });
});
