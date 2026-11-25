import { useId, useRef, useState } from "react";
import Icone from "./Icone.jsx";

const normal = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/**
 * Uma caixa de texto que também é lista: tocar nela abre as opções, e o que
 * se escreve vai filtrando a lista. Escolher uma opção põe o nome na caixa;
 * Enter sem opção marcada chama `aoConfirmar` com o texto (um nome novo vale).
 */
export default function CaixaComLista({ opcoes, valor, aoMudar, aoConfirmar, placeholder, rotulo, id }) {
  const [aberta, setAberta] = useState(false);
  const [marcada, setMarcada] = useState(-1);
  const lista = useId();
  const caixa = useRef(null);

  const termo = normal(valor);
  // O nome já escolhido inteiro não filtra: tocar de novo mostra a lista toda.
  const exato = opcoes.some((o) => normal(o) === termo);
  const visiveis = !termo || exato ? opcoes : opcoes.filter((o) => normal(o).includes(termo));

  const abrir = () => {
    setAberta(true);
    setMarcada(-1);
  };

  const escolher = (o) => {
    aoMudar(o);
    setAberta(false);
    setMarcada(-1);
  };

  const teclas = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!aberta) return abrir();
      setMarcada((m) => Math.min(visiveis.length - 1, m + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMarcada((m) => Math.max(-1, m - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (aberta && marcada >= 0 && visiveis[marcada]) escolher(visiveis[marcada]);
      else {
        setAberta(false);
        aoConfirmar?.(valor);
      }
    } else if (e.key === "Escape") {
      setAberta(false);
    }
  };

  return (
    <div className={`caixa-lista ${aberta ? "caixa-lista--aberta" : ""}`}>
      <input
        ref={caixa}
        id={id}
        type="text"
        className="caixa caixa--texto caixa-lista__campo"
        role="combobox"
        aria-label={rotulo}
        aria-expanded={aberta && visiveis.length > 0}
        aria-controls={lista}
        aria-autocomplete="list"
        aria-activedescendant={aberta && marcada >= 0 ? `${lista}-${marcada}` : undefined}
        autoComplete="off"
        value={valor}
        placeholder={placeholder}
        onClick={abrir}
        onFocus={abrir}
        onBlur={() => setAberta(false)}
        onChange={(e) => {
          aoMudar(e.target.value);
          setAberta(true);
          setMarcada(-1);
        }}
        onKeyDown={teclas}
      />
      <button
        type="button"
        className="caixa-lista__seta"
        tabIndex={-1}
        aria-hidden="true"
        // Sem tirar o foco da caixa: o clique só abre ou fecha a lista.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (aberta) setAberta(false);
          else {
            caixa.current?.focus();
            abrir();
          }
        }}
      >
        <Icone nome="baixo" tamanho={18} />
      </button>
      {aberta && visiveis.length > 0 && (
        <ul className="caixa-lista__opcoes" role="listbox" id={lista} aria-label={rotulo}>
          {visiveis.map((o, i) => (
            <li
              key={o}
              id={`${lista}-${i}`}
              role="option"
              aria-selected={i === marcada}
              className={`caixa-lista__opcao ${i === marcada ? "caixa-lista__opcao--marcada" : ""}`}
              // mousedown, não click: escolhe antes de a caixa perder o foco.
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(o);
              }}
              onMouseEnter={() => setMarcada(i)}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
