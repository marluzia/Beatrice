import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import IconeDoTipo from "../componentes/IconeDoTipo.jsx";
import { BotaoSino, dinheiro, tomDoSaldo } from "../componentes/Interface.jsx";
import { hojeISO } from "../nucleo/resumo.js";
import { codigoSeNaoForReal, fraseDoConjunto, porLancamento, TEXTO_DA_SITUACAO } from "./comum.js";

const normal = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** A aba Conjuntos: busca, criar e todos os conjuntos, o de lançamento mais recente primeiro. */
export default function ListaDeConjuntos({ app }) {
  const { panorama, abrir, comecarACriar } = app;
  const [busca, setBusca] = useState("");
  const hoje = hojeISO();

  const lista = porLancamento(panorama).filter((p) => !busca.trim() || normal(p.ficha.nome).includes(normal(busca.trim())));

  return (
    <div className="tela">
      <div className="topo-tela topo-tela--so-direita">
        <span />
        <div className="topo-tela__acoes">
          <BotaoSino />
        </div>
      </div>

      <h1 className="titulo-tela titulo-tela--grande">Conjuntos</h1>

      <label className="busca">
        <Icone nome="busca" tamanho={22} />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar conjunto"
          aria-label="Buscar conjunto"
        />
      </label>

      <button type="button" className="botao botao--fantasma botao--largo" onClick={comecarACriar}>
        <Icone nome="mais" tamanho={20} espessura={2} /> Novo conjunto
      </button>

      {panorama.length > 0 && <p className="rotulo-secao">Lançamento mais recente primeiro</p>}

      {lista.length === 0 ? (
        <p className="vazio-suave">
          {panorama.length === 0
            ? "Nenhum conjunto ainda. Crie o primeiro: um evento, uma temporada, a casa ou a república."
            : "Nenhum conjunto com esse nome."}
        </p>
      ) : (
        <div className="cartao-lista">
          {lista.map((p) => {
            const r = p.resumo;
            const valor = r?.eu ? r.aberto / 100 : null;
            return (
              <button key={p.ficha.id} type="button" className="linha-conjunto" onClick={() => abrir(p.ficha.id)}>
                <IconeDoTipo tipo={p.estado.modo} tamanho={52} />
                <span className="linha-conjunto__textos">
                  <strong>{p.ficha.nome}</strong>
                  <span>{fraseDoConjunto(p, hoje)}</span>
                </span>
                <span className="linha-conjunto__valor">
                  <strong className={`valor--${valor === null ? "zero" : tomDoSaldo(valor)}`}>
                    {valor === null ? "—" : dinheiro(valor, { sinal: true, simbolo: Boolean(codigoSeNaoForReal(p.estado)), moeda: p.estado.moeda })}
                  </strong>
                  <span>{TEXTO_DA_SITUACAO[r?.situacao] ?? ""}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
