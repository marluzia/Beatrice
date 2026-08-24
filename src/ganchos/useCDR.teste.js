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
  it("digitar a fatura recalcula a tarifa", () => {
    const { result } = montar();
    act(() => {
      result.current.acoes.definirFatura("luzKwh", "400");
      result.current.acoes.definirFatura("luzValor", "360");
    });
    expect(result.current.resultado.tarifaLuz).toBeCloseTo(0.9, 10);
  });

  it("trocar o mês muda os dias do período", () => {
    const { result } = montar();
    act(() => {
      result.current.acoes.definirPeriodo("ano", "2024");
      result.current.acoes.definirPeriodo("mes", "2");
    });
    expect(result.current.resultado.diasNoPeriodo).toBe(29);

    act(() => result.current.acoes.definirPeriodo("ano", "2025"));
    expect(result.current.resultado.diasNoPeriodo).toBe(28);
  });

  it("mês inválido é ignorado em vez de zerar o período", () => {
    const { result } = montar();
    const antes = result.current.estado.periodo.mes;
    act(() => result.current.acoes.definirPeriodo("mes", "abc"));
    expect(result.current.estado.periodo.mes).toBe(antes);
  });

  it("recomeçar volta ao estado inicial", () => {
    const { result } = montar();
    act(() => result.current.acoes.ajustarQuantidadeDeMoradores(8));
    act(() => result.current.acoes.recomecar());
    expect(result.current.estado.moradores).toHaveLength(3);
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
