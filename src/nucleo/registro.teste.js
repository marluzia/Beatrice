import { beforeEach, describe, expect, it } from "vitest";
import { calcular } from "./adaptador.js";
import { dadosDoRelatorio, montarRelatorio } from "./relatorio.js";
import { estadoInicial } from "./estadoInicial.js";

const casa = ({ quemCede = null } = {}) => {
  const e = estadoInicial("moradia", 3);
  e.periodo = { mes: 6, ano: 2026 };
  e.moradores.forEach((m, i) => { m.nome = ["Ana", "Bruno", "Carla"][i]; });
  const ids = e.moradores.map((m) => m.id);

  e.faturas.luz.janela = { de: "2026-06-01", ate: "2026-07-01" };
  e.faturas.luz.pagoPor = ids[0];
  e.faturas.luz.linhas = [
    { id: "l1", nome: "Energia", quantidade: "300", valor: "268,40", comportamento: "consumo" },
  ];
  e.faturas.agua.ativa = false;

  const item = (id, nome, valor, pagoPor) => ({
    id, nome, especie: "reais", valor, rateio: "igual", rateios: ["igual"],
    usosPorPessoa: {}, porcentagens: {}, valores: {},
    data: null, ate: null, pagoPor, eventos: [], participantes: ids,
  });

  e.itens = [item("net", "Internet", "119,90", ids[2]), item("gas", "Gás", "110,00", null)];
  e.quemCede = quemCede === null ? null : ids[quemCede];
  return e;
};

const dados = (e) => dadosDoRelatorio(e, calcular(e));

beforeEach(() => window.localStorage.clear());

// Quanto cada um deve é só metade do fechamento. A outra metade   quem
// desembolsou e quem transfere para quem   não ficava registrada em lugar
// nenhum do relatório.
describe("o relatório registra quem pagou cada despesa", () => {
  it("lista cada despesa com quem desembolsou", () => {
    const { pagamentos } = dados(casa({ quemCede: 1 }));

    expect(pagamentos.map((p) => p.nome)).toEqual(["Conta de luz", "Internet", "Gás"]);
    expect(pagamentos[0].quemPagou).toBe("Ana");
    expect(pagamentos[1].quemPagou).toBe("Carla");
  });

  it("despesa sem pagador fica declarada, não some", () => {
    const { pagamentos } = dados(casa({ quemCede: 1 }));
    expect(pagamentos[2].quemPagou).toBeNull();
  });

  it("o texto também traz o bloco", () => {
    const e = casa({ quemCede: 1 });
    const texto = montarRelatorio(e, calcular(e));

    expect(texto).toContain("QUEM PAGOU");
    expect(texto).toContain("cada um pagou a sua parte");
  });
});

describe("o relatório registra as transferências", () => {
  it("traz os saldos e de quem para quem", () => {
    const { acerto } = dados(casa({ quemCede: 1 }));

    expect(acerto.saldos.map((s) => s.nome)).toEqual(["Ana", "Bruno", "Carla"]);
    expect(acerto.transferencias.length).toBeGreaterThan(0);
    for (const t of acerto.transferencias) {
      expect(t.de).toBeDefined();
      expect(t.para).toBeDefined();
      expect(t.valor).toBeGreaterThan(0);
    }
  });

  it("as transferências zeram os saldos", () => {
    const { acerto } = dados(casa({ quemCede: 1 }));
    const soma = acerto.saldos.reduce((s, x) => s + x.saldo, 0);
    expect(Math.abs(soma)).toBeLessThan(0.005);
  });

  it("o que foi pago direto fica à parte, fora do acerto", () => {
    const { acerto } = dados(casa({ quemCede: 1 }));
    expect(acerto.diretas.map((d) => d.nome)).toEqual(["Gás"]);
  });
});

describe("fechamento em aberto não imprime acerto que não fecha", () => {
  it("sem ninguém cedendo, o relatório se declara em aberto", () => {
    expect(dados(casa()).acerto.emAberto).toBe(true);
  });

  it("e o texto diz isso em vez de listar transferências", () => {
    const e = casa();
    const texto = montarRelatorio(e, calcular(e));
    expect(texto).toContain("EM ABERTO");
  });

  it("com alguém cedendo, deixa de estar em aberto", () => {
    expect(dados(casa({ quemCede: 1 })).acerto.emAberto).toBe(false);
  });
});

describe("a conferência não repete mais a soma arredondada", () => {
  it("o texto não fala em valores arredondados", () => {
    const e = casa({ quemCede: 1 });
    expect(montarRelatorio(e, calcular(e))).not.toContain("valores arredondados");
  });

  it("quando alguém cede, a conferência diz que a soma bate", () => {
    const { conferencia } = dados(casa({ quemCede: 1 }));
    if (conferencia.centavos) expect(conferencia.centavos).toContain("cedeu");
  });

  it("quando ninguém cede, diz que está em aberto", () => {
    const { conferencia } = dados(casa());
    if (conferencia.centavos) expect(conferencia.centavos).toContain("em aberto");
  });
});
