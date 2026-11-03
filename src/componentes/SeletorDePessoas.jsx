import Pastilha from "./Pastilha.jsx";
import { corDe, nomeOu } from "../nucleo/formato.js";

/**
 * Escolher pessoas pelos botões: todas as seções de "quem" usam esta mesma
 * interface (quem paga, quem participou de um uso, quem pagou).
 *
 *  · várias   (padrão)  marca e desmarca cada um; "Todos" e "Ninguém" em cima
 *                        fazem a marcação rápida.
 *  · uma                 só uma pessoa por vez; tocar de novo desmarca. É o
 *                        "quem pagou": uma despesa tem no máximo um pagador.
 */
export default function SeletorDePessoas({
  pessoas,
  indicePorId = {},
  selecionados = [],
  aoMudar,
  uma = false,
  rotulo = "Pessoas",
  rapidos = !uma,
}) {
  const marcados = new Set(selecionados.filter(Boolean));
  const indice = (m, i) => indicePorId[m.id] ?? i;

  const alternar = (id) => {
    if (uma) return aoMudar(marcados.has(id) ? [] : [id]);
    return aoMudar(marcados.has(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id]);
  };

  return (
    <div className="seletor-de-pessoas" role="group" aria-label={rotulo}>
      {rapidos && pessoas.length > 1 && (
        <div className="seletor-de-pessoas__rapidos">
          <button
            type="button"
            className="botao--catalogo botao--pequeno"
            aria-pressed={marcados.size === pessoas.length}
            onClick={() => aoMudar(pessoas.map((m) => m.id))}
          >
            Todos
          </button>
          <button
            type="button"
            className="botao--catalogo botao--pequeno"
            aria-pressed={marcados.size === 0}
            onClick={() => aoMudar([])}
          >
            Ninguém
          </button>
        </div>
      )}
      <div className="pastilhas">
        {pessoas.map((m, i) => (
          <Pastilha
            key={m.id}
            cor={corDe(indice(m, i))}
            nome={nomeOu(m.nome, indice(m, i))}
            ativo={marcados.has(m.id)}
            aoClicar={() => alternar(m.id)}
          />
        ))}
      </div>
    </div>
  );
}
