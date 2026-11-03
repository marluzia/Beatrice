// A tradução vista de fora.
//
// A tela guarda tudo em texto, do jeito que a pessoa digitou. O domínio
// (`motor.ts`) só entende números. A tradução entre os dois mora em
// `traducao/`, um arquivo por assunto, e este arquivo só reexporta, para que
// quem importava daqui continue importando daqui.
//
//   traducao/fatura.js   as linhas da fatura viram consumo, valor e taxas
//   traducao/morador.js  ausências ou estadias marcadas viram dias fora em
//                        cada ciclo, conforme o modo da casa pergunta
//   traducao/uso.js      os usos com data viram usos por ciclo; os que caem
//                        fora do ciclo são apontados
//   traducao/item.js     a espécie do item vira um custo e uma regra
//   traducao/conjunto.js o conjunto inteiro vira o Estado que o domínio fecha

export {
  consumoDaFatura,
  consumoMedido,
  faturaParaMotor,
  janelaDaFatura,
  linhasPorComportamento,
  tarifaDaFatura,
  totalDaFatura,
  totalDasTaxas,
  valorDoConsumo,
} from "./traducao/fatura.js";

export {
  campoDaPresenca,
  datasMarcadas,
  diasContadosDe,
  diasContadosNaFatura,
  diasForaNaJanela,
  polaridadeDoConjunto,
  presentesPorDia,
  temDatasMarcadas,
  todosComDatas,
} from "./traducao/morador.js";

export {
  alertaDeLavagens,
  ciclosDoUso,
  lavagensForaDoCiclo,
  orfasDoItem,
  parteNoRegistro,
  registrosDe,
  temUsoDatado,
  usosDe,
  usosPorJanela,
} from "./traducao/uso.js";

export {
  ciclosDoAparelho,
  faltaParaItem,
  itemParaMotor,
  rateiosDoItem,
  totalDeclaradoPorHora,
} from "./traducao/item.js";

export { alertaDoCorte, calcular, paraMotor } from "./traducao/conjunto.js";

export { diasDoPeriodo } from "./motor.ts";
