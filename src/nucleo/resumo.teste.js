import { beforeEach, describe, expect, it } from "vitest";
import { comContasLigadas } from "./teste/conjuntoAntigo.js";
import { cicloPorId } from "./ciclos.js";
import { estadoDeCriacao, estadoInicial, novoLembrete, proximoMes } from "./estadoInicial.js";
import { calcular } from "./adaptador.js";
import { sanear } from "./persistencia.js";
import {
  atividadeDe,
  chaveDaTransferencia,
  composicaoDoCiclo,
  composicaoPorPessoa,
  despesasAvulsas,
  despesasCiclicas,
  eventosDoDia,
  historicoDosCiclos,
  linhaDoMembro,
  listaEmFrase,
  periodoDe,
  quandoFoi,
  quemSouEu,
  resumoDoConjunto,
} from "./resumo.js";

beforeEach(() => window.localStorage.clear());

/**
 * A República Girassol do Figma, em miniatura: quatro pessoas, luz com
 * geladeira e uso comum, uma faxina que a Bia pagou e a luz que a Bia pagou.
 */
function girassol() {
  const e = comContasLigadas(
    estadoDeCriacao({ modo: "moradia", preset: "moderada", voce: "Duda", convidados: ["Bia", "Caio", "Léo"] }),
  );
  e.periodo = { mes: 10, ano: 2026 };
  const luz = cicloPorId(e, "luz");
  luz.janela = { de: "2026-09-25", ate: "2026-10-25" };
  luz.vencimento = "2026-11-04";
  luz.linhas = [
    { id: "l1", nome: "Energia", quantidade: "280", valor: "193.20", comportamento: "consumo" },
    { id: "l2", nome: "Iluminação pública", quantidade: "", valor: "21.60", comportamento: "igual" },
  ];
  cicloPorId(e, "agua").ativa = false;
  const [duda, bia, caio, leo] = e.moradores.map((m) => m.id);
  luz.pagoPor = bia;
  luz.pagoEm = "2026-11-03T12:00:00.000Z";
  e.moradores[2].ausencias = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"];
  e.itens = e.itens.filter((i) => i.modelo === "faxina" || i.modelo === "geladeira");
  const faxina = e.itens.find((i) => i.modelo === "faxina");
  Object.assign(faxina, { valor: "180", pagoPor: bia, rateio: "igual", criadoEm: "2026-10-20T10:42:00.000Z" });
  if (faxina.especie === "porUso") Object.assign(faxina, { origemUso: "reais", valorPorUso: "45", usos: "4" });
  const geladeira = e.itens.find((i) => i.modelo === "geladeira");
  geladeira.consumoPorCiclo = { luz: "36" };
  // Quem fica com o centavo que não fecha: sem isso o acerto não sai.
  e.quemCede = duda;
  return { e: sanear(e), duda, bia, caio, leo };
}

describe("criar um conjunto com nomes", () => {
  it("a primeira pessoa é você e administra; as outras são convidadas", () => {
    const e = estadoDeCriacao({ modo: "evento", voce: "Duda", convidados: ["Bia", " ", "Caio"] });
    expect(e.moradores.map((m) => m.nome)).toEqual(["Duda", "Bia", "Caio"]);
    expect(e.voce).toBe(e.moradores[0].id);
    expect(e.admin).toBe(e.moradores[0].id);
    expect(e.moradores.map((m) => m.convidado)).toEqual([false, true, true]);
    // Todo mundo entra nas despesas que o modo traz.
    for (const i of e.itens) expect(i.participantes).toHaveLength(3);
  });

  it("a temporada nasce com as despesas por dias", () => {
    const e = estadoDeCriacao({ modo: "temporada", voce: "Ana", convidados: ["Bruno"] });
    expect(e.itens.every((i) => i.rateio === "dias")).toBe(true);
  });

  it("quem é você: o que o conjunto gravou, senão o nome do perfil", () => {
    const e = estadoInicial("moradia", 2);
    e.moradores[1].nome = "Duda";
    expect(quemSouEu(e, { nome: "duda " })).toBe(e.moradores[1].id);
    expect(quemSouEu(e, { nome: "" })).toBeNull();
    e.voce = e.moradores[0].id;
    expect(quemSouEu(e, { nome: "Duda" })).toBe(e.moradores[0].id);
  });
});

describe("de que é feita a parte de cada um", () => {
  it("as quatro categorias somam a parte de cada pessoa", () => {
    const { e } = girassol();
    const r = calcular(e);
    const comp = composicaoPorPessoa(r);
    for (const m of r.moradores) {
      const c = comp[m.moradorId];
      expect(c.aparelhos + c.comum + c.taxas + c.avulsas).toBeCloseTo(m.total, 6);
    }
    // A taxa de iluminação é igual entre os quatro.
    expect(comp[r.moradores[0].moradorId].taxas).toBeCloseTo(5.4, 6);
  });

  it("um ciclo por dentro: a parte de cada um fecha com a fatura", () => {
    const { e } = girassol();
    const r = calcular(e);
    const { porPessoa, calculado } = composicaoDoCiclo(e, r, "luz");
    const soma = Object.values(porPessoa).reduce((s, p) => s + p.total, 0);
    expect(soma).toBeCloseTo(calculado.valor, 6);
    expect(calculado.valor).toBeCloseTo(214.8, 6);
  });
});

