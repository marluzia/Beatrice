// O acerto é a última conta antes do dinheiro mudar de mão, então é onde um
// centavo perdido vira discussão no grupo.
//
// O caso que estes testes mais protegem é a diferença entre as duas situações:
// despesa que alguém centralizou (gera dívida interna) e despesa que cada um
// pagou direto (não gera). Confundir as duas infla a dívida de todo mundo com
// dinheiro que já foi pago   foi o erro da primeira versão deste módulo.

import { describe, expect, it } from "vitest";
import { estadoInicial } from "./estadoInicial.js";
import { calcular } from "./adaptador.js";
import { acertoDe, despesasPagaveis, mensagemDoAcerto, transferenciasDe } from "./acerto.js";

const CICLO = { de: "2026-09-01", ate: "2026-10-01" };

function conjunto(quantos = 3) {
  const e = estadoInicial("moradia", quantos);
  e.periodo = { mes: 9, ano: 2026 };
  e.faturas.luz.janela = { ...CICLO };
  e.faturas.agua.janela = { ...CICLO };
  e.faturas.luz.linhas = [
    { id: "l1", nome: "Energia", quantidade: "200", valor: "300", comportamento: "consumo" },
  ];
  e.faturas.agua.linhas = [
    { id: "a1", nome: "Tarifa água", quantidade: "10", valor: "120", comportamento: "consumo" },
  ];
  e.moradores.forEach((m, i) => (m.nome = ["Ana", "Bruno", "Célia"][i] ?? `P${i}`));
  e.itens = [];
  return e;
}

const ids = (e) => e.moradores.map((m) => m.id);
const acerto = (e) => acertoDe(e, calcular(e));
const soma = (lista, campo = "centavos") => lista.reduce((s, t) => s + t[campo], 0);

const despesaEmReais = (e, nome, valor, pagoPor = null) => ({
  ...estadoInicial("moradia").itens[0],
  nome,
  especie: "reais",
  valor: String(valor),
  rateio: "igual",
  participantes: ids(e),
  pagoPor,
});

// ── as duas situações ──────────────────────────────────────────────────────

describe("despesa centralizada x despesa paga direto", () => {
  it("sem pagador, ninguém deve a ninguém: cada um pagou a própria parte", () => {
    const e = conjunto();
    e.faturas.luz.ativa = false;
    e.faturas.agua.ativa = false;
    e.itens = [despesaEmReais(e, "Jantar", 300)];

    const a = acerto(e);

    expect(a.diretas.map((d) => d.nome)).toEqual(["Jantar"]);
    expect(a.centralizadas).toHaveLength(0);
    expect(a.transferencias).toHaveLength(0);
    expect(a.saldos.every((s) => s.saldo === 0)).toBe(true);
  });

  it("com pagador, os outros devem a quem centralizou", () => {
    const e = conjunto();
    e.faturas.luz.ativa = false;
    e.faturas.agua.ativa = false;
    e.itens = [despesaEmReais(e, "Jantar", 300, ids(e)[0])];

    const a = acerto(e);

    expect(a.centralizadas).toHaveLength(1);
    expect(a.saldos[0].saldo).toBe(20000); // pagou 300, deve 100
    expect(a.saldos[1].saldo).toBe(-10000);
    expect(a.transferencias).toHaveLength(2);
  });

  it("as duas situações convivem no mesmo fechamento", () => {
    const e = conjunto();
    e.faturas.luz.ativa = false;
    e.faturas.agua.ativa = false;
    e.itens = [
      despesaEmReais(e, "Jantar", 300), // cada um pagou o seu
      despesaEmReais(e, "Gás", 90, ids(e)[1]), // Bruno centralizou
    ];

    const a = acerto(e);

    // O jantar não entra na dívida interna; o gás entra.
    expect(a.saldos[1].saldo).toBe(6000); // pagou 90, deve 30
    expect(a.saldos[0].saldo).toBe(-3000);
    expect(soma(a.transferencias)).toBe(6000);

    // Mas os dois continuam no rateio do fechamento.
    expect(calcular(e).somaDevida).toBeCloseTo(390, 2);
  });

  it("a dívida interna é só a parte centralizada, não o total do fechamento", () => {
    const e = conjunto();
    e.faturas.luz.ativa = false;
    e.faturas.agua.ativa = false;
    e.itens = [
      despesaEmReais(e, "Jantar", 300), // direto
      despesaEmReais(e, "Gás", 90, ids(e)[0]),
    ];

    const a = acerto(e);
    const r = calcular(e);

    // Cada um deve R$ 130 do fechamento, mas só R$ 30 por dentro.
    expect(r.moradores[1].total).toBeCloseTo(130, 2);
    expect(a.saldos[1].deve).toBe(3000);
  });

  it("pagador que saiu da casa conta como pagamento direto", () => {
    const e = conjunto();
    e.faturas.luz.ativa = false;
    e.faturas.agua.ativa = false;
    e.itens = [despesaEmReais(e, "Jantar", 300, "m-que-saiu")];

    const a = acerto(e);
    expect(a.diretas).toHaveLength(1);
    expect(a.transferencias).toHaveLength(0);
  });
});

