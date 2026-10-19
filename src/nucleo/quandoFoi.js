// Quando a despesa aconteceu: sem data, num dia, ou num período.
//
// Isto mora fora da tela porque a primeira versão errou exatamente por não
// morar: o formato era DEDUZIDO dos campos (`data` vazia → "sem data"), e aí
// escolher "dia" num item ainda sem data não mudava campo nenhum, a dedução
// continuava dando "sem data", e os campos nunca apareciam. A escolha da
// pessoa não cabia nos dados que ela ainda não tinha preenchido.
//
// A correção é separar as duas coisas: o que a pessoa ESCOLHEU e o que o item
// GUARDA. A escolha manda enquanto a tela está aberta; o item é só o ponto de
// partida quando ela abre.

export const FORMATOS = ["sem", "dia", "periodo"];

/**
 * Em que formato este item está, lido do que ele guarda.
 *
 * Serve para abrir a tela no estado certo   não para decidir o que mostrar
 * depois que a pessoa mexeu.
 */
export function formatoDoItem(item) {
  if (!item?.data) return "sem";
  return item?.ate ? "periodo" : "dia";
}

/**
 * O que a tela mostra, dado o item e o formato escolhido.
 *
 * `escolha` é `null` enquanto a pessoa não mexeu no seletor; aí vale o que o
 * item já guardava.
 */
export function telaDoQuando(item, escolha = null) {
  const formato = FORMATOS.includes(escolha) ? escolha : formatoDoItem(item);

  return {
    formato,
    mostraInicio: formato !== "sem",
    mostraFim: formato === "periodo",
  };
}

/**
 * O que muda no item quando a pessoa troca de formato.
 *
 * Devolve só os campos a alterar. Trocar de "período" para "dia" apaga o fim e
 * preserva o começo: quem já digitou a data de início não a perde por mudar de
 * ideia sobre o formato.
 */
export function trocaDeFormato(item, novo) {
  if (novo === "sem") return { data: null, ate: null };
  if (novo === "dia") return { ate: null };
  // Período: o fim começa vazio e a pessoa digita. Não o igualamos ao início,
  // porque um período de um dia só é um dia, e seria um valor inventado.
  return { ate: item?.ate ?? null };
}

/**
 * O que muda ao digitar o início.
 *
 * Um começo depois do fim não é um período, é erro de digitação que viraria
 * conta errada três telas adiante   então o fim acompanha.
 */
export function aoMudarInicio(item, valor) {
  const data = valor || null;
  if (!data) return { data, ate: null };
  if (item?.ate && item.ate < data) return { data, ate: data };
  return { data };
}

/** O que muda ao digitar o fim. Fim antes do começo é recusado. */
export function aoMudarFim(item, valor) {
  const ate = valor || null;
  if (ate && item?.data && ate < item.data) return { ate: item.data };
  return { ate };
}
