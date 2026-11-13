import { describe, expect, it } from "vitest";
import { calcular, registravel } from "./adaptador.js";
import { criarItem, itensPorGrupo, modeloPorChave } from "./catalogo.js";
import { comRateioDoModo, estadoDeCriacao } from "./estadoInicial.js";
import { modoDe } from "./modos.js";
import { todasAsDespesas } from "./resumo.js";

const MULTI = modoDe("multipro");

/** Um chalé da Multi com uma lancha a R$ 120 a hora, período de novembro. */
function chale() {
  const e = estadoDeCriacao({ modo: "multipro", voce: "Ana", convidados: ["Bia"] });
  const ids = e.moradores.map((m) => m.id);
  e.itens = [];
  e.corte = { de: "2026-11-01", ate: "2026-12-01" };
  const lancha = {
    ...comRateioDoModo(criarItem(modeloPorChave("embarcacao"), ids), MULTI),
    id: "lancha",
    valorPorUso: "120",
    pagoPor: ids[0],
    registrosDeUso: [
      { id: "r1", data: "2026-11-05", quantidade: "3", participantes: [ids[0]] },
      { id: "r2", data: "2026-11-08", quantidade: "2", participantes: [ids[0], ids[1]] },
      { id: "r3", data: "2026-10-20", quantidade: "5", participantes: [ids[1]] },
    ],
  };
  e.itens.push(lancha);
  return { e, ids, lancha };
}

describe("equipamentos fora das faturas, na Multi", () => {
  it("ficam num grupo próprio e aceitam registro", () => {
    const { e, lancha } = chale();
    expect(itensPorGrupo(e.itens, MULTI).map((g) => g.grupo)).toEqual(["Equipamentos fora das faturas"]);
    expect(registravel(lancha, e)).toBe(true);
  });

  it("custam o preço da hora vezes as horas registradas dentro do período", () => {
    const { e } = chale();
    const r = calcular(e);
    const item = r.itens.find((i) => i.id === "lancha");
    expect(item.custoTotal).toBeCloseTo(600, 2);
    // Ana: 3 h sozinha + 1 h dividida; Bia: 1 h. O registro de outubro fica fora.
    expect(item.fatias.map((f) => f.total)).toEqual([480, 120]);
  });

  it("cada registro vale em reais na lista de despesas", () => {
    const { e } = chale();
    const regs = todasAsDespesas(e, calcular(e), "2026-11-12").filter((d) => d.tipo === "registrada");
    expect(regs.map((d) => d.valor)).toEqual([240, 360, 600]);
    expect(regs[0].detalhe).toMatch(/2 horas/);
  });

  it("a moradia não vê equipamentos", () => {
    const e = estadoDeCriacao({ modo: "moradia", voce: "Ana" });
    expect(itensPorGrupo(e.itens, modoDe("moradia"), true).map((g) => g.grupo)).not.toContain("Equipamentos fora das faturas");
  });
});
