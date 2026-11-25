// Os preços de um item avulso (equipamento fora das faturas).
//
// Quem aluga um equipamento cobra de jeitos diferentes: a diária, a hora, o
// mês, cada uso. O item guarda em `precos` só as unidades que a pessoa ligou,
// cada uma com o seu valor em texto:
//
//   precos: { hora: "180", dia: "900" }
//
// Cada registro diz em qual dessas unidades foi (`unidade`) e quantas vezes;
// o valor do registro é o preço daquela unidade vezes a quantidade. Um item
// antigo, sem `precos`, tem um preço só: `valorPorUso`, na `medida` dele.

import { num } from "./formato.js";

export const UNIDADES_DE_PRECO = [
  { chave: "mes", nome: "por mês", custa: "Cada mês custa", quantos: "Quantos meses", um: "mês", varios: "meses" },
  { chave: "dia", nome: "por dia", custa: "Cada dia custa", quantos: "Quantos dias", um: "dia", varios: "dias" },
  { chave: "hora", nome: "por hora", custa: "Cada hora custa", quantos: "Quantas horas", um: "hora", varios: "horas" },
  { chave: "uso", nome: "por uso", custa: "Cada uso custa", quantos: "Quantos usos", um: "uso", varios: "usos" },
];

export const unidadeDePreco = (chave) => UNIDADES_DE_PRECO.find((u) => u.chave === chave) ?? UNIDADES_DE_PRECO[3];

/** Equipamento fora das faturas: em dinheiro, com uso registrado. */
export const temPrecos = (item) =>
  Boolean(item?.equipamento) && item.especie === "porUso" && item.origemUso === "reais";

/** As unidades ligadas e o preço de cada uma, na ordem mês, dia, hora, uso. */
export function precosDe(item) {
  if (!temPrecos(item)) return {};
  if (item.precos && typeof item.precos === "object") {
    return Object.fromEntries(
      UNIDADES_DE_PRECO.filter((u) => u.chave in item.precos).map((u) => [u.chave, item.precos[u.chave] ?? ""]),
    );
  }
  return { [item.medida === "hora" ? "hora" : "uso"]: item.valorPorUso ?? "" };
}

/** As chaves das unidades ligadas. */
export const unidadesDe = (item) => Object.keys(precosDe(item));

/** Em que unidade foi este registro: a dele, se ainda estiver ligada; senão a primeira. */
export function unidadeDoRegistro(item, registro) {
  const ligadas = unidadesDe(item);
  return ligadas.includes(registro?.unidade) ? registro.unidade : ligadas[0] ?? "uso";
}

/** Quanto vale um registro de um item avulso: o preço da unidade vezes a quantidade. */
export function valorDoRegistro(item, registro) {
  const quantidade = num(registro?.quantidade) > 0 ? num(registro.quantidade) : 1;
  return num(precosDe(item)[unidadeDoRegistro(item, registro)]) * quantidade;
}

/** "3 horas", "1 diária"… a quantidade do registro, na unidade dele. */
export function quantidadeNaUnidade(item, registro) {
  const q = num(registro?.quantidade) > 0 ? num(registro.quantidade) : 1;
  const u = unidadeDePreco(unidadeDoRegistro(item, registro));
  return `${String(q).replace(".", ",")} ${q === 1 ? u.um : u.varios}`;
}

/**
 * O item como o motor o entende: cada registro passa a valer o seu valor em
 * dinheiro, e o "preço por uso" vira 1. Assim o total é a soma dos registros
 * e a divisão por uso pesa o que cada um gastou, não quantas vezes usou.
 */
export function emDinheiroPorRegistro(item) {
  if (!temPrecos(item) || !item.precos) return item;
  // Registro sem preço não vale nada (e quantidade zero, para o motor, vale 1).
  const registros = (item.registrosDeUso ?? [])
    .map((r) => ({ ...r, quantidade: String(valorDoRegistro(item, r)) }))
    .filter((r) => num(r.quantidade) > 0);
  return { ...item, valorPorUso: "1", usos: "0", usosPorPessoa: {}, registrosDeUso: registros };
}
