import { afterEach, describe, expect, it, vi } from "vitest";
import { carregarCasa, limparCasa, salvarCasa } from "./persistencia.js";
import { estadoInicial } from "./estadoInicial.js";
import { calcular } from "./adaptador.js";
import { conferir } from "./motor.ts";

afterEach(() => {
  limparCasa();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("ida e volta", () => {
  it("salva e devolve a casa inteira", () => {
    const casa = estadoInicial(4);
    expect(salvarCasa(casa)).toBe(true);

    const voltou = carregarCasa();
    expect(voltou.moradores).toHaveLength(4);
    expect(voltou.itens).toHaveLength(casa.itens.length);
    expect(voltou.periodo).toEqual(casa.periodo);
  });

  it("preserva o que foi digitado, não só a estrutura", () => {
    const casa = estadoInicial(2);
    casa.moradores[0].nome = "Ana";
    casa.moradores[0].diasFora = "12";
    casa.faturas.luz.consumo = "400";
    casa.faturas.luz.linhas[0].valor = "360,50";
    salvarCasa(casa);

    const voltou = carregarCasa();
    expect(voltou.moradores[0].nome).toBe("Ana");
    expect(voltou.moradores[0].diasFora).toBe("12");
    expect(voltou.faturas.luz.consumo).toBe("400");
    expect(voltou.faturas.luz.linhas[0].valor).toBe("360,50");
  });

  it("devolve null quando não há nada salvo", () => {
    expect(carregarCasa()).toBeNull();
  });

  it("limpar apaga de verdade", () => {
    salvarCasa(estadoInicial(3));
    limparCasa();
    expect(carregarCasa()).toBeNull();
  });

  it("salvar de novo substitui, não acumula", () => {
    salvarCasa(estadoInicial(2));
    salvarCasa(estadoInicial(5));
    expect(carregarCasa().moradores).toHaveLength(5);
  });
});

describe("dado que não dá para confiar", () => {
  it("ignora JSON quebrado", () => {
    window.localStorage.setItem("cdr:casa", "{isso não é json");
    expect(carregarCasa()).toBeNull();
  });

  it("ignora versão diferente da atual", () => {
    window.localStorage.setItem(
      "cdr:casa",
      JSON.stringify({ versao: 999, estado: estadoInicial(3) }),
    );
    expect(carregarCasa()).toBeNull();
  });

  it("ignora objeto que não tem cara de casa", () => {
    window.localStorage.setItem(
      "cdr:casa",
      JSON.stringify({ versao: 1, estado: { qualquer: "coisa" } }),
    );
    expect(carregarCasa()).toBeNull();
  });

  it("ignora casa pela metade", () => {
    const casa = estadoInicial(3);
    delete casa.itens;
    window.localStorage.setItem("cdr:casa", JSON.stringify({ versao: 1, estado: casa }));
    expect(carregarCasa()).toBeNull();
  });

  it("ignora null e string vazia", () => {
    window.localStorage.setItem("cdr:casa", "null");
    expect(carregarCasa()).toBeNull();
    window.localStorage.setItem("cdr:casa", "");
    expect(carregarCasa()).toBeNull();
  });
});

describe("navegador hostil", () => {
  it("não lança quando não dá para escrever", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => salvarCasa(estadoInicial(3))).not.toThrow();
    expect(salvarCasa(estadoInicial(3))).toBe(false);
  });

  it("não lança quando não dá para ler", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => carregarCasa()).not.toThrow();
    expect(carregarCasa()).toBeNull();
  });

  it("não lança quando não dá para apagar", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => limparCasa()).not.toThrow();
  });

  it("não lança com estado que não vira JSON", () => {
    const circular = estadoInicial(2);
    circular.euMesmo = circular;
    expect(() => salvarCasa(circular)).not.toThrow();
    expect(salvarCasa(circular)).toBe(false);
  });
});

