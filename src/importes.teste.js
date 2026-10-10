import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function arquivosJsx(pasta) {
  const achados = [];

  for (const item of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) achados.push(...arquivosJsx(caminho));
    else if (item.name.endsWith(".jsx")) achados.push(caminho);
  }

  return achados;
}

const usados = (codigo) => new Set([...codigo.matchAll(/<([A-Z][\w]*)/g)].map((m) => m[1]));

function disponiveis(codigo) {
  const nomes = new Set();

  for (const m of codigo.matchAll(/import\s+(?:([\w]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from/g)) {
    if (m[1]) nomes.add(m[1]);
    for (const parte of (m[2] ?? "").split(",")) {
      const nome = parte.split(" as ").pop().trim();
      if (nome) nomes.add(nome);
    }
  }

  for (const m of codigo.matchAll(/function\s+([A-Z][\w]*)/g)) nomes.add(m[1]);
  for (const m of codigo.matchAll(/const\s+([A-Z][\w]*)\s*=/g)) nomes.add(m[1]);

  return nomes;
}

describe("componentes usados existem", () => {
  const arquivos = arquivosJsx("src");

  it("encontra a árvore de telas", () => {
    expect(arquivos.length).toBeGreaterThan(10);
  });

  for (const caminho of arquivos) {
    it(`${caminho} importa tudo o que usa`, () => {
      const codigo = readFileSync(caminho, "utf8");
      const tem = disponiveis(codigo);
      const faltando = [...usados(codigo)].filter((nome) => !tem.has(nome));

      expect(faltando, `${caminho} usa <${faltando.join(">, <")}> sem ter o nome`).toEqual([]);
    });
  }
});
