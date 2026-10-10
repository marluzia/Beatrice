import { novoId } from "./formato.js";
import { criarItem, modeloPorChave } from "./catalogo.js";
import { modoDe, PADRAO } from "./modos.js";

export function novaLinha(nome = "", comportamento = "consumo") {
  return { id: novoId("l"), nome, quantidade: "", valor: "", comportamento };
}

export function faturaVazia(unidade, ativa = true) {
  const linhas =
    unidade === "kwh"
      ? [novaLinha("Energia elétrica", "consumo"), novaLinha("Iluminação pública", "igual")]
      : [novaLinha("Tarifa água", "consumo")];

  return { unidade, ativa, janela: null, linhas };
}

export function novaPessoa() {
  return { id: novoId("m"), nome: "", diasFora: "", ausencias: [], presencas: [] };
}

/**
 * Com o que a tela abre. O modo decide quantas pessoas, quais itens, se as
 * faturas entram e como o uso comum divide; daqui para a frente é estado
 * comum, e o domínio não sabe de que modo ele veio.
 */
export function estadoInicial(chaveDoModo = PADRAO, quantasPessoas) {
  const modo = modoDe(chaveDoModo);

  const quantos = Math.max(
    0,
    Math.min(modo.maximoDeMoradores, quantasPessoas ?? modo.moradores),
  );

  const moradores = Array.from({ length: quantos }, novaPessoa);
  const ids = moradores.map((m) => m.id);
  const hoje = new Date();

  return {
    modo: modo.chave,
    calibragem: modo.calibragem,
    periodo: { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() },
    faturas: {
      luz: faturaVazia("kwh", modo.faturas),
      agua: faturaVazia("m3", modo.faturas),
    },
    moradores,
    itens: modo.itens
      .map((chave) => modeloPorChave(chave))
      .filter(Boolean)
      .map((modelo) => criarItem(modelo, ids)),
  };
}

/**
 * A mesma casa, um mês adiante: mantém quem mora e o que a casa tem, e limpa o
 * que é do mês que passou — valores das faturas, ciclos, dias fora e usos.
 * É o que a maioria dos clientes quer quando diz "quero refazer no mês que vem".
 */
export function proximoMes(estado) {
  const { mes, ano } = estado.periodo;
  const seguinte = mes === 12 ? { mes: 1, ano: ano + 1 } : { mes: mes + 1, ano };

  const limparFatura = (fatura) => ({
    ...fatura,
    janela: null,
    linhas: (fatura.linhas ?? []).map((l) => ({ ...l, quantidade: "", valor: "" })),
  });

  return {
    ...estado,
    periodo: { ...estado.periodo, ...seguinte, dias: undefined },
    faturas: {
      luz: limparFatura(estado.faturas.luz),
      agua: limparFatura(estado.faturas.agua),
    },
    moradores: estado.moradores.map((m) => ({
      ...m,
      diasFora: "",
      ausencias: [],
      presencas: [],
    })),
    itens: estado.itens.map((i) => ({
      ...i,
      quantidade: "",
      horas: "",
      usos: "",
      valor: "",
      usosPorPessoa: {},
      eventos: [],
    })),
  };
}
