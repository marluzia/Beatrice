/**
 * O símbolo de cada ciclo no calendário e na linha do tempo: gota para a água,
 * raio para a luz, círculo para os ciclos criados pelo grupo.
 */
export default function SimboloDoCiclo({ ciclo, tamanho = 10, titulo }) {
  const nome = titulo ?? ciclo?.nome ?? "Conta";
  const comum = { width: tamanho, height: tamanho, viewBox: "0 0 10 10", role: "img", "aria-label": nome, className: `simbolo-ciclo simbolo-ciclo--${ciclo?.id === "agua" || ciclo?.id === "luz" ? ciclo.id : "outro"}` };

  if (ciclo?.id === "agua") {
    return (
      <svg {...comum}>
        <title>{nome}</title>
        <path d="M5 0.6 C5 0.6 1.6 4.6 1.6 6.5 A3.4 3.4 0 0 0 8.4 6.5 C8.4 4.6 5 0.6 5 0.6 Z" fill="currentColor" />
      </svg>
    );
  }
  if (ciclo?.id === "luz") {
    return (
      <svg {...comum}>
        <title>{nome}</title>
        <path d="M6.2 0.4 L1.8 5.6 L4.6 5.6 L3.6 9.6 L8.2 4 L5.4 4 Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...comum}>
      <title>{nome}</title>
      <circle cx="5" cy="5" r="3.4" fill="currentColor" />
    </svg>
  );
}
