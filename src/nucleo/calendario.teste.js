import { describe, expect, it } from "vitest";
import {
  LIMITES_DO_CICLO,
  cicloValido,
  dentroDaJanela,
  diasSemSobreposicao,
  faturaAtiva,
  diaISO,
  diasDaJanela,
  diasDoMes,
  diasNaJanela,
  distanciaEmDias,
  janelaComum,
  janelaDoFechamento,
  janelaDoMes,
  janelaPreenchida,
  janelaTotal,
  periodoDasFaturas,
  janelaValida,
  diasEntre,
  fimDoMes,
  intervalosDe,
  mesPredominante,
  mesSeguinte,
  partesDoDia,
  somarDias,
  temCicloInvalido,
  ultimoDiaDaJanela,
} from "./calendario.js";

describe("leitura de datas", () => {
  it("monta o ISO com zero à esquerda", () => {
    expect(diaISO(2026, 8, 9)).toBe("2026-08-09");
  });

  it("lê de volta o que escreveu", () => {
    expect(partesDoDia("2026-08-09")).toEqual({ ano: 2026, mes: 8, dia: 9 });
  });

  it("recusa o que não é dia do calendário", () => {
    expect(partesDoDia("2026-02-30")).toBeNull();
    expect(partesDoDia("2026-13-01")).toBeNull();
    expect(partesDoDia("09/08/2026")).toBeNull();
    expect(partesDoDia(null)).toBeNull();
  });

  it("aceita 29 de fevereiro em ano bissexto e recusa fora dele", () => {
    expect(partesDoDia("2024-02-29")).not.toBeNull();
    expect(partesDoDia("2025-02-29")).toBeNull();
  });

  it("conta os dias do mês, fevereiro bissexto incluído", () => {
    expect(diasDoMes(2, 2024)).toBe(29);
    expect(diasDoMes(2, 2025)).toBe(28);
    expect(diasDoMes(8, 2026)).toBe(31);
  });
});

