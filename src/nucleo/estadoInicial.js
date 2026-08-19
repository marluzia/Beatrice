import { novoId } from "./formato.js";
import { criarItem, modeloPorChave } from "./catalogo.js";

/** Itens que quase toda república tem, para a tela não abrir vazia. */
const ITENS_DE_PARTIDA = ["faxina", "geladeira", "maquina", "gas", "internet"];

export function estadoInicial(quantosMoradores = 3) {
  const moradores = Array.from({ length: quantosMoradores }, () => ({
    id: novoId("m"),
    nome: "",
    diasFora: "",
  }));
  const ids = moradores.map((m) => m.id);
  const hoje = new Date();

  return {
    periodo: { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() },
    faturas: { luzKwh: "", luzValor: "", aguaM3: "", aguaValor: "" },
    moradores,
    itens: ITENS_DE_PARTIDA.map((chave) => criarItem(modeloPorChave(chave), ids)),
  };
}
