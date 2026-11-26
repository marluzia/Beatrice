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
 * As regras da calculadora de uma cíclica, na ordem do teclado: igual, cotas,
 * percentual, valor, ajuste, dias, horas e uso.
 */
export const REGRAS_DA_CALCULADORA = ["igual", "cotas", "porcentagem", "valor", "ajuste", "dias", "horas", "uso"];

/**
 * As regras que uma conta pode guardar: as da calculadora e a régua do uso
 * comum (o jeito da v10, que contas antigas mantêm).
 */
export const REGRAS_DO_CICLO = [...REGRAS_DA_CALCULADORA, "comum"];

/**
 * Como uma despesa cíclica se divide:
 *
 *  · calculadora           a fatura inteira por uma regra clássica (igual, por
 *                          dias, porcentagem), entre quem divide. Nenhum item
 *                          sai dela.
 *  · registros             o consumo de cada item vinculado (registros de uso,
 *                          horas, o total do mês) e, o que sobra, pela régua do
 *                          uso comum. Só aqui uma conta aceita itens.
 */
export const DIVISOES_DO_CICLO = ["calculadora", "registros"];

/**
 * A divisão de um ciclo. Conta de antes da escolha: medida (luz, água) ou na
 * régua ("comum") é de registros + régua; só de valor com regra própria
 * (aluguel por igual, por porcentagem), da calculadora.
 */
export function divisaoDoCiclo(ciclo) {
  if (DIVISOES_DO_CICLO.includes(ciclo?.divisao)) return ciclo.divisao;
  if (ehMedido(ciclo)) return "registros";
  return !ciclo?.rateio || ciclo.rateio === "comum" ? "registros" : "calculadora";
}

/** Só uma conta medida dividida por registros + régua aceita itens vinculados a ela. */
export const aceitaItens = (ciclo) => ehMedido(ciclo) && divisaoDoCiclo(ciclo) === "registros";

/** Quem divide a conta: os marcados nela, ou, sem marca, todo o conjunto. */
export function quemDivideOCiclo(ciclo, estado) {
  const todos = (estado?.moradores ?? []).map((m) => m.id);
  const marcados = Array.isArray(ciclo?.participantes) ? ciclo.participantes.filter((id) => todos.includes(id)) : [];
  return marcados.length > 0 ? marcados : todos;
}

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

/**
 * Os ciclos ligados de onde um aparelho pode tirar consumo: os que medem
 * alguma coisa e se dividem por registros + régua (na calculadora, não).
 */
export const ciclosMedidos = (estado) => ciclosLigados(estado).filter(aceitaItens);

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
