// A cessão: de quem é o centavo que a divisão não fecha.
//
// O motor fecha a conta em números reais. Dinheiro, não: ele tem duas casas
// decimais e acabou. Cem reais entre três dá 33,3333... para cada um, e três
// vezes 33,33 são 99,99   falta um centavo que não existe em nenhuma divisão
// possível. Não é erro de cálculo, é o sistema monetário não cedendo.
//
// Este arquivo responde "e aí, de quem é esse centavo?". E a resposta é SÓ da
// casa: não existe padrão. Enquanto ninguém escolhe, o centavo fica sem dono,
// a conta fica declaradamente em aberto e o acerto não acontece.
//
// Antes havia um padrão   "fica com quem mais deve"   e ele era confortável e
// errado. Um padrão transforma a decisão em algo que já foi tomada por outra
// pessoa, e a tela só avisava depois. A CEDER inteira existe para dizer que
// essa escolha é da casa; tomá-la em silêncio contradiz o produto.

import { num } from "./formato.js";

/**
 * Reais em centavos inteiros, no mesmo arredondamento que o relatório mostra.
 *
 * Definido aqui, e não importado do acerto, porque é o acerto que depende
 * desta regra de cessão   e não o contrário. Duas setas entre os dois arquivos
 * seria um ciclo à espera de uma ordem de importação infeliz.
 */
export const emCentavos = (reais) => Math.round(num(reais) * 100);

/**
 * Quem a casa escolheu para ficar com o resíduo.
 *
 * Devolve `null` quando ninguém escolheu, ou quando quem foi escolhido não
 * está mais entre os candidatos   alguém que saiu da casa não pode ceder, e
 * herdar essa escolha calada seria pior do que perdê-la.
 */
export function quemCedeDe(estado, candidatos) {
  const escolhido = estado?.quemCede;
  const vale = Boolean(escolhido) && candidatos.some((c) => c.moradorId === escolhido);
  return { id: vale ? escolhido : null, escolhido: vale };
}

/**
 * Quanto cada um deve no fechamento, em centavos inteiros, com o resíduo no
 * colo de quem a casa escolheu.
 *
 * Enquanto ninguém escolhe, a soma dos `deve` fica diferente do valor devido,
 * exatamente pelo resíduo. Isso é proposital: a conta está em aberto, e a tela
 * mostra que está em vez de fechar sozinha por um caminho que ninguém pediu.
 */
export function cessaoDe(estado, resultado) {
  const residuo = resultado?.residuoDeCentavos ?? 0;

  const parciais = (resultado?.moradores ?? []).map((m) => ({
    moradorId: m.moradorId,
    nome: m.nome,
    deve: emCentavos(m.total),
  }));

  const cede = quemCedeDe(estado, parciais);

  const lista = parciais.map((p) => {
    const cedeu = p.moradorId === cede.id ? residuo : 0;
    return { ...p, deve: p.deve + cedeu, cedeu };
  });

  return {
    porMorador: Object.fromEntries(lista.map((p) => [p.moradorId, p.deve])),
    lista,
    quemCede: cede.id,
    residuo,
    /** Há centavo sobrando e ninguém assumiu: a conta não está fechada. */
    precisaEscolher: residuo !== 0 && cede.id === null && parciais.length > 0,
  };
}

/** O sistema monetário cedeu desta vez? Então não há o que a casa ceder. */
export const fechouRedondo = (resultado) => (resultado?.residuoDeCentavos ?? 0) === 0;
