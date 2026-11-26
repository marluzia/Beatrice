import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { AbasDePasta, emBreve } from "../componentes/Interface.jsx";
import { CabecalhoDaSecao, rotuloDaAba } from "../componentes/CabecalhoDoConjunto.jsx";

/**
 * Lançar despesas: a pasta Avulsa | Cíclica e os três jeitos de lançar.
 * Nunca mostra o que já foi lançado: isso fica em Ver despesas.
 */
export default function Despesas({ app, rota }) {
  const { modo, ir, voltar } = app;
  const semFaturas = modo.faturas === false;
  const [tipo, setTipo] = useState(!semFaturas && rota?.tipo === "ciclica" ? "ciclica" : "avulsa");

  const opcoes = [
    { valor: "avulsa", rotulo: "Avulsa" },
    ...(semFaturas ? [] : [{ valor: "ciclica", rotulo: "Cíclica" }]),
  ];

  return (
    <div className="tela">
      <CabecalhoDaSecao app={app} secao="Lançar despesas" subsecao={rotuloDaAba(opcoes, tipo)} />

      <AbasDePasta opcoes={opcoes} valor={tipo} aoMudar={setTipo} rotulo="Tipo de despesa">
        <div className="jeitos-de-lancar">
          <button type="button" className="jeito-de-lancar" onClick={() => emBreve("Importar arquivo")}>
            <Icone nome="importar" tamanho={26} />
            <strong>Importar arquivo</strong>
          </button>
          <button type="button" className="jeito-de-lancar" onClick={() => emBreve("Lançar por foto")}>
            <Icone nome="camera" tamanho={26} />
            <strong>Foto</strong>
          </button>
          <button
            type="button"
            className="jeito-de-lancar jeito-de-lancar--escuro"
            onClick={() => ir("lancar", { tipo })}
          >
            <Icone nome="lapis" tamanho={26} />
            <strong>Lançar manualmente</strong>
          </button>
        </div>
      </AbasDePasta>
    </div>
  );
}
