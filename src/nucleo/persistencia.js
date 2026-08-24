/**
 * Guarda a casa no navegador de quem está usando.
 *
 * Sem isso, recarregar a página apaga sete moradores e seis itens de uma vez.
 * Numa república real isso não vira crítica ao produto: vira uma pessoa
 * desistindo no meio.
 *
 * Nada sai deste navegador. Não há servidor, conta nem sincronização — trocar
 * de aparelho ou abrir numa aba anônima começa do zero.
 *
 * Tudo aqui é à prova de falha. Navegador com armazenamento bloqueado, cota
 * estourada ou dado corrompido não pode derrubar a aplicação: na dúvida, o CDR
 * abre vazio, que é um estado ruim mas utilizável.
 */

const CHAVE = "cdr:casa";

/**
 * Versão do formato salvo. Suba este número sempre que a forma do estado mudar
 * de um jeito que o código novo não saiba ler — um dado antigo lido errado é
 * pior que dado nenhum, porque produz conta errada em silêncio.
 */
const VERSAO = 1;

/** Nem todo navegador tem localStorage utilizável (anônimo, cota, políticas). */
function deposito() {
  try {
    const teste = "cdr:teste";
    window.localStorage.setItem(teste, "1");
    window.localStorage.removeItem(teste);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function salvarCasa(estado) {
  const guarda = deposito();
  if (!guarda) return false;
  try {
    guarda.setItem(CHAVE, JSON.stringify({ versao: VERSAO, estado }));
    return true;
  } catch {
    // Cota estourada ou estado que não vira JSON. Perder o salvamento é
    // aceitável; derrubar a tela de quem está no meio do cálculo, não.
    return false;
  }
}

/** Devolve o estado salvo, ou null se não houver nada confiável para ler. */
export function carregarCasa() {
  const guarda = deposito();
  if (!guarda) return null;

  let cru;
  try {
    cru = guarda.getItem(CHAVE);
  } catch {
    return null;
  }
  if (!cru) return null;

  try {
    const pacote = JSON.parse(cru);
    if (!pacote || pacote.versao !== VERSAO) return null;
    return pareceUmaCasa(pacote.estado) ? pacote.estado : null;
  } catch {
    return null;
  }
}

export function limparCasa() {
  const guarda = deposito();
  if (!guarda) return;
  try {
    guarda.removeItem(CHAVE);
  } catch {
    // Sem nada a fazer, e nada que justifique quebrar a tela.
  }
}

/**
 * Conferência mínima de forma antes de aceitar o que veio do disco.
 *
 * Não valida cada campo: valida que é o tipo de objeto certo. O objetivo é
 * barrar lixo — outra aplicação escrevendo na mesma chave, um recorte pela
 * metade — sem virar um segundo esquema para manter em dia.
 */
function pareceUmaCasa(estado) {
  return Boolean(
    estado &&
      typeof estado === "object" &&
      estado.periodo &&
      typeof estado.periodo.mes === "number" &&
      typeof estado.periodo.ano === "number" &&
      estado.faturas &&
      typeof estado.faturas === "object" &&
      Array.isArray(estado.moradores) &&
      Array.isArray(estado.itens),
  );
}
