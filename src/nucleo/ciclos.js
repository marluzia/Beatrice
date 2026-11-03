// Ciclos: as contas que o conjunto recebe, cada uma com o seu intervalo.
//
// Um ciclo é uma fatura que chega de tempos em tempos: luz, água, gás,
// aluguel, condomínio, internet. Todo conjunto com faturas nasce com luz e
// água, que podem ser desligadas, e pode criar outros até o limite de oito.
//
// O que muda entre um ciclo e outro é só o RECURSO:
//
//   kwh   energia, medida na fatura em kWh
//   m3    água ou gás encanado, em m³
//   null  só dinheiro: aluguel, condomínio, internet
//
// Num ciclo medido, as linhas "acompanha o consumo" dão a tarifa, e o que
// nenhum item explica vira uso comum. Num ciclo só monetário não há tarifa:
// as mesmas linhas viram uso comum inteiro, dividido pela régua, e as linhas
// "divide igual" continuam por igual. O motor é o mesmo para todos.
//
// Os ids "luz" e "agua" são reservados para os dois de fábrica. Isso não dá a
// eles nenhum poder especial no cálculo: serve para conjuntos antigos e
// arquivos exportados continuarem apontando para o ciclo certo.

import { novoId } from "./formato.js";

export const MAXIMO_DE_CICLOS = 8;

/**
 * Como se divide uma conta só de valor: por igual, por dias, por porcentagem,
 * ou pela régua do uso comum (o jeito da v10, que contas antigas mantêm).
 */
export const REGRAS_DO_CICLO = ["igual", "dias", "porcentagem", "comum"];

export const RECURSOS = {
  kwh: { chave: "kwh", unidade: "kWh", nome: "energia, em kWh" },
  m3: { chave: "m3", unidade: "m³", nome: "volume, em m³" },
};

/** A unidade que a tela escreve: "kWh", "m³", ou nada num ciclo só monetário. */
export const unidadeDoRecurso = (recurso) => RECURSOS[recurso]?.unidade ?? "";

/** O ciclo mede alguma grandeza física? */
export const ehMedido = (ciclo) => Boolean(RECURSOS[ciclo?.recurso]);

export function novaLinha(nome = "", comportamento = "consumo") {
  return { id: novoId("l"), nome, quantidade: "", valor: "", comportamento };
}

/** Os dois ciclos de fábrica. */
const DE_FABRICA = {
  luz: {
    nome: "Luz",
    recurso: "kwh",
    linhas: () => [novaLinha("Energia elétrica", "consumo"), novaLinha("Iluminação pública", "igual")],
  },
  agua: {
    nome: "Água",
    recurso: "m3",
    linhas: () => [novaLinha("Tarifa água", "consumo")],
  },
};

const base = (id, nome, recurso, ativa, linhas) => ({
  id,
  nome,
  recurso,
  ativa,
  janela: null,
  vencimento: null,
  pagoPor: null,
  linhas,
});

/** Luz ou água, como o conjunto as recebe ao nascer. */
export function cicloDeFabrica(id, ativa = true) {
  const modelo = DE_FABRICA[id];
  return base(id, modelo.nome, modelo.recurso, ativa, modelo.linhas());
}

export const ciclosDeFabrica = (ativa = true) => [cicloDeFabrica("luz", ativa), cicloDeFabrica("agua", ativa)];

/**
 * A ordem em que a tela mostra os ciclos: Água, Luz, depois os criados pelo
 * grupo. A lista guardada continua luz e água, porque sem corte o período
 * segue o primeiro ciclo ligado, e essa regra não deve mudar com a tela.
 */
export const naOrdemDaTela = (ciclos) => {
  const peso = (c) => (c.id === "agua" ? 0 : c.id === "luz" ? 1 : 2);
  return [...(ciclos ?? [])].sort((a, b) => peso(a) - peso(b));
};

/**
 * Um ciclo criado pela casa. Medido, ele abre com uma linha de consumo; só
 * monetário, com uma linha que vira uso comum   que é o caso do aluguel.
 */
export function novoCiclo(nome = "", recurso = null) {
  const limpo = String(nome ?? "").trim() || "Nova conta";
  const medido = Boolean(RECURSOS[recurso]);
  return {
    ...base(novoId("c"), limpo, medido ? recurso : null, true, [novaLinha(limpo, "consumo")]),
    // Só de valor: o valor e como divide. Medido: linhas, como luz e água.
    ...(medido ? {} : { rateio: "igual", porcentagens: {} }),
  };
}

export const ehDeFabrica = (ciclo) => Boolean(DE_FABRICA[ciclo?.id]);

/** A lista de ciclos de um conjunto, sempre uma lista. */
export const ciclosDe = (estado) => (Array.isArray(estado?.ciclos) ? estado.ciclos : []);

export const cicloPorId = (estado, id) => ciclosDe(estado).find((c) => c.id === id) ?? null;

/** Os ciclos ligados, na ordem do conjunto. */
export const ciclosLigados = (estado) => ciclosDe(estado).filter((c) => c.ativa !== false);

/** Os ciclos ligados que medem alguma coisa: são os únicos de onde um aparelho pode tirar consumo. */
export const ciclosMedidos = (estado) => ciclosLigados(estado).filter(ehMedido);

/**
 * "da luz", "da água", "de Gás": como a frase se refere ao ciclo. Os de
 * fábrica têm artigo; os da casa vão com o nome que a casa escreveu.
 */
export function doCiclo(ciclo) {
  if (ciclo?.id === "luz") return "da luz";
  if (ciclo?.id === "agua") return "da água";
  return `de ${ciclo?.nome || "uma conta"}`;
}

/** "luz", "água", "Gás": o nome do ciclo dentro de uma frase. */
export function nomeNaFrase(ciclo) {
  if (ciclo?.id === "luz") return "luz";
  if (ciclo?.id === "agua") return "água";
  return ciclo?.nome || "conta";
}

/** "de luz", "de água", "de Gás": a conta, como em "a conta de luz". */
export function deConta(ciclo) {
  if (ciclo?.id === "luz") return "de luz";
  if (ciclo?.id === "agua") return "de água";
  return `de ${ciclo?.nome || "uma conta"}`;
}
