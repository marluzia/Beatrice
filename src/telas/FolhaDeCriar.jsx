import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import IconeDoTipo from "../componentes/IconeDoTipo.jsx";
import { SetaComBarra } from "../componentes/Interface.jsx";
import { modoDe } from "../nucleo/modos.js";
import { porLancamento } from "./comum.js";

/** O "EM [conjunto] ⌄" de cada cartão. */
function EmQual({ opcoes, valor, aoMudar }) {
  if (opcoes.length === 0) return <p className="folha__falta">Crie um conjunto primeiro.</p>;
  return (
    <label className="em-qual">
      <span className="em-qual__em">em</span>
      <select value={valor ?? ""} onChange={(e) => aoMudar(e.target.value)} aria-label="Em qual conjunto">
        {opcoes.map((p) => (
          <option key={p.ficha.id} value={p.ficha.id}>
            {p.ficha.nome}
          </option>
        ))}
      </select>
      <Icone nome="baixo" tamanho={20} />
    </label>
  );
}

/**
 * "O que vamos criar?": a folha que sobe do botão "+". Novo conjunto, nova
 * despesa, novo registro, novo lembrete   cada um já no conjunto escolhido.
 */
export default function FolhaDeCriar({ app, aoFechar }) {
  const { panorama, idDoConjunto, abrir, comecarACriar } = app;
  const todos = porLancamento(panorama);
  const comFaturas = todos.filter((p) => modoDe(p.estado.modo).faturas !== false);
  const padrao = (lista) => (lista.some((p) => p.ficha.id === idDoConjunto) ? idDoConjunto : lista[0]?.ficha.id ?? null);

  const [despesaEm, setDespesaEm] = useState(() => padrao(todos));
  const [registroEm, setRegistroEm] = useState(() => padrao(comFaturas));
  const [lembreteEm, setLembreteEm] = useState(() => padrao(todos));


  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <section
        className="folha"
        role="dialog"
        aria-modal="true"
        aria-label="O que vamos criar?"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="folha__alca" aria-hidden="true" />
        <h2 className="titulo-tela">O que vamos criar?</h2>

        <button type="button" className="criar-cartao criar-cartao--escuro" onClick={comecarACriar}>
          <IconeDoTipo tipo="novoConjunto" tamanho={64} />
          <span className="criar-cartao__textos">
            <strong>Novo conjunto</strong>
            <span>Evento, temporada, familiar, moradia ou multi</span>
          </span>
          <SetaComBarra />
        </button>

        <div className="criar-cartao criar-cartao--com-seta">
          <div className="criar-cartao__corpo">
            <button type="button" className="criar-cartao__linha criar-cartao__linha--botao" disabled={!despesaEm} onClick={() => abrir(despesaEm, { tela: "despesas" })}>
              <IconeDoTipo tipo="novaDespesa" tamanho={64} />
              <span className="criar-cartao__textos">
                <strong>Nova despesa</strong>
                <span>Avulsa ou cíclica, por arquivo, foto ou à mão</span>
              </span>
            </button>
            <EmQual opcoes={todos} valor={despesaEm} aoMudar={setDespesaEm} />
          </div>
          <button
            type="button"
            className="criar-cartao__seta"
            tabIndex={-1}
            aria-hidden="true"
            disabled={!despesaEm}
            onClick={() => abrir(despesaEm, { tela: "despesas" })}
          >
            <SetaComBarra />
          </button>
        </div>

        <div className="criar-cartao criar-cartao--com-seta">
          <div className="criar-cartao__corpo">
            <button type="button" className="criar-cartao__linha criar-cartao__linha--botao" disabled={!registroEm} onClick={() => abrir(registroEm, { tela: "lancarRegistro" })}>
              <IconeDoTipo tipo="novoRegistro" tamanho={64} />
              <span className="criar-cartao__textos">
                <strong>Novo registro</strong>
                <span>Uso de itens, aparelhos etc.</span>
              </span>
            </button>
            {comFaturas.length === 0 && todos.length > 0 ? (
              <p className="folha__falta">Registros são de conjuntos com despesas cíclicas.</p>
            ) : (
              <EmQual opcoes={comFaturas} valor={registroEm} aoMudar={setRegistroEm} />
            )}
          </div>
          <button
            type="button"
            className="criar-cartao__seta"
            tabIndex={-1}
            aria-hidden="true"
            disabled={!registroEm}
            onClick={() => abrir(registroEm, { tela: "lancarRegistro" })}
          >
            <SetaComBarra />
          </button>
        </div>

        <div className="criar-cartao criar-cartao--com-seta">
          <div className="criar-cartao__corpo">
            <button type="button" className="criar-cartao__linha criar-cartao__linha--botao" disabled={!lembreteEm} onClick={() => abrir(lembreteEm, { tela: "lancarLembrete" })}>
              <IconeDoTipo tipo="novoLembrete" tamanho={64} />
              <span className="criar-cartao__textos">
                <strong>Novo lembrete</strong>
                <span>Lista ou nota, para o grupo</span>
              </span>
            </button>
            <EmQual opcoes={todos} valor={lembreteEm} aoMudar={setLembreteEm} />
          </div>
          <button
            type="button"
            className="criar-cartao__seta"
            tabIndex={-1}
            aria-hidden="true"
            disabled={!lembreteEm}
            onClick={() => abrir(lembreteEm, { tela: "lancarLembrete" })}
          >
            <SetaComBarra />
          </button>
        </div>
      </section>
    </div>
  );
}
