import { dadosDoRelatorio } from "../nucleo/relatorio.js";
import { reais } from "../nucleo/formato.js";
import MarcaR from "../componentes/MarcaR.jsx";

const porcento = (v) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const numero = (v, casas = 2) =>
  Number(v).toLocaleString("pt-BR", { maximumFractionDigits: casas });

const diaCurto = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : " ");

const diaLongo = (iso) =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : " ";

export default function RelatorioImpresso({ estado, resultado }) {
  const d = dadosDoRelatorio(estado, resultado);

  return (
    <div className="impresso" aria-hidden="true">
      <header className="impresso-topo">
        {/* O R. assina o documento que sai da casa. */}
        <MarcaR tamanho={38} cor="#000000" titulo="CEDER" />
        <div>
          <h1>CEDER</h1>
          <p>{d.titulo}</p>
          {/* Qual conjunto é este: o mesmo relatório serve a uma república e a
              uma multipropriedade, e elas leem os números de jeitos diferentes. */}
          <p className="impresso-tipo">
            {d.tipo.nome}
            {d.tipo.exemplo && <span> · {d.tipo.exemplo}</span>}
          </p>
        </div>
        <p className="impresso-carimbo">
          Gerado em {d.geradoEm}
          <br />
          {d.preset && (
            <>
              {d.preset}
              <br />
            </>
          )}
          Uso comum: {d.calibragem}% por igual, {100 - d.calibragem}% pelos dias em casa
          <br />
          Presença marcada por {d.tipo.presenca}
        </p>
      </header>

      <section className="impresso-bloco">
        <h2>As contas</h2>
        {d.faturas.map((f) => (
          <div className="impresso-fatura" key={f.id ?? f.nome}>
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
                  {f.medido ? (
                    <>
                      {numero(f.consumo)} {f.unidade} · total R$ {reais(f.total)} · acompanha o
                      consumo R$ {reais(f.consumoEmReais)} · preço efetivo R${" "}
                      {numero(f.tarifa, 6)} por {f.unidade}
                    </>
                  ) : (
                    <>
                      total R$ {reais(f.total)} · vai para o uso comum R${" "}
                      {reais(f.consumoEmReais)}
                    </>
                  )}
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
        <h2>O que o conjunto gasta</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Consumo</th>
              <th className="num">Custo</th>
              <th>Divide por</th>
            </tr>
          </thead>
          <tbody>
            {d.itens.map((i, k) => (
              <tr key={k}>
                <td>{i.nome}</td>
                {/* Os kWh e m³ de cada aparelho: é com eles que a casa confere
                    o relatório contra a etiqueta e contra a fatura. */}
                <td className="num">{i.consumo || " "}</td>
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
                    {o.item} em {diaLongo(o.dia)}   a{" "}
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
                  {[...p.porCiclo.map((c) => `${c.nome} R$ ${reais(c.valor)}`), `Reais R$ ${reais(p.reais)}`].join(" · ")}
                </td>
                <td className="num">R$ {reais(p.total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </section>
      ))}

      {/* Quem desembolsou. Sem isto, o relatório dizia quanto cada um deve e
          não dizia quem já tinha posto dinheiro   que é metade do fechamento. */}
      <section className="impresso-bloco">
        <h2>Quem pagou</h2>
        <table>
          <thead>
            <tr>
              <th>Despesa</th>
              <th className="num">Valor</th>
              <th>Quem desembolsou</th>
            </tr>
          </thead>
          <tbody>
            {d.pagamentos.map((p, i) => (
              <tr key={i}>
                <td>{p.nome}</td>
                <td className="num">R$ {reais(p.valor)}</td>
                <td>{p.quemPagou ?? "cada um pagou a sua parte"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="impresso-bloco">
        <h2>O acerto</h2>

        {d.acerto.emAberto ? (
          <p>
            Falta o grupo decidir quem fica com o centavo que não fecha. Enquanto
            isso, o acerto não pode ser calculado.
          </p>
        ) : d.acerto.semCentralizacao ? (
          <p>
            Ninguém centralizou despesa: cada um pagou a própria parte direto, e
            não há transferência a fazer.
          </p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th className="num">Adiantou</th>
                  <th className="num">Parte dela</th>
                  <th className="num">Situação</th>
                </tr>
              </thead>
              <tbody>
                {d.acerto.saldos.map((s, i) => (
                  <tr key={i}>
                    <td>{s.nome}</td>
                    <td className="num">R$ {reais(s.adiantou)}</td>
                    <td className="num">R$ {reais(s.parte)}</td>
                    <td className="num">
                      {s.saldo > 0
                        ? `recebe R$ ${reais(s.saldo)}`
                        : s.saldo < 0
                          ? `paga R$ ${reais(-s.saldo)}`
                          : "quite"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {d.acerto.transferencias.length === 0 ? (
              <p>Nenhuma transferência necessária.</p>
            ) : (
              <ul className="impresso-transferencias">
                {d.acerto.transferencias.map((t, i) => (
                  <li key={i}>
                    {t.de} → {t.para}: <strong>R$ {reais(t.valor)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {d.acerto.diretas.length > 0 && (
          <p className="impresso-diretas">
            Fora do acerto, cada um pagou a sua parte direto em:{" "}
            {d.acerto.diretas.map((x) => x.nome).join(", ")}.
          </p>
        )}
      </section>

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
