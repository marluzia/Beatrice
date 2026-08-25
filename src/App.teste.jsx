// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";


beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

const irPara = (nome) => {
  const alvo = screen
    .getAllByRole("button")
    .find((b) => b.textContent?.trim().endsWith(nome));
  if (!alvo) throw new Error(`Não achei o passo "${nome}"`);
  fireEvent.click(alvo);
};

describe("a aplicação abre", () => {
  it("monta e mostra a marca", () => {
    render(<App />);
    expect(screen.getByText("CDR")).toBeTruthy();
  });

  it("abre no passo das contas", () => {
    render(<App />);
    expect(screen.getAllByText(/^Período$/).length).toBeGreaterThan(0);
  });
});

describe("dá para percorrer os quatro passos", () => {
  it("cada passo renderiza sem estourar", () => {
    render(<App />);

    irPara("Moradores");
    expect(screen.getAllByText(/quem mora aqui/i).length).toBeGreaterThan(0);

    irPara("Itens");
    expect(screen.getAllByText(/o que a casa gasta/i).length).toBeGreaterThan(0);

    irPara("Rateio");
    expect(screen.getAllByText(/quanto cada um paga/i).length).toBeGreaterThan(0);

    irPara("Contas");
    expect(screen.getAllByText(/^Período$/).length).toBeGreaterThan(0);
  });

  it("a mensagem de coleta é montada sem erro", () => {
    render(<App />);
    irPara("Itens");
    expect(screen.getByText(/Fechamento de/)).toBeTruthy();
  });

  it("o rateio mostra a conferência", () => {
    render(<App />);
    irPara("Rateio");
    expect(screen.getAllByText(/conferência/i).length).toBeGreaterThan(0);
  });
});

describe("os painéis de ajuda existem em todos os passos", () => {
  it("cada passo tem pelo menos um", () => {
    const { container } = render(<App />);
    for (const passo of ["Contas", "Moradores", "Itens", "Rateio"]) {
      irPara(passo);
      expect(
        container.querySelectorAll("details.ajuda").length,
        `passo ${passo} ficou sem ajuda`,
      ).toBeGreaterThan(0);
    }
  });
});
