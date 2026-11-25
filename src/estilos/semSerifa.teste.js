import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// O app não usa fonte serifada: nem nos estilos, nem na fonte carregada.
describe("sem fontes serifadas", () => {
  it("nenhum estilo pede serifa", () => {
    for (const nome of readdirSync("src/estilos").filter((n) => n.endsWith(".css"))) {
      const css = readFileSync(join("src/estilos", nome), "utf8");
      const familias = [...css.matchAll(/font-family:\s*([^;]+);/g)].map((m) => m[1]);
      for (const f of familias) expect(/(^|[\s,"])serif\b|--serifa|Georgia|Newsreader|Lora/.test(f), `${nome}: ${f}`).toBe(false);
      expect(css.includes("--serifa"), nome).toBe(false);
    }
  });

  it("o index.html não carrega fonte serifada", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html.includes("Newsreader")).toBe(false);
  });
});
