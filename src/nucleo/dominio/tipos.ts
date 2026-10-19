// O vocabulário do domínio.
//
// Aqui só há formas de dados, nenhuma regra. Cada CRC tem o seu arquivo e as
// suas funções; este arquivo é o que todos eles compartilham para conversar.

export type MoradorId = string;

// ── Morador ────────────────────────────────────────────────────────────────

export interface Morador {
  id: MoradorId;
  nome: string;
  /** Dias fora no período do fechamento. */
  diasFora: number;
  /** Dias fora dentro do ciclo da fatura de luz, quando ele não coincide com o fechamento. */
  diasForaLuz?: number;
  /** Idem, para a água. */
  diasForaAgua?: number;
}

// ── Recurso ────────────────────────────────────────────────────────────────

/** A unidade física em que cada recurso medido é cobrado. */
export type Unidade = "kwh" | "m3";

/**
 * Qual recurso medido está em jogo numa conta. `null` quer dizer "o período
 * do fechamento", que é onde moram as despesas em reais.
 *
 * Hoje são só dois recursos medidos, luz e água, e eles aparecem com nome
 * próprio em vários tipos abaixo (`luzKwh`, `diasLuz`, `usosLuz`...). Tornar
 * isso uma lista de recursos é a próxima onda; por ora, todo lugar que
 * distingue os dois passa por este tipo, o que deixa a troca rastreável.
 */
export type Mundo = "luz" | "agua" | null;

// ── Custo ──────────────────────────────────────────────────────────────────

export type Custo =
  | { tipo: "consumo"; quantidade: number; unidade: Unidade }
  | {
      tipo: "porUso";
      usosTotais?: number;
      usosTotaisLuz?: number;
      usosTotaisAgua?: number;
      unitario:
        | { origem: "fatura"; kwhPorUso: number; m3PorUso: number }
        | { origem: "reais"; valorPorUso: number };
    }
  | { tipo: "porHora"; porHora: number; horas: number; unidade: Unidade }
  | { tipo: "reais"; valor: number };

/** Um custo já em reais, separado pela conta de onde ele sai. */
export interface CustoBruto {
  luz: number;
  agua: number;
  reais: number;
}

// ── Regra de alocação ──────────────────────────────────────────────────────

export type Rateio =
  | { tipo: "igual" }
  | { tipo: "dias" }
  | { tipo: "presenca" }
  | { tipo: "misto"; igual: number }
  /** Cada um declara a sua fatia em porcentagem. Deveria somar 100. */
  | { tipo: "porcentagem"; porcentagens: Record<MoradorId, number> }
  /**
   * Cada um declara quanto paga, em reais. Diferente de todas as outras, esta
   * regra não é uma proporção: são valores exatos, e por isso a soma precisa
   * bater com o custo do item. Quando não bate, o fechamento reclama em
   * vermelho em vez de ajustar por baixo do pano.
   */
  | { tipo: "valor"; valores: Record<MoradorId, number> }
  | {
      /**
       * `uso` conta vezes (inteiros: três lavagens); `horas` conta tempo
       * (decimais: 2,5 horas de ar-condicionado). Para o motor são a mesma
       * coisa   uma quantidade por pessoa   e o que muda é o que a tela pede.
       */
      tipo: "uso" | "horas";
      usos: Record<MoradorId, number>;
      /** Usos que caíram dentro do ciclo da luz, quando os usos têm data. */
      usosLuz?: Record<MoradorId, number>;
      /** Idem, para a água. */
      usosAgua?: Record<MoradorId, number>;
    };

export type TipoDeRateio = Rateio["tipo"];

// ── Item: um custo, um grupo e uma regra ───────────────────────────────────

export interface Item {
  id: string;
  nome: string;
  custo: Custo;
  participantes: MoradorId[];
  rateio: Rateio;
  /** As regras que este item aceita, quando ele restringe as que o custo permitiria. */
  rateiosDoItem?: TipoDeRateio[];
}

