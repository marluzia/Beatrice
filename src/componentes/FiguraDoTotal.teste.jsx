import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import FiguraDoTotal, { verticesDoPoligono } from "./FiguraDoTotal.jsx";

afterEach(cleanup);

const partes = [
  { valor: 30, cor: "var(--agua)" },
  { valor: 70, cor: "var(--ouro)" },
];

describe("a figura do total, uma ponta por pessoa", () => {
  it("uma pessoa é uma pizza, com o Total dentro", () => {
    const { container } = render(<FiguraDoTotal pessoas={1} partes={partes}>Total</FiguraDoTotal>);
    expect(container.querySelector(".figura-total--pizza")).not.toBeNull();
    expect(container.querySelectorAll("path[fill]")).toHaveLength(2);
    expect(container.querySelector(".figura-total__miolo").textContent).toBe("Total");
  });

  it("duas pessoas são um segmento de reta unido por dois pontos", () => {
    const { container } = render(<FiguraDoTotal pessoas={2} partes={partes} />);
    expect(container.querySelector(".figura-total--segmento")).not.toBeNull();
    expect(container.querySelectorAll("line")).toHaveLength(2);
    expect(container.querySelectorAll(".figura-total__ponto")).toHaveLength(2);
  });

  it("de três em diante, um polígono com um vértice por pessoa", () => {
    for (const n of [3, 5, 30]) {
      const { container } = render(<FiguraDoTotal pessoas={n} partes={partes} />);
      expect(container.querySelector(".figura-total--poligono")).not.toBeNull();
      expect(container.querySelectorAll(".figura-total__ponto")).toHaveLength(n);
      cleanup();
    }
  });

  it("o primeiro vértice fica no alto e todos à mesma distância do centro", () => {
    const v = verticesDoPoligono(4, 50, 40);
    expect(v[0][0]).toBeCloseTo(50);
    expect(v[0][1]).toBeCloseTo(10);
    for (const [x, y] of v) expect(Math.hypot(x - 50, y - 50)).toBeCloseTo(40);
  });
});
