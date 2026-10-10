import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
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
    expect(screen.getAllByText(/Contas e Período/i).length).toBeGreaterThan(0);
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
    expect(screen.getAllByText(/Contas e Período/i).length).toBeGreaterThan(0);
  });

  it("a mensagem de coleta é montada sem erro", () => {
    render(<App />);
    irPara("Itens");
    expect(screen.getAllByText(/Fechamento de/).length).toBeGreaterThan(0);
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

describe("as contas seguram os outros passos", () => {
  const digitar = (indice, texto) => {
    const campos = screen.getAllByPlaceholderText("dd/mm/aaaa");
    fireEvent.change(campos[indice], { target: { value: texto } });
  };

  it("com tudo em branco, dá para seguir", () => {
    render(<App />);
    irPara("Moradores");
    expect(screen.getAllByText(/quem mora aqui/i).length).toBeGreaterThan(0);
  });

  it("com meia data escrita, a navegação trava e diz o que falta", () => {
    render(<App />);
    digitar(0, "25/07/2026");

    expect(screen.getByText(/resolva o período das faturas/i)).toBeTruthy();
    expect(screen.getByText(/data final/i)).toBeTruthy();

    irPara("Moradores");
    expect(screen.getAllByText(/Contas e Período/i).length).toBeGreaterThan(0);
  });

  it("completar o ciclo libera a navegação", () => {
    render(<App />);
    digitar(0, "25/07/2026");
    digitar(1, "21/08/2026");

    expect(screen.queryByText(/resolva o período das faturas/i)).toBeNull();
    irPara("Moradores");
    expect(screen.getAllByText(/quem mora aqui/i).length).toBeGreaterThan(0);
  });

  it("apagar a data de volta destrava", () => {
    render(<App />);
    digitar(0, "25/07/2026");
    expect(screen.getByText(/resolva o período das faturas/i)).toBeTruthy();

    digitar(0, "");
    expect(screen.queryByText(/resolva o período das faturas/i)).toBeNull();
  });
});
