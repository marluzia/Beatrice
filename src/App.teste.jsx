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

/** Abre o programa (no painel) e cria uma república, já dentro dela. */
const abrirRepublica = () => {
  const montado = render(<App />);
  fireEvent.click(screen.getByText("Criar conjunto"));
  fireEvent.click(screen.getByText(/^Criar república$/i));
  return montado;
};

/** Liga a luz e abre a edição dela, onde ficam as datas de leitura. */
const editarLuz = () => {
  fireEvent.click(screen.getByRole("button", { name: /Luz$/ }));
  fireEvent.click(screen.getByText("editar"));
};

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
    expect(screen.getByText("CEDER")).toBeTruthy();
  });

  it("abre no painel de conjuntos", () => {
    render(<App />);
    expect(screen.getAllByText(/Meus conjuntos/i).length).toBeGreaterThan(0);
  });

  it("um conjunto novo abre no passo das contas, com as faturas desligadas", () => {
    abrirRepublica();
    expect(screen.getAllByText(/^Faturas/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/\+ Gás ou outras/)).toBeTruthy();
  });
});

describe("dá para percorrer os quatro passos", () => {
  it("cada passo renderiza sem estourar", () => {
    abrirRepublica();

    irPara("Pessoas");
    expect(screen.getAllByText(/quem mora aqui/i).length).toBeGreaterThan(0);

    irPara("Itens");
    expect(screen.getAllByText(/o que o conjunto gasta/i).length).toBeGreaterThan(0);

    irPara("Rateio");
    expect(screen.getAllByText(/quanto cada um deve/i).length).toBeGreaterThan(0);
    irPara("Acerto");
    expect(screen.getAllByText(/quanto cada um paga/i).length).toBeGreaterThan(0);

    irPara("Contas");
    expect(screen.getAllByText(/^Faturas/i).length).toBeGreaterThan(0);
  });

  it("a mensagem de coleta é montada sem erro", () => {
    abrirRepublica();
    irPara("Itens");
    irPara("Juntar os dados");
    expect(screen.getAllByText(/Fechamento de/).length).toBeGreaterThan(0);
  });

  it("o rateio mostra a conferência", () => {
    abrirRepublica();
    irPara("Rateio");
    irPara("Conferência");
    expect(screen.getAllByText(/conferência/i).length).toBeGreaterThan(0);
  });
});

describe("cada etapa mostra uma macrosseção por vez", () => {
  const continuar = () => fireEvent.click(screen.getByText("Continuar"));

  it("nas contas, Continuar vai das faturas para o período e depois para as pessoas", () => {
    abrirRepublica();
    expect(screen.getAllByText(/^Faturas cíclicas/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Período de corte")).toBeNull();

    continuar();
    expect(screen.getByText("Período de corte")).toBeTruthy();
    expect(screen.queryByText(/\+ Gás ou outras/)).toBeNull();

    continuar();
    expect(screen.getAllByText(/quem mora aqui/i).length).toBeGreaterThan(0);
  });

  it("Voltar de uma etapa cai na última seção da anterior", () => {
    abrirRepublica();
    irPara("Pessoas");
    fireEvent.click(screen.getByText("Voltar"));
    expect(screen.getByText("Período de corte")).toBeTruthy();
  });

  it("nos itens, o que sai da fatura e o que não sai ficam um de cada vez", () => {
    abrirRepublica();
    irPara("Itens");
    expect(screen.getAllByText("Sai do ciclo de faturas").length).toBeGreaterThan(0);
    expect(screen.queryByText("Independente do ciclo de faturas")).toBeNull();

    continuar();
    expect(screen.getAllByText("Independente do ciclo de faturas").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sai do ciclo de faturas")).toBeNull();
  });
});

describe("os painéis de ajuda existem em todos os passos", () => {
  it("cada passo tem pelo menos um", () => {
    const { container } = abrirRepublica();
    for (const passo of ["Contas", "Pessoas", "Itens", "Rateio"]) {
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
    abrirRepublica();
    irPara("Pessoas");
    expect(screen.getAllByText(/quem mora aqui/i).length).toBeGreaterThan(0);
  });

  it("com meia data escrita, a navegação trava e diz o que falta", () => {
    abrirRepublica();
    editarLuz();
    digitar(0, "25/07/2026");

    expect(screen.getByText(/resolva o período das faturas/i)).toBeTruthy();
    expect(screen.getByText(/data final/i)).toBeTruthy();

    irPara("Pessoas");
    expect(screen.getAllByText(/^Faturas/i).length).toBeGreaterThan(0);
  });

  it("completar o ciclo libera a navegação", () => {
    abrirRepublica();
    editarLuz();
    digitar(0, "25/07/2026");
    digitar(1, "21/08/2026");

    expect(screen.queryByText(/resolva o período das faturas/i)).toBeNull();
    irPara("Pessoas");
    expect(screen.getAllByText(/quem mora aqui/i).length).toBeGreaterThan(0);
  });

  it("apagar a data de volta destrava", () => {
    abrirRepublica();
    editarLuz();
    digitar(0, "25/07/2026");
    expect(screen.getByText(/resolva o período das faturas/i)).toBeTruthy();

    digitar(0, "");
    expect(screen.queryByText(/resolva o período das faturas/i)).toBeNull();
  });
});
