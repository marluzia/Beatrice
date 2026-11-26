import { useEffect, useState } from "react";
import { Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import PassoAgenda from "../passos/PassoAgenda.jsx";
import { hojeISO } from "../nucleo/resumo.js";
import { dentroDaJanela, janelaDoFechamento } from "../nucleo/calendario.js";

/** A agenda do conjunto, fora do Fechar contas: o mês e o dia tocado. */
export default function AgendaDoConjunto({ app }) {
  const { estado, acoes, modo, voltar, ir, nomeDoConjunto, abrirNotificacoes, esconderBarra } = app;
  // Abre no mês de hoje, sem dia escolhido. Na temporada, no período dela
  // quando hoje está fora.
  const [inicial] = useState(() => {
    const hoje = hojeISO();
    if (modo.chave !== "temporada") return hoje;
    const periodo = janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte);
    return dentroDaJanela(hoje, periodo) ? hoje : periodo.de;
  });
  const [dia, setDia] = useState(null);

  // Com um dia escolhido, a barra de baixo sai e fica só o "+ Lançar no dia";
  // tirar a seleção a traz de volta.
  useEffect(() => {
    esconderBarra?.(Boolean(dia));
  }, [dia, esconderBarra]);
  useEffect(() => () => esconderBarra?.(false), [esconderBarra]);

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} acoes={[{ icone: "sino", rotulo: "Notificações", aoClicar: abrirNotificacoes }]} />
      <Sobrescrito>{nomeDoConjunto}</Sobrescrito>
      <h1 className="titulo-tela titulo-tela--grande">Agenda</h1>

      <div className="embutido embutido--agenda">
        <PassoAgenda
          estado={estado}
          acoes={acoes}
          modo={modo}
          secao="mes"
          diaAberto={dia}
          diaInicial={inicial}
          aoAbrirDia={setDia}
          solto
          aoAbrirLancamento={(ref) => ir("lancamento", ref)}
          aoLancarNoDia={(tipo, data) =>
            tipo === "lembrete" ? ir("lancarLembrete", { tipo: "nota", data }) : ir("lancar", { tipo: "avulsa", data })
          }
        />
      </div>

      {dia && (
        <div className="rodape-fixo">
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
