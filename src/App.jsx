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
    // matchMedia e scrollTo com opções não existem em toda WebView. Numa
    // falha aqui, o React derruba a árvore inteira e a pessoa vê tela branca
    // por causa de uma animação de rolagem.
    try {
      const reduz =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduz ? "auto" : "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
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

      <div className="salvamento">
        <span>
          Os dados preenchidos estão salvos neste navegador. Fechar a aba não os apaga. Exceto se limpar ou trocar de aparelho.
        </span>
        <Botao
          tipo="fantasma"
          aoClicar={() => {
            const certeza = window.confirm(
              "Isso apaga a casa salva neste navegador e começa do zero. Continuar?",
            );
            if (certeza) {
              acoes.recomecar();
              irPara(0);
            }
          }}
        >
          Recomeçar
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
