// CRC: Fatura
//
// Responsabilidade: transformar a conta de um ciclo no que o resto do domínio
// precisa dela   quanto custa cada unidade consumida, quanto é taxa fixa e
// quanto é consumo.
// Colabora com: Custo (que usa a tarifa), Fechamento (que precisa do valor
// total e das taxas para publicar).
//
// Serve para qualquer ciclo: luz em kWh, água ou gás em m³, e também um ciclo
// só monetário (aluguel, condomínio), que não tem quantidade nem tarifa e cujo
// valor fora das taxas vira uso comum inteiro.

import type { CicloId, Fatura, Recurso, TaxaFixa } from "./tipos.ts";
import { dividir, somar } from "./numeros.ts";

/** O que o domínio sabe de uma fatura depois de lê-la. */
export interface FaturaMedida {
  id: CicloId;
  nome: string;
  recurso: Recurso;
  /** O total da conta. */
  valor: number;
  /** Quanto foi consumido, em kWh ou m³. */
  quantidade: number;
  /** As taxas fixas, uma a uma, como vieram. */
  taxas: TaxaFixa[];
  /** Quanto das taxas entra na conta: a soma delas, com teto no valor da fatura na forma antiga. */
  taxasCobradas: number;
  /** O que sobra do valor depois das taxas. É isso que o consumo paga. */
  consumoEmReais: number;
  /** Reais por kWh ou por m³. */
  tarifa: number;
}

/** O nome que uma taxa sem nome recebe: "Taxas fixas da luz", "Taxas fixas de Gás". */
export function nomeGenericoDasTaxas(fatura: Pick<Fatura, "id" | "nome">): string {
  if (fatura.id === "luz") return "Taxas fixas da luz";
  if (fatura.id === "agua") return "Taxas fixas da água";
  return `Taxas fixas de ${fatura.nome}`;
}

/**
 * As taxas numa forma só. Elas podem vir linha a linha, que é a forma atual,
 * ou como um total, que é como a casa salva antes das linhas guardava.
 */
export function normalizarTaxas(
  lista: TaxaFixa[] | undefined,
  total: number | undefined,
  nomeGenerico: string,
): TaxaFixa[] {
  if (lista && lista.length > 0) {
    return lista
      .filter((t) => Number.isFinite(t.valor) && t.valor !== 0)
      .map((t) => ({ nome: t.nome.trim() || nomeGenerico, valor: t.valor }));
  }
  const soma = total ?? 0;
  return soma > 0 ? [{ nome: nomeGenerico, valor: soma }] : [];
}

export const somaDeTaxas = (lista: TaxaFixa[]): number => somar(lista.map((t) => t.valor));

/**
 * Quanto das taxas entra na conta. Linha a linha, entra o que está escrito,
 * inclusive abatimento. No total antigo, a taxa não pode passar do valor da
 * fatura nem ser negativa.
 */
export function recortarTaxas(lista: TaxaFixa[], valorDaFatura: number, veioDeLista: boolean): number {
  const soma = somaDeTaxas(lista);
  return veioDeLista ? soma : Math.max(0, Math.min(valorDaFatura, soma));
}

/** Lê uma fatura: separa taxa de consumo e acha a tarifa. */
export function medirFatura(fatura: Fatura): FaturaMedida {
  const valor = fatura.valor;
  // Ciclo sem recurso não tem o que medir, mesmo que alguém tenha escrito um número.
  const quantidade = fatura.recurso === null ? 0 : fatura.quantidade;

  const taxas = normalizarTaxas(fatura.taxas, fatura.taxasFixas, nomeGenericoDasTaxas(fatura));
  const taxasCobradas = recortarTaxas(taxas, valor, Boolean(fatura.taxas?.length));
  const consumoEmReais = valor - taxasCobradas;

  return {
    id: fatura.id,
    nome: fatura.nome,
    recurso: fatura.recurso,
    valor,
    quantidade,
    taxas,
    taxasCobradas,
    consumoEmReais,
    tarifa: dividir(consumoEmReais, quantidade),
  };
}
