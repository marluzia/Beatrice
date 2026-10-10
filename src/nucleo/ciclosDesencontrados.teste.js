import { describe, expect, it } from "vitest";
import {
  cicloValido,
  diasDaJanela,
  diasSemSobreposicao,
  janelaComum,
  janelaDoFechamento,
  janelaTotal,
  mesPredominante,
  periodoDasFaturas,
  temCicloInvalido,
  ultimoDiaDaJanela,
} from "./calendario.js";

const LUZ = { de: "2026-07-25", ate: "2026-08-21" };
const AGUA = { de: "2026-07-14", ate: "2026-08-12" };

const faturas = {
  luz: { ativa: true, janela: LUZ },
  agua: { ativa: true, janela: AGUA },
};

const periodo = { mes: 8, ano: 2026 };

describe("o tamanho de cada ciclo sai das datas de leitura", () => {
  it("a luz cobra 27 dias", () => {
    expect(diasDaJanela(LUZ, periodo)).toBe(27);
  });

  it("a água cobra 29 dias", () => {
    expect(diasDaJanela(AGUA, periodo)).toBe(29);
  });

  it("os dois são ciclos plausíveis", () => {
    expect(cicloValido(LUZ)).toBe(true);
    expect(cicloValido(AGUA)).toBe(true);
    expect(temCicloInvalido(faturas)).toBe(false);
  });
});

describe("o mês do fechamento", () => {
  it("é onde a maior parte do ciclo da luz caiu", () => {
    expect(mesPredominante(LUZ)).toEqual({ mes: 8, ano: 2026 });
  });

  it("a água sozinha diria julho, mas quem manda é a luz", () => {
    expect(mesPredominante(AGUA)).toEqual({ mes: 7, ano: 2026 });
    expect(periodoDasFaturas(faturas, periodo)).toEqual({ mes: 8, ano: 2026 });
  });

  it("sem a luz, a água passa a mandar", () => {
    const soAgua = { luz: { ativa: false, janela: null }, agua: faturas.agua };
    expect(periodoDasFaturas(soAgua, periodo)).toEqual({ mes: 7, ano: 2026 });
  });
});

describe("as três janelas", () => {
  it("o fechamento segue o ciclo da luz", () => {
    expect(janelaDoFechamento(faturas, periodo)).toEqual(LUZ);
  });

  it("a janela total vai da leitura mais cedo à mais tarde", () => {
    expect(janelaTotal(faturas, periodo)).toEqual({
      de: "2026-07-14",
      ate: "2026-08-21",
    });
  });

  it("o último dia que ainda conta é 20/08", () => {
    expect(ultimoDiaDaJanela(janelaTotal(faturas, periodo))).toBe("2026-08-20");
  });

  it("a janela comum é o trecho que as duas cobrem", () => {
    expect(janelaComum(faturas, periodo)).toEqual({
      de: "2026-07-25",
      ate: "2026-08-12",
    });
  });
});

describe("a folga entre os ciclos", () => {
  it("vinte dias são cobertos por uma conta só", () => {
    expect(diasDaJanela(janelaTotal(faturas, periodo), periodo)).toBe(38);
    expect(diasDaJanela(janelaComum(faturas, periodo), periodo)).toBe(18);
    expect(diasSemSobreposicao(faturas, periodo)).toBe(20);
  });

  it("com ciclos iguais, não há folga", () => {
    const iguais = { luz: { ativa: true, janela: LUZ }, agua: { ativa: true, janela: LUZ } };
    expect(diasSemSobreposicao(iguais, periodo)).toBe(0);
  });

  it("com uma fatura só, não há folga a considerar", () => {
    const soLuz = { luz: faturas.luz, agua: { ativa: false, janela: AGUA } };
    expect(diasSemSobreposicao(soLuz, periodo)).toBe(0);
    expect(janelaTotal(soLuz, periodo)).toEqual(LUZ);
  });
});

describe("fatura desligada sai de todas as contas", () => {
  it("desligar a água encolhe a janela total para o ciclo da luz", () => {
    const soLuz = { luz: faturas.luz, agua: { ativa: false, janela: AGUA } };
    expect(janelaTotal(soLuz, periodo)).toEqual(LUZ);
    expect(janelaComum(soLuz, periodo)).toEqual(LUZ);
  });

  it("sem nenhuma das duas, vale o mês de referência", () => {
    const nenhuma = {
      luz: { ativa: false, janela: LUZ },
      agua: { ativa: false, janela: AGUA },
    };
    expect(janelaDoFechamento(nenhuma, periodo)).toEqual({
      de: "2026-08-01",
      ate: "2026-09-01",
    });
    expect(diasDaJanela(janelaDoFechamento(nenhuma, periodo), periodo)).toBe(31);
  });

  it("ciclo impossível numa fatura desligada não conta como erro", () => {
    const desligadaComLixo = {
      luz: faturas.luz,
      agua: { ativa: false, janela: { de: "2026-07-14", ate: "2323-02-23" } },
    };
    expect(temCicloInvalido(desligadaComLixo)).toBe(false);
  });

  it("ciclo impossível numa fatura ligada é acusado", () => {
    const comLixo = {
      luz: { ativa: true, janela: { de: "2026-07-14", ate: "2323-02-23" } },
      agua: faturas.agua,
    };
    expect(temCicloInvalido(comLixo)).toBe(true);
    expect(mesPredominante(comLixo.luz.janela)).toBeNull();
  });
});
