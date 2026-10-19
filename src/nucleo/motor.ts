// O motor visto de fora.
//
// Este arquivo não calcula nada: reexporta o domínio, que mora em `dominio/`,
// um arquivo por CRC (Classe–Responsabilidade–Colaboração). Quem importava de
// `motor.ts` continua importando daqui, sem mudar nada.
//
//   dominio/tipos.ts       o vocabulário que as CRCs compartilham
//   dominio/numeros.ts     a aritmética miúda
//
//   dominio/ciclo.ts       Ciclo            quantos dias tem cada intervalo
//   dominio/morador.ts     Morador/Ausência quantos dias cada um passou em casa
//   dominio/fatura.ts      Fatura           tarifa, taxas e consumo de cada conta
//   dominio/uso.ts         Uso              quantos usos, de quem, em qual ciclo
//   dominio/consumo.ts     Consumo          quanto cada item gastou em kWh e m³
//   dominio/custo.ts       Custo            quanto isso custa, e de qual conta sai
//   dominio/regras.ts      RegraDeAlocação  o peso de cada um, por regra
//   dominio/alocacao.ts    Alocação         a parcela de cada um em cada item
//   dominio/explicacao.ts  Explicação       o total desmontado e os avisos
//   dominio/fechamento.ts  Fechamento       a ordem em que tudo isso acontece
//
// A Casa é o `Estado` que o fechamento recebe; ela não tem comportamento
// próprio no domínio. O Evento ainda não existe como entidade: as ausências
// chegam já contadas e os usos já somados. Ver o README.

export type * from "./dominio/tipos.ts";

export { TOLERANCIA } from "./dominio/numeros.ts";
export { diasDoPeriodo, diasDoCiclo, MAXIMO_DE_DIAS, NOMES_DOS_MESES } from "./dominio/ciclo.ts";
export { diasContadosEm } from "./dominio/morador.ts";
export { medirFatura, normalizarTaxas, recortarTaxas, somaDeTaxas } from "./dominio/fatura.ts";
export type { FaturaMedida } from "./dominio/fatura.ts";
export { usosPorPessoa, usosTotaisDe } from "./dominio/uso.ts";
export { consumoDe, consumoDeclaradoPorHora } from "./dominio/consumo.ts";
export type { ConsumoDoItem } from "./dominio/consumo.ts";
export { custoDe, origemDoCusto } from "./dominio/custo.ts";
export {
  ausentesEntre,
  fatiasPorPresenca,
  fatiasPorPresencaExata,
  temPresencaExata,
  MAXIMO_PARA_PRESENCA,
  pesosDe,
  rateiosPermitidos,
  rateiosSugeridos,
  regraDe,
  regraDeclarada,
  regraExata,
  REGRAS,
  somaDeclarada,
} from "./dominio/regras.ts";
export type { RegraDeAlocacao, ContextoDaRegra } from "./dominio/regras.ts";
export { alocar } from "./dominio/alocacao.ts";
export { calcular, conferir, conferirEmCentavos } from "./dominio/fechamento.ts";
