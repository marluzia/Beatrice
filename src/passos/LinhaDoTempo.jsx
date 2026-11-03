import { SimboloDoCiclo } from "../componentes/index.js";
import {
  LIMITE_DO_PERIODO,
  cicloValido,
  distanciaEmDias,
  janelaDoFechamento,
  janelaTotal,
  limitesDoCorte,
  somarDias,
  ultimoDiaDaJanela,
} from "../nucleo/calendario.js";
import { ciclosLigados, naOrdemDaTela } from "../nucleo/ciclos.js";

const curto = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;


/**
 * A figura dos ciclos ao longo do período: uma barra por conta ligada, na
 * mesma escala de dias, e embaixo a barra do período. Duas linhas tracejadas
 * pretas descem pelas barras nas bordas do período, para se ver de relance o
 * que fica dentro e o que fica fora dele.
 *
 * A barra do período tem duas bolinhas: arrastar qualquer uma muda o início
 * ou o fim do corte, e as datas acompanham.
 */
export default function LinhaDoTempo({ estado, comCorte = false, aoMudarCorte }) {
  const ciclos = naOrdemDaTela(ciclosLigados(estado)).filter((c) => cicloValido(c.janela));
  const periodo = janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte);
  const total = janelaTotal(estado.ciclos, estado.periodo, estado.corte);

  // A escala vai de onde o corte pode começar até onde ele pode terminar:
  // 30 dias antes do primeiro ciclo e 30 depois do último. Assim as bolinhas
  // não passam desses limites. (Um corte antigo que já esteja fora deles
  // continua aparecendo inteiro.)
  const limites = limitesDoCorte(estado.ciclos, estado.periodo);
  const de = [limites.de, total.de, periodo.de].sort()[0];
  const ate = [limites.ate, total.ate, periodo.ate].sort().pop();
  const dias = Math.max(1, distanciaEmDias(de, ate));
  const pct = (iso) => `${(distanciaEmDias(de, iso) / dias) * 100}%`;
  const posicao = (janela) => ({
    left: pct(janela.de),
    width: `${(distanciaEmDias(janela.de, janela.ate) / dias) * 100}%`,
  });

  // As linhas tracejadas das bordas do período, desenhadas em cada trilho:
  // empilhadas, elas formam uma linha só que corta as barras de cima.
  const bordas = (
    <>
      <span className="linha-do-tempo__borda" style={{ left: pct(periodo.de) }} />
      <span className="linha-do-tempo__borda" style={{ left: pct(periodo.ate) }} />
    </>
  );

  const inicio = distanciaEmDias(de, periodo.de);
  const fim = distanciaEmDias(de, periodo.ate);

  /** Move uma das bolinhas, sem deixar o período virar do avesso nem passar do limite. */
  const mover = (qual, valor) => {
    let a = qual === "inicio" ? Number(valor) : inicio;
    let b = qual === "fim" ? Number(valor) : fim;
    if (qual === "inicio") {
      a = Math.min(a, b - 1);
      if (b - a > LIMITE_DO_PERIODO) b = a + LIMITE_DO_PERIODO;
    } else {
      b = Math.max(b, a + 1);
      if (b - a > LIMITE_DO_PERIODO) a = b - LIMITE_DO_PERIODO;
    }
    aoMudarCorte?.({ de: somarDias(de, a), ate: somarDias(de, b) });
  };

  return (
    <div className="linha-do-tempo" role="group" aria-label="Os ciclos das contas ao longo do período">
      {ciclos.length === 0 && (
        <p className="dica">
          Ligue uma conta e preencha as datas de leitura dela para ver os ciclos ao longo do período.
        </p>
      )}

      {ciclos.map((c) => (
        <div className="linha-do-tempo__linha" key={c.id}>
          <span className="linha-do-tempo__nome">
            <SimboloDoCiclo ciclo={c} tamanho={11} /> {c.nome}
          </span>
          <span className="linha-do-tempo__trilho">
            <span
              className={`linha-do-tempo__barra linha-do-tempo__barra--${c.id === "agua" || c.id === "luz" ? c.id : "outro"}`}
              style={posicao(c.janela)}
            />
            {bordas}
          </span>
          <span className="linha-do-tempo__datas">
            {curto(c.janela.de)} a {curto(ultimoDiaDaJanela(c.janela))}
          </span>
        </div>
      ))}

      {/* As bolinhas moram na própria barra do período: arrastar uma muda o
          início ou o fim, e as datas acompanham. Sem corte, arrastar liga o
          período de corte a partir do período que estava valendo. */}
      <div className="linha-do-tempo__linha linha-do-tempo__linha--periodo">
        <span className="linha-do-tempo__nome">{comCorte ? "Corte" : "Período"}</span>
        <span className="linha-do-tempo__trilho linha-do-tempo__trilho--periodo">
          <span className="linha-do-tempo__barra linha-do-tempo__barra--periodo" style={posicao(periodo)} />
          {bordas}
          {aoMudarCorte && (
            <span className="intervalo">
              <input
                type="range"
                min={0}
                max={dias}
                step={1}
                value={inicio}
                aria-label="Início do período de corte"
                aria-valuetext={curto(periodo.de)}
                onChange={(e) => mover("inicio", e.target.value)}
              />
              <input
                type="range"
                min={0}
                max={dias}
                step={1}
                value={fim}
                aria-label="Fim do período de corte"
                aria-valuetext={curto(ultimoDiaDaJanela(periodo))}
                onChange={(e) => mover("fim", e.target.value)}
              />
            </span>
          )}
        </span>
        <span className="linha-do-tempo__datas">
          {curto(periodo.de)} a {curto(ultimoDiaDaJanela(periodo))}
        </span>
      </div>
    </div>
  );
}