describe("o saldo de quem usa", () => {
  it("você deve o que as transferências pedem, e a Bia tem a receber", () => {
    const { e, duda, bia } = girassol();
    const r = resumoDoConjunto(e, { perfil: null });
    expect(r.eu).toBe(duda);
    expect(r.total).toBe(Math.round((214.8 + 180) * 100));
    expect(r.aPagar).toBeGreaterThan(0);
    expect(r.aReceber).toBe(0);
    expect(r.situacao).toBe("a pagar");
    const daBia = resumoDoConjunto({ ...e, voce: bia });
    expect(daBia.aReceber).toBeGreaterThan(0);
    expect(daBia.situacao).toBe("a receber");
  });

  it("confirmar o Pix tira a transferência do que está em aberto", () => {
    const { e, duda } = girassol();
    const antes = resumoDoConjunto(e);
    const minha = antes.transferencias.find((t) => t.de === duda);
    const depois = resumoDoConjunto({ ...e, pagamentos: { [chaveDaTransferencia(minha)]: { em: "2026-11-05" } } });
    expect(depois.aPagar).toBe(antes.aPagar - minha.centavos);
    expect(depois.transferencias.find((t) => t.de === duda && t.para === minha.para).confirmada).toBe(true);
  });

  it("conjunto sem você não inventa saldo", () => {
    const e = estadoInicial("evento", 3);
    const r = resumoDoConjunto(e);
    expect(r.eu).toBeNull();
    expect(r.aPagar).toBe(0);
    expect(r.situacao).toBe("sem você");
  });
});

describe("as despesas e os dias", () => {
  it("cíclicas e avulsas saem separadas", () => {
    const { e } = girassol();
    const r = calcular(e);
    expect(despesasCiclicas(e, r).map((d) => d.id)).toEqual(["luz"]);
    expect(despesasCiclicas(e, r)[0].valor).toBeCloseTo(214.8, 6);
    expect(despesasCiclicas(e, r)[0].quantidade).toBe(280);
    expect(despesasAvulsas(e, r).map((d) => d.nome)).toContain("Faxina");
  });

  it("o período do fechamento em texto", () => {
    const { e } = girassol();
    expect(periodoDe(e).texto).toBe("25/09 a 24/10 · 30 dias");
  });

  it("a linha de cada membro diz onde estava", () => {
    const { e } = girassol();
    expect(linhaDoMembro(e, e.moradores[0])).toBe("em casa: luz 30/30");
    expect(linhaDoMembro(e, e.moradores[2])).toBe("fora de 05 a 10/10 · luz 24/30");
    expect(linhaDoMembro(estadoInicial("evento", 1), estadoInicial("evento", 1).moradores[0])).toBe("");
  });

  it("um dia junta vencimento, registro, lembrete e ausência", () => {
    const { e } = girassol();
    e.lembretes = [novoLembrete("nota", { texto: "Lavar as toalhas", data: "2026-11-04" })];
    const tipos = eventosDoDia(e, "2026-11-04").map((x) => x.tipo);
    expect(tipos).toContain("vencimento");
    expect(tipos).toContain("lembrete");
    expect(eventosDoDia(e, "2026-10-06").map((x) => x.tipo)).toContain("ausencia");
  });
});

describe("a atividade e o histórico", () => {
  it("do mais recente para o mais antigo, só o que tem data", () => {
    const { e } = girassol();
    const a = atividadeDe(e);
    expect(a.map((x) => x.tipo)).toEqual(["pagamento", "despesa"]);
    expect(a[0].texto).toBe("Bia marcou a luz como paga");
    expect(a[1].texto).toBe("Bia pagou Faxina");
  });

  it("o mês seguinte guarda quanto cada ciclo custou", () => {
    const { e } = girassol();
    const novembro = proximoMes(e);
    expect(novembro.historicoDeCiclos).toHaveLength(1);
    expect(novembro.historicoDeCiclos[0].valores.luz).toBeCloseTo(214.8, 6);
    expect(novembro.pagamentos).toEqual({});
    const h = historicoDosCiclos(novembro);
    expect(h.map((x) => x.rotulo)).toEqual(["OUT", "NOV"]);
  });

  it("quando foi, dito como gente fala", () => {
    expect(quandoFoi("2026-11-04", "2026-11-04")).toBe("hoje");
    expect(quandoFoi("2026-11-03", "2026-11-04")).toBe("ontem");
    expect(quandoFoi("2026-10-12", "2026-11-04")).toBe("12/10");
    expect(listaEmFrase(["luz", "água", "faxina"])).toBe("luz, água e faxina");
  });
});
