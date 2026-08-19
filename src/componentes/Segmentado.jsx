export default function Segmentado({ opcoes, valor, aoMudar, rotuloDoGrupo }) {
  return (
    <div className="segmentado" role="group" aria-label={rotuloDoGrupo}>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={o.valor === valor}
          onClick={() => aoMudar(o.valor)}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}