describe("contas que atravessam mês e ano", () => {
  it("mede a distância entre leituras de meses diferentes", () => {
    expect(distanciaEmDias("2021-03-09", "2021-04-09")).toBe(31);
    expect(distanciaEmDias("2025-06-06", "2025-07-07")).toBe(31);
  });

  it("atravessa a virada do ano", () => {
    expect(distanciaEmDias("2026-12-28", "2027-01-04")).toBe(7);
    expect(somarDias("2026-12-28", 7)).toBe("2027-01-04");
  });

  it("soma e subtrai dias", () => {
    expect(somarDias("2026-08-31", 1)).toBe("2026-09-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("dá o mês seguinte, virando o ano em dezembro", () => {
    expect(mesSeguinte({ mes: 8, ano: 2026 })).toEqual({ mes: 9, ano: 2026 });
    expect(mesSeguinte({ mes: 12, ano: 2026 })).toEqual({ mes: 1, ano: 2027 });
  });
});

describe("janela de leitura", () => {
  const janela = { de: "2026-08-09", ate: "2026-09-09" };

  it("mede o ciclo como a fatura mede: 31 dias entre 09/08 e 09/09", () => {
    expect(diasDaJanela(janela)).toBe(31);
  });

  it("o dia da leitura anterior entra, o da seguinte não", () => {
    expect(dentroDaJanela("2026-08-09", janela)).toBe(true);
    expect(dentroDaJanela("2026-09-08", janela)).toBe(true);
    expect(dentroDaJanela("2026-09-09", janela)).toBe(false);
    expect(dentroDaJanela("2026-08-08", janela)).toBe(false);
  });

  it("recusa janela incompleta ou de trás para frente", () => {
    expect(janelaValida(null)).toBe(false);
    expect(janelaValida({ de: "2026-08-09", ate: null })).toBe(false);
    expect(janelaValida({ de: "2026-09-09", ate: "2026-08-09" })).toBe(false);
    expect(janelaValida({ de: "2026-08-09", ate: "2026-08-09" })).toBe(false);
  });

  it("sem janela marcada, vale o mês de referência inteiro", () => {
    expect(diasDaJanela(null, { mes: 8, ano: 2026 })).toBe(31);
    expect(diasDaJanela(null, { mes: 2, ano: 2024 })).toBe(29);
  });

  it("a janela do mês vai do dia 1º ao 1º do mês seguinte", () => {
    expect(janelaDoMes({ mes: 8, ano: 2026 })).toEqual({ de: "2026-08-01", ate: "2026-09-01" });
    expect(diasDaJanela(janelaDoMes({ mes: 12, ano: 2026 }))).toBe(31);
  });

  it("não corta ciclo absurdo: mostrar o número real é o que denuncia o erro", () => {
    expect(diasDaJanela({ de: "2026-01-01", ate: "2027-01-01" })).toBe(365);
  });
});

describe("ausências dentro da janela", () => {
  const luz = { de: "2026-08-09", ate: "2026-09-09" };
  const agua = { de: "2026-08-01", ate: "2026-09-01" };

  it("conta só os dias que caem dentro", () => {
    const viagem = ["2026-08-05", "2026-08-06", "2026-08-20", "2026-09-05"];
    expect(diasNaJanela(viagem, luz)).toBe(2);
    expect(diasNaJanela(viagem, agua)).toBe(3);
  });

  it("é isso que faz a mesma viagem pesar diferente em cada fatura", () => {
    const viagem = ["2026-09-02", "2026-09-03", "2026-09-04"];
    expect(diasNaJanela(viagem, luz)).toBe(3);
    expect(diasNaJanela(viagem, agua)).toBe(0);
  });

  it("dia repetido conta uma vez só", () => {
    expect(diasNaJanela(["2026-08-20", "2026-08-20"], luz)).toBe(1);
  });

  it("lista vazia, lixo ou ausente dão zero", () => {
    expect(diasNaJanela([], luz)).toBe(0);
    expect(diasNaJanela(["nada"], luz)).toBe(0);
    expect(diasNaJanela(undefined, luz)).toBe(0);
  });
});

describe("períodos fora", () => {
  it("abre um período em dias, atravessando o mês", () => {
    expect(diasEntre("2026-08-30", "2026-09-02")).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
    ]);
  });

  it("um dia só é um período de um dia", () => {
    expect(diasEntre("2026-08-30", "2026-08-30")).toEqual(["2026-08-30"]);
  });

  it("aceita as pontas trocadas em vez de devolver vazio", () => {
    expect(diasEntre("2026-09-02", "2026-08-30")).toHaveLength(4);
  });

  it("junta dias corridos num trecho só", () => {
    const trechos = intervalosDe(["2026-09-02", "2026-08-31", "2026-09-01", "2026-09-10"]);
    expect(trechos).toEqual([
      { de: "2026-08-31", ate: "2026-09-02" },
      { de: "2026-09-10", ate: "2026-09-10" },
    ]);
  });

  it("ignora repetido e lixo, e devolve em ordem", () => {
    expect(intervalosDe(["2026-09-05", "2026-09-05", "nada", "2026-09-01"])).toEqual([
      { de: "2026-09-01", ate: "2026-09-01" },
      { de: "2026-09-05", ate: "2026-09-05" },
    ]);
  });

  it("dá o último dia do mês, para limitar o seletor", () => {
    expect(fimDoMes({ mes: 2, ano: 2024 })).toBe("2024-02-29");
    expect(fimDoMes({ mes: 9, ano: 2026 })).toBe("2026-09-30");
  });
});

describe("janela do fechamento", () => {
  const luz = { unidade: "kwh", janela: { de: "2026-08-09", ate: "2026-09-09" } };
  const agua = { unidade: "m3", janela: { de: "2026-08-01", ate: "2026-09-01" } };
  const periodo = { mes: 8, ano: 2026 };

  it("é o ciclo da luz, não o mês do calendário", () => {
    expect(janelaDoFechamento({ luz, agua }, periodo)).toEqual(luz.janela);
  });

  it("cai na água quando a luz ainda não tem datas", () => {
    expect(janelaDoFechamento({ luz: { janela: null }, agua }, periodo)).toEqual(agua.janela);
  });

  it("sem nenhuma data, vale o mês inteiro", () => {
    expect(janelaDoFechamento({}, periodo)).toEqual({ de: "2026-08-01", ate: "2026-09-01" });
  });

  it("é o que faz uma viagem em setembro contar num fechamento de agosto", () => {
    const viagem = ["2026-09-02", "2026-09-03", "2026-09-04"];
    expect(diasNaJanela(viagem, janelaDoFechamento({ luz, agua }, periodo))).toBe(3);
    expect(diasNaJanela(viagem, janelaDoMes(periodo))).toBe(0);
  });
});

