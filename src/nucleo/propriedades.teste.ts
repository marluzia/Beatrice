import { describe, expect, it } from "vitest";
import { calcular, conferir, diasDoPeriodo } from "./motor.ts";
import type { Estado, Item, Rateio } from "./motor.ts";

/**
 * Testes de propriedade.
 *
 * Os testes de cenário provam que casos escolhidos a dedo dão certo. Estes
 * provam que nenhum caso dá errado, gerando repúblicas aleatórias e afirmando
 * as regras que precisam valer sempre.
 *
 * O sorteio é determinístico: cada república nasce de uma semente numérica.
 * Quando um teste falha, a semente aparece na mensagem e o caso pode ser
 * reproduzido exatamente com `republica(semente)`.
 */

const REPETICOES = 400;

/** Gerador congruente linear. Pequeno, determinístico e suficiente aqui. */
function sorteio(semente: number) {
  let estado = semente >>> 0 || 1;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 0x100000000;
  };
}

export function republica(semente: number): Estado {
  const r = sorteio(semente);
  const entre = (min: number, max: number) => min + r() * (max - min);
  const inteiro = (min: number, max: number) => Math.floor(entre(min, max + 1));
  const talvez = (chance: number) => r() < chance;

  const periodo = { mes: inteiro(1, 12), ano: inteiro(2023, 2027) };
  const dias = diasDoPeriodo(periodo);

  const quantos = inteiro(0, 7);
  const moradores = Array.from({ length: quantos }, (_, i) => ({
    id: `m${i}`,
    nome: talvez(0.2) ? "" : `Pessoa ${i + 1}`,
    // Passa do tamanho do mês de propósito, para exercitar o corte.
    diasFora: talvez(0.15) ? inteiro(0, 60) : inteiro(0, dias),
  }));
  const ids = moradores.map((m) => m.id);

  const grupo = () => ids.filter(() => talvez(0.7));

  const usosDe = (participantes: string[]) =>
    Object.fromEntries(
      participantes.map((id) => [id, talvez(0.3) ? 0 : inteiro(0, 12)]),
    );

  const itemAleatorio = (i: number): Item => {
    const participantes = grupo();
    const tipoDeRateio = (["igual", "dias", "presenca", "uso"] as const)[inteiro(0, 3)];
    const rateio: Rateio =
      tipoDeRateio === "uso"
        ? { tipo: "uso", usos: usosDe(participantes) }
        : { tipo: tipoDeRateio };

    const sorte = r();
    const custo: Item["custo"] =
      sorte < 0.25
        ? { tipo: "consumo", quantidade: entre(0, 300), unidade: talvez(0.7) ? "kwh" : "m3" }
        : sorte < 0.45
          ? { tipo: "porHora", porHora: entre(0, 3), horas: entre(0, 400), unidade: "kwh" }
          : sorte < 0.65
            ? {
                tipo: "porUso",
                usosTotais: inteiro(0, 20),
                unitario: { origem: "fatura", kwhPorUso: entre(0, 2), m3PorUso: entre(0, 0.5) },
              }
            : sorte < 0.85
              ? {
                  tipo: "porUso",
                  usosTotais: inteiro(0, 10),
                  unitario: { origem: "reais", valorPorUso: entre(0, 200) },
                }
              : { tipo: "reais", valor: entre(0, 500) };

    return { id: `i${i}`, nome: `Item ${i}`, custo, participantes, rateio };
  };

  return {
    periodo,
    faturas: {
      luzKwh: talvez(0.1) ? 0 : entre(0, 800),
      luzValor: talvez(0.1) ? 0 : entre(0, 900),
      aguaM3: talvez(0.1) ? 0 : entre(0, 40),
      aguaValor: talvez(0.1) ? 0 : entre(0, 400),
    },
    moradores,
    itens: Array.from({ length: inteiro(0, 8) }, (_, i) => itemAleatorio(i)),
  };
}

