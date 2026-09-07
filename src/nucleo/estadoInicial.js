import { novoId } from "./formato.js";
import { criarItem, modeloPorChave } from "./catalogo.js";

const ITENS_DE_PARTIDA = ["faxina", "geladeira", "maquina", "gas", "internet"];

export function novaLinha(nome = "", comportamento = "consumo") {
  return { id: novoId("l"), nome, quantidade: "", valor: "", comportamento };
}

export function faturaVazia(unidade) {
  const linhas =
    unidade === "kwh"
      ? [novaLinha("Energia elétrica", "consumo"), novaLinha("Iluminação pública", "igual")]
      : [novaLinha("Tarifa água", "consumo")];

  return { unidade, ativa: true, janela: null, linhas };
}

export function estadoInicial(quantosMoradores = 3) {
  const moradores = Array.from({ length: quantosMoradores }, () => ({
    id: novoId("m"),
    nome: "",
    diasFora: "",
    ausencias: [],
  }));
  const ids = moradores.map((m) => m.id);
  const hoje = new Date();

  return {
    calibragem: 0,
    periodo: { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() },
    faturas: {
      luz: faturaVazia("kwh"),
      agua: faturaVazia("m3"),
    },
    moradores,
    itens: ITENS_DE_PARTIDA.map((chave) => criarItem(modeloPorChave(chave), ids)),
  };
}
