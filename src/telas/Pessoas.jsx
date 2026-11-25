import { Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { Membros } from "./Hub.jsx";

/** Pessoas: quem divide o conjunto, adicionar convidado, "Sou eu", admin. */
export default function Pessoas({ app }) {
  const { voltar, estado, modo } = app;
  return (
    <div className="tela">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito>{app.nomeDoConjunto}</Sobrescrito>
      <h1 className="titulo-tela titulo-tela--grande">Pessoas</h1>
      <p className="texto-apoio">
        {estado.moradores.length} {estado.moradores.length === 1 ? "pessoa divide" : "pessoas dividem"} {modo.palavras.oConjunto}.
      </p>
      <Membros app={app} />
    </div>
  );
}
