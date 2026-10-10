// CRC: Fatura
//
// Responsabilidade: transformar uma conta de luz ou de água no que o resto do
// domínio precisa dela — quanto custa cada unidade consumida, quanto é taxa
// fixa e quanto é consumo.
// Colabora com: Custo (que usa a tarifa), Fechamento (que precisa do valor
// total e das taxas para publicar).
//
// É o único lugar do domínio que conhece os nomes dos campos de cada fatura
// (`luzKwh`, `aguaM3`...). Quem quer saber de uma fatura pergunta por ela aqui.

import type { Faturas, TaxaFixa } from "./tipos.ts";
import { dividir, somar } from "./numeros.ts";

export type QualFatura = "luz" | "agua";

/** O que o domínio sabe de uma fatura depois de lê-la. */
export interface FaturaMedida {
  qual: QualFatura;
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

const NOME_GENERICO: Record<QualFatura, string> = {
  luz: "Taxas fixas da luz",
  agua: "Taxas fixas da água",
};

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

function camposDe(faturas: Faturas, qual: QualFatura) {
  return qual === "luz"
    ? {
        valor: faturas.luzValor,
        quantidade: faturas.luzKwh,
        lista: faturas.luzTaxas,
        total: faturas.luzTaxasFixas,
      }
    : {
        valor: faturas.aguaValor,
        quantidade: faturas.aguaM3,
        lista: faturas.aguaTaxas,
        total: faturas.aguaTaxasFixas,
      };
}

/** Lê uma fatura: separa taxa de consumo e acha a tarifa. */
export function medirFatura(faturas: Faturas, qual: QualFatura): FaturaMedida {
  const { valor, quantidade, lista, total } = camposDe(faturas, qual);

  const taxas = normalizarTaxas(lista, total, NOME_GENERICO[qual]);
  const taxasCobradas = recortarTaxas(taxas, valor, Boolean(lista?.length));
  const consumoEmReais = valor - taxasCobradas;

  return {
    qual,
    valor,
    quantidade,
    taxas,
    taxasCobradas,
    consumoEmReais,
    tarifa: dividir(consumoEmReais, quantidade),
  };
}
