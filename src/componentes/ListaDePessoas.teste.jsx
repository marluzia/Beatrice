import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import ListaDePessoas from "./ListaDePessoas.jsx";

afterEach(cleanup);

const pessoas = [
  { id: "a", nome: "Ana" },
  { id: "b", nome: "Bia" },
  { id: "c", nome: "Caio" },
];

function Com({ uma = false, inicio = [] }) {
  const [sel, setSel] = useState(inicio);
  return (
    <>
      <ListaDePessoas pessoas={pessoas} selecionados={sel} aoMudar={setSel} uma={uma} rotulo="Quem divide" />
      <output>{sel.join(",")}</output>
    </>
  );
}
const marcados = () => document.querySelector("output").textContent;

describe("a lista de quem divide", () => {
  it("abre ao tocar; Selecionar todos liga todo mundo e, desligado em seguida, ninguém", () => {
    render(<Com inicio={["a"]} />);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Quem divide/ }));
    const todos = screen.getByRole("option", { name: /Selecionar todos/ });
    fireEvent.click(todos);
    expect(marcados()).toBe("a,b,c");
    expect(screen.getByRole("option", { name: /Selecionar todos/ }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("option", { name: /Selecionar todos/ }));
    expect(marcados()).toBe("");
  });

  it("cada pessoa marca e desmarca, e a lista fica aberta", () => {
    render(<Com />);
    fireEvent.click(screen.getByRole("button", { name: /^Quem divide/ }));
    fireEvent.click(screen.getByRole("option", { name: /Bia/ }));
    fireEvent.click(screen.getByRole("option", { name: /Caio/ }));
    expect(marcados()).toBe("b,c");
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Quem divide/ }).textContent).toContain("Bia, Caio");
  });

  it("numa escolha só (quem pagou), escolher fecha a lista; Ninguém desmarca", () => {
    render(<Com uma inicio={["a"]} />);
    fireEvent.click(screen.getByRole("button", { name: /^Quem divide/ }));
    fireEvent.click(screen.getByRole("option", { name: /Caio/ }));
    expect(marcados()).toBe("c");
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Quem divide/ }));
    fireEvent.click(screen.getByRole("option", { name: /Ninguém/ }));
    expect(marcados()).toBe("");
  });
});

describe("achar a pessoa pelo nome", () => {
  it("escrever filtra a lista (sem ligar para acento), e as pessoas rolam numa janela", () => {
    render(<Com />);
    fireEvent.click(screen.getByRole("button", { name: /^Quem divide/ }));
    expect(document.querySelector(".lista-de-pessoas__rolo")).not.toBeNull();
    const campo = screen.getByRole("searchbox", { name: /Buscar pessoa/ });
    fireEvent.change(campo, { target: { value: "cAÍ" } });
    const nomes = () => [...document.querySelectorAll(".lista-de-pessoas__rolo .lista-de-pessoas__nome")].map((el) => el.textContent);
    expect(nomes()).toEqual(["Caio"]);
    fireEvent.click(screen.getByRole("option", { name: /Caio/ }));
    expect(marcados()).toBe("c");
    fireEvent.change(campo, { target: { value: "zé" } });
    expect(screen.getByText("Ninguém com esse nome.")).toBeTruthy();
  });
});

describe("a ordem da calculadora", () => {
  it("presença vem depois de ajuste, e o resto segue igual, cotas, percentual, valor, ajuste, dias, horas, uso", async () => {
    const { naOrdemDaCalculadora } = await import("./TecladoDeDivisao.jsx");
    expect(naOrdemDaCalculadora(["uso", "dias", "presenca", "igual", "valor", "porcentagem", "ajuste", "horas", "cotas"])).toEqual([
      "igual",
      "cotas",
      "porcentagem",
      "valor",
      "ajuste",
      "presenca",
      "dias",
      "horas",
      "uso",
    ]);
  });
});
