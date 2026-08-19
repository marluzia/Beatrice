import Rotulo from "./Rotulo.jsx";

export default function Seletor({
  rotulo,
  valor,
  aoMudar,
  opcoes,
  texto = false,
  largura = "campo--medio",
}) {
  return (
    <label className={`campo ${largura}`}>
      {rotulo && <Rotulo>{rotulo}</Rotulo>}
      <select
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className={texto ? "caixa caixa--texto" : "caixa"}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  );
}
