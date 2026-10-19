// CRC: ExplicaçãoDoCálculo
//
// Responsabilidade: juntar as parcelas de cada pessoa num total que se
// desmonta item a item, e dizer em palavras o que o cálculo teve de supor,
// cortar ou arredondar.
// Colabora com: Alocação (as parcelas), Fechamento (que decide quando cada
// aviso vale).
//
// Os textos dos avisos moram todos aqui. Nenhum outro arquivo do domínio
// escreve frase para a tela.

import type { Alerta, Item, Morador, MoradorId, TotalMorador } from "./tipos.ts";
import type { DiasContados } from "./morador.ts";
import type { ItemAlocado } from "./alocacao.ts";
import { escrito, plural } from "./numeros.ts";

// ── o total de cada pessoa ─────────────────────────────────────────────────

export type Totais = Record<MoradorId, TotalMorador>;

export function totaisEmBranco(moradores: Morador[], diasContados: DiasContados): Totais {
  const totais: Totais = {};

  for (const m of moradores) {
    totais[m.id] = {
      moradorId: m.id,
      nome: m.nome,
      diasContados: diasContados[m.id],
      luz: 0,
      agua: 0,
      reais: 0,
      total: 0,
      linhas: [],
    };
  }

  return totais;
}

/** Soma a parte de cada um num item ao total dele, e anota a linha. */
export function lancarNosTotais(totais: Totais, nome: string, alocado: ItemAlocado): void {
  for (const parcela of alocado.parcelas) {
    const alvo = totais[parcela.moradorId];
    // Participante que não é morador da casa: a fatia existe, mas não há de quem cobrar.
    if (!alvo) continue;

    alvo.luz += parcela.luz;
    alvo.agua += parcela.agua;
    alvo.reais += parcela.reais;
    alvo.total += parcela.total;

    if (Math.abs(parcela.total) > 1e-9) alvo.linhas.push({ nome, valor: parcela.total });
  }
}

// ── os avisos ──────────────────────────────────────────────────────────────

export const itensSemNinguem = (quantos: number): Alerta => ({
  nivel: "aviso",
  texto:
    quantos === 1
      ? "Um item está sem ninguém marcado e ficou de fora do rateio."
      : `${quantos} itens estão sem ninguém marcado e ficaram de fora do rateio.`,
});

export const consumoPassaDaFatura = (qual: "luz" | "agua", excesso: number): Alerta => ({
  nivel: "erro",
  texto:
    qual === "luz"
      ? `Os itens de consumo elétrico passam em R$ ${escrito(excesso)} o valor da fatura de luz. Revise os kWh informados.`
      : `Os itens de consumo de água passam em R$ ${escrito(excesso)} o valor da fatura de água. Revise os m³ informados.`,
});

export const ninguemEmCasa = (): Alerta => ({
  nivel: "aviso",
  texto: "Ninguém passou nenhum dia em casa no período. O uso comum foi dividido em partes iguais.",
});

/**
 * Só aparece quando as datas NÃO foram marcadas no calendário.
 *
 * Com as datas, a divisão por presença é uma conta direta, dia a dia, e nada é
 * suposto   por isso a mensagem diz o que fazer para ela sumir, em vez de
 * pedir que a casa confira uma estimativa que ela não tem como conferir.
 */
export const presencaSuposta = (item: Item): Alerta => ({
  nivel: "aviso",
  texto: `"${item.nome}" divide por presença, mais de uma pessoa ficou fora e o calendário não diz quais dias foram. Sem isso a CEDER não sabe se as ausências coincidiram, e supôs que não. Marque os dias de cada um no calendário e esta divisão passa a ser exata.`,
});

/**
 * Porcentagem que não soma 100. Os pesos são normalizados, então a divisão
 * acontece mesmo assim   30 e 30 viram metade para cada um. O aviso existe
 * porque isso quase nunca é o que a pessoa quis dizer ao escrever 30 e 30.
 */
export const porcentagemNaoFecha = (item: Item, soma: number): Alerta => ({
  nivel: "aviso",
  texto:
    `As porcentagens de "${item.nome}" somam ${escrito(soma)}%, não 100%. ` +
    `A divisão saiu na proporção do que foi escrito, mas confira se é isso mesmo.`,
});

/**
 * Valores em reais que não somam o custo do item. Aqui é erro, não aviso: a
 * pessoa escreveu quanto cada um paga, e esse número não fecha com o que o
 * item custa. Ajustar em silêncio seria inventar uma conta que ninguém pediu.
 */
export const valorNaoFecha = (item: Item, soma: number, custo: number): Alerta => {
  const diferenca = custo - soma;

  return {
    nivel: "erro",
    texto:
      `"${item.nome}" custa R$ ${escrito(custo)} e os valores lançados somam ` +
      `R$ ${escrito(soma)}: ` +
      (diferenca > 0
        ? `faltam R$ ${escrito(diferenca)} sem dono.`
        : `sobram R$ ${escrito(-diferenca)} a mais do que o item custa.`) +
      " Acerte os valores ou troque a regra de divisão.",
  };
};

export const casaSemMorador = (somaDevida: number): Alerta => ({
  nivel: "erro",
  texto: `Há R$ ${escrito(somaDevida)} a dividir e nenhum morador cadastrado. Cadastre quem morou na casa no período para o rateio existir.`,
});

export function centavosDeDiferenca(
  residuo: number,
  somaArredondada: number,
  somaDevida: number,
): Alerta {
  const quanto = plural(Math.abs(residuo), "centavo", "centavos");

  return {
    nivel: "aviso",
    texto:
      residuo > 0
        ? `Arredondando, a soma dá R$ ${escrito(somaArredondada)} e não os R$ ${escrito(somaDevida)} devidos: ${quanto} de menos. Fiz meu melhor, mas esse sistema monetário não cedeu para mim. Passo a moeda para vocês...`
        : `Arredondando, a soma dá R$ ${escrito(somaArredondada)} contra os R$ ${escrito(somaDevida)} devidos: ${quanto} de sobra. Fiz meu melhor, mas esse sistema monetário não cedeu para mim. Passo a moeda para vocês...`,
  };
}
