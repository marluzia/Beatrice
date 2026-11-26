import CabecalhoDoConjunto from "../componentes/CabecalhoDoConjunto.jsx";
import { Membros } from "./Hub.jsx";

/** Pessoas: quem divide o conjunto, adicionar convidado, "Sou eu", admin. */
export default function Pessoas({ app }) {
  const { voltar, estado, modo } = app;
  return (
    <div className="tela">
      <CabecalhoDoConjunto estado={estado} nome={app.nomeDoConjunto} aoVoltar={voltar} subtitulo="Pessoas" />
      <p className="texto-apoio">
        {estado.moradores.length} {estado.moradores.length === 1 ? "pessoa divide" : "pessoas dividem"} {modo.palavras.oConjunto}.
      </p>
      <Membros app={app} />
    </div>
  );
}
