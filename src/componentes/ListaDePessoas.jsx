import { useEffect, useId, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import { Avatar } from "./Interface.jsx";
import { nomeOu } from "../nucleo/formato.js";

/**
 * "Quem pagou" e "Quem divide" como uma lista que se abre: a caixa mostra
 * quem está marcado; tocar nela abre a lista das pessoas.
 *
 *  · várias (padrão)  marca e desmarca cada um. No topo, "Selecionar todos":
 *                     ligar marca todo mundo; desligar em seguida desmarca
 *                     todo mundo. A lista fica aberta até tocar fora dela.
 *  · uma              só uma pessoa (quem pagou). No topo, "Ninguém". Escolher
 *                     alguém fecha a lista.
 *
 * Aberta, a lista tem um campo para escrever o nome e achar a pessoa, e as
 * pessoas rolam numa janela do tamanho de três.
 */

const normal = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export default function ListaDePessoas({ pessoas, indicePorId = {}, selecionados = [], aoMudar, uma = false, rotulo = "Pessoas" }) {
  const [aberta, setAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const caixa = useRef(null);
  const id = useId();
  const marcados = new Set(selecionados.filter(Boolean));
  const todos = pessoas.length > 0 && pessoas.every((m) => marcados.has(m.id));
  const indice = (m, i) => indicePorId[m.id] ?? i;
  const nome = (m, i) => nomeOu(m.nome, indice(m, i));

  // Tocar fora, ou o Esc, fecha a lista. Fechada, a busca se apaga.
  useEffect(() => {
    if (!aberta) {
      setTermo("");
      return undefined;
    }
    const fora = (e) => {
      if (caixa.current && !caixa.current.contains(e.target)) setAberta(false);
    };
    const tecla = (e) => e.key === "Escape" && setAberta(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberta]);

  const escolhidos = pessoas.map((m, i) => ({ m, i })).filter(({ m }) => marcados.has(m.id));
  const busca = normal(termo);
  const achadas = pessoas.map((m, i) => ({ m, i })).filter(({ m, i }) => !busca || normal(nome(m, i)).includes(busca));
  const resumo =
    escolhidos.length === 0
      ? "Ninguém"
      : !uma && todos && pessoas.length > 1
        ? `Todos · ${pessoas.length}`
        : escolhidos.map(({ m, i }) => nome(m, i)).join(", ");

  const alternar = (pessoa) => {
    if (uma) {
      aoMudar(marcados.has(pessoa) ? [] : [pessoa]);
      setAberta(false);
      return;
    }
    aoMudar(marcados.has(pessoa) ? selecionados.filter((x) => x !== pessoa) : [...selecionados, pessoa]);
  };

  return (
    <div className={`lista-de-pessoas ${aberta ? "lista-de-pessoas--aberta" : ""}`} ref={caixa}>
      <button
        type="button"
        className="caixa lista-de-pessoas__caixa"
        aria-haspopup="listbox"
        aria-expanded={aberta}
        aria-controls={id}
        aria-label={`${rotulo}: ${resumo}`}
        onClick={() => setAberta((v) => !v)}
      >
        <span className="lista-de-pessoas__rostos" aria-hidden="true">
          {escolhidos.slice(0, 4).map(({ m, i }) => (
            <Avatar key={m.id} nome={nome(m, i)} indice={indice(m, i)} tamanho={24} />
          ))}
        </span>
        <span className="lista-de-pessoas__resumo">{resumo}</span>
        <Icone nome="baixo" tamanho={18} />
      </button>

      {aberta && (
        <div className="lista-de-pessoas__lista" id={id}>
          <label className="lista-de-pessoas__busca">
            <Icone nome="busca" tamanho={18} />
            <input
              type="search"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Escreva o nome"
              aria-label={`Buscar pessoa em ${rotulo}`}
            />
          </label>
          <div className="lista-de-pessoas__opcoes" role="listbox" aria-label={rotulo} aria-multiselectable={!uma}>
          {uma ? (
            <button
              type="button"
              role="option"
              aria-selected={marcados.size === 0}
              className="lista-de-pessoas__opcao lista-de-pessoas__opcao--topo"
              onClick={() => {
                aoMudar([]);
                setAberta(false);
              }}
            >
              <span className="lista-de-pessoas__nome">Ninguém</span>
              <Marca ligada={marcados.size === 0} redonda />
            </button>
          ) : (
            <button
              type="button"
              role="option"
              aria-selected={todos}
              className="lista-de-pessoas__opcao lista-de-pessoas__opcao--topo"
              onClick={() => aoMudar(todos ? [] : pessoas.map((m) => m.id))}
            >
              <span className="lista-de-pessoas__nome">Selecionar todos</span>
              <Marca ligada={todos} />
            </button>
          )}
          <div className="lista-de-pessoas__rolo">
          {achadas.length === 0 && <p className="lista-de-pessoas__vazio">Ninguém com esse nome.</p>}
          {achadas.map(({ m, i }) => {
            const ligada = marcados.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={ligada}
                className="lista-de-pessoas__opcao"
                onClick={() => alternar(m.id)}
              >
                <Avatar nome={nome(m, i)} indice={indice(m, i)} tamanho={28} />
                <span className="lista-de-pessoas__nome">{nome(m, i)}</span>
                <Marca ligada={ligada} redonda={uma} />
              </button>
            );
          })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Para quem só sabe alternar uma pessoa de cada vez (o dia fora, a estadia):
 * chama `alternar` para cada uma que entrou ou saiu da lista.
 */
export function porDiferenca(antes, depois, alternar) {
  const a = new Set(antes);
  const d = new Set(depois);
  for (const id of new Set([...a, ...d])) if (a.has(id) !== d.has(id)) alternar(id);
}

/** O quadradinho (ou a bolinha, numa escolha só) de cada linha. */
function Marca({ ligada, redonda = false }) {
  return (
    <span
      className={`lista-de-pessoas__marca ${redonda ? "lista-de-pessoas__marca--redonda" : ""} ${ligada ? "lista-de-pessoas__marca--ligada" : ""}`}
      aria-hidden="true"
    >
      {ligada && <Icone nome="check" tamanho={14} espessura={2.6} />}
    </span>
  );
}
