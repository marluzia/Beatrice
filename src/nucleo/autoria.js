// Quem lançou o quê, e quando. Vale para os quatro tipos de lançamento:
// despesa avulsa (item), despesa cíclica (a fatura de um ciclo), registro de
// uso e lembrete. Cada um guarda `lancadoPor` (o id da pessoa) e `lancadoEm`
// (ISO). O que foi lançado antes de existir autoria fica sem autor; os
// lembretes antigos tinham `autor` e `criadoEm`, e os itens, `criadoEm`.

/** Quem lançou e quando, de qualquer lançamento (com os nomes antigos). */
export function autoriaDe(lancamento) {
  return {
    por: lancamento?.lancadoPor ?? lancamento?.autor ?? null,
    em: lancamento?.lancadoEm ?? lancamento?.criadoEm ?? null,
  };
}

/** O carimbo de um lançamento novo: quem é você neste conjunto, e agora. */
export const carimbo = (eu) => ({ lancadoPor: eu ?? null, lancadoEm: new Date().toISOString() });

/**
 * Quem pode editar um lançamento: quem lançou e o admin do conjunto. O que
 * não tem autor (veio de antes) qualquer um edita; e, enquanto ninguém disse
 * quem é e o conjunto não tem admin, não há de quem proteger.
 */
export function podeEditar(estado, lancamento, eu) {
  const { por } = autoriaDe(lancamento);
  if (!por) return true;
  if (eu) return eu === por || eu === estado?.admin;
  return !estado?.admin;
}