// ── Fatura ─────────────────────────────────────────────────────────────────

export interface TaxaFixa {
  nome: string;
  valor: number;
}

export interface Faturas {
  luzKwh: number;
  luzValor: number;
  /** Forma antiga: as taxas como um total só. */
  luzTaxasFixas?: number;
  /** Forma atual: as taxas linha a linha. */
  luzTaxas?: TaxaFixa[];
  aguaM3: number;
  aguaValor: number;
  aguaTaxasFixas?: number;
  aguaTaxas?: TaxaFixa[];
}

// ── Ciclo ──────────────────────────────────────────────────────────────────

export interface Periodo {
  /** Tamanho do fechamento em dias. Sem ele, vale o mês de referência. */
  dias?: number;
  mes: number;
  ano: number;
  /** Tamanho do ciclo da fatura de luz, quando ele não coincide com o fechamento. */
  diasLuz?: number;
  /** Idem, para a água. */
  diasAgua?: number;
}

// ── Presença: quem estava em casa, dia a dia ───────────────────────────────

/**
 * Para cada dia de um ciclo, quem estava em casa naquele dia.
 *
 * O domínio recebe isto já resolvido, como listas de ids   nenhuma data entra
 * aqui, porque o motor não sabe de calendário. É a tradução que converte as
 * ausências e as estadias marcadas na tela nestas listas.
 *
 * Quando existe, a divisão por presença é exata: dá para saber se duas viagens
 * coincidiram. Quando não existe   porque a casa só informou "ficou 5 dias
 * fora", sem dizer quais   a regra volta a estimar e o fechamento avisa.
 */
export type PresencaPorDia = MoradorId[][];

export interface Presencas {
  mes: PresencaPorDia;
  luz: PresencaPorDia;
  agua: PresencaPorDia;
}

// ── Casa: o agregado que o fechamento recebe ───────────────────────────────

export interface Estado {
  /** Quanto do uso comum divide por igual; o resto vai pelos dias. De 0 a 1. */
  calibragem?: number;
  periodo: Periodo;
  faturas: Faturas;
  moradores: Morador[];
  itens: Item[];
  /** Quem estava em casa em cada dia, quando a casa marcou as datas. */
  presencas?: Presencas;
}

// ── Alocação: o resultado de aplicar uma regra a um custo ──────────────────

export interface Fatia {
  moradorId: MoradorId;
  peso: number;
  proporcao: number;
  total: number;
}

export interface ItemCalculado {
  id: string;
  nome: string;
  /** Item que o fechamento criou sozinho: o uso comum e as taxas fixas. */
  automatico: boolean;
  origem: "luz" | "agua" | "reais" | "mista";
  custoTotal: number;
  fatias: Fatia[];
}

// ── Explicação: o que cada um paga e por quê ───────────────────────────────

export interface TotalMorador {
  moradorId: MoradorId;
  nome: string;
  diasContados: number;
  luz: number;
  agua: number;
  reais: number;
  total: number;
  /** O total desmontado item a item. */
  linhas: { nome: string; valor: number }[];
}

export interface Alerta {
  nivel: "aviso" | "erro";
  texto: string;
}

// ── Fechamento ─────────────────────────────────────────────────────────────

export interface Resultado {
  diasNoPeriodo: number;
  diasNoPeriodoLuz: number;
  diasNoPeriodoAgua: number;
  tarifaLuz: number;
  tarifaAgua: number;
  diasContados: Record<MoradorId, number>;
  diasContadosLuz: Record<MoradorId, number>;
  diasContadosAgua: Record<MoradorId, number>;
  somaDiasContados: number;
  itens: ItemCalculado[];
  moradores: TotalMorador[];
  sobraLuz: number;
  sobraAgua: number;
  totalEmReais: number;
  somaCobrada: number;
  somaDevida: number;
  diferenca: number;
  somaCobradaArredondada: number;
  residuoDeCentavos: number;
  alertas: Alerta[];
}