// ── o que entra como despesa ───────────────────────────────────────────────

describe("o que pode ter pagador", () => {
  it("as faturas ligadas entram, pelo valor total", () => {
    const e = conjunto();
    const d = despesasPagaveis(e, calcular(e));

    expect(d.map((x) => x.nome)).toEqual(["Conta de luz", "Conta de água"]);
    expect(d.map((x) => x.centavos)).toEqual([30000, 12000]);
  });

  it("a parte de cada um na fatura vem do rateio, não de dividir por igual", () => {
    const e = conjunto();
    // Célia fica 10 dias fora: deve menos da luz que os outros.
    e.moradores[2].ausencias = Array.from(
      { length: 10 },
      (_, i) => `2026-09-${String(i + 5).padStart(2, "0")}`,
    );
    e.faturas.luz.pagoPor = ids(e)[0];

    const a = acerto(e);
    const celia = a.saldos[2];
    const bruno = a.saldos[1];

    expect(celia.deve).toBeLessThan(bruno.deve);
  });

  it("item que sai da fatura não entra: já está dentro da conta de luz", () => {
    const e = conjunto();
    e.itens = [
      {
        ...estadoInicial("moradia").itens[0],
        nome: "Geladeira", especie: "consumo", quantidade: "50", unidade: "kwh",
        participantes: ids(e),
      },
    ];

    expect(despesasPagaveis(e, calcular(e)).some((d) => d.nome === "Geladeira")).toBe(false);
  });

  it("fatura desligada não entra", () => {
    const e = conjunto();
    e.faturas.agua.ativa = false;
    expect(despesasPagaveis(e, calcular(e)).some((d) => d.nome === "Conta de água")).toBe(false);
  });
});

// ── saldos e transferências ────────────────────────────────────────────────

describe("saldos e transferências", () => {
  const resolvida = () => {
    const e = conjunto();
    e.faturas.luz.pagoPor = ids(e)[0];
    e.faturas.agua.pagoPor = ids(e)[1];
    return e;
  };

  it("os saldos somam zero", () => {
    expect(soma(acerto(resolvida()).saldos, "saldo")).toBe(0);
  });

  it("cada pessoa termina quite depois das transferências", () => {
    const a = acerto(resolvida());

    for (const s of a.saldos) {
      const mandou = soma(a.transferencias.filter((t) => t.de === s.moradorId));
      const recebeu = soma(a.transferencias.filter((t) => t.para === s.moradorId));
      expect(s.saldo - recebeu + mandou, s.nome).toBe(0);
    }
  });

  it("nunca passa de n−1 transferências", () => {
    const e = conjunto(6);
    e.faturas.luz.pagoPor = ids(e)[0];
    e.faturas.agua.pagoPor = ids(e)[3];

    expect(acerto(e).transferencias.length).toBeLessThanOrEqual(5);
  });

  it("ninguém transfere para si mesmo", () => {
    expect(acerto(resolvida()).transferencias.every((t) => t.de !== t.para)).toBe(true);
  });

  it("nada sobra de nenhum lado", () => {
    const a = acerto(resolvida());
    expect(a.sobraDevendo).toBe(0);
    expect(a.sobraRecebendo).toBe(0);
  });

  it("casa onde ninguém centralizou nada não gera transferência", () => {
    const a = acerto(conjunto());
    expect(a.totalCentralizado).toBe(0);
    expect(a.transferencias).toHaveLength(0);
  });
});

// ── quem cede ──────────────────────────────────────────────────────────────

