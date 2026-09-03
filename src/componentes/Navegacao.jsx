export default function Navegacao({ passos, atual, aoEscolher, bloqueadosApos }) {
  return (
    <nav className="passos" aria-label="Etapas">
      {passos.map((p, i) => (
        <button
          key={p}
          type="button"
          className="passo-botao"
          aria-current={i === atual ? "step" : undefined}
          disabled={bloqueadosApos !== undefined && i > bloqueadosApos}
          onClick={() => aoEscolher(i)}
        >
          <span className="ordem">{String(i + 1).padStart(2, "0")}</span>
          {p}
        </button>
      ))}
    </nav>
  );
}
