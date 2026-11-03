// Apoio de teste: conjuntos escritos na forma de antes dos ciclos (v9).
//
// Muitos casos de teste montam o estado com `faturas: { luz, agua }`, que é
// como o app guardava tudo até a v9. Em vez de reescrever cada caso, eles
// passam pela MESMA migração que um conjunto salvo passa ao ser aberto. Assim
// o teste continua dizendo o que dizia, e de brinde prova que a migração não
// muda nenhum número.
//
// Só os testes importam daqui.

import { migrarEstado, sanear } from "../persistencia.js";

/** Um estado da v9 (faturas luz/água, item.unidade, item.eventos) na forma atual. */
export const deDuasFaturas = (estado) => sanear(migrarEstado(estado, 9));

/**
 * `{ luz, agua }` vira a lista de ciclos que as funções do calendário recebem.
 * Cada parte entra com o id e o recurso dela; parte ausente não entra.
 */
export function listaDeCiclos(faturas = {}) {
  const lista = [];
  if (faturas.luz) lista.push({ id: "luz", nome: "Luz", recurso: "kwh", linhas: [], ...faturas.luz });
  if (faturas.agua) lista.push({ id: "agua", nome: "Água", recurso: "m3", linhas: [], ...faturas.agua });
  return lista;
}

/**
 * Conjunto novo nasce com as contas desligadas (o grupo liga as que tem). Os
 * casos que lançam valores direto em luz e água ligam as duas antes.
 */
export function comContasLigadas(estado) {
  for (const c of estado.ciclos ?? []) c.ativa = true;
  return estado;
}
