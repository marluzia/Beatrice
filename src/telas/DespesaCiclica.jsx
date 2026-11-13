import Icone from "../componentes/Icone.jsx";
import { dinheiro, SeloPilula, TopoDaTela } from "../componentes/Interface.jsx";
import { janelaDaFatura, linhasPorComportamento } from "../nucleo/adaptador.js";
import { janelaDoFechamento, ultimoDiaDaJanela } from "../nucleo/calendario.js";
import { cicloPorId, ciclosLigados, unidadeDoRecurso } from "../nucleo/ciclos.js";
import { MESES, num, reais } from "../nucleo/formato.js";
import { presetDe } from "../nucleo/modos.js";
import { composicaoDoCiclo, curta, diasAte, hojeISO, listaEmFrase, nomeDaRegra, nomeDe, periodoDe } from "../nucleo/resumo.js";
import { totalDaFatura } from "../nucleo/traducao/fatura.js";

const CORES_DAS_PECAS = ["#3f7fae", "#c9962a", "#23633f", "#6b5b95", "#8c6a3d"];
const CORES_DOS_MISTOS = ["#b4432f", "#a34f76", "#1f7a7a"];
const iso = (d) => (d ? String(d).slice(0, 10) : null);

/** A linha do tempo da despesa: o fechamento, o consumo, os outros ciclos e as datas soltas. */
function LinhaDasDatas({ estado, ciclo }) {
  const fechamento = janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte);
  const consumo = janelaDaFatura(ciclo, estado.periodo);
  const outros = ciclosLigados(estado).filter((c) => c.id !== ciclo.id);
  const marcos = [
    ciclo.pagoEm ? { data: iso(ciclo.pagoEm), tipo: "paga", rotulo: `paga ${curta(iso(ciclo.pagoEm))}` } : null,
    ciclo.vencimento ? { data: ciclo.vencimento, tipo: "vence", rotulo: `vence ${curta(ciclo.vencimento)}` } : null,
  ].filter(Boolean);

  const inicio = [fechamento.de, consumo.de, ...outros.map((c) => janelaDaFatura(c, estado.periodo).de)].sort()[0];
  const fim = [fechamento.ate, consumo.ate, ...marcos.map((m) => m.data), ...outros.map((c) => janelaDaFatura(c, estado.periodo).ate)]
    .sort()
    .slice(-1)[0];
  const total = Math.max(1, diasAte(inicio, fim) + 2);
  const x = (d) => 8 + (diasAte(inicio, d) / total) * 304;

  const linhas = 1 + outros.length;
  const altura = 54 + linhas * 16 + 40 + marcos.length * 13;
  const eixo = 40 + linhas * 16 + 18;

  return (
    <svg viewBox={`0 0 320 ${altura}`} className="linha-das-datas" role="img" aria-label="Datas desta despesa">
      <rect
        x={x(fechamento.de)}
        y="6"
        width={x(fechamento.ate) - x(fechamento.de)}
        height={28 + linhas * 16}
        fill="#e6dcc6"
        stroke="#1b1a17"
        strokeDasharray="3 2"
      />
      <text x={x(fechamento.de) + 4} y="18" className="ldd__rotulo">
        FECHAMENTO DE {MESES[estado.periodo.mes - 1].toUpperCase()}
      </text>
      <rect x={x(consumo.de)} y="24" width={Math.max(2, x(consumo.ate) - x(consumo.de))} height="12" fill="#c9962a" />
      <text x={x(consumo.de) + 4} y="33.5" className="ldd__barra">
        consumo · {diasAte(consumo.de, consumo.ate)} dias
      </text>
      {outros.map((c, i) => {
        const j = janelaDaFatura(c, estado.periodo);
        return (
          <g key={c.id}>
            <rect x={x(j.de)} y={42 + i * 16} width={Math.max(2, x(j.ate) - x(j.de))} height="6" fill="#a9bccb" />
            <text x={x(j.ate) + 4} y={48 + i * 16} className="ldd__pequeno">
              {(c.nome || "conta").toLowerCase()}
            </text>
          </g>
        );
      })}
      <line x1="4" x2="316" y1={eixo} y2={eixo} stroke="#9e9788" />
      {[fechamento.de, consumo.de, ultimoDiaDaJanela(consumo)].map((d, i) => (
        <text key={`${d}-${i}`} x={Math.max(14, Math.min(306, x(d)))} y={eixo + 16} textAnchor="middle" className="ldd__data">
          {curta(d)}
        </text>
      ))}
      {marcos.map((m, i) => (
        <g key={m.tipo}>
          {m.tipo === "vence" ? (
            <path d={`M${x(m.data)} ${eixo - 6} l6 6 -6 6 -6 -6z`} fill="#1b1a17" />
          ) : (
            <circle cx={x(m.data)} cy={eixo} r="5" fill="#23633f" />
          )}
          <text x="316" y={eixo + 16 + (i + 1) * 13} textAnchor="end" className="ldd__data">
            {m.rotulo}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Uma despesa cíclica por dentro: datas, do que é feita e quanto é de cada um. */
export default function DespesaCiclica({ app, rota }) {
  const { estado, resultado, voltar, nomeDoConjunto, eu, ir, abrirNotificacoes } = app;
  const ciclo = cicloPorId(estado, rota.id);
  if (!ciclo) {
    return (
      <div className="tela">
        <TopoDaTela aoVoltar={voltar} />
        <p className="vazio-suave">Esta conta não existe mais.</p>
      </div>
    );
  }

  const valor = totalDaFatura(ciclo);
  const unidade = unidadeDoRecurso(ciclo.recurso);
  const { pecas, porPessoa, calculado, misto, mistos } = composicaoDoCiclo(estado, resultado, ciclo.id);
  const tarifa = calculado?.tarifa ?? 0;
  const consumoLinhas = linhasPorComportamento(ciclo, "consumo");
  const quantidade = consumoLinhas.reduce((s, l) => s + num(l.quantidade), 0);
  const valorDoConsumo = consumoLinhas.reduce((s, l) => s + num(l.valor), 0);
  const consumo = janelaDaFatura(ciclo, estado.periodo);
  const p = periodoDe(estado);
  const hoje = hojeISO();
  const preset = presetDe(estado);

  const aparelhos = pecas.filter((x) => x.categoria !== "taxas");
  const taxas = pecas.filter((x) => x.categoria === "taxas");
  const n = estado.moradores.length;

  const descricaoDaPeca = (peca) => {
    if (peca.categoria === "comum") {
      return `o que nenhum aparelho explica${preset ? ` · ${preset.curto}: ${preset.resumo.replace(/^Uso comum /, "").replace(/\.$/, "")}` : ""}`;
    }
    const item = estado.itens.find((i) => i.id === peca.id);
    const quem = peca.fatias.filter((f) => f.total > 0.004).map((f) => nomeDe(estado, f.moradorId));
    const regra = nomeDaRegra(item?.rateio);
    return quem.length === n ? `${regra} entre os ${n}` : `${regra} · ${listaEmFrase(quem)}`;
  };

  const ordenadas = [...aparelhos].sort((a, b) => b.custoTotal - a.custoTotal);
  const corDe = (peca, i) => (peca.categoria === "comum" ? "#1b1a17" : CORES_DAS_PECAS[i % CORES_DAS_PECAS.length]);
  let indiceDeCor = 0;
  const cores = ordenadas.map((peca) => (peca.categoria === "comum" ? "#1b1a17" : corDe(peca, indiceDeCor++)));

  const dias = calculado?.dias ?? 0;
  const somaTabela = Object.values(porPessoa).reduce((s, x) => s + x.total, 0);

  return (
    <div className="tela">
      <TopoDaTela aoVoltar={voltar} acoes={[{ icone: "sino", rotulo: "Notificações", aoClicar: abrirNotificacoes }]} />
      <p className="sobrescrito sobrescrito--icone">
        <Icone nome={ciclo.id === "agua" ? "gota" : "raio"} tamanho={18} />
        <span>
          {nomeDoConjunto} · despesa cíclica · {ciclo.nome}
        </span>
      </p>
      <p className="valor-gigante">{dinheiro(valor)}</p>
      <div className="pilulas">
        {ciclo.pagoPor ? (
          <SeloPilula tom="verde">
            Paga por {nomeDe(estado, ciclo.pagoPor)}
            {ciclo.pagoEm ? ` em ${curta(iso(ciclo.pagoEm))}` : ""}
          </SeloPilula>
        ) : (
          <SeloPilula tom="vermelho">ninguém pagou ainda</SeloPilula>
        )}
        {quantidade > 0 && (
          <SeloPilula tom="areia">
            {reais(quantidade).replace(",00", "")} {unidade} · R$ {reais(tarifa)} por {unidade}
          </SeloPilula>
        )}
      </div>

      <h2 className="titulo-secao__texto titulo-secao__texto--solto">
        As <em>datas</em> desta despesa
      </h2>
      <section className="cartao">
        <LinhaDasDatas estado={estado} ciclo={ciclo} />
        <dl className="tabela-datas">
          <div>
            <dt>Consumo</dt>
            <dd>
              {curta(consumo.de)} a {curta(ultimoDiaDaJanela(consumo))} · {diasAte(consumo.de, consumo.ate)} dias
            </dd>
          </div>
          <div>
            <dt>Vencimento</dt>
            <dd>
              {ciclo.vencimento ? curta(ciclo.vencimento) : "—"}
              {ciclo.vencimento === hoje ? " · hoje" : ""}
            </dd>
          </div>
          <div>
            <dt>Pagamento</dt>
            <dd>
              {ciclo.pagoPor ? `${ciclo.pagoEm ? `${curta(iso(ciclo.pagoEm))} · ` : ""}${nomeDe(estado, ciclo.pagoPor)}` : "—"}
            </dd>
          </div>
          <div>
            <dt>Alocação</dt>
            <dd>
              fechamento de {p.mes}
              <small>{p.texto}</small>
            </dd>
          </div>
        </dl>
        <button type="button" className="link-forte link-forte--direita" onClick={() => ir("editar", { qual: "ciclicas", aba: ciclo.id })}>
          Editar esta conta ›
        </button>
      </section>

      <h2 className="titulo-secao__texto titulo-secao__texto--solto">
        Do que ela é <em>feita</em>
      </h2>
      {pecas.length === 0 && misto === 0 ? (
        <p className="vazio-suave">Preencha os valores da conta para ver do que ela é feita.</p>
      ) : (
        <>
          {aparelhos.length > 0 && (
            <section className="cartao">
              <div className="composicao-topo">
                <span>
                  <strong>{consumoLinhas[0]?.nome || ciclo.nome}</strong>
                  {quantidade > 0 && (
                    <span>
                      consumo · {reais(quantidade).replace(",00", "")} {unidade}
                    </span>
                  )}
                </span>
                <strong>{dinheiro(valorDoConsumo)}</strong>
              </div>
              <div className="barra-empilhada barra-empilhada--fina" aria-hidden="true">
                {ordenadas.map((peca, i) => (
                  <span key={peca.id} style={{ flexGrow: peca.custoTotal, background: cores[i] }} />
                ))}
                {mistos.map((m, i) => (
                  <span key={m.id} style={{ flexGrow: m.custo, background: CORES_DOS_MISTOS[i % CORES_DOS_MISTOS.length] }} />
                ))}
                {misto > 0 && mistos.length === 0 && <span style={{ flexGrow: misto, background: "#9e9788" }} />}
              </div>
              <ul className="lista-pecas">
                {ordenadas.map((peca, i) => (
                  <li key={peca.id}>
                    <i style={{ background: cores[i] }} />
                    <span>
                      <strong>
                        {peca.categoria === "comum" ? "Uso comum" : peca.nome}
                        {tarifa > 0 ? ` · ${reais(peca.custoTotal / tarifa).replace(/,?0+$/, "").replace(/,$/, "")} ${unidade}` : ""}
                      </strong>
                      <span>{descricaoDaPeca(peca)}</span>
                    </span>
                    <strong>{reais(peca.custoTotal)}</strong>
                  </li>
                ))}
                {mistos.map((m, i) => (
                  <li key={m.id}>
                    <i style={{ background: CORES_DOS_MISTOS[i % CORES_DOS_MISTOS.length] }} />
                    <span>
                      <strong>
                        {m.nome} · {reais(m.quantidade).replace(/,?0+$/, "").replace(/,$/, "")} {unidade}
                      </strong>
                      <span>
                        {m.especie === "porUso" && m.usos > 0
                          ? `por uso · ${reais(m.usos).replace(",00", "")} ${
                              estado.itens.find((x) => x.id === m.id)?.modelo === "maquina"
                                ? m.usos === 1
                                  ? "lavagem"
                                  : "lavagens"
                                : m.usos === 1
                                  ? "uso"
                                  : "usos"
                            } × ${reais(m.porUso).replace(/,?0+$/, "")} ${unidade}`
                          : "puxa desta e de outra fatura"}
                      </span>
                    </span>
                    <strong>{reais(m.custo)}</strong>
                  </li>
                ))}
                {misto > 0 && mistos.length === 0 && (
                  <li>
                    <i style={{ background: "#9e9788" }} />
                    <span>
                      <strong>Aparelhos de mais de uma conta</strong>
                      <span>puxam desta e de outra fatura (ex.: o chuveiro)</span>
                    </span>
                    <strong>{reais(misto)}</strong>
                  </li>
                )}
              </ul>
            </section>
          )}
          {taxas.map((t) => (
            <section className="cartao cartao--taxa" key={t.id}>
              <span>
                <strong>{t.nome.replace(/^Taxa:?\s*/i, "")}</strong>
                <span>
                  taxa fixa · igual entre os {t.fatias.length} · R$ {reais(t.custoTotal / Math.max(1, t.fatias.length))} cada
                </span>
              </span>
              <strong>{dinheiro(t.custoTotal)}</strong>
            </section>
          ))}
        </>
      )}

      <h2 className="titulo-secao__texto titulo-secao__texto--solto">
        Quanto é de <em>cada um</em>
      </h2>
      <div className="tabela-pessoas" role="table">
        <div className="tabela-pessoas__cabeca" role="row">
          <span role="columnheader">Pessoa</span>
          <span role="columnheader">Aparelhos</span>
          <span role="columnheader">Comum</span>
          <span role="columnheader">Taxa</span>
          <span role="columnheader">Total</span>
        </div>
        {resultado.moradores.map((m) => {
          const x = porPessoa[m.moradorId];
          return (
            <div key={m.moradorId} role="row" className={`tabela-pessoas__linha ${m.moradorId === eu ? "tabela-pessoas__linha--eu" : ""}`}>
              <span role="cell">
                <strong>{nomeDe(estado, m.moradorId)}</strong>
                {dias > 0 && (
                  <small>
                    {calculado?.diasContados?.[m.moradorId] ?? dias} de {dias} dias
                  </small>
                )}
              </span>
              <span role="cell">{reais(x.aparelhos)}</span>
              <span role="cell">{reais(x.comum)}</span>
              <span role="cell">{reais(x.taxas)}</span>
              <span role="cell">
                <strong>{reais(x.total)}</strong>
              </span>
            </div>
          );
        })}
        <div className="tabela-pessoas__soma">
          <span>A soma fecha com a fatura</span>
          <strong>{dinheiro(somaTabela)}</strong>
        </div>
      </div>
    </div>
  );
}
