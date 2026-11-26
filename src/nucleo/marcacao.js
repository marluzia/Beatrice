// Marcação: na Multi, a agenda marca a estadia ou os dias fora.
//
// As duas listas moram em cada pessoa (`presencas` e `ausencias`) e o tipo do
// conjunto diz qual delas vale (ver `traducao/morador.js`). Trocar a marcação
// sem mexer nas listas mudaria a conta calada: quem marcou estadia passaria a
// contar o mês inteiro em casa. Então a troca converte uma lista na outra,
// dia a dia, dentro do período em que se marca (`janelaTotal`): quem esteve
// 10 de 30 dias passa a estar fora 20 de 30. O número de dias não muda.
//
// Ninguém com dia marcado ainda (o conjunto recém-criado) é a exceção: aí não
// há o que converter, e a lista nova começa vazia.

import { janelaTotal, somarDias } from "./calendario.js";
import { MARCACOES, modoDoConjunto } from "./modos.js";

const CAMPO = { presenca: "presencas", ausencia: "ausencias" };

/** Os dias de uma janela { de, ate } (ate exclusivo), em ordem. */
function diasDe(janela) {
  const dias = [];
  for (let d = janela.de; d < janela.ate; d = somarDias(d, 1)) dias.push(d);
  return dias;
}

/** O estado com a marcação trocada e as marcas convertidas. */
export function comMarcacao(estado, nova) {
  if (!MARCACOES.includes(nova)) return estado;
  const modo = modoDoConjunto(estado);
  if (!modo.marcacaoEscolhida) return estado;
  const atual = modo.presenca;
  if (atual === nova) return { ...estado, marcacao: nova };

  const de = CAMPO[atual];
  const para = CAMPO[nova];
  const alguemMarcou = (estado.moradores ?? []).some((m) => (m[de] ?? []).length > 0);
  const dias = diasDe(janelaTotal(estado.ciclos, estado.periodo, estado.corte));

  return {
    ...estado,
    marcacao: nova,
    moradores: (estado.moradores ?? []).map((m) => {
      if (!alguemMarcou) return { ...m, [para]: [] };
      const marcados = new Set(m[de] ?? []);
      return { ...m, [para]: dias.filter((d) => !marcados.has(d)) };
    }),
  };
}
