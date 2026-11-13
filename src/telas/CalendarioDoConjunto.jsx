import { useState } from "react";
import { Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import PassoCalendario from "../passos/PassoCalendario.jsx";
import { hojeISO } from "../nucleo/resumo.js";
import { dentroDaJanela, janelaDoFechamento } from "../nucleo/calendario.js";

/** O calendário do conjunto, fora do Fechar contas: o mês e o dia tocado. */
export default function CalendarioDoConjunto({ app }) {
  const { estado, acoes, modo, voltar, nomeDoConjunto, abrirNotificacoes } = app;
  // Na temporada, abre no período dela quando hoje está fora.
  const [dia, setDia] = useState(() => {
    const hoje = hojeISO();
    if (modo.chave !== "temporada") return hoje;
    const periodo = janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte);
    return dentroDaJanela(hoje, periodo) ? hoje : periodo.de;
  });

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} acoes={[{ icone: "sino", rotulo: "Notificações", aoClicar: abrirNotificacoes }]} />
      <Sobrescrito>{nomeDoConjunto}</Sobrescrito>
      <h1 className="titulo-tela titulo-tela--grande">Calendário</h1>

      <div className="embutido embutido--calendario">
        <PassoCalendario estado={estado} acoes={acoes} modo={modo} secao="mes" diaAberto={dia} aoAbrirDia={setDia} solto />
      </div>

      {dia && (
        <div className="rodape-fixo rodape-fixo--sobre-barra">
          <button
            type="button"
            className="botao botao--largo"
            onClick={() => document.getElementById("acoes-do-dia")?.scrollIntoView({ behavior: "smooth", block: "center" })}
          >
            + Lançar no dia {Number(dia.slice(8, 10))}
          </button>
        </div>
      )}
    </div>
  );
}
