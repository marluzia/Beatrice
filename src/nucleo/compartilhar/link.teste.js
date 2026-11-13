import { describe, expect, it } from "vitest";
import { compactar, dadosDoLink, descompactar, lerLink, linkDoConjunto } from "./link.js";
import { criarItem, modeloPorChave } from "../catalogo.js";
import { estadoDeCriacao } from "../estadoInicial.js";
import { sanear } from "../persistencia.js";
import { matrizDoQR } from "./qr.js";

describe("o link de um conjunto", () => {
  it("compacta e descompacta sem perder nada", async () => {
    const texto = JSON.stringify({ nome: "República Girassol · água 💧", lista: Array.from({ length: 200 }, (_, i) => i) });
    const dados = await compactar(texto);
    expect(dados.startsWith("z")).toBe(true);
    expect(dados).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await descompactar(dados)).toBe(texto);
  });

  it("leva o conjunto sem o 'quem é você' de quem compartilhou", async () => {
    const exportado = JSON.stringify({ ceder: "conjunto", nome: "Casa", estado: { voce: "m1", moradores: [{ id: "m1" }] } }, null, 2);
    const link = await linkDoConjunto(exportado, "https://ceder.app/");
    expect(link.startsWith("https://ceder.app/#conjunto=")).toBe(true);
    const volta = JSON.parse(await lerLink(dadosDoLink(link)));
    expect(volta.nome).toBe("Casa");
    expect(volta.estado.voce).toBeNull();
    expect(volta.estado.moradores).toHaveLength(1);
  });

  it("um endereço sem conjunto não tem dados", () => {
    expect(dadosDoLink("https://ceder.app/")).toBeNull();
    expect(dadosDoLink("#conjunto=zabc")).toBe("zabc");
  });

  it("o QR Code cresce com o texto e recusa o que não cabe", () => {
    const qr = (n) => matrizDoQR(new TextEncoder().encode("a".repeat(n)));
    expect(qr(10)).toHaveLength(21);
    expect(qr(100).length).toBeGreaterThan(21);
    expect(qr(3000)).toBeNull();
  });
});

describe("o link leva cada item só com o que difere do catálogo", () => {
  it("e quem abre recebe o conjunto igualzinho", async () => {
    for (const modo of ["evento", "temporada", "familia", "moradia", "multipro"]) {
      const estado = estadoDeCriacao({ modo, voce: "Ana", convidados: ["Bruno"] });
      const ids = estado.moradores.map((m) => m.id);
      estado.itens.push({ ...criarItem(modeloPorChave("outra"), ids), nome: "Mercado", valor: "92.50", pagoPor: ids[1], cotas: { [ids[0]]: "2" } });
      estado.itens.push({ ...criarItem({ chave: null, nome: "Sem modelo", especie: "reais", rateio: "ajuste" }, ids), valor: "40" });
      estado.voce = null;
      const exportado = JSON.stringify({ ceder: "conjunto", versao: 12, nome: "X", estado });
      const link = await linkDoConjunto(exportado, "https://ceder.app/");
      const bruto = JSON.parse(await descompactar(dadosDoLink(link)));
      // O pacote do link é mais magro: a dica do catálogo não viaja.
      expect(bruto.estado.itens.every((i) => !("dica" in i))).toBe(true);
      const volta = JSON.parse(await lerLink(dadosDoLink(link)));
      expect(sanear(volta.estado)).toEqual(sanear(estado));
    }
  });
});
