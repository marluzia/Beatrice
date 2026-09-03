import { describe, expect, it } from "vitest";
import {
  ANO_MINIMO,
  LIMITES_DO_CICLO,
  cicloValido,
  dataPlausivel,
  faltaNaFatura,
  faltasDoFechamento,
  fechamentoPronto,
} from "./calendario.js";
import { comMascara, paraISO } from "../componentes/CampoData.jsx";

const HOJE = new Date(Date.UTC(2026, 8, 15));

const luz = (janela, ativa = true) => ({ ativa, janela });

describe("faixa de datas aceitas", () => {
  it("aceita de 2020 até o ano seguinte ao corrente", () => {
    expect(dataPlausivel("2020-01-01", HOJE)).toBe(true);
    expect(dataPlausivel("2026-09-15", HOJE)).toBe(true);
  });

  it("aceita janeiro do ano seguinte, por causa do ciclo de dezembro", () => {
    expect(dataPlausivel("2027-01-26", HOJE)).toBe(true);
    expect(cicloValido({ de: "2026-12-28", ate: "2027-01-26" }, HOJE)).toBe(true);
  });

  it("recusa antes de 2020 e o ano visivelmente trocado", () => {
    expect(dataPlausivel("2019-12-31", HOJE)).toBe(false);
    expect(dataPlausivel("2028-01-01", HOJE)).toBe(false);
    expect(dataPlausivel("2039-09-03", HOJE)).toBe(false);
    expect(dataPlausivel("2932-02-23", HOJE)).toBe(false);
  });

  it("recusa dia e mês que não existem", () => {
    expect(dataPlausivel("2026-13-01", HOJE)).toBe(false);
    expect(dataPlausivel("2026-02-31", HOJE)).toBe(false);
  });
});

describe("tamanho do ciclo", () => {
  it("vale de 20 a 45 dias", () => {
    expect(LIMITES_DO_CICLO).toEqual({ minimo: 20, maximo: 45 });
    expect(cicloValido({ de: "2026-08-01", ate: "2026-08-21" }, HOJE)).toBe(true);
    expect(cicloValido({ de: "2026-07-01", ate: "2026-08-15" }, HOJE)).toBe(true);
  });

  it("recusa ciclo curto ou longo demais", () => {
    expect(cicloValido({ de: "2026-08-01", ate: "2026-08-19" }, HOJE)).toBe(false);
    expect(cicloValido({ de: "2026-07-01", ate: "2026-08-16" }, HOJE)).toBe(false);
  });

  it("recusa ciclo com data fora da faixa de anos", () => {
    expect(cicloValido({ de: "2026-09-03", ate: "2039-09-03" }, HOJE)).toBe(false);
  });
});

describe("quando a fatura está pronta para seguir", () => {
  it("as duas datas em branco valem o mês de referência", () => {
    expect(faltaNaFatura(luz({ de: null, ate: null }), "luz", HOJE)).toBeNull();
    expect(faltaNaFatura(luz(null), "luz", HOJE)).toBeNull();
  });

  it("ciclo completo e plausível passa", () => {
    expect(faltaNaFatura(luz({ de: "2026-07-25", ate: "2026-08-21" }), "luz", HOJE)).toBeNull();
  });

  it("meia data não passa, e o aviso diz qual falta", () => {
    expect(faltaNaFatura(luz({ de: "2026-07-25", ate: null }), "luz", HOJE)).toMatch(/final/);
    expect(faltaNaFatura(luz({ de: null, ate: "2026-08-21" }), "luz", HOJE)).toMatch(/inicial/);
  });

  it("data final antes da inicial não passa", () => {
    const falta = faltaNaFatura(luz({ de: "2026-08-21", ate: "2026-07-25" }), "luz", HOJE);
    expect(falta).toMatch(/depois da inicial/);
  });

  it("ano fora da faixa não passa, e o aviso diz a faixa", () => {
    const falta = faltaNaFatura(luz({ de: "2026-09-03", ate: "2039-09-03" }), "luz", HOJE);
    expect(falta).toContain(String(ANO_MINIMO));
    expect(falta).toContain("2027");
  });

  it("ciclo de tamanho impossível não passa, e o aviso diz quantos dias deu", () => {
    const falta = faltaNaFatura(luz({ de: "2026-08-01", ate: "2026-08-10" }), "luz", HOJE);
    expect(falta).toContain("9 dias");
    expect(falta).toContain("20");
    expect(falta).toContain("45");
  });

  it("fatura desligada não exige nada, mesmo com lixo escrito", () => {
    const desligada = luz({ de: "2026-09-03", ate: "2039-09-03" }, false);
    expect(faltaNaFatura(desligada, "luz", HOJE)).toBeNull();
  });
});

describe("o fechamento inteiro", () => {
  const pronto = {
    luz: luz({ de: "2026-07-25", ate: "2026-08-21" }),
    agua: luz({ de: "2026-07-14", ate: "2026-08-12" }),
  };

  it("passa com os dois ciclos completos", () => {
    expect(fechamentoPronto(pronto, HOJE)).toBe(true);
    expect(faltasDoFechamento(pronto, HOJE)).toEqual([]);
  });

  it("passa com tudo em branco", () => {
    const branco = { luz: luz(null), agua: luz(null) };
    expect(fechamentoPronto(branco, HOJE)).toBe(true);
  });

  it("reclama de cada fatura separadamente", () => {
    const meio = {
      luz: luz({ de: "2026-07-25", ate: null }),
      agua: luz({ de: null, ate: "2026-08-12" }),
    };
    const faltas = faltasDoFechamento(meio, HOJE);
    expect(faltas).toHaveLength(2);
    expect(faltas[0]).toContain("luz");
    expect(faltas[1]).toContain("água");
  });

  it("desligar a fatura problemática libera o fechamento", () => {
    const soLuz = {
      luz: pronto.luz,
      agua: luz({ de: "2026-02-23", ate: "2932-02-23" }, false),
    };
    expect(fechamentoPronto(soLuz, HOJE)).toBe(true);
  });

  it("o caso exato do print não passa", () => {
    const doPrint = {
      luz: luz({ de: null, ate: "2039-09-03" }),
      agua: luz({ de: "2932-02-23", ate: null }),
    };
    expect(fechamentoPronto(doPrint, HOJE)).toBe(false);
    expect(faltasDoFechamento(doPrint, HOJE)).toHaveLength(2);
  });
});

describe("como a data pode ser digitada", () => {
  it("espaço, ponto e traço funcionam como barra", () => {
    expect(comMascara("01 09 2026")).toBe("01/09/2026");
    expect(comMascara("1 09 2026")).toBe("01/09/2026");
    expect(comMascara("01 9 2026")).toBe("01/09/2026");
    expect(comMascara("1-9-2026")).toBe("01/09/2026");
    expect(comMascara("1.9.2026")).toBe("01/09/2026");
  });

  it("as quatro formas dão a mesma data", () => {
    const esperado = "2026-09-01";
    for (const escrito of ["01/09/2026", "01 09 2026", "1 09 2026", "01 9 2026"]) {
      expect(paraISO(comMascara(escrito)), escrito).toBe(esperado);
    }
  });
});
