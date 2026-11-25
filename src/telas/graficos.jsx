import { simboloDe } from "../nucleo/moedas.js";
import { dinheiro, TituloDeSecao } from "../componentes/Interface.jsx";
import { ciclosLigados } from "../nucleo/ciclos.js";
import { nomeDe } from "../nucleo/resumo.js";
import { reais } from "../nucleo/formato.js";

/** A cor de cada ciclo nos gráficos: luz mostarda, água azul, os outros na ordem. */
const DEMAIS = ["#b4432f", "#23633f", "#6b5b95", "#8c6a3d", "#1f7a7a", "#a34f76"];
export const CORES_DO_CICLO = (ciclo, i) =>
  ciclo.id === "luz" ? "#c9962a" : ciclo.id === "agua" ? "#3f7fae" : DEMAIS[i % DEMAIS.length];

/** "Os ciclos": quanto cada conta custou nos últimos fechamentos. */
export function GraficoDosCiclos({ estado, historico, cores }) {
  const ciclos = ciclosLigados(estado);
  if (ciclos.length === 0) return null;

  const maximo = Math.max(1, ...historico.flatMap((h) => ciclos.map((c) => h.valores?.[c.id] ?? 0)));
  const largura = 320;
  const altura = 190;
  const base = 160;
  const topo = 26;
  const grupo = largura / historico.length;
  const barra = Math.min(22, (grupo - 14) / ciclos.length);

  return (
    <section className="secao-grafico">
      <TituloDeSecao direita={`${simboloDe()} por ciclo · ${historico.length} ${historico.length === 1 ? "fechamento" : "fechamentos"}`}>
        Os <em>ciclos</em>
      </TituloDeSecao>
      <div className="cartao-grafico">
        <div className="legenda">
          {ciclos.map((c, i) => (
            <span key={c.id}>
              <i style={{ background: cores(c, i) }} /> {c.nome || "Conta"}
            </span>
          ))}
        </div>
        <svg viewBox={`0 0 ${largura} ${altura}`} className="grafico" role="img" aria-label="Valor de cada ciclo por fechamento">
          {historico.map((h, g) => {
            const x0 = g * grupo + (grupo - barra * ciclos.length - 4 * (ciclos.length - 1)) / 2;
            return (
              <g key={`${h.ano}-${h.mes}`}>
                {ciclos.map((c, i) => {
                  const v = h.valores?.[c.id] ?? 0;
                  const alt = (v / maximo) * (base - topo);
                  const x = x0 + i * (barra + 4);
                  const cor = h.atual ? (i === 0 ? "#1b1a17" : "#5e584d") : cores(c, i);
                  return (
                    <g key={c.id}>
                      <rect x={x} y={base - alt} width={barra} height={Math.max(alt, v > 0 ? 1 : 0)} fill={cor} />
                      {h.atual && v > 0 && (
                        <text x={x + barra / 2} y={base - alt - 5} textAnchor="middle" className="grafico__valor">
                          {reais(v)}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text x={g * grupo + grupo / 2} y={altura - 6} textAnchor="middle" className="grafico__mes">
                  {h.rotulo}
                </text>
              </g>
            );
          })}
          <line x1="0" x2={largura} y1={base + 0.5} y2={base + 0.5} stroke="#1b1a17" strokeWidth="1.2" />
        </svg>
        {historico.length === 1 && (
          <p className="ajuda-campo">Os meses anteriores aparecem aqui quando você abrir o fechamento seguinte em Configurar → Próximo mês.</p>
        )}
      </div>
    </section>
  );
}

const CORES_DAS_CATEGORIAS = ["#b4432f", "#3f7fae", "#c9962a", "#1b1a17", "#23633f", "#6b5b95", "#8c6a3d"];

/** "Para onde foi": as despesas do evento numa barra só, por categoria. */
export function ParaOndeFoi({ estado, despesas }) {
  const lista = despesas.filter((d) => d.valor > 0).sort((a, b) => b.valor - a.valor);
  const total = lista.reduce((s, d) => s + d.valor, 0);
  if (total <= 0) return null;

  return (
    <section className="secao-grafico">
      <TituloDeSecao direita="por categoria">
        Para onde <em>foi</em>
      </TituloDeSecao>
      <div className="cartao-grafico">
        <div className="barra-empilhada" role="img" aria-label="Divisão do total por despesa">
          {lista.map((d, i) => (
            <span key={d.id} style={{ flexGrow: d.valor, background: CORES_DAS_CATEGORIAS[i % CORES_DAS_CATEGORIAS.length] }} />
          ))}
        </div>
        <ul className="lista-categorias">
          {lista.map((d, i) => (
            <li key={d.id}>
              <i style={{ background: CORES_DAS_CATEGORIAS[i % CORES_DAS_CATEGORIAS.length] }} />
              <span>
                {d.nome}
                {d.pagoPor ? ` · ${nomeDe(estado, d.pagoPor)} pagou` : ""}
              </span>
              <strong>{dinheiro(d.valor, { simbolo: false })}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
