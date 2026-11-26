// Os lembretes (listas e notas) e o que se lê deles fora do dinheiro.
//
// Todo lembrete tem duas datas: a de lançamento (`lancadoEm`, quando alguém o
// escreveu) e a agendada (`data`, o dia em que ele aparece na agenda e vira
// notificação). Sem data agendada, ela é o dia do lançamento.
//
// Todo lembrete pode marcar pessoas (`pessoas`): a notificação vai para elas.
// Sem ninguém marcado, vai para todo o grupo.
//
// O vínculo com um registro de uso mora no REGISTRO (`registro.nota`), não no
// lembrete: um registro pode apontar para uma nota; uma nota não aponta para
// registro nenhum.

/** O dia em que o lembrete aparece na agenda: o agendado ou, sem ele, o do lançamento. */
export function dataAgendada(l) {
  if (!l) return null;
  if (typeof l.data === "string" && l.data) return l.data;
  const lancado = l.lancadoEm ?? l.criadoEm;
  return typeof lancado === "string" && lancado.length >= 10 ? lancado.slice(0, 10) : null;
}

/** O dia do lançamento, como "AAAA-MM-DD". */
export const dataDeLancamento = (l) => {
  const lancado = l?.lancadoEm ?? l?.criadoEm;
  return typeof lancado === "string" && lancado.length >= 10 ? lancado.slice(0, 10) : null;
};

/** Quem o lembrete marcou (ids). */
export const pessoasDoLembrete = (l) => (Array.isArray(l?.pessoas) ? l.pessoas : []);

/** O lembrete é para esta pessoa: ela foi marcada, ou ninguém foi. Sem saber quem é você, é para você. */
export function lembreteParaMim(l, eu) {
  const marcadas = pessoasDoLembrete(l);
  return marcadas.length === 0 || !eu || marcadas.includes(eu);
}

/** As notas do conjunto, para um registro apontar. */
export const notasDe = (estado) => (estado?.lembretes ?? []).filter((l) => l.tipo === "nota");

/** A nota a que um registro aponta, se ela ainda existe. */
export const notaDoRegistro = (estado, r) => (r?.nota ? notasDe(estado).find((l) => l.id === r.nota) ?? null : null);

/** Os registros (com o item de cada um) que apontam para esta nota. */
export function registrosDaNota(estado, idDaNota) {
  const achados = [];
  for (const item of estado?.itens ?? []) {
    for (const r of item.registrosDeUso ?? []) if (r?.nota === idDaNota) achados.push({ item, registro: r });
  }
  return achados;
}

/**
 * Conjuntos de antes guardavam o vínculo na nota (`nota.registro`, o id de
 * um item). Ele passa para os registros daquele item no dia da nota (ou, sem
 * dia, para nenhum: não dá para saber qual era). O que já está no registro
 * fica; vínculo para uma nota que não existe mais some.
 */
export function vinculosNosRegistros(itens, lembretesAntigos, lembretes) {
  const notas = new Set(lembretes.filter((l) => l.tipo === "nota").map((l) => l.id));
  const antigos = (Array.isArray(lembretesAntigos) ? lembretesAntigos : []).filter(
    (l) => l && l.tipo !== "lista" && typeof l.registro === "string" && typeof l.data === "string" && notas.has(l.id),
  );
  return itens.map((item) => {
    if (!Array.isArray(item.registrosDeUso) || item.registrosDeUso.length === 0) return item;
    return {
      ...item,
      registrosDeUso: item.registrosDeUso.map((r) => {
        if (!r || typeof r !== "object") return r;
        if (typeof r.nota === "string" && notas.has(r.nota)) return r;
        const antiga = antigos.find((l) => l.registro === item.id && l.data === r.data);
        const { nota: _fora, ...sem } = r;
        return antiga ? { ...sem, nota: antiga.id } : sem;
      }),
    };
  });
}
