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

function* tags(codigo) {
  let i = 0;

  while (i < codigo.length) {
    const c = codigo[i];

    if (c === '"' || c === "'" || c === "`") {
      const aspas = c;
      i += 1;
      while (i < codigo.length && codigo[i] !== aspas) i += codigo[i] === "\\" ? 2 : 1;
      i += 1;
      continue;
    }

    if (codigo.startsWith("//", i)) {
      const fim = codigo.indexOf("\n", i);
      i = fim < 0 ? codigo.length : fim;
      continue;
    }

    if (codigo.startsWith("/*", i)) {
      const fim = codigo.indexOf("*/", i);
      i = fim < 0 ? codigo.length : fim + 2;
      continue;
    }

    if (c === "<" && /[A-Za-z/>]/.test(codigo[i + 1] ?? "")) {
      let j = i + 1;
      let chaves = 0;

      while (j < codigo.length) {
        const d = codigo[j];
        if (d === '"' || d === "'" || d === "`") {
          const aspas = d;
          j += 1;
          while (j < codigo.length && codigo[j] !== aspas) j += codigo[j] === "\\" ? 2 : 1;
        } else if (d === "{") chaves += 1;
        else if (d === "}") chaves -= 1;
        else if (d === ">" && chaves === 0) break;
        j += 1;
      }

      yield { texto: codigo.slice(i, j + 1), linha: codigo.slice(0, i).split("\n").length };
      i = j + 1;
      continue;
    }

    i += 1;
  }
}

function desbalanceadas(codigo) {
  const pilha = [];
  const erros = [];

  for (const { texto, linha } of tags(codigo)) {
    const corpo = texto.slice(1, -1).trim();

    if (corpo.startsWith("/")) {
      const nome = corpo.slice(1).trim() || "<>";
      const aberta = pilha.pop();

      if (!aberta) erros.push(`linha ${linha}: </${nome}> sem abertura`);
      else if (aberta.nome !== nome) {
        erros.push(
          `linha ${linha}: fecha <${nome}>, mas o aberto é <${aberta.nome}> da linha ${aberta.linha}`,
        );
      }
      continue;
    }

    if (corpo.endsWith("/")) continue;

    const nome = /^[A-Za-z][\w.]*/.exec(corpo);
    pilha.push({ nome: nome ? nome[0] : "<>", linha });
  }

  for (const { nome, linha } of pilha) erros.push(`<${nome}> da linha ${linha} nunca fecha`);
  return erros;
}

describe("JSX fecha", () => {
  const arquivos = arquivosJsx("src");

  it("encontra a árvore de telas", () => {
    expect(arquivos.length).toBeGreaterThan(10);
  });

  for (const caminho of arquivos) {
    it(`${caminho} está balanceado`, () => {
      const erros = desbalanceadas(readFileSync(caminho, "utf8"));
      expect(erros, `${caminho}\n  ${erros.join("\n  ")}`).toEqual([]);
    });
  }
});