describe("quem cede o centavo", () => {
  const naoFecha = () => {
    const e = conjunto(3);
    e.faturas.agua.ativa = false;
    e.faturas.luz.linhas[0].valor = "100"; // 100 entre três não fecha
    e.faturas.luz.pagoPor = ids(e)[0];
    return e;
  };

  // Não existe padrão: a escolha é da casa, e enquanto ela não acontece a
  // moeda fica sem dono e o acerto fica em aberto.
  it("sem escolha, ninguém cede e o acerto se declara em aberto", () => {
    const a = acerto(naoFecha());

    expect(a.quemCede).toBeNull();
    expect(a.precisaCeder).toBe(true);
    for (const s of a.saldos) expect(s.cedeu).toBe(0);
  });

  it("com escolha, o centavo vai para quem a casa escolheu", () => {
    const e = naoFecha();
    e.quemCede = ids(e)[2];

    const a = acerto(e);
    expect(a.quemCede).toBe(ids(e)[2]);
    expect(a.precisaCeder).toBe(false);
    expect(a.saldos[2].cedeu).toBe(a.residuo);
  });

  it("com alguém escolhido, os saldos somam zero e o acerto fecha", () => {
    for (const quem of [0, 1, 2]) {
      const e = naoFecha();
      e.quemCede = ids(e)[quem];

      const a = acerto(e);
      expect(soma(a.saldos, "saldo"), String(quem)).toBe(0);
      expect(a.sobraDevendo + a.sobraRecebendo, String(quem)).toBe(0);
    }
  });

  it("quem cede paga o centavo a mais, e os outros não", () => {
    const e = naoFecha();
    e.quemCede = ids(e)[1];

    const a = acerto(e);
    expect(a.saldos[1].cedeu).toBe(a.residuo);
    expect(a.saldos[0].cedeu).toBe(0);
    expect(a.saldos[2].cedeu).toBe(0);
  });

  // Herdar a escolha de alguém que não mora mais aqui seria pior do que
  // perdê-la: a casa veria um nome que não pode ceder nada.
  it("escolhido que saiu da casa volta a ser ninguém, e a tela trava", () => {
    const e = naoFecha();
    e.quemCede = "m-que-saiu";

    const a = acerto(e);
    expect(a.quemCede).toBeNull();
    expect(a.precisaCeder).toBe(true);
  });

  it("divisão que fecha redondo não tem centavo para ceder", () => {
    const e = conjunto(3);
    e.faturas.agua.ativa = false;
    e.faturas.luz.linhas[0].valor = "300";
    e.faturas.luz.pagoPor = ids(e)[0];

    expect(acerto(e).residuo).toBe(0);
  });
});

// ── a heurística ───────────────────────────────────────────────────────────

describe("a heurística das transferências", () => {
  it("casa o maior devedor com o maior credor", () => {
    const { transferencias } = transferenciasDe([
      { moradorId: "a", saldo: 10000 },
      { moradorId: "b", saldo: -3000 },
      { moradorId: "c", saldo: -7000 },
    ]);

    expect(transferencias[0]).toMatchObject({ de: "c", para: "a", centavos: 7000 });
    expect(transferencias[1]).toMatchObject({ de: "b", para: "a", centavos: 3000 });
  });

  it("dois credores e dois devedores resolvem em até três Pix", () => {
    const { transferencias } = transferenciasDe([
      { moradorId: "a", saldo: 5000 },
      { moradorId: "b", saldo: 5000 },
      { moradorId: "c", saldo: -6000 },
      { moradorId: "d", saldo: -4000 },
    ]);

    expect(transferencias.length).toBeLessThanOrEqual(3);
    expect(soma(transferencias)).toBe(10000);
  });

  it("transferência nunca tem fração de centavo", () => {
    const e = conjunto(3);
    e.faturas.luz.linhas[0].valor = "100";
    e.faturas.agua.linhas[0].valor = "33.33";
    e.faturas.luz.pagoPor = ids(e)[0];
    e.faturas.agua.pagoPor = ids(e)[1];

    expect(acerto(e).transferencias.every((t) => Number.isInteger(t.centavos))).toBe(true);
  });
});

// ── a mensagem ─────────────────────────────────────────────────────────────

describe("a mensagem do grupo", () => {
  it("lista as transferências com nome e valor", () => {
    const e = conjunto();
    e.faturas.luz.pagoPor = ids(e)[0];
    e.faturas.agua.pagoPor = ids(e)[1];

    const texto = mensagemDoAcerto(acerto(e), e.periodo, "República da Serra");
    expect(texto).toContain("República da Serra");
    expect(texto).toContain("→");
  });

  it("diz quem cedeu quando o centavo não fecha", () => {
    const e = conjunto(3);
    e.faturas.agua.ativa = false;
    e.faturas.luz.linhas[0].valor = "100";
    e.faturas.luz.pagoPor = ids(e)[0];
    e.quemCede = ids(e)[2];

    expect(mensagemDoAcerto(acerto(e), e.periodo, "Casa")).toContain("Célia cedeu");
  });

  it("separa o que foi pago direto do que entrou no acerto", () => {
    const e = conjunto();
    e.faturas.luz.pagoPor = ids(e)[0];
    // a água fica sem pagador: cada um pagou a sua parte

    const texto = mensagemDoAcerto(acerto(e), e.periodo, "Casa");
    expect(texto).toContain("cada um pagou a sua parte direto");
    expect(texto).toContain("Conta de água");
  });

  it("diz quando ninguém centralizou nada", () => {
    expect(mensagemDoAcerto(acerto(conjunto()), { mes: 9, ano: 2026 }, "Casa")).toContain(
      "Cada um pagou a própria parte direto",
    );
  });
});
