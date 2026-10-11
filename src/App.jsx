import { useEffect, useState } from "react";
import { Alerta, Botao, Cabecalho, Navegacao } from "./componentes/index.js";
import { faltasDoFechamento } from "./nucleo/calendario.js";
import { passosDe } from "./nucleo/modos.js";
import { useCDR } from "./ganchos/useCDR.js";
import PainelDeCasas from "./passos/PainelDeCasas.jsx";
import PassoContas from "./passos/PassoContas.jsx";
import PassoMoradores from "./passos/PassoMoradores.jsx";
import PassoItens from "./passos/PassoItens.jsx";
import PassoCalendario from "./passos/PassoCalendario.jsx";
import PassoRateio from "./passos/PassoRateio.jsx";

const TELAS = {
  contas: PassoContas,
  moradores: PassoMoradores,
  itens: PassoItens,
  calendario: PassoCalendario,
  rateio: PassoRateio,
};

function aoTopo() {
  try {
    const reduz =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduz ? "auto" : "smooth" });
  } catch {
    window.scrollTo(0, 0);
  }
}

export default function App() {
  const [passo, setPasso] = useState(0);
  const { estado, resultado, indicePorId, modo, idDaCasa, casas, acoes } = useCDR();

  // Trocar de conjunto recomeça o assistente no primeiro passo.
  useEffect(() => setPasso(0), [idDaCasa]);

  if (!estado) {
    return (
      <div className="folha">
        <Cabecalho />
        <main>
          <PainelDeCasas casas={casas} acoes={acoes} />
        </main>
        <footer className="rodape">
          <p>CEDER | Divisão de Despesas</p>
        </footer>
      </div>
    );
  }

  const passos = passosDe(modo.chave);
  const titulos = passos.map((p) => p.titulo);

  const faltas = modo.faturas ? faltasDoFechamento(estado.faturas) : [];
  const preso = faltas.length > 0;
  const indiceDasContas = passos.findIndex((p) => p.chave === "contas");

  const irPara = (i) => {
    if (preso && indiceDasContas >= 0 && i > indiceDasContas) {
      setPasso(indiceDasContas);
      return;
    }
    setPasso(Math.max(0, Math.min(passos.length - 1, i)));
    aoTopo();
  };

  const atual = passos[Math.min(passo, passos.length - 1)];
  const Tela = TELAS[atual.chave];
  const comuns = { estado, resultado, indicePorId, modo, acoes };

  const nomeDoConjunto = casas.find((c) => c.id === idDaCasa)?.nome;

  return (
    <div className="folha">
      <Cabecalho
        casa={nomeDoConjunto}
        modo={modo}
        aoSair={() => {
          acoes.fecharCasa();
          aoTopo();
        }}
      />

      <Navegacao
        passos={titulos}
        atual={passo}
        aoEscolher={irPara}
        bloqueadosApos={preso && indiceDasContas >= 0 ? indiceDasContas : undefined}
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
            Se não tiver as datas em mãos, deixe as duas em branco que o
            fechamento passa a valer o mês inteiro, ou desligue a fatura.
          </p>
        </Alerta>
      )}

      <main>
        <Tela {...comuns} />
      </main>

      <div className="barra-acoes">
        <Botao tipo="fantasma" aoClicar={() => irPara(passo - 1)} desabilitado={passo === 0}>
          Voltar
        </Botao>
        <Botao
          aoClicar={() => irPara(passo + 1)}
          desabilitado={passo === passos.length - 1 || preso}
        >
          {passo === passos.length - 2 ? `Ver ${passos[passos.length - 1].titulo.toLowerCase()}` : "Continuar"}
        </Botao>
      </div>

      <div className="salvamento">
        <span>
          O que você preencheu está salvo neste navegador, neste conjunto.
          Fechar a aba não apaga. Limpar os dados do site, sim.
        </span>
        <Botao
          tipo="fantasma"
          aoClicar={() => {
            const certeza = window.confirm(
              `Isso zera "${nomeDoConjunto ?? "este conjunto"}" e começa do zero, mantendo o tipo dele. Continuar?`,
            );
            if (certeza) {
              acoes.recomecar();
              irPara(0);
            }
          }}
        >
          Zerar este conjunto
        </Botao>
      </div>

      <footer className="rodape">
        <p>CEDER | Divisão de Despesas</p>
      </footer>
    </div>
  );
}
