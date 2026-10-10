import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CartaoItem from "./CartaoItem.jsx";
import { criarItem, modeloPorChave } from "../nucleo/catalogo.js";

const IDS = ["m0", "m1", "m2"];

const moradores = IDS.map((id, i) => ({
  id,
  nome: `Pessoa ${i + 1}`,
  diasFora: "",
  ausencias: [],
}));

const indicePorId = { m0: 0, m1: 1, m2: 2 };

const faturas = {
  luz: {
    unidade: "kwh",
    ativa: true,
    janela: { de: "2026-05-31", ate: "2026-06-28" },
    linhas: [
      { id: "l1", nome: "Energia", quantidade: "100", valor: "100", comportamento: "consumo" },
    ],
  },
  agua: {
    unidade: "m3",
    ativa: true,
    janela: { de: "2026-05-31", ate: "2026-06-28" },
    linhas: [{ id: "l2", nome: "Água", quantidade: "10", valor: "90", comportamento: "consumo" }],
  },
};

function maquina(eventos = []) {
  return {
    ...criarItem(modeloPorChave("maquina"), ["m0", "m2"]),
    kwhPorUso: "0,44",
    m3PorUso: "0,88",
    rateio: "uso",
    eventos,
  };
}

function montar(eventos) {
  const item = maquina(eventos);
  const mudancas = [];

  render(
    <CartaoItem
      item={item}
      moradores={moradores}
      indicePorId={indicePorId}
      faturas={faturas}
      periodo={{ mes: 6, ano: 2026 }}
      resultado={{ itens: [] }}
      acoes={{
        editarItem: (_id, campo, valor) => mudancas.push([campo, valor]),
        alternarParticipante: () => {},
        removerItem: () => {},
      }}
      abertoPorPadrao
    />,
  );

  return { item, mudancas };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const abrir = () => {
  const ajustar = screen.queryByText(/ajustar/i);
  if (ajustar) fireEvent.click(ajustar);
};

describe("adicionar uso", () => {
  it("o lançamento novo nasce sem ninguém marcado", () => {
    const { mudancas } = montar([]);
    abrir();

    fireEvent.click(screen.getByText(/adicionar uso/i));

    const [campo, valor] = mudancas.at(-1);
    expect(campo).toBe("eventos");
    expect(valor.at(-1).participantes).toEqual([]);
  });

  it("não herda o participante do lançamento anterior", () => {
    const anterior = [
      { id: "e1", data: "2026-06-02", quantidade: "1", participantes: ["m0"] },
    ];
    const { mudancas } = montar(anterior);
    abrir();

    fireEvent.click(screen.getByText(/adicionar uso/i));

    const novos = mudancas.at(-1)[1];
    expect(novos).toHaveLength(2);
    expect(novos[0].participantes).toEqual(["m0"]);
    expect(novos[1].participantes).toEqual([]);
  });

  it("avisa que o lançamento vazio não entra na conta", () => {
    montar([{ id: "e1", data: "2026-06-02", quantidade: "1", participantes: [] }]);
    abrir();

    expect(screen.getByText(/não entra na conta/i)).toBeTruthy();
  });

  it("um lançamento com uma pessoa só não fala em divisão", () => {
    montar([{ id: "e1", data: "2026-06-02", quantidade: "1", participantes: ["m0"] }]);
    abrir();

    expect(screen.queryByText(/Dividido entre \d/)).toBeNull();
  });

  it("dois lançamentos de uma pessoa cada somam dois usos, não 1,5", () => {
    montar([
      { id: "e1", data: "2026-06-02", quantidade: "1", participantes: ["m0"] },
      { id: "e2", data: "2026-06-02", quantidade: "1", participantes: ["m2"] },
    ]);
    abrir();

    expect(screen.getByText(/Total lançado: 2 usos/i)).toBeTruthy();
    expect(screen.queryByText(/Dividido entre \d/)).toBeNull();
  });

  it("a divisão ao meio continua valendo quando é de propósito", () => {
    montar([{ id: "e1", data: "2026-06-02", quantidade: "1", participantes: ["m0", "m2"] }]);
    abrir();

    expect(screen.getByText(/Dividido entre 2:/)).toBeTruthy();
    expect(screen.getByText(/Total lançado: 1 usos/i)).toBeTruthy();
  });
});

describe("desmarcar", () => {
  it("dá para tirar o último participante", () => {
    const { mudancas } = montar([
      { id: "e1", data: "2026-06-02", quantidade: "1", participantes: ["m0"] },
    ]);
    abrir();

    const lancamento = document.querySelector(".evento-uso");
    const pastilha = within(lancamento).getByText("Pessoa 1");
    fireEvent.click(pastilha);

    expect(mudancas.at(-1)[1][0].participantes).toEqual([]);
  });
});
