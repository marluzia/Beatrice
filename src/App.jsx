import { useEffect, useState } from "react";
import { Alerta, Botao, Cabecalho, Navegacao } from "./componentes/index.js";
import { faltasDoFechamento } from "./nucleo/calendario.js";
import { passosDe } from "./nucleo/modos.js";
import { useCDR } from "./ganchos/useCDR.js";
import PainelDeConjuntos from "./passos/PainelDeConjuntos.jsx";
import PassoContas from "./passos/PassoContas.jsx";
import PassoMoradores from "./passos/PassoMoradores.jsx";
import PassoItens from "./passos/PassoItens.jsx";
import PassoCalendario from "./passos/PassoCalendario.jsx";
import PassoRateio from "./passos/PassoRateio.jsx";
import { secoesDaEtapa, vizinha } from "./passos/secoes.js";

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
  // A macrosseção aberta dentro da etapa: uma por vez.
  const [secao, setSecao] = useState(0);
  const { estado, resultado, indicePorId, modo, idDoConjunto, conjuntos, acoes } = useCDR();

  // Trocar de conjunto recomeça o assistente no primeiro passo.
  useEffect(() => {
    setPasso(0);
    setSecao(0);
  }, [idDoConjunto]);

  if (!estado) {
    return (
      <div className="folha">
        <Cabecalho />
        <main>
          <PainelDeConjuntos conjuntos={conjuntos} acoes={acoes} />
        </main>
        <footer className="rodape">
          <p>CEDER | Finanças Coletivas</p>
        </footer>
      </div>
    );
  }

  const passos = passosDe(modo);
  const titulos = passos.map((p) => p.titulo);

  const faltas = modo.faturas ? faltasDoFechamento(estado.ciclos) : [];
  const preso = faltas.length > 0;
  const indiceDasContas = passos.findIndex((p) => p.chave === "contas");

  const secoesDe = (i) => secoesDaEtapa(passos[i]?.chave, estado, modo);

  /** Vai para a etapa `i`, na seção `s`. */
  const irPara = (i, s = 0) => {
    if (preso && indiceDasContas >= 0 && i > indiceDasContas) {
      setPasso(indiceDasContas);
      return;
    }
    const alvo = Math.max(0, Math.min(passos.length - 1, i));
    const quantas = secoesDe(alvo).length;
    setPasso(alvo);
    setSecao(Math.max(0, Math.min(quantas - 1, s)));
    aoTopo();
  };

  const nomeDoConjunto = conjuntos.find((c) => c.id === idDoConjunto)?.nome;

  const indice = Math.min(passo, passos.length - 1);
  const atual = passos[indice];
  const Tela = TELAS[atual.chave];

  const secoes = secoesDe(indice);
  const nDaSecao = Math.min(secao, secoes.length - 1);
  const ultimaSecao = nDaSecao === secoes.length - 1;
  const ultimaEtapa = indice === passos.length - 1;

  const irParaSecao = (chave) => {
    const n = secoes.findIndex((x) => x.chave === chave);
    if (n >= 0) irPara(indice, n);
  };

  const quantas = passos.map((_, i) => secoesDe(i).length);
  const ir = (sentido) => {
    const alvo = vizinha({ passo: indice, secao: nDaSecao }, sentido, quantas);
    if (alvo) irPara(alvo.passo, alvo.secao);
  };
  const avancar = () => ir(1);
  const recuar = () => ir(-1);
  const travaAoAvancar = preso && ultimaSecao && indiceDasContas >= 0 && indice >= indiceDasContas;

  const comuns = {
    estado,
    resultado,
    indicePorId,
    modo,
    acoes,
    nomeDoConjunto,
    secao: secoes[nDaSecao].chave,
    irParaSecao,
  };

  return (
    <div className="folha">
      <Cabecalho
        conjunto={nomeDoConjunto}
        modo={modo}
        aoSair={() => {
          acoes.fecharConjunto();
          aoTopo();
        }}
      />

      {/* As etapas ficam grudadas no topo, com as seções da etapa atual logo embaixo. */}
      <div className="topo-fixo">
        <Navegacao
          passos={titulos}
          atual={indice}
          aoEscolher={(i) => irPara(i)}
          bloqueadosApos={preso && indiceDasContas >= 0 ? indiceDasContas : undefined}
          secoes={secoes.length > 1 ? secoes.map((x) => x.titulo) : null}
          secaoAtual={nDaSecao}
          aoEscolherSecao={(n) => irPara(indice, n)}
        />
      </div>

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
        <Botao tipo="fantasma" aoClicar={recuar} desabilitado={indice === 0 && nDaSecao === 0}>
          Voltar
        </Botao>
        <Botao aoClicar={avancar} desabilitado={(ultimaEtapa && ultimaSecao) || travaAoAvancar}>
          {indice === passos.length - 2 && ultimaSecao
            ? `Ver ${passos[passos.length - 1].titulo.toLowerCase()}`
            : "Continuar"}
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
        <p>CEDER | Finanças Coletivas</p>
      </footer>
    </div>
  );
}
