import { CampoData, Segmentado } from "../componentes/index.js";
import { dinheiro } from "../componentes/Interface.jsx";
import LinhaDoTempo from "../passos/LinhaDoTempo.jsx";
import { corteValido, janelaDoFechamento, limitesDeHoje, somarDias, ultimoDiaDaJanela } from "../nucleo/calendario.js";
import { totalDaFatura } from "../nucleo/traducao/fatura.js";
import { antesDoPeriodo } from "../nucleo/naConta.js";
import { curta, hojeISO, nomeDe, periodoDe, STATUS_DA_DESPESA, statusDaDespesa, valorDeclarado } from "../nucleo/resumo.js";

/** O resumo "25/09 a 24/10 · 30 dias", no alto da aba. */
function Cabecalho({ estado, titulo }) {
  return (
    <div className="periodo-cabecalho">
      <span className="rotulo">{titulo}</span>
      <strong>{periodoDe(estado).texto}</strong>
    </div>
  );
}

/** O período das casas: com ou sem corte, a barra de arrastar e as duas datas. */
function PeriodoDasFaturas({ estado, acoes, limites }) {
  const comCorte = corteValido(estado.corte);
  const janela = janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte);
  const fim = ultimoDiaDaJanela(janela);

  return (
    <section className="cartao cartao--periodo">
      <Cabecalho estado={estado} titulo="Período do fechamento" />
      <Segmentado
        rotuloDoGrupo="Usar período de corte"
        opcoes={[
          { valor: "nao", texto: "Sem corte" },
          { valor: "sim", texto: "Com período de corte" },
        ]}
        valor={comCorte ? "sim" : "nao"}
        aoMudar={(v) => acoes.alternarCorte(v === "sim")}
      />
      <LinhaDoTempo estado={estado} comCorte={comCorte} aoMudarCorte={acoes.definirJanelaDeCorte} />
      <div className="linha-campos linha-campos--duas">
        <CampoData
          rotulo="Início"
          valor={janela.de}
          min={limites.min}
          max={fim}
          aoMudar={(v) => v && v <= fim && acoes.definirJanelaDeCorte({ de: v, ate: janela.ate })}
          etiqueta="Primeiro dia do período"
        />
        <CampoData
          rotulo="Fim"
          valor={fim}
          min={janela.de}
          max={limites.max}
          aoMudar={(v) => v && v >= janela.de && acoes.definirJanelaDeCorte({ de: janela.de, ate: somarDias(v, 1) })}
          etiqueta="Último dia do período"
        />
      </div>
      <p className="ajuda-campo">
        {comCorte
          ? "Com corte, o período é o trecho que vocês escolheram (até 30 dias antes e depois dos ciclos). Cada conta entra no período em que cai a sua leitura final."
          : "Sem corte, o período vai do começo do ciclo que começa primeiro ao fim do que termina por último. Arrastar as bolinhas liga o período de corte (até 30 dias antes e depois dos ciclos)."}{" "}
        O início não vai antes de {curta(limites.min)} (40 dias atrás).
      </p>
    </section>
  );
}

/** O período da temporada: início e fim, sem barra de ciclos. */
function PeriodoDaTemporada({ estado, acoes, limites }) {
  const janela = janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte);
  const fim = ultimoDiaDaJanela(janela);
  return (
    <section className="cartao cartao--periodo">
      <Cabecalho estado={estado} titulo="Período da temporada" />
      <div className="linha-campos linha-campos--duas">
        <CampoData
          rotulo="Início"
          valor={janela.de}
          min={limites.min}
          max={limites.max}
          aoMudar={(v) => v && acoes.definirPeriodoDaTemporada(v, v > fim ? v : fim)}
          etiqueta="Início da temporada"
        />
        <CampoData
          rotulo="Fim"
          valor={fim}
          min={janela.de}
          max={limites.max}
          aoMudar={(v) => v && v >= janela.de && acoes.definirPeriodoDaTemporada(janela.de, v)}
          etiqueta="Fim da temporada"
        />
      </div>
      <p className="ajuda-campo">
        As estadias marcadas no calendário dentro deste período dão o peso de cada um nas divisões por dias e por
        presença. O início vai até 40 dias para trás; o fim, até 2 anos para a frente.
      </p>
    </section>
  );
}

/**
 * As despesas de antes do período. As que estão em aberto (ou que o grupo já
 * tirou) ganham a escolha: entram na conta deste fechamento ou ficam de fora.
 */
function AntesDoPeriodo({ estado, acoes, hoje }) {
  const { janela, itens, ciclos } = antesDoPeriodo(estado);
  const linhas = [
    ...itens.map((i) => ({
      tipo: "avulsa",
      id: i.id,
      nome: i.nome?.trim() || "Despesa sem nome",
      quando: curta(i.ate && i.ate > i.data ? i.ate : i.data),
      valor: valorDeclarado(i),
      status: statusDaDespesa(i, hoje),
      naConta: i.naConta !== false,
      pagoPor: i.pagoPor,
    })),
    ...ciclos.map((c) => ({
      tipo: "ciclica",
      id: c.id,
      nome: c.nome || "Conta",
      quando: `termina ${curta(ultimoDiaDaJanela(c.janela))}`,
      valor: totalDaFatura(c),
      status: statusDaDespesa(c, hoje),
      naConta: c.naConta !== false,
      pagoPor: c.pagoPor,
    })),
  ].filter((d) => d.status !== "paga" || !d.naConta);

  if (linhas.length === 0) return null;

  return (
    <section className="antes-do-periodo">
      <h3 className="titulo-secao__texto titulo-secao__texto--solto">
        Antes do <em>período</em>
      </h3>
      <p className="ajuda-campo">
        Estas despesas são de antes de {curta(janela.de)} e estão em aberto. Escolham se entram na conta deste
        fechamento.
      </p>
      <div className="cartao-lista">
        {linhas.map((d) => {
          const s = STATUS_DA_DESPESA[d.status];
          return (
            <div key={`${d.tipo}-${d.id}`} className={`linha-antes ${d.naConta ? "" : "linha-antes--fora"}`}>
              <span className="linha-antes__textos">
                <strong>{d.nome}</strong>
                <span>
                  <span className={`status-despesa status-despesa--${s.tom}`}>{s.rotulo}</span> {d.quando}
                  {d.valor > 0 ? ` · ${dinheiro(d.valor)}` : ""}
                  {d.pagoPor ? ` · ${nomeDe(estado, d.pagoPor)} pagou` : ""}
                </span>
              </span>
              <select
                className="caixa caixa--texto linha-antes__escolha"
                aria-label={`${d.nome} entra na conta?`}
                value={d.naConta ? "sim" : "nao"}
                onChange={(e) => acoes.definirNaConta(d.tipo, d.id, e.target.value === "sim")}
              >
                <option value="sim">Entra na conta</option>
                <option value="nao">Fica de fora</option>
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** A aba Período do painel. */
export default function PainelDoPeriodo({ app }) {
  const { estado, modo, acoes } = app;
  const hoje = hojeISO();
  const limites = limitesDeHoje(hoje);
  return (
    <div className="painel-do-periodo">
      {modo.chave === "temporada" ? (
        <PeriodoDaTemporada estado={estado} acoes={acoes} limites={limites} />
      ) : (
        <PeriodoDasFaturas estado={estado} acoes={acoes} limites={limites} />
      )}
      <AntesDoPeriodo estado={estado} acoes={acoes} hoje={hoje} />
    </div>
  );
}

/** Este conjunto tem período? (As casas e a temporada; o evento não.) */
export const temPeriodo = (modo) => modo.faturas !== false || modo.chave === "temporada";
