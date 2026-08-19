import Rotulo from "./Rotulo.jsx";

export default function Campo({
  rotulo,
  valor,
  aoMudar,
  sufixo,
  placeholder,
  largura = "",
  tipoDeTeclado = "decimal",
  texto = false,
  rotuloSolto = false,
}) {
  return (
    <label className={`campo ${largura}`}>
      {rotulo && <Rotulo solto={rotuloSolto}>{rotulo}</Rotulo>}
      <span className="campo-corpo">
        <input
          type="text"
          inputMode={texto ? "text" : tipoDeTeclado}
          value={valor}
          placeholder={placeholder}
          onChange={(e) => aoMudar(e.target.value)}
          className={texto ? "caixa caixa--texto" : "caixa"}
        />
        {sufixo && <span className="sufixo">{sufixo}</span>}
      </span>
    </label>
  );
}
