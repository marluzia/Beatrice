// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCDR } from "./useCDR.js";
import { modeloPorChave } from "../nucleo/catalogo.js";

/**
 * O gancho guarda o estado da casa. Os testes aqui cobrem as ações que mexem
 * em duas coisas ao mesmo tempo — mexer em morador mexe nos itens — porque é
 * onde mora o risco de alguém ficar de fora do rateio sem ninguém perceber.
 */

const montar = () => renderHook(() => useCDR());

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("moradores", () => {
  it("abre com três moradores e itens de partida", () => {
    const { result } = montar();
    expect(result.current.estado.moradores).toHaveLength(3);
    expect(result.current.estado.itens.length).toBeGreaterThan(0);
  });

  it("quem entra depois passa a participar dos itens que já existiam", () => {
    const { result } = montar();
    act(() => result.current.acoes.ajustarQuantidadeDeMoradores(5));

    const ids = result.current.estado.moradores.map((m) => m.id);
    expect(ids).toHaveLength(5);
    for (const item of result.current.estado.itens) {
      expect(item.participantes.sort()).toEqual([...ids].sort());
    }
  });

  it("quem sai é apagado de todos os itens", () => {
    const { result } = montar();
    const saiu = result.current.estado.moradores[2].id;

    act(() => result.current.acoes.ajustarQuantidadeDeMoradores(2));

    for (const item of result.current.estado.itens) {
      expect(item.participantes).not.toContain(saiu);
    }
  });

  it("não duplica participante ao aumentar e diminuir várias vezes", () => {
    const { result } = montar();
    act(() => result.current.acoes.ajustarQuantidadeDeMoradores(6));
    act(() => result.current.acoes.ajustarQuantidadeDeMoradores(2));
    act(() => result.current.acoes.ajustarQuantidadeDeMoradores(4));

    for (const item of result.current.estado.itens) {
      expect(new Set(item.participantes).size).toBe(item.participantes.length);
    }
  });

  it("respeita o teto e o piso de moradores", () => {
    const { result } = montar();
    act(() => result.current.acoes.ajustarQuantidadeDeMoradores(999));
    expect(result.current.estado.moradores).toHaveLength(20);

    act(() => result.current.acoes.ajustarQuantidadeDeMoradores(-5));
    expect(result.current.estado.moradores).toHaveLength(0);
  });

  it("uma casa vazia não quebra o cálculo", () => {
    const { result } = montar();
    act(() => result.current.acoes.ajustarQuantidadeDeMoradores(0));
    expect(result.current.resultado.moradores).toEqual([]);
    expect(Number.isFinite(result.current.resultado.somaCobrada)).toBe(true);
  });

  it("a cor de cada morador segue a posição na lista", () => {
    const { result } = montar();
    const ids = result.current.estado.moradores.map((m) => m.id);
    expect(result.current.indicePorId[ids[0]]).toBe(0);
    expect(result.current.indicePorId[ids[2]]).toBe(2);
  });
});

describe("itens", () => {
  it("item adicionado já vem com todo mundo marcado", () => {
    const { result } = montar();
    act(() => result.current.acoes.adicionarItem(modeloPorChave("ar")));

    const ids = result.current.estado.moradores.map((m) => m.id);
    const adicionado = result.current.estado.itens.at(-1);
    expect(adicionado.participantes.sort()).toEqual([...ids].sort());
  });

  it("alternar participante tira e devolve", () => {
    const { result } = montar();
    const item = result.current.estado.itens[0];
    const alvo = result.current.estado.moradores[1].id;

    act(() => result.current.acoes.alternarParticipante(item.id, alvo));
    expect(result.current.estado.itens[0].participantes).not.toContain(alvo);

    act(() => result.current.acoes.alternarParticipante(item.id, alvo));
    expect(result.current.estado.itens[0].participantes).toContain(alvo);
  });

  it("remover item não mexe nos outros", () => {
    const { result } = montar();
    const antes = result.current.estado.itens.map((i) => i.id);

    act(() => result.current.acoes.removerItem(antes[1]));

    const depois = result.current.estado.itens.map((i) => i.id);
    expect(depois).toEqual(antes.filter((id) => id !== antes[1]));
  });

  it("editar campo de item mantém os demais campos", () => {
    const { result } = montar();
    const item = result.current.estado.itens[0];

    act(() => result.current.acoes.editarItem(item.id, "nome", "Faxina do prédio"));

    const editado = result.current.estado.itens[0];
    expect(editado.nome).toBe("Faxina do prédio");
    expect(editado.participantes).toEqual(item.participantes);
    expect(editado.rateio).toBe(item.rateio);
  });
});

