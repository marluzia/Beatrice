import { useState } from "react";
import { Avatar, dinheiro, Sobrescrito, TopoDaTela, tomDoSaldo } from "../componentes/Interface.jsx";
import { CATEGORIAS_DA_PARTE, composicaoPorPessoa, listaEmFrase, nomeDe, oQueCadaUmPagou } from "../nucleo/resumo.js";
import { despesasCiclicas, despesasAvulsas } from "../nucleo/resumo.js";
import { reais } from "../nucleo/formato.js";
import { sobrescritoDaTela } from "./Hub.jsx";

const COR_DA_CATEGORIA = {
  aparelhos: "var(--azul)",
  comum: "var(--tinta)",
  taxas: "var(--ouro)",
  avulsas: "var(--vermelho)",
};

/**
 * Saldos: o que cada pessoa pagou menos a parte dela, com a parte desmontada
 * em aparelhos, uso comum, taxas e despesas avulsas.
 */
export default function Saldos({ app }) {
  const { estado, resultado, modo, resumo, eu, ir, voltar, abrirNotificacoes } = app;
  const [aberta, setAberta] = useState(null);
  const semFaturas = modo.faturas === false;

  const composicao = composicaoPorPessoa(resultado);
  const pagouQuais = oQueCadaUmPagou(estado, resultado);
  const saldos = resumo?.acerto?.saldos ?? [];
  const maiorParte = Math.max(1, ...resultado.moradores.map((m) => m.total));
  const categorias = semFaturas ? CATEGORIAS_DA_PARTE.filter((c) => c.chave === "avulsas") : CATEGORIAS_DA_PARTE;

  const totalPago = saldos.reduce((s, x) => s + x.pagou, 0) / 100;
  const total = resultado.somaDevida;
  const diretas = resumo?.acerto?.diretas ?? [];

  const ciclicas = semFaturas ? [] : despesasCiclicas(estado, resultado);
  const avulsas = despesasAvulsas(estado, resultado).reduce((s, d) => s + d.valor, 0);
  const conta = [
    ...ciclicas.map((c) => `${c.nome.toLowerCase()} ${reais(c.valor)}`),
    avulsas > 0 ? `${semFaturas ? "despesas" : "despesas avulsas"} ${reais(avulsas)}` : null,
  ].filter(Boolean);

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} acoes={[{ icone: "sino", rotulo: "Notificações", aoClicar: abrirNotificacoes }]} />
      <Sobrescrito partes={sobrescritoDaTela(app)} />
      <h1 className="titulo-tela titulo-tela--grande">Saldos</h1>
      <p className="texto-apoio">
        Saldo = o que a pessoa pagou − a parte dela.{" "}
        {semFaturas ? "A barra mostra o tamanho da parte de cada um." : "Cada barra mostra de que é feita a parte de cada um."}
      </p>

      {!semFaturas && (
        <div className="legenda legenda--solta">
          {categorias.map((c) => (
            <span key={c.chave}>
              <i style={{ background: COR_DA_CATEGORIA[c.chave] }} /> {c.nome}
            </span>
          ))}
        </div>
      )}

      {resultado.moradores.length === 0 ? (
        <p className="vazio-suave">Sem pessoas ainda.</p>
      ) : (
        <div className="cartao-lista cartao-lista--saldos">
          {resultado.moradores.map((m, i) => {
            const s = saldos.find((x) => x.moradorId === m.moradorId);
            const saldo = (s?.saldo ?? 0) / 100;
            const c = composicao[m.moradorId];
            const pagou = (s?.pagou ?? 0) / 100;
            const nome = nomeDe(estado, m.moradorId);
            const quais = pagouQuais[m.moradorId];
            const aberto = aberta === m.moradorId;
            return (
              <div key={m.moradorId} className={`linha-saldo ${m.moradorId === eu ? "linha-saldo--eu" : ""}`}>
                <button type="button" className="linha-saldo__botao" aria-expanded={aberto} onClick={() => setAberta(aberto ? null : m.moradorId)}>
                  <span className="linha-saldo__topo">
                    <Avatar nome={nome} indice={i} />
                    <strong className="linha-saldo__nome">
                      {nome}
                      {m.moradorId === eu && <span className="voce"> (você)</span>}
                    </strong>
                    <strong className={`linha-saldo__valor valor--${tomDoSaldo(saldo)}`}>{dinheiro(saldo, { sinal: true, simbolo: false })}</strong>
                  </span>
                  <span className="barra-parte" style={{ width: `${(m.total / maiorParte) * 100}%` }} aria-hidden="true">
                    {categorias.map((cat) =>
                      c[cat.chave] > 0.004 ? (
                        <i key={cat.chave} style={{ flexGrow: c[cat.chave], background: COR_DA_CATEGORIA[cat.chave] }} />
                      ) : null,
                    )}
                  </span>
                  <span className="linha-saldo__nota">
                    parte {reais(m.total)} · pagou {reais(pagou)}
                    {quais ? ` (${quais})` : ""}
                  </span>
                </button>
                {aberto && (
                  <ul className="parte-detalhe">
                    {m.linhas
                      .filter((l) => Math.abs(l.valor) > 0.004)
                      .map((l, k) => (
                        <li key={`${l.nome}-${k}`}>
                          <span>{l.nome}</span>
                          <strong>{reais(l.valor)}</strong>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            );
          })}
          <div className="linha-soma">
            <span>Soma das partes = soma do que foi pago</span>
            <strong>{dinheiro(total)}</strong>
          </div>
        </div>
      )}

      <p className="texto-apoio">
        {dinheiro(total)} = {listaEmFrase(conta) || "nada lançado ainda"}. Toque numa pessoa para ver como a parte dela foi formada.
      </p>
      {diretas.length > 0 && (
        <p className="nota-tipo">
          {listaEmFrase(diretas.map((d) => d.nome))} não {diretas.length === 1 ? "tem" : "têm"} pagador marcado: cada um pagou a sua parte
          direto. Entra na parte de cada um e fica fora do saldo ({dinheiro(totalPago)} foram adiantados por alguém).
        </p>
      )}

      <div className="rodape-fixo rodape-fixo--sobre-barra">
        <button type="button" className="botao botao--largo" onClick={() => ir("fechar", { passo: "rateio", secao: "acerto" })}>
          Fechar contas
        </button>
      </div>
    </div>
  );
}
