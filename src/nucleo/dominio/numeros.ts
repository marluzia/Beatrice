// A aritmética miúda que todo o domínio usa.

/** Abaixo disto, uma diferença em reais é considerada zero. */
export const TOLERANCIA = 0.005;

/** Divisão que devolve zero em vez de infinito quando não há por onde dividir. */
export const dividir = (a: number, b: number): number => (b > 0 ? a / b : 0);

export const emCentavos = (valor: number): number => Math.round(valor * 100);

/** Um valor em reais como a tela escreve: duas casas e vírgula. */
export const escrito = (valor: number): string => valor.toFixed(2).replace(".", ",");

export const plural = (n: number, um: string, muitos: string): string =>
  n === 1 ? `1 ${um}` : `${n} ${muitos}`;

export const entreZeroEUm = (x: number): number => Math.min(1, Math.max(0, x));

export const somar = (valores: number[]): number => valores.reduce((a, b) => a + b, 0);
