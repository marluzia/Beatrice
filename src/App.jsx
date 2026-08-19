import { useState } from "react";
import { Botao, Cabecalho, Navegacao } from "./componentes/index.js";
import { useCDR } from "./ganchos/useCDR.js";
import PassoContas from "./passos/PassoContas.jsx";
import PassoMoradores from "./passos/PassoMoradores.jsx";
import PassoItens from "./passos/PassoItens.jsx";
import PassoRateio from "./passos/PassoRateio.jsx";

const PASSOS = ["Contas", "Moradores", "Itens", "Rateio"];

export default function App() {
  const [passo, setPasso] = useState(0);
  const { estado, resultado, indicePorId, acoes } = useCDR();

  const irPara = (i) => {
    setPasso(Math.max(0, Math.min(PASSOS.length - 1, i)));
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: suave ? "smooth" : "auto" });
  };

  const comuns = { estado, resultado, indicePorId, acoes };

  return (
    <div className="folha">
      <Cabecalho />
      <Navegacao passos={PASSOS} atual={passo} aoEscolher={irPara} />

      <main>
        {passo === 0 && <PassoContas {...comuns} />}
        {passo === 1 && <PassoMoradores {...comuns} />}
        {passo === 2 && <PassoItens {...comuns} />}
        {passo === 3 && <PassoRateio {...comuns} />}
      </main>

      <div className="barra-acoes">
        <Botao tipo="fantasma" aoClicar={() => irPara(passo - 1)} desabilitado={passo === 0}>
          Voltar
        </Botao>
        <Botao aoClicar={() => irPara(passo + 1)} desabilitado={passo === PASSOS.length - 1}>
          {passo === 2 ? "Ver o rateio" : "Continuar"}
        </Botao>
      </div>

      <footer className="rodape">
        <p>
          por marluzia😽
        </p>
      </footer>
    </div>
  );
}
