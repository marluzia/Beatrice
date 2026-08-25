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
const VERSAO = 3;

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
    if (!pacote) return null;

    const estado = migrar(pacote.estado, pacote.versao);
    if (!estado) return null;

    return pareceUmaCasa(estado) ? estado : null;
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
/**
 * Traz uma casa salva num formato antigo para o formato de hoje.
 *
 * Descartar seria mais simples, mas quem tem casa salva é justamente quem já
 * está usando o CDR — perder a configuração de sete moradores por causa de uma
 * atualização é o pior momento possível para pedir que comecem de novo.
 *
 * Formato desconhecido, aí sim, é descartado: dado antigo lido errado produz
 * conta errada em silêncio, que é pior que começar do zero.
 */
function migrar(estado, versao) {
  if (!estado || typeof estado !== "object") return null;
  if (versao === VERSAO) return estado;

  const numero = (v) => Number(String(v ?? "").replace(",", ".")) || 0;

  /** Versão 1: valor da fatura já incluía as taxas, num campo só. */
  if (versao === 1) {
    const f = estado.faturas ?? {};

    const converter = (unidade, consumo, valorTotal, taxaFixa, nomeDaTaxa) => {
      const total = numero(valorTotal);
      const fixa = numero(taxaFixa);
      const linhas = [];

      const consumoEmReais = total - fixa;
      if (consumoEmReais !== 0) {
        linhas.push({
          id: `l-migrada-${unidade}-consumo`,
          nome: unidade === "kwh" ? "Energia elétrica" : "Tarifa água",
          valor: String(consumoEmReais),
          comportamento: "consumo",
        });
      }
      if (fixa !== 0) {
        linhas.push({
          id: `l-migrada-${unidade}-taxa`,
          nome: nomeDaTaxa,
          valor: String(fixa),
          comportamento: "igual",
        });
      }
      return { unidade, consumo: consumo ?? "", linhas };
    };

    return {
      ...estado,
      faturas: {
        luz: converter("kwh", f.luzKwh, f.luzValor, f.luzTaxasFixas, "Iluminação pública"),
        agua: converter("m3", f.aguaM3, f.aguaValor, f.aguaTaxasFixas, "Custo mínimo fixo"),
      },
    };
  }

  /** Versão 2: consumo separado das taxas, mas ainda sem comportamento por linha. */
  if (versao === 2) {
    const converter = (fatura, unidade) => {
      if (!fatura) return { unidade, consumo: "", linhas: [] };

      const linhas = [];
      const consumoEmReais =
        fatura.modo === "preco"
          ? numero(fatura.consumo) * numero(fatura.preco)
          : numero(fatura.valor);

      if (consumoEmReais !== 0) {
        linhas.push({
          id: `l-migrada-${unidade}-consumo`,
          nome: unidade === "kwh" ? "Energia elétrica" : "Tarifa água",
          valor: String(consumoEmReais),
          comportamento: "consumo",
        });
      }

      for (const taxa of fatura.taxas ?? []) {
        linhas.push({
          id: taxa.id ?? `l-migrada-${unidade}-${linhas.length}`,
          nome: taxa.nome ?? "",
          valor: taxa.valor ?? "",
          comportamento: "igual",
        });
      }

      return { unidade, consumo: fatura.consumo ?? "", linhas };
    };

    return {
      ...estado,
      faturas: {
        luz: converter(estado.faturas?.luz, "kwh"),
        agua: converter(estado.faturas?.agua, "m3"),
      },
    };
  }

  return null;
}

function pareceUmaCasa(estado) {
  return Boolean(
    estado &&
      typeof estado === "object" &&
      estado.periodo &&
      typeof estado.periodo.mes === "number" &&
      typeof estado.periodo.ano === "number" &&
      estado.faturas &&
      typeof estado.faturas === "object" &&
      estado.faturas.luz &&
      Array.isArray(estado.faturas.luz.linhas) &&
      estado.faturas.agua &&
      Array.isArray(estado.faturas.agua.linhas) &&
      Array.isArray(estado.moradores) &&
      Array.isArray(estado.itens),
  );
}
