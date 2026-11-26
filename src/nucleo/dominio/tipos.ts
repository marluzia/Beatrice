// O vocabulário do domínio.
//
// Aqui só há formas de dados, nenhuma regra. Cada CRC tem o seu arquivo e as
// suas funções; este arquivo é o que todos eles compartilham para conversar.

export type MoradorId = string;

/**
 * O id de um ciclo de fatura. Luz e água vêm de fábrica com os ids "luz" e
 * "agua"; os ciclos que a casa cria ganham um id próprio. O domínio não
 * distingue os de fábrica dos outros.
 */
export type CicloId = string;

// ── Morador ────────────────────────────────────────────────────────────────

export interface Morador {
  id: MoradorId;
  nome: string;
  /** Dias fora no período do fechamento. */
  diasFora: number;
  /** Dias fora dentro do ciclo de cada fatura, quando ele não coincide com o período. */
  diasForaPorCiclo?: Record<CicloId, number>;
}

// ── Recurso ────────────────────────────────────────────────────────────────

/** A unidade física em que cada recurso medido é cobrado. */
export type Unidade = "kwh" | "m3";

/**
 * O recurso que um ciclo mede. `null` é um ciclo só monetário   aluguel,
 * condomínio, internet: tem linhas e valor, mas nenhuma grandeza física.
 */
export type Recurso = Unidade | null;

/**
 * Em qual intervalo uma regra mede os pesos: o ciclo de uma fatura, pelo id,
 * ou `null` para o período do fechamento, que é onde moram as despesas em
 * reais.
 */
export type Mundo = CicloId | null;

// ── Custo ──────────────────────────────────────────────────────────────────

export type Custo =
  /**
   * Sai de dentro da fatura de um ou mais ciclos medidos, cada quantidade na
   * unidade do seu ciclo: um chuveiro elétrico gasta kWh da luz e m³ da água.
   */
  | { tipo: "consumo"; porCiclo: Record<CicloId, number> }
  | {
      tipo: "porUso";
      usosTotais?: number;
      /** Usos que caíram dentro de cada ciclo, quando os usos têm data. */
      usosTotaisPorCiclo?: Record<CicloId, number>;
      unitario:
        /** Quanto cada uso puxa de cada ciclo: 0,8 kWh da luz e 0,05 m³ da água. */
        | { origem: "fatura"; porCiclo: Record<CicloId, number> }
        | { origem: "reais"; valorPorUso: number };
    }
  /** Quanto o aparelho gasta por hora em cada ciclo, vezes as horas ligado. */
  | { tipo: "porHora"; horas: number; porCiclo: Record<CicloId, number> }
  | { tipo: "reais"; valor: number };

