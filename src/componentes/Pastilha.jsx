export default function Pastilha({ cor, nome, ativo, aoClicar }) {
  return (
    <button
      type="button"
      className="pastilha"
      aria-pressed={ativo}
      onClick={aoClicar}
      style={{
        borderColor: ativo ? cor : "var(--regua)",
        background: ativo ? `${cor}1A` : "transparent",
      }}
    >
      <span className="ponto" style={{ background: ativo ? cor : "var(--regua)" }} />
      {nome}
    </button>
  );
}
