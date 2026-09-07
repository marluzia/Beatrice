import { dadosDoRelatorio } from "../nucleo/relatorio.js";
import { reais } from "../nucleo/formato.js";
import MarcaCeder from "../componentes/MarcaCeder.jsx";

const porcento = (v) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const numero = (v, casas = 2) =>
  Number(v).toLocaleString("pt-BR", { maximumFractionDigits: casas });

const diaCurto = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");

const diaLongo = (iso) =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—";

export default function RelatorioImpresso({ estado, resultado }) {
  const d = dadosDoRelatorio(estado, resultado);

  return (
    <div className="impresso" aria-hidden="true">
      <header className="impresso-topo">
        <MarcaCeder tamanho={40} />
        <div>
          <h1>CEDER</h1>
          <p>{d.titulo}</p>
        </div>
        <p className="impresso-carimbo">
          Gerado em {d.geradoEm}
          <br />
          Uso comum: {d.calibragem}% por igual, {100 - d.calibragem}% pelos dias em casa
        </p>
      </header>

      <section className="impresso-bloco">
        <h2>As contas</h2>
        {d.faturas.map((f) => (
          <div className="impresso-fatura" key={f.nome}>
            <h3>
              {f.nome}
              {f.ativa ? (
                <span> · {f.ciclo} · {f.dias} dias</span>
              ) : (
                <span> · fora deste fechamento</span>
              )}
            </h3>

            {f.ativa && (
              <>
                <p className="impresso-resumo">
                  {numero(f.consumo)} {f.unidade} · total R$ {reais(f.total)} · acompanha o
                  consumo R$ {reais(f.consumoEmReais)} · preço efetivo R${" "}
                  {numero(f.tarifa, 6)} por {f.unidade}
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Linha da fatura</th>
                      <th className="num">Quantidade</th>
                      <th className="num">Valor</th>
                      <th>Comportamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.linhas.map((l, i) => (
                      <tr key={i}>
                        <td>{l.nome}</td>
                        <td className="num">{l.quantidade}</td>
                        <td className="num">R$ {reais(l.valor)}</td>
                        <td>{l.comportamento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        ))}
      </section>

      <section className="impresso-bloco">
        <h2>O que a casa tem</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Custo</th>
              <th>Divide por</th>
            </tr>
          </thead>
          <tbody>
            {d.itens.map((i, k) => (
              <tr key={k}>
                <td>{i.nome}</td>
                <td className="num">R$ {reais(i.custoTotal)}</td>
                <td>{i.rateio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {d.pessoas.map((p) => (
        <section className="impresso-pessoa" key={p.nome}>
          <h2>
            {p.nome} <span className="impresso-total">R$ {reais(p.total)}</span>
          </h2>

          {p.pendencias.length > 0 && (
            <div className="impresso-pendencia">
              <strong>Fica para o próximo fechamento</strong>
              <ul>
                {p.pendencias.map((o, i) => (
                  <li key={i}>
                    {o.item} em {diaLongo(o.dia)} — a{" "}
                    {o.faltando === "luz" ? "energia" : "água"}{" "}
                    {o.quando === "futuro"
                      ? "virá na próxima fatura e não está cobrada aqui."
                      : "entrou na fatura anterior, já fechada, e não é cobrada de novo."}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="impresso-presenca">
            {p.presenca.map((pr) => `${pr.contados} de ${pr.de} dias na ${pr.conta}`).join(" · ")}
            {" · "}
            {p.ausencias.length === 0
              ? "nenhum dia fora"
              : `${p.ausencias.length} dias fora (${p.ausencias.map(diaCurto).join(", ")})`}
          </p>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Fatia</th>
                <th className="num">Valor</th>
                <th>Por quê</th>
              </tr>
            </thead>
            <tbody>
              {p.participacoes.map((t, i) => (
                <tr key={i}>
                  <td>{t.item}</td>
                  <td className="num">{porcento(t.proporcao)}</td>
                  <td className="num">R$ {reais(t.total)}</td>
                  <td>{t.detalhe}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2">
                  Luz R$ {reais(p.luz)} · Água R$ {reais(p.agua)} · Reais R$ {reais(p.reais)}
                </td>
                <td className="num">R$ {reais(p.total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </section>
      ))}

      <section className="impresso-bloco">
        <h2>Conferência</h2>
        <table>
          <tbody>
            <tr>
              <td>Soma das faturas e despesas</td>
              <td className="num">R$ {reais(d.conferencia.somaDevida)}</td>
            </tr>
            <tr>
              <td>Soma cobrada das pessoas</td>
              <td className="num">R$ {reais(d.conferencia.somaCobrada)}</td>
            </tr>
            <tr>
              <td>Diferença</td>
              <td className="num">R$ {reais(d.conferencia.diferenca)}</td>
            </tr>
          </tbody>
        </table>
        {d.conferencia.centavos && (
          <p className="impresso-centavo">{d.conferencia.centavos}</p>
        )}
      </section>

      {d.alertas.length > 0 && (
        <section className="impresso-bloco">
          <h2>Avisos</h2>
          <ul className="impresso-avisos">
            {d.alertas.map((a, i) => (
              <li key={i}>{a.texto}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