/** Um custo já em reais, separado pela conta de onde ele sai. */
export interface CustoBruto {
  /** Quanto sai de cada ciclo. Um ciclo que o item não toca não aparece. */
  porCiclo: Record<CicloId, number>;
  /** Quanto sai do bolso, sem passar por fatura. */
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
  /**
   * Cada um tem um número de cotas: quem tem 2 paga o dobro de quem tem 1.
   * Quem não declarou tem 1, então a regra nasce igual a "igual".
   */
  | { tipo: "cotas"; cotas: Record<MoradorId, number> }
  /**
   * Como no Splitwise: divide por igual e cada um tem um ajuste em reais, para
   * mais ou para menos. A parte de cada um é (custo − soma dos ajustes) / n +
   * o ajuste dele. Sem ajuste nenhum, é "igual".
   */
  | { tipo: "ajuste"; ajustes: Record<MoradorId, number> }
  | {
      /**
       * `uso` conta vezes (inteiros: três lavagens); `horas` conta tempo
       * (decimais: 2,5 horas de ar-condicionado). Para o motor são a mesma
       * coisa   uma quantidade por pessoa   e o que muda é o que a tela pede.
       */
      tipo: "uso" | "horas";
      usos: Record<MoradorId, number>;
      /** Os usos de cada um que caíram dentro de cada ciclo, quando os usos têm data. */
      usosPorCiclo?: Record<CicloId, Record<MoradorId, number>>;
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

/**
 * A fatura de um ciclo, como o domínio a recebe. Um ciclo desligado não chega
 * aqui: a tradução só manda os ativos.
 */
export interface Fatura {
  id: CicloId;
  /** Como a casa chama este ciclo: "Luz", "Água", "Gás", "Aluguel". */
  nome: string;
  /** O que ele mede. `null` = só dinheiro. */
  recurso: Recurso;
  /** Quanto foi consumido, na unidade do recurso. Zero num ciclo sem recurso. */
  quantidade: number;
  /** O total da conta. */
  valor: number;
  /** Forma atual: as taxas linha a linha. */
  taxas?: TaxaFixa[];
  /** Forma antiga: as taxas como um total só. */
  taxasFixas?: number;
  /** Tamanho do ciclo em dias, quando ele não coincide com o período. */
  dias?: number;
  /**
   * Como o que sobra deste ciclo se divide. Sem regra, vai pela régua do uso
   * comum (`calibragem`). Uma conta só de valor   aluguel   costuma ter regra
   * própria: igual, por dias, por porcentagem.
   */
  rateio?: Rateio;
}

// ── Ciclo ──────────────────────────────────────────────────────────────────

export interface Periodo {
  /** Tamanho do fechamento em dias. Sem ele, vale o mês de referência. */
  dias?: number;
  mes: number;
  ano: number;
}

// ── Presença: quem estava em casa, dia a dia ───────────────────────────────

/**
 * Para cada dia de um ciclo, quem estava em casa naquele dia.
 *
 * O domínio recebe isto já resolvido, como listas de ids   nenhuma data entra
 * aqui, porque o motor não sabe de agenda. É a tradução que converte as
 * ausências e as estadias marcadas na tela nestas listas.
 *
 * Quando existe, a divisão por presença é exata: dá para saber se duas viagens
 * coincidiram. Quando não existe   porque a casa só informou "ficou 5 dias
 * fora", sem dizer quais   a regra volta a estimar e o fechamento avisa.
 */
export type PresencaPorDia = MoradorId[][];

export interface Presencas {
  /** O período do fechamento. */
  mes?: PresencaPorDia;
  /** Cada ciclo de fatura, pelo id. */
  porCiclo?: Record<CicloId, PresencaPorDia | undefined>;
}

// ── Casa: o agregado que o fechamento recebe ───────────────────────────────

export interface Estado {
  /** Quanto do uso comum divide por igual; o resto vai pelos dias. De 0 a 1. */
  calibragem?: number;
  periodo: Periodo;
  /** Os ciclos ativos, na ordem da casa. Até 8. */
  faturas: Fatura[];
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
  /** O id do ciclo de onde o custo saiu, "reais", ou "mista" quando sai de mais de um. */
  origem: CicloId | "reais" | "mista";
  custoTotal: number;
  fatias: Fatia[];
}

// ── Explicação: o que cada um paga e por quê ───────────────────────────────

export interface TotalMorador {
  moradorId: MoradorId;
  nome: string;
  diasContados: number;
  /** Quanto cada um deve de cada ciclo. */
  porCiclo: Record<CicloId, number>;
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

/** O que o fechamento mediu de cada ciclo. */
export interface CicloCalculado {
  id: CicloId;
  nome: string;
  recurso: Recurso;
  /** Dias do ciclo. */
  dias: number;
  /** Dias de cada um dentro dele. */
  diasContados: Record<MoradorId, number>;
  /** Reais por unidade consumida. Zero num ciclo sem recurso. */
  tarifa: number;
  /** O total da fatura. */
  valor: number;
  /** O que nenhum item explicou e virou uso comum. */
  sobra: number;
}

export interface Resultado {
  diasNoPeriodo: number;
  diasContados: Record<MoradorId, number>;
  somaDiasContados: number;
  /** Um por ciclo ativo, na ordem em que vieram. */
  ciclos: CicloCalculado[];
  itens: ItemCalculado[];
  moradores: TotalMorador[];
  totalEmReais: number;
  somaCobrada: number;
  somaDevida: number;
  diferenca: number;
  somaCobradaArredondada: number;
  residuoDeCentavos: number;
  alertas: Alerta[];
}
