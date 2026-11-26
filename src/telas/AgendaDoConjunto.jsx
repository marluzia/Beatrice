import { useEffect, useState } from "react";
import CabecalhoDoConjunto from "../componentes/CabecalhoDoConjunto.jsx";
import PassoAgenda from "../passos/PassoAgenda.jsx";
import { hojeISO } from "../nucleo/resumo.js";
import { dentroDaJanela, janelaDoFechamento } from "../nucleo/calendario.js";

/** A agenda do conjunto, fora do Fechar contas: o mês e o dia tocado. */
export default function AgendaDoConjunto({ app }) {
  const { estado, acoes, modo, voltar, ir, nomeDoConjunto, esconderBarra } = app;
  // Abre no mês de hoje, sem dia escolhido. Na temporada, no período dela
  // quando hoje está fora.
  const [inicial] = useState(() => {
    const hoje = hojeISO();
    if (modo.chave !== "temporada") return hoje;
    const periodo = janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte);
    return dentroDaJanela(hoje, periodo) ? hoje : periodo.de;
  });
  const [dia, setDia] = useState(null);
  // O lápis do cabeçalho leva ao "lançar no dia": abre o dia (hoje, se nenhum
  // estava aberto) e desce até as ações dele, sem pulo.
  const [descer, setDescer] = useState(0);
  const lancarNoDia = () => {
    if (!dia) setDia(inicial);
    setDescer((n) => n + 1);
  };
  useEffect(() => {
    if (!descer) return undefined;
    const quadro = requestAnimationFrame(() => {
      const reduz = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("acoes-do-dia")?.scrollIntoView?.({ behavior: reduz ? "auto" : "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(quadro);
  }, [descer]);

  // Com um dia escolhido, a barra de baixo sai e fica só o "+ Lançar no dia";
  // tirar a seleção a traz de volta.
  useEffect(() => {
    esconderBarra?.(Boolean(dia));
  }, [dia, esconderBarra]);
  useEffect(() => () => esconderBarra?.(false), [esconderBarra]);

  return (
    <div className="tela tela--com-rodape">
      <CabecalhoDoConjunto
        estado={estado}
        nome={nomeDoConjunto}
        aoVoltar={voltar}
        subtitulo="Agenda"
        acoes={[{ icone: "editar", rotulo: "Lançar no dia", aoClicar: lancarNoDia }]}
      />

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

      {/* No lugar da barra de baixo, que sai enquanto um dia está aberto. */}
      {dia && (
        <div className="rodape-fixo rodape-fixo--agenda">
          <button type="button" className="botao botao--largo" onClick={lancarNoDia}>
            Lançar no dia {Number(dia.slice(8, 10))}
          </button>
        </div>
      )}
    </div>
  );
}
