import { useState } from "react";
import { Alerta, Botao, Cabecalho, Navegacao } from "./componentes/index.js";
import { faltasDoFechamento } from "./nucleo/calendario.js";
import { useCDR } from "./ganchos/useCDR.js";
import PassoContas from "./passos/PassoContas.jsx";
import PassoMoradores from "./passos/PassoMoradores.jsx";
import PassoItens from "./passos/PassoItens.jsx";
import PassoRateio from "./passos/PassoRateio.jsx";

const PASSOS = ["Contas", "Moradores", "Itens", "Rateio"];

export default function App() {
  const [passo, setPasso] = useState(0);
  const { estado, resultado, indicePorId, acoes } = useCDR();

  const faltas = faltasDoFechamento(estado.faturas);
  const preso = faltas.length > 0;

  const irPara = (i) => {
    if (preso && i > 0) {
      setPasso(0);
      return;
    }
    setPasso(Math.max(0, Math.min(PASSOS.length - 1, i)));
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
      <Navegacao
        passos={PASSOS}
        atual={passo}
        aoEscolher={irPara}
        bloqueadosApos={preso ? 0 : undefined}
      />

      {preso && (
        <Alerta nivel="erro">
          <p>Para seguir, resolva o período das faturas:</p>
          <ul>
            {faltas.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p>
            Se não tiver as datas em mãos, deixe as duas em branco — o
            fechamento passa a valer o mês inteiro — ou desligue a fatura.
          </p>
        </Alerta>
      )}

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
        <Botao
          aoClicar={() => irPara(passo + 1)}
          desabilitado={passo === PASSOS.length - 1 || preso}
        >
          {passo === 2 ? "Ver o rateio" : "Continuar"}
        </Botao>
      </div>

      <div className="salvamento">
        <span>
          Os dados preenchidos estão salvos no seu navegador. Fechar a aba não os apaga. Exceto se limpar ou trocar de aparelho.
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
          por marialuzia😽
        </p>
      </footer>
    </div>
  );
}
