export default function Botao({
  children,
  aoClicar,
  tipo = "primario",
  quadrado = false,
  desabilitado = false,
  rotuloAcessivel,
}) {
  const classes = [
    "botao",
    tipo === "fantasma" ? "botao--fantasma" : "",
    quadrado ? "botao--quadrado" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      onClick={aoClicar}
      disabled={desabilitado}
      aria-label={rotuloAcessivel}
    >
      {children}
    </button>
  );
}
