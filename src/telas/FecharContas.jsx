import { useState } from "react";
import { Alerta, Navegacao } from "../componentes/index.js";
import { TopoDaTela } from "../componentes/Interface.jsx";
import { faltasDoFechamento } from "../nucleo/calendario.js";
import { passosDe } from "../nucleo/modos.js";
import { periodoDe } from "../nucleo/resumo.js";
import { MESES } from "../nucleo/formato.js";
import PassoContas from "../passos/PassoContas.jsx";
import PassoMoradores from "../passos/PassoMoradores.jsx";
import PassoItens from "../passos/PassoItens.jsx";
import PassoAgenda from "../passos/PassoAgenda.jsx";
import PassoRateio from "../passos/PassoRateio.jsx";
import { secoesDaEtapa, vizinha } from "../passos/secoes.js";

const TELAS = {
  contas: PassoContas,
  moradores: PassoMoradores,
  itens: PassoItens,
  agenda: PassoAgenda,
  rateio: PassoRateio,
};

function aoTopo() {
  try {
    window.scrollTo({ top: 0, behavior: "instant" });
  } catch {
    window.scrollTo(0, 0);
  }
}

/**
 * Fechar contas: o assistente de sempre (pessoas, contas, itens, agenda,
 * rateio), uma seção por vez, com a linha de etapas no topo.
 */
export default function FecharContas({ app, rota }) {
  const { estado, resultado, indicePorId, modo, acoes, nomeDoConjunto, voltar, eu, perfil, ir } = app;
  const passos = passosDe(modo);

  const inicioPedido = rota?.passo ? Math.max(0, passos.findIndex((p) => p.chave === rota.passo)) : 0;
  const [passo, setPasso] = useState(inicioPedido);
  const [secao, setSecao] = useState(() => {
    if (!rota?.secao) return 0;
    const n = secoesDaEtapa(passos[inicioPedido]?.chave, estado, modo).findIndex((s) => s.chave === rota.secao);
    return Math.max(0, n);
  });

  const faltas = modo.faturas ? faltasDoFechamento(estado.ciclos) : [];
  const preso = faltas.length > 0;
  const indiceDasContas = passos.findIndex((p) => p.chave === "contas");
  const secoesDe = (i) => secoesDaEtapa(passos[i]?.chave, estado, modo);

  const irPara = (i, s = 0) => {
    if (preso && indiceDasContas >= 0 && i > indiceDasContas) {
      setPasso(indiceDasContas);
      setSecao(0);
      aoTopo();
      return;
    }
    const alvo = Math.max(0, Math.min(passos.length - 1, i));
    const quantas = secoesDe(alvo).length;
    setPasso(alvo);
    setSecao(Math.max(0, Math.min(quantas - 1, s)));
    aoTopo();
  };

  const indice = Math.min(passo, passos.length - 1);
  const atual = passos[indice];
  const Tela = TELAS[atual.chave];
  const secoes = secoesDe(indice);
  const nDaSecao = Math.min(secao, secoes.length - 1);
  const ultimaSecao = nDaSecao === secoes.length - 1;
  const ultimaEtapa = indice === passos.length - 1;
  const quantas = passos.map((_, i) => secoesDe(i).length);

  const proxima = vizinha({ passo: indice, secao: nDaSecao }, 1, quantas);
  const travaAoAvancar = preso && ultimaSecao && indiceDasContas >= 0 && indice >= indiceDasContas;
  const rotuloDaProxima = !proxima
    ? "Concluir"
    : proxima.passo === indice
      ? secoes[proxima.secao].titulo
      : passos[proxima.passo].titulo;

  const irParaSecao = (chave) => {
    const n = secoes.findIndex((x) => x.chave === chave);
    if (n >= 0) irPara(indice, n);
  };

  const periodo = periodoDe(estado);
  const titulo = modo.faturas === false ? "Fechar contas" : `Fechar contas de ${MESES[estado.periodo.mes - 1]}`;

  const comuns = {
    estado,
    resultado,
    indicePorId,
    modo,
    acoes,
    nomeDoConjunto,
    secao: secoes[nDaSecao].chave,
    irParaSecao,
    eu,
    perfil,
    ir,
  };

  return (
    <div className="tela tela--assistente tela--com-rodape">
      <div className="assistente-topo">
        <div className="assistente-topo__titulo">
          <TopoDaTela aoVoltar={voltar} fechar />
          <div>
            <h1 className="titulo-assistente">{titulo}</h1>
            <p className="texto-apoio texto-apoio--colado">
              {nomeDoConjunto} · {periodo.texto}
            </p>
          </div>
        </div>
        <Navegacao
          passos={passos.map((p) => p.titulo)}
          atual={indice}
          aoEscolher={(i) => irPara(i)}
          bloqueadosApos={preso && indiceDasContas >= 0 ? indiceDasContas : undefined}
          secoes={secoes.length > 1 ? secoes.map((x) => x.titulo) : null}
          secaoAtual={nDaSecao}
          aoEscolherSecao={(n) => irPara(indice, n)}
        />
      </div>

      {preso && indice >= indiceDasContas && (
        <Alerta nivel="erro">
          <p>Para seguir, resolva o período das faturas:</p>
          <ul>
            {faltas.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p>
            Se não tiver as datas em mãos, deixe as duas em branco que o fechamento passa a valer o mês inteiro, ou
            desligue a fatura.
          </p>
        </Alerta>
      )}

      <div className="embutido">
        <Tela {...comuns} />
      </div>

      <div className="rodape-fixo rodape-fixo--dois">
        <button
          type="button"
          className="botao botao--fantasma"
          onClick={() => {
            const anterior = vizinha({ passo: indice, secao: nDaSecao }, -1, quantas);
            if (anterior) irPara(anterior.passo, anterior.secao);
            else voltar();
          }}
        >
          Voltar
        </button>
        <button
          type="button"
          className="botao"
          disabled={travaAoAvancar}
          onClick={() => {
            if (!proxima || (ultimaEtapa && ultimaSecao)) voltar();
            else irPara(proxima.passo, proxima.secao);
          }}
        >
          {rotuloDaProxima}
        </button>
      </div>
    </div>
  );
}