describe("migração da versão 1", () => {
  const casaAntiga = {
    versao: 1,
    estado: {
      periodo: { mes: 8, ano: 2026 },
      faturas: {
        luzKwh: "122",
        luzValor: "113.74",
        luzTaxasFixas: "12.73",
        aguaM3: "20",
        aguaValor: "180",
        aguaTaxasFixas: "",
      },
      moradores: [
        { id: "m0", nome: "Ana", diasFora: "10" },
        { id: "m1", nome: "Bia", diasFora: "" },
      ],
      itens: [],
    },
  };

  it("não perde a casa de quem já estava usando", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaAntiga));
    const voltou = carregarCasa();
    expect(voltou).not.toBeNull();
    expect(voltou.moradores).toHaveLength(2);
    expect(voltou.moradores[0].nome).toBe("Ana");
    expect(voltou.periodo.mes).toBe(8);
  });

  it("separa a taxa que estava dentro do valor da fatura", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaAntiga));
    const luz = carregarCasa().faturas.luz;

    const daLinha = luz.linhas.find((l) => l.comportamento === "consumo");
    expect(daLinha.quantidade).toBe("122");
    expect(luz.consumo).toBeUndefined();
    expect(luz.linhas).toHaveLength(2);

    const consumo = luz.linhas.find((l) => l.comportamento === "consumo");
    const taxa = luz.linhas.find((l) => l.comportamento === "igual");

    expect(Number(consumo.valor)).toBeCloseTo(101.01, 8);
    expect(taxa.nome).toBe("Iluminação pública");
    expect(Number(taxa.valor)).toBeCloseTo(12.73, 8);
  });

  it("fatura sem taxa vira fatura com uma linha só", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaAntiga));
    const agua = carregarCasa().faturas.agua;
    expect(agua.linhas).toHaveLength(1);
    expect(agua.linhas[0].comportamento).toBe("consumo");
    expect(Number(agua.linhas[0].valor)).toBeCloseTo(180, 8);
  });

  it("a casa migrada é aceita pelo motor sem erro", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaAntiga));
    expect(() => calcular(carregarCasa())).not.toThrow();
    const r = calcular(carregarCasa());
    expect(conferir(r)).toBe(true);
  });

  it("salvar de novo grava já na versão nova", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaAntiga));
    salvarCasa(carregarCasa());
    const pacote = JSON.parse(window.localStorage.getItem("cdr:casa"));
    expect(pacote.versao).toBe(4);
    expect(pacote.estado.faturas.luz).toBeDefined();
  });

  it("versão desconhecida continua sendo descartada", () => {
    window.localStorage.setItem(
      "cdr:casa",
      JSON.stringify({ ...casaAntiga, versao: 99 }),
    );
    expect(carregarCasa()).toBeNull();
  });
});

describe("migração da versão 2", () => {
  const casaV2 = {
    versao: 2,
    estado: {
      periodo: { mes: 8, ano: 2026 },
      faturas: {
        luz: {
          unidade: "kwh",
          modo: "preco",
          consumo: "122",
          preco: "0.82822887",
          valor: "",
          taxas: [{ id: "t1", nome: "Iluminação pública", valor: "12.73" }],
        },
        agua: {
          unidade: "m3",
          modo: "valor",
          consumo: "20",
          preco: "",
          valor: "180",
          taxas: [],
        },
      },
      moradores: [{ id: "m0", nome: "Ana", diasFora: "5" }],
      itens: [],
    },
  };

  it("converte o modo preço em linha de consumo", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaV2));
    const luz = carregarCasa().faturas.luz;
    const consumo = luz.linhas.find((l) => l.comportamento === "consumo");
    expect(Number(consumo.valor)).toBeCloseTo(122 * 0.82822887, 6);
  });

  it("preserva as taxas como linhas que dividem igual", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaV2));
    const taxa = carregarCasa().faturas.luz.linhas.find((l) => l.comportamento === "igual");
    expect(taxa.nome).toBe("Iluminação pública");
    expect(Number(taxa.valor)).toBeCloseTo(12.73, 8);
  });

  it("não perde os moradores", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaV2));
    expect(carregarCasa().moradores[0].nome).toBe("Ana");
  });

  it("a casa migrada passa pelo motor e fecha", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaV2));
    expect(conferir(calcular(carregarCasa()))).toBe(true);
  });
});

describe("migração da versão 3", () => {
  const casaV3 = {
    versao: 3,
    estado: {
      periodo: { mes: 8, ano: 2026 },
      faturas: {
        luz: {
          unidade: "kwh",
          ativa: true,
          janela: null,
          consumo: "141",
          linhas: [
            { id: "l1", nome: "Energia elétrica", valor: "168,61", comportamento: "consumo" },
            { id: "l2", nome: "Iluminação pública", valor: "21,65", comportamento: "igual" },
          ],
        },
        agua: { unidade: "m3", ativa: true, janela: null, consumo: "", linhas: [] },
      },
      moradores: [{ id: "m0", nome: "Ana", diasFora: "", ausencias: [] }],
      itens: [],
    },
  };

  it("leva o consumo solto para a primeira linha de consumo", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaV3));
    const luz = carregarCasa().faturas.luz;

    expect(luz.consumo).toBeUndefined();
    expect(luz.linhas[0].quantidade).toBe("141");
    expect(luz.linhas[1].comportamento).toBe("igual");
  });

  it("a tarifa continua a mesma depois de migrar", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaV3));
    const r = calcular(carregarCasa());
    expect(r.tarifaLuz).toBeCloseTo(168.61 / 141, 8);
  });

  it("fatura sem consumo não ganha linha inventada", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaV3));
    expect(carregarCasa().faturas.agua.linhas).toEqual([]);
  });

  it("consumo solto sem linha de consumo vira uma linha", () => {
    const semLinha = {
      versao: 3,
      estado: {
        ...casaV3.estado,
        faturas: {
          luz: { unidade: "kwh", ativa: true, janela: null, consumo: "80", linhas: [] },
          agua: casaV3.estado.faturas.agua,
        },
      },
    };
    window.localStorage.setItem("cdr:casa", JSON.stringify(semLinha));
    const linhas = carregarCasa().faturas.luz.linhas;
    expect(linhas).toHaveLength(1);
    expect(linhas[0].quantidade).toBe("80");
    expect(linhas[0].comportamento).toBe("consumo");
  });

  it("a casa migrada passa pelo motor e fecha", () => {
    window.localStorage.setItem("cdr:casa", JSON.stringify(casaV3));
    expect(conferir(calcular(carregarCasa()))).toBe(true);
  });
});
