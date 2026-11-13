// O perfil de quem usa este navegador: o nome (para achar "você" nos
// conjuntos) e quando avisar. Fica numa chave própria, fora dos conjuntos.

const CHAVE = "ceder:perfil";

export const AVISOS = [
  { chave: "vencimento", texto: "Faltarem 3 dias para um vencimento" },
  { chave: "ciclo", texto: "Um ciclo fechar, para marcar os dias fora" },
  { chave: "lembrete", texto: "Um lembrete estiver marcado para o dia" },
  { chave: "pagamento", texto: "Alguém ainda não tiver pago no fechamento" },
];

export const perfilVazio = () => ({
  nome: "",
  avisos: Object.fromEntries(AVISOS.map((a) => [a.chave, true])),
});

export function lerPerfil() {
  try {
    const cru = JSON.parse(window.localStorage.getItem(CHAVE) ?? "null");
    const base = perfilVazio();
    if (!cru || typeof cru !== "object") return base;
    return {
      nome: typeof cru.nome === "string" ? cru.nome : "",
      avisos: { ...base.avisos, ...(cru.avisos && typeof cru.avisos === "object" ? cru.avisos : {}) },
    };
  } catch {
    return perfilVazio();
  }
}

export function guardarPerfil(perfil) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(perfil));
    return true;
  } catch {
    return false;
  }
}
