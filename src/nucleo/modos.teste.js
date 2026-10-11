import { describe, expect, it } from "vitest";
import { MODOS, modoDe, passosDe, polaridadeDe } from "./modos.js";
import { estadoInicial, proximoMes } from "./estadoInicial.js";

describe("modos", () => {
  it("cada modo sabe como perguntar a presença", () => {
    expect(polaridadeDe("moradia")).toBe("ausencia");
    expect(polaridadeDe("temporada")).toBe("presenca");
    expect(polaridadeDe("familia")).toBe("ausencia");
    expect(polaridadeDe("evento")).toBe("nenhuma");
  });

  it("modo desconhecido cai no padrão em vez de quebrar", () => {
    // Uma casa salva antes dos modos existirem não tem chave nenhuma.
    expect(modoDe(undefined).chave).toBe("moradia");
    expect(modoDe("inventado").chave).toBe("moradia");
  });

  it("todo modo tem um tipo curto para o painel agrupar", () => {
    for (const modo of Object.values(MODOS)) {
      expect(modo.tipo, modo.chave).toBeTruthy();
    }
  });

  it("os três modos cíclicos têm calendário; o evento também", () => {
    for (const chave of ["moradia", "temporada", "familia", "evento"]) {
      expect(passosDe(chave).map((p) => p.chave), chave).toContain("calendario");
    }
  });

  it("evento não tem passo de contas", () => {
    const passos = passosDe("evento").map((p) => p.chave);
    expect(passos).not.toContain("contas");
    expect(passos).toEqual(["moradores", "itens", "calendario", "rateio"]);
  });

  it("os passos falam a língua do modo", () => {
    expect(passosDe("temporada")[1].titulo).toBe("Cotistas");
    expect(passosDe("moradia")[1].titulo).toBe("Moradores");
    expect(passosDe("evento")[0].titulo).toBe("Participantes");
  });

  it("todo modo tem o vocabulário completo", () => {
    const precisa = ["pessoa", "pessoas", "Pessoas", "conjunto", "oConjunto", "quemMora", "semPessoas"];
    for (const modo of Object.values(MODOS)) {
      for (const palavra of precisa) {
        expect(modo.palavras[palavra], `${modo.chave}.${palavra}`).toBeTruthy();
      }
    }
  });
});

describe("estado inicial por modo", () => {
  it.each(Object.keys(MODOS))("%s abre do jeito que o modo manda", (chave) => {
    const modo = MODOS[chave];
    const estado = estadoInicial(chave);

    expect(estado.modo).toBe(chave);
    expect(estado.moradores).toHaveLength(modo.moradores);
    expect(estado.itens).toHaveLength(modo.itens.length);
    expect(estado.calibragem).toBe(modo.calibragem);
    expect(estado.faturas.luz.ativa).toBe(modo.faturas);
    expect(estado.faturas.agua.ativa).toBe(modo.faturas);
  });

  it("todo item de partida entra com todo mundo participando", () => {
    const estado = estadoInicial("moradia");
    const ids = estado.moradores.map((m) => m.id);
    for (const item of estado.itens) {
      expect([...item.participantes].sort()).toEqual([...ids].sort());
    }
  });

  it("o teto de pessoas do modo vale", () => {
    expect(estadoInicial("familia", 40).moradores).toHaveLength(MODOS.familia.maximoDeMoradores);
    expect(estadoInicial("moradia", -3).moradores).toHaveLength(0);
  });

  it("evento abre sem fatura, então não trava o fechamento", () => {
    const estado = estadoInicial("evento");
    expect(estado.faturas.luz.ativa).toBe(false);
    expect(estado.faturas.agua.ativa).toBe(false);
  });
});

describe("próximo mês", () => {
  const casaPreenchida = () => {
    const estado = estadoInicial("moradia", 2);
    estado.periodo = { mes: 9, ano: 2026 };
    estado.moradores[0].nome = "Ana";
    estado.moradores[0].ausencias = ["2026-09-10", "2026-09-11"];
    estado.faturas.luz.janela = { de: "2026-09-01", ate: "2026-10-01" };
    estado.faturas.luz.linhas[0].valor = "300";
    estado.faturas.luz.linhas[0].quantidade = "180";
    estado.itens[0].valor = "120";
    estado.itens[0].eventos = [{ id: "e1", data: "2026-09-05", quantidade: "1", participantes: [] }];
    return estado;
  };

  it("mantém quem mora e o que a casa tem", () => {
    const seguinte = proximoMes(casaPreenchida());
    expect(seguinte.moradores[0].nome).toBe("Ana");
    expect(seguinte.itens).toHaveLength(casaPreenchida().itens.length);
    expect(seguinte.modo).toBe("moradia");
  });

  it("limpa tudo o que é do mês que passou", () => {
    const seguinte = proximoMes(casaPreenchida());
    expect(seguinte.moradores[0].ausencias).toEqual([]);
    expect(seguinte.faturas.luz.janela).toBeNull();
    expect(seguinte.faturas.luz.linhas[0].valor).toBe("");
    expect(seguinte.faturas.luz.linhas[0].quantidade).toBe("");
    expect(seguinte.itens[0].valor).toBe("");
    expect(seguinte.itens[0].eventos).toEqual([]);
  });

  it("vira o mês, e dezembro vira janeiro do ano seguinte", () => {
    expect(proximoMes(casaPreenchida()).periodo).toMatchObject({ mes: 10, ano: 2026 });

    const dezembro = casaPreenchida();
    dezembro.periodo = { mes: 12, ano: 2026 };
    expect(proximoMes(dezembro).periodo).toMatchObject({ mes: 1, ano: 2027 });
  });

  it("não mexe na casa original", () => {
    const original = casaPreenchida();
    proximoMes(original);
    expect(original.faturas.luz.linhas[0].valor).toBe("300");
    expect(original.moradores[0].ausencias).toHaveLength(2);
  });
});