describe("o que dá para marcar", () => {
  const faturas = {
    luz: { janela: { de: "2026-08-02", ate: "2026-09-02" } },
    agua: { janela: { de: "2026-08-13", ate: "2026-09-08" } },
  };
  const periodo = { mes: 8, ano: 2026 };

  it("vai do começo mais cedo ao fim mais tarde", () => {
    expect(janelaTotal(faturas, periodo)).toEqual({ de: "2026-08-02", ate: "2026-09-08" });
  });

  it("o último dia marcável é a véspera da última leitura", () => {
    expect(ultimoDiaDaJanela(janelaTotal(faturas, periodo))).toBe("2026-09-07");
  });

  it("não deixa marcar antes da primeira leitura nem depois da última", () => {
    const total = janelaTotal(faturas, periodo);
    expect(dentroDaJanela("2026-08-01", total)).toBe(false);
    expect(dentroDaJanela("2026-08-02", total)).toBe(true);
    expect(dentroDaJanela("2026-09-07", total)).toBe(true);
    expect(dentroDaJanela("2026-09-08", total)).toBe(false);
  });

  it("um dia entre as duas leituras conta só na luz", () => {
    expect(dentroDaJanela("2026-08-05", faturas.luz.janela)).toBe(true);
    expect(dentroDaJanela("2026-08-05", faturas.agua.janela)).toBe(false);
  });

  it("sem datas nenhuma, dá para marcar o mês inteiro", () => {
    expect(janelaTotal({}, periodo)).toEqual({ de: "2026-08-01", ate: "2026-09-01" });
  });
});

describe("fatura ligada e desligada", () => {
  const periodo = { mes: 8, ano: 2026 };
  const luz = { ativa: true, janela: { de: "2026-08-02", ate: "2026-09-02" } };
  const agua = { ativa: true, janela: { de: "2026-08-13", ate: "2026-09-08" } };

  it("fatura sem a marca vale como ligada: estado antigo não muda de resultado", () => {
    expect(faturaAtiva({ janela: null })).toBe(true);
    expect(faturaAtiva({ ativa: false })).toBe(false);
  });

  it("o fechamento ignora o ciclo de uma fatura desligada", () => {
    const soAgua = { luz: { ...luz, ativa: false }, agua };
    expect(janelaDoFechamento(soAgua, periodo)).toEqual(agua.janela);
  });

  it("o que dá para marcar encolhe para a fatura que sobrou", () => {
    const soLuz = { luz, agua: { ...agua, ativa: false } };
    expect(janelaTotal(soLuz, periodo)).toEqual(luz.janela);
  });

  it("a sobreposição é o trecho que as duas cobrem ao mesmo tempo", () => {
    expect(janelaComum({ luz, agua }, periodo)).toEqual({
      de: "2026-08-13",
      ate: "2026-09-02",
    });
  });

  it("conta os dias que uma fatura cobre e a outra não", () => {
    expect(diasSemSobreposicao({ luz, agua }, periodo)).toBe(17);
  });

  it("ciclos idênticos não têm dia solto, e o total sem data é exato", () => {
    const mesmo = { de: "2026-08-01", ate: "2026-09-01" };
    expect(diasSemSobreposicao({ luz: { ativa: true, janela: mesmo }, agua: { ativa: true, janela: mesmo } }, periodo)).toBe(0);
  });

  it("com uma fatura só não há o que não se sobrepor", () => {
    expect(diasSemSobreposicao({ luz, agua: { ...agua, ativa: false } }, periodo)).toBe(0);
  });

  it("ciclos que não se encostam não têm trecho comum", () => {
    const cedo = { ativa: true, janela: { de: "2026-06-01", ate: "2026-07-01" } };
    const tarde = { ativa: true, janela: { de: "2026-07-05", ate: "2026-08-05" } };
    expect(janelaComum({ luz: cedo, agua: tarde }, periodo)).toBeNull();
  });
});

