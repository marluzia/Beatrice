import { novoId } from "./formato.js";
import { criarItem, modeloPorChave } from "./catalogo.js";

// Itens que quase toda república tem, para a tela não abrir vazia. 
const ITENS_DE_PARTIDA = ["faxina", "geladeira", "maquina", "gas", "internet"];

export function novaLinha(nome = "", comportamento = "consumo") {
  return { id: novoId("l"), nome, valor: "", comportamento };
}

export function faturaVazia(unidade) {
  const linhas =
    unidade === "kwh"
      ? [novaLinha("Energia elétrica", "consumo"), novaLinha("Iluminação pública", "igual")]
      : [novaLinha("Tarifa água", "consumo")];

  return { unidade, consumo: "", linhas };
}

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
    faturas: {
      luz: faturaVazia("kwh"),
      agua: faturaVazia("m3"),
    },
    moradores,
    itens: ITENS_DE_PARTIDA.map((chave) => criarItem(modeloPorChave(chave), ids)),
  };
}