describe("faturas e período", () => {
  it("as linhas de consumo formam a tarifa", () => {
    const { result } = montar();
    const linha = result.current.estado.faturas.luz.linhas[0];
    act(() => {
      result.current.acoes.definirFatura("luz", "consumo", "122");
      result.current.acoes.editarLinha("luz", linha.id, "valor", "101,01");
    });
    expect(result.current.resultado.tarifaLuz).toBeCloseTo(101.01 / 122, 8);
  });

  it("linha que divide igual não entra na tarifa", () => {
    const { result } = montar();
    const [consumo, taxa] = result.current.estado.faturas.luz.linhas;
    act(() => {
      result.current.acoes.definirFatura("luz", "consumo", "122");
      result.current.acoes.editarLinha("luz", consumo.id, "valor", "101,01");
      result.current.acoes.editarLinha("luz", taxa.id, "valor", "12,73");
    });
    // A tarifa continua sendo só a linha de consumo.
    expect(result.current.resultado.tarifaLuz).toBeCloseTo(101.01 / 122, 8);
    const item = result.current.resultado.itens.find((i) => i.nome === "Iluminação pública");
    expect(item?.custoTotal).toBeCloseTo(12.73, 8);
  });

  it("trocar o comportamento de uma linha muda a tarifa", () => {
    const { result } = montar();
    const [consumo, taxa] = result.current.estado.faturas.luz.linhas;
    act(() => {
      result.current.acoes.definirFatura("luz", "consumo", "100");
      result.current.acoes.editarLinha("luz", consumo.id, "valor", "100");
      result.current.acoes.editarLinha("luz", taxa.id, "valor", "50");
    });
    expect(result.current.resultado.tarifaLuz).toBeCloseTo(1, 8);

    act(() => result.current.acoes.editarLinha("luz", taxa.id, "comportamento", "consumo"));
    expect(result.current.resultado.tarifaLuz).toBeCloseTo(1.5, 8);
  });

  it("dias entre leituras em branco volta a valer o tamanho do mês", () => {
    const { result } = montar();
    act(() => {
      result.current.acoes.definirPeriodo("ano", "2026");
      result.current.acoes.definirPeriodo("mes", "4");
      result.current.acoes.definirPeriodo("dias", "35");
    });
    expect(result.current.resultado.diasNoPeriodo).toBe(35);

    act(() => result.current.acoes.definirPeriodo("dias", ""));
    expect(result.current.resultado.diasNoPeriodo).toBe(30);
  });
});

describe("linhas da fatura", () => {
  it("a luz abre com energia e iluminação pública", () => {
    const { result } = montar();
    const linhas = result.current.estado.faturas.luz.linhas;
    expect(linhas.map((l) => l.nome)).toEqual(["Energia elétrica", "Iluminação pública"]);
    expect(linhas.map((l) => l.comportamento)).toEqual(["consumo", "igual"]);
  });

  it("adiciona linha com nome e comportamento sugeridos", () => {
    const { result } = montar();
    act(() => result.current.acoes.adicionarLinha("agua", "Tratamento esgoto", "consumo"));
    const nova = result.current.estado.faturas.agua.linhas.at(-1);
    expect(nova.nome).toBe("Tratamento esgoto");
    expect(nova.comportamento).toBe("consumo");
  });

  it("cada linha tem id próprio e some sozinha", () => {
    const { result } = montar();
    const [primeira, segunda] = result.current.estado.faturas.luz.linhas;
    expect(primeira.id).not.toBe(segunda.id);

    act(() => result.current.acoes.removerLinha("luz", primeira.id));
    const restantes = result.current.estado.faturas.luz.linhas;
    expect(restantes).toHaveLength(1);
    expect(restantes[0].id).toBe(segunda.id);
  });

  it("linha da luz não vaza para a água", () => {
    const { result } = montar();
    const antes = result.current.estado.faturas.agua.linhas.length;
    act(() => result.current.acoes.adicionarLinha("luz", "Custo de disponibilidade", "igual"));
    expect(result.current.estado.faturas.agua.linhas).toHaveLength(antes);
  });

  it("crédito negativo abate em vez de sumir", () => {
    const { result } = montar();
    const [consumo] = result.current.estado.faturas.luz.linhas;
    act(() => {
      result.current.acoes.definirFatura("luz", "consumo", "100");
      result.current.acoes.editarLinha("luz", consumo.id, "valor", "100");
      result.current.acoes.adicionarLinha("luz", "Crédito de energia", "consumo");
    });
    const credito = result.current.estado.faturas.luz.linhas.at(-1);
    act(() => result.current.acoes.editarLinha("luz", credito.id, "valor", "-30"));

    expect(result.current.resultado.tarifaLuz).toBeCloseTo(0.7, 8);
  });
});

describe("persistência", () => {
  it("recupera a casa salva ao montar de novo", () => {
    const primeira = montar();
    act(() => primeira.result.current.acoes.ajustarQuantidadeDeMoradores(5));
    act(() => primeira.result.current.acoes.editarMorador(
      primeira.result.current.estado.moradores[0].id, "nome", "Marluzia",
    ));

    // o salvamento é adiado meio segundo para não escrever a cada tecla
    act(() => vi.advanceTimersByTime(600));

    const segunda = montar();
    expect(segunda.result.current.estado.moradores).toHaveLength(5);
    expect(segunda.result.current.estado.moradores[0].nome).toBe("Marluzia");
  });

  it("não escreve antes de a digitação parar", () => {
    const primeira = montar();
    act(() => primeira.result.current.acoes.ajustarQuantidadeDeMoradores(7));
    act(() => vi.advanceTimersByTime(100));

    const segunda = montar();
    expect(segunda.result.current.estado.moradores).toHaveLength(3);
  });

  it("recomeçar apaga o que estava salvo", () => {
    const primeira = montar();
    act(() => primeira.result.current.acoes.ajustarQuantidadeDeMoradores(6));
    act(() => vi.advanceTimersByTime(600));
    act(() => primeira.result.current.acoes.recomecar());
    act(() => vi.advanceTimersByTime(600));

    const segunda = montar();
    expect(segunda.result.current.estado.moradores).toHaveLength(3);
  });
});