describe("mês do fechamento e período válido", () => {
  it("o mês é aquele em que a maior parte do ciclo caiu", () => {
    expect(mesPredominante({ de: "2026-04-28", ate: "2026-05-26" })).toEqual({ mes: 5, ano: 2026 });
  });

  it("vale para a água do mesmo fechamento, que lê em outras datas", () => {
    expect(mesPredominante({ de: "2026-05-06", ate: "2026-06-03" })).toEqual({ mes: 5, ano: 2026 });
  });

  it("um ciclo que vira o ano fica no mês que domina", () => {
    expect(mesPredominante({ de: "2026-12-28", ate: "2027-01-26" })).toEqual({ mes: 1, ano: 2027 });
  });

  it("período inválido não nomeia mês nenhum", () => {
    expect(mesPredominante({ de: "2027-04-24", ate: "2026-05-25" })).toBeNull();
    expect(mesPredominante({ de: "2026-04-22", ate: "2026-04-22" })).toBeNull();
    expect(mesPredominante({ de: "2026-04-22", ate: null })).toBeNull();
  });

  it("sem ciclo válido, o fechamento fica no mês que já estava", () => {
    const padrao = { mes: 9, ano: 2026 };
    expect(periodoDasFaturas({}, padrao)).toEqual(padrao);
    expect(periodoDasFaturas({ luz: { janela: { de: "2026-04-22", ate: "2026-04-22" } } }, padrao)).toEqual(padrao);
  });

  it("a luz manda; a água só decide se a luz não tiver ciclo", () => {
    const faturas = {
      luz: { janela: { de: "2026-04-28", ate: "2026-05-26" } },
      agua: { janela: { de: "2026-06-01", ate: "2026-07-01" } },
    };
    expect(periodoDasFaturas(faturas, { mes: 1, ano: 2000 })).toEqual({ mes: 5, ano: 2026 });
    expect(periodoDasFaturas({ agua: faturas.agua }, { mes: 1, ano: 2000 })).toEqual({ mes: 6, ano: 2026 });
  });

  it("fim antes do começo e leitura no mesmo dia não são período", () => {
    expect(janelaValida({ de: "2027-04-24", ate: "2026-05-25" })).toBe(false);
    expect(janelaValida({ de: "2026-04-22", ate: "2026-04-22" })).toBe(false);
  });
});

describe("ciclo de fatura plausível", () => {
  it("mostra a distância real, sem aparar", () => {
    expect(distanciaEmDias("2022-06-24", "2023-11-25")).toBe(519);
    expect(diasDaJanela({ de: "2022-06-24", ate: "2023-11-25" })).toBe(519);
  });

  it("recusa o ciclo absurdo em vez de encurtá-lo", () => {
    expect(cicloValido({ de: "2022-06-24", ate: "2023-11-25" })).toBe(false);
  });

  it("aceita o ciclo de fatura de verdade", () => {
    expect(cicloValido({ de: "2026-07-26", ate: "2026-08-25" })).toBe(true);
    expect(cicloValido({ de: "2026-04-28", ate: "2026-05-26" })).toBe(true);
  });

  it("as bordas da faixa entram, e um dia fora dela não", () => {
    const { minimo, maximo } = LIMITES_DO_CICLO;
    expect(cicloValido({ de: "2026-08-01", ate: somarDias("2026-08-01", minimo) })).toBe(true);
    expect(cicloValido({ de: "2026-08-01", ate: somarDias("2026-08-01", maximo) })).toBe(true);
    expect(cicloValido({ de: "2026-08-01", ate: somarDias("2026-08-01", minimo - 1) })).toBe(false);
    expect(cicloValido({ de: "2026-08-01", ate: somarDias("2026-08-01", maximo + 1) })).toBe(false);
  });

  it("ciclo impossível não nomeia o fechamento", () => {
    const padrao = { mes: 9, ano: 2026 };
    const absurdo = { luz: { ativa: true, janela: { de: "2022-06-24", ate: "2023-11-25" } } };
    expect(periodoDasFaturas(absurdo, padrao)).toEqual(padrao);
  });

  it("separa 'ainda não preencheu' de 'preencheu errado'", () => {
    const branco = { luz: { ativa: true, janela: null }, agua: { ativa: true, janela: null } };
    const errado = {
      luz: { ativa: true, janela: { de: "2026-07-26", ate: "2026-08-25" } },
      agua: { ativa: true, janela: { de: "2022-06-24", ate: "2023-11-25" } },
    };
    expect(temCicloInvalido(branco)).toBe(false);
    expect(temCicloInvalido(errado)).toBe(true);
  });

  it("conta desligada com ciclo torto não trava o fechamento", () => {
    const desligada = {
      luz: { ativa: true, janela: { de: "2026-07-26", ate: "2026-08-25" } },
      agua: { ativa: false, janela: { de: "2022-06-24", ate: "2023-11-25" } },
    };
    expect(temCicloInvalido(desligada)).toBe(false);
  });

  it("meia data não é preenchimento completo", () => {
    expect(janelaPreenchida({ de: "2026-08-01", ate: null })).toBe(false);
    expect(janelaPreenchida({ de: "2026-08-01", ate: "2026-09-01" })).toBe(true);
  });

  it("o ciclo torto cai no mês de referência, e não em 519 dias de rateio", () => {
    const absurda = { ativa: true, janela: { de: "2022-06-24", ate: "2023-11-25" } };
    expect(janelaTotal({ luz: absurda }, { mes: 8, ano: 2026 })).toEqual({
      de: "2026-08-01",
      ate: "2026-09-01",
    });
  });
});
