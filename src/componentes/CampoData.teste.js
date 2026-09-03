import { describe, expect, it } from "vitest";
import { comMascara, paraISO } from "./CampoData.jsx";

const digitar = (entrada) => {
  let texto = "";
  for (const tecla of entrada) texto = comMascara(texto + tecla);
  return texto;
};

describe("máscara dd/mm/aaaa", () => {
  it("põe as barras sozinha para quem só digita números", () => {
    expect(digitar("09082026")).toBe("09/08/2026");
  });

  it("não engole dígito ao passar de um grupo para o outro", () => {
    expect(digitar("0908")).toBe("09/08");
    expect(digitar("09082")).toBe("09/08/2");
  });

  it("respeita a barra digitada e completa o zero à esquerda", () => {
    expect(digitar("9/8/2026")).toBe("09/08/2026");
    expect(digitar("1/1/2027")).toBe("01/01/2027");
  });

  it("mantém a barra em pé enquanto se apaga", () => {
    expect(comMascara("09/08/202")).toBe("09/08/202");
    expect(comMascara("09/08/")).toBe("09/08/");
  });

  it("descarta letra e qualquer outro sinal", () => {
    expect(comMascara("a9b/c8")).toBe("09/08");
    expect(comMascara("abc")).toBe("");
  });

  it("não deixa o ano passar de quatro dígitos", () => {
    expect(comMascara("09/08/20267")).toBe("09/08/2026");
  });
});

describe("leitura da data digitada", () => {
  it("devolve ISO quando a data existe", () => {
    expect(paraISO("09/08/2026")).toBe("2026-08-09");
    expect(paraISO("09082026")).toBe("2026-08-09");
  });

  it("recusa data que o calendário não tem", () => {
    expect(paraISO("31/02/2026")).toBeNull();
    expect(paraISO("29/02/2025")).toBeNull();
    expect(paraISO("32/01/2026")).toBeNull();
    expect(paraISO("09/13/2026")).toBeNull();
  });

  it("aceita 29 de fevereiro em ano bissexto", () => {
    expect(paraISO("29/02/2024")).toBe("2024-02-29");
  });

  it("espera a data ficar inteira antes de decidir", () => {
    expect(paraISO("09/08")).toBeNull();
    expect(paraISO("09/08/")).toBeNull();
    expect(paraISO("")).toBeNull();
  });

  it("exige o ano com quatro dígitos", () => {
    expect(paraISO("09/08/26")).toBeNull();
    expect(paraISO("09/08/202")).toBeNull();
    expect(paraISO("09/08/2026")).toBe("2026-08-09");
  });

  it("recusa o que está escrito errado em vez de reinterpretar", () => {
    expect(paraISO("32/01/2026")).toBeNull();
    expect(paraISO("23/23/2323")).toBeNull();
  });
});