/** Roda uma afirmação contra muitas repúblicas, apontando a semente que falhou. */
function paraToda(nome: string, afirmar: (estado: Estado, resultado: ReturnType<typeof calcular>) => void) {
  it(nome, () => {
    for (let semente = 1; semente <= REPETICOES; semente++) {
      const estado = republica(semente);
      const resultado = calcular(estado);
      try {
        afirmar(estado, resultado);
      } catch (erro) {
        throw new Error(
          `Falhou na semente ${semente}. Reproduza com republica(${semente}).\n${
            erro instanceof Error ? erro.message : String(erro)
          }`,
        );
      }
    }
  });
}

describe(`propriedades, em ${REPETICOES} repúblicas sorteadas`, () => {
  paraToda("a soma cobrada é igual ao total devido", (e, r) => {
    if (e.moradores.length === 0) {
      // Sem morador não há a quem cobrar. O que se exige aqui é que o motor
      // diga isso em voz alta, em vez de devolver um rateio vazio calado.
      if (Math.abs(r.somaDevida) > 0.005) {
        expect(r.alertas.some((a) => a.nivel === "erro")).toBe(true);
      }
      return;
    }
    expect(conferir(r)).toBe(true);
  });

  paraToda("nenhum valor é NaN ou Infinity", (_e, r) => {
    for (const m of r.moradores) {
      for (const v of [m.luz, m.agua, m.reais, m.total, m.diasContados]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
    for (const item of r.itens) {
      expect(Number.isFinite(item.custoTotal)).toBe(true);
      for (const f of item.fatias) expect(Number.isFinite(f.total)).toBe(true);
    }
  });

  paraToda("as fatias de cada item somam o custo do item", (_e, r) => {
    for (const item of r.itens) {
      const soma = item.fatias.reduce((s, f) => s + f.total, 0);
      expect(Math.abs(soma - item.custoTotal)).toBeLessThan(1e-6);
    }
  });

  paraToda("as três origens somam o total de cada pessoa", (_e, r) => {
    for (const m of r.moradores) {
      expect(Math.abs(m.luz + m.agua + m.reais - m.total)).toBeLessThan(1e-6);
    }
  });

  paraToda("dias contados ficam entre zero e o tamanho do mês", (e, r) => {
    for (const m of r.moradores) {
      expect(m.diasContados).toBeGreaterThanOrEqual(0);
      expect(m.diasContados).toBeLessThanOrEqual(r.diasNoPeriodo);
      expect(r.diasNoPeriodo).toBe(diasDoPeriodo(e.periodo));
    }
  });

  paraToda("o resíduo de centavos nunca passa de um por morador", (e, r) => {
    if (e.moradores.length === 0) return;
    expect(Math.abs(r.residuoDeCentavos)).toBeLessThanOrEqual(r.moradores.length);
  });

  paraToda("casa sem morador e com conta a pagar sempre acusa erro", (e, r) => {
    if (e.moradores.length > 0 || Math.abs(r.somaDevida) <= 0.005) return;
    expect(r.alertas.some((a) => a.nivel === "erro")).toBe(true);
    // E não fica falando de arredondamento, que não é o problema ali.
    expect(r.alertas.some((a) => a.texto.includes("Arredondando"))).toBe(false);
  });

  paraToda("quem não participa de nada não paga nada", (e, r) => {
    const participaDeAlgo = new Set(e.itens.flatMap((i) => i.participantes));
    for (const m of r.moradores) {
      const soUsoComum = !participaDeAlgo.has(m.moradorId);
      if (soUsoComum && r.sobraLuz === 0 && r.sobraAgua === 0) {
        expect(Math.abs(m.total)).toBeLessThan(1e-9);
      }
    }
  });

  paraToda("item sem participantes gera aviso", (e, r) => {
    const orfaos = e.itens.filter((i) => i.participantes.length === 0).length;
    if (orfaos > 0) {
      expect(r.alertas.some((a) => a.texto.includes("sem ninguém marcado"))).toBe(true);
    }
  });
});
