import { describe, expect, it } from "vitest";
import { comMascara, paraISO } from "./CampoData.jsx";

describe("a máscara recusa o que não pode existir", () => {
  it("dia não passa de 31", () => {
    expect(comMascara("34")).toBe("3");
    expect(comMascara("32")).toBe("3");
    expect(comMascara("99")).toBe("09/09");
  });

  it("mês não passa de 12", () => {
    expect(comMascara("23/23")).toBe("23/02");
    expect(comMascara("23/13")).toBe("23/1");
    expect(comMascara("23/19")).toBe("23/1");
  });

  it("ano começa em 1 ou 2", () => {
    expect(comMascara("25/07/4202")).toBe("25/07/202");
    expect(paraISO(comMascara("25/07/4202"))).toBeNull();
    expect(comMascara("25/07/2026")).toBe("25/07/2026");
    expect(comMascara("25/07/1998")).toBe("25/07/1998");
  });

  it("os casos exatos dos prints não passam mais", () => {
    expect(comMascara("23232323")).not.toBe("23/23/2323");
    expect(comMascara("21/32/029")).not.toBe("21/32/029");
    expect(comMascara("34/34")).not.toBe("34/34");
    expect(comMascara("23/23/36")).not.toBe("23/23/36");
  });

  it("ano de dois dígitos não vira data válida no meio da digitação", () => {
    expect(paraISO("25/07/20")).toBeNull();
    expect(paraISO("25/07/202")).toBeNull();
    expect(paraISO("25/07/2026")).toBe("2026-07-25");
  });
});

describe("digitar continua natural", () => {
  it("dígito por dígito monta a data", () => {
    expect(comMascara("2")).toBe("2");
    expect(comMascara("25")).toBe("25");
    expect(comMascara("250")).toBe("25/0");
    expect(comMascara("2507")).toBe("25/07");
    expect(comMascara("250720")).toBe("25/07/20");
    expect(comMascara("25072026")).toBe("25/07/2026");
  });

  it("dia de um dígito só ganha o zero e fecha o grupo", () => {
    expect(comMascara("9")).toBe("09");
    expect(comMascara("98")).toBe("09/08");
  });

  it("respeita a barra digitada à mão", () => {
    expect(comMascara("1/2/2026")).toBe("01/02/2026");
    expect(comMascara("9/8/2026")).toBe("09/08/2026");
  });

  it("apagar não trava o campo", () => {
    expect(comMascara("")).toBe("");
    expect(comMascara("2")).toBe("2");
  });
});

describe("paraISO", () => {
  it("converte data completa", () => {
    expect(paraISO("25/07/2026")).toBe("2026-07-25");
  });

  it("recusa data que não existe no calendário", () => {
    expect(paraISO("31/02/2026")).toBeNull();
    expect(paraISO("29/02/2025")).toBeNull();
  });

  it("aceita 29 de fevereiro em ano bissexto", () => {
    expect(paraISO("29/02/2024")).toBe("2024-02-29");
  });

  it("devolve null enquanto a data está incompleta", () => {
    expect(paraISO("25/07")).toBeNull();
    expect(paraISO("25/07/20")).toBeNull();
  });
});
