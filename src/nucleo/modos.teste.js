import { describe, expect, it } from "vitest";
import { cicloPorId } from "./ciclos.js";
import { MODOS, modoDe, modoDoConjunto, passosDe, polaridadeDe, PRESETS_DA_REPUBLICA } from "./modos.js";
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

  it("os três modos cíclicos têm calendário; o evento, só quando é longo", () => {
    for (const chave of ["moradia", "temporada", "familia"]) {
      expect(passosDe(chave).map((p) => p.chave), chave).toContain("calendario");
    }
    expect(passosDe("evento").map((p) => p.chave)).not.toContain("calendario");
    const longo = modoDoConjunto({ modo: "evento", eventoLongo: true });
    expect(passosDe(longo).map((p) => p.chave)).toContain("calendario");
  });

  it("o evento longo conta os dias marcados de cada pessoa", () => {
    expect(modoDoConjunto({ modo: "evento" }).presenca).toBe("nenhuma");
    expect(modoDoConjunto({ modo: "evento", eventoLongo: true }).presenca).toBe("presenca");
    // Fora do evento o interruptor não faz nada.
    expect(modoDoConjunto({ modo: "moradia", eventoLongo: true }).presenca).toBe("ausencia");
  });

  it("evento não tem passo de contas", () => {
    const passos = passosDe("evento").map((p) => p.chave);
    expect(passos).not.toContain("contas");
    expect(passos).toEqual(["moradores", "itens", "rateio"]);
  });

  it("os passos falam a língua do modo", () => {
    // Moradores, cotistas e participantes são todos "pessoas" na tela.
    expect(passosDe("temporada")[1].titulo).toBe("Pessoas");
    expect(passosDe("moradia")[1].titulo).toBe("Pessoas");
    expect(passosDe("evento")[0].titulo).toBe("Pessoas");
    expect(passosDe("evento").map((p) => p.titulo)).toEqual(["Pessoas", "Despesas", "Rateio"]);
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
    // Num modo com presets (a República), quem decide a régua de partida é o
    // preset padrão; nos outros, o próprio modo.
    const partida = modo.presets
      ? PRESETS_DA_REPUBLICA[modo.presetPadrao].calibragem
      : modo.calibragem;
    expect(estado.calibragem).toBe(partida);
    // As contas nascem desligadas em todo modo: o grupo liga as que tem.
    expect(cicloPorId(estado, "luz").ativa).toBe(false);
    expect(cicloPorId(estado, "agua").ativa).toBe(false);
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
    expect(cicloPorId(estado, "luz").ativa).toBe(false);
    expect(cicloPorId(estado, "agua").ativa).toBe(false);
  });
});

describe("próximo mês", () => {
  const casaPreenchida = () => {
    const estado = estadoInicial("moradia", 2);
    estado.periodo = { mes: 9, ano: 2026 };
    estado.moradores[0].nome = "Ana";
    estado.moradores[0].ausencias = ["2026-09-10", "2026-09-11"];
    cicloPorId(estado, "luz").janela = { de: "2026-09-01", ate: "2026-10-01" };
    cicloPorId(estado, "luz").linhas[0].valor = "300";
    cicloPorId(estado, "luz").linhas[0].quantidade = "180";
    estado.itens[0].valor = "120";
    estado.itens[0].registrosDeUso = [{ id: "e1", data: "2026-09-05", quantidade: "1", participantes: [] }];
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
    expect(cicloPorId(seguinte, "luz").janela).toBeNull();
    expect(cicloPorId(seguinte, "luz").linhas[0].valor).toBe("");
    expect(cicloPorId(seguinte, "luz").linhas[0].quantidade).toBe("");
    expect(seguinte.itens[0].valor).toBe("");
    expect(seguinte.itens[0].registrosDeUso).toEqual([]);
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
    expect(cicloPorId(original, "luz").linhas[0].valor).toBe("300");
    expect(original.moradores[0].ausencias).toHaveLength(2);
  });
});
