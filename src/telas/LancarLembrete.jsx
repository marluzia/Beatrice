import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { Campo, CampoData } from "../componentes/index.js";
import { AbasDePasta, mostrarAviso, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { novoId } from "../nucleo/formato.js";
import { sobrescritoDaTela } from "./Hub.jsx";

const SOBRE_O_TIPO = {
  lista: "Uma lista para riscar: o mercado da semana, o que levar na viagem.",
  nota: "Um recado para o grupo: a senha do wi-fi, lavar as toalhas no sábado.",
};

const listaEmBranco = () => ({ titulo: "", novo: "", itens: [] });
const notaEmBranco = (data = null) => ({ texto: "", data, registro: "" });

/** O rascunho de um lembrete que já existe (para editar). */
export const rascunhoDoLembrete = (l) =>
  l.tipo === "lista"
    ? { titulo: l.titulo ?? "", novo: "", itens: (l.itens ?? []).map((x) => ({ ...x })) }
    : { texto: l.texto ?? "", data: l.data ?? null, registro: l.registro ?? "" };

/** Os itens da lista, com o que estiver escrito no campo de novo item. */
export const itensDaLista = (lista) => [
  ...lista.itens,
  ...(lista.novo.trim() ? [{ id: novoId("li"), texto: lista.novo.trim(), feito: false }] : []),
];

/** Nome e itens de uma lista. */
export function CamposDaLista({ lista, setLista }) {
  const somarItem = () => {
    const texto = lista.novo.trim();
    if (!texto) return;
    setLista((l) => ({ ...l, novo: "", itens: [...l.itens, { id: novoId("li"), texto, feito: false }] }));
  };
  return (
    <div className="formulario formulario--classico">
      <Campo rotulo="Nome da lista" valor={lista.titulo} aoMudar={(v) => setLista((l) => ({ ...l, titulo: v }))} texto rotuloSolto placeholder="Mercado da semana" />
      <div className="grupo">
        <span className="rotulo">Itens</span>
        {lista.itens.length > 0 && (
          <div className="fichas-da-lista">
            {lista.itens.map((x) => (
              <button
                key={x.id}
                type="button"
                className={`ficha-da-lista ${x.feito ? "ficha-da-lista--feita" : ""}`}
                aria-label={`Tirar ${x.texto}`}
                onClick={() => setLista((l) => ({ ...l, itens: l.itens.filter((y) => y.id !== x.id) }))}
              >
                {x.texto} ×
              </button>
            ))}
          </div>
        )}
        <div className="convidar convidar--lista">
          <input
            className="caixa caixa--texto caixa--compacta"
            value={lista.novo}
            onChange={(e) => setLista((l) => ({ ...l, novo: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && somarItem()}
            placeholder="Novo item"
            aria-label="Novo item da lista"
          />
          <button type="button" className="icone-botao icone-botao--cheio" onClick={somarItem} aria-label="Somar item">
            <Icone nome="mais" tamanho={20} espessura={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** O texto da nota, o dia no calendário e o registro a que ela se liga. */
export function CamposDaNota({ nota, setNota, estado }) {
  const comUso = estado.itens.filter((i) => i.especie === "porUso" || i.especie === "porHora");
  return (
    <div className="formulario formulario--classico">
      <label className="campo-novo">
        <span className="rotulo">Nota</span>
        <textarea
          className="caixa caixa--texto caixa--area"
          rows={4}
          value={nota.texto}
          onChange={(e) => setNota((n) => ({ ...n, texto: e.target.value }))}
          placeholder="A senha do wi-fi, lavar as toalhas no sábado…"
          aria-label="Texto da nota"
        />
      </label>
      <CampoData
        rotulo="No calendário (opcional)"
        valor={nota.data}
        aoMudar={(v) => setNota((n) => ({ ...n, data: v }))}
        etiqueta="Dia da nota no calendário"
      />
      {comUso.length > 0 && (
        <label className="campo-novo">
          <span className="rotulo">Vincular a um registro (opcional)</span>
          <select
            className="caixa caixa--texto"
            value={nota.registro ?? ""}
            onChange={(e) => setNota((n) => ({ ...n, registro: e.target.value }))}
          >
            <option value="">Nenhum</option>
            {comUso.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

/**
 * Lançar lembretes: a pasta Lista | Nota e o formulário de cada uma. Como em
 * Lançar despesas, depois de lançar só aparece o aviso de sucesso; o que foi
 * lançado se confere em Ver lembretes.
 */
export default function LancarLembrete({ app, rota }) {
  const { estado, acoes, ir, voltar } = app;
  const [tipo, setTipo] = useState(rota?.tipo === "nota" ? "nota" : "lista");
  const [lista, setLista] = useState(listaEmBranco);
  const [nota, setNota] = useState(() => notaEmBranco(rota?.data ?? null));
  const [lancados, setLancados] = useState(0);

  const lancar = () => {
    if (tipo === "lista") {
      const itens = itensDaLista(lista);
      if (!lista.titulo.trim() && itens.length === 0) return mostrarAviso("Dê um nome à lista ou escreva um item.");
      acoes.adicionarLembrete("lista", { titulo: lista.titulo.trim(), itens });
      setLista(listaEmBranco());
    } else {
      if (!nota.texto.trim()) return mostrarAviso("Escreva a nota.");
      acoes.adicionarLembrete("nota", { texto: nota.texto.trim(), data: nota.data, registro: nota.registro || null });
      setNota(notaEmBranco());
    }
    setLancados((n) => n + 1);
    window.scrollTo?.(0, 0);
  };

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito partes={sobrescritoDaTela(app)} />
      <h1 className="titulo-tela titulo-tela--grande">
        Lançar <em>lembretes</em>
      </h1>
      <p className="texto-apoio">Escolha o tipo e preencha. O que já foi lançado fica em Ver lembretes.</p>

      {lancados > 0 && (
        <div className="sucesso" role="status">
          <Icone nome="check" tamanho={20} espessura={2.4} />
          <span>
            Sucesso. Confira em{" "}
            <button type="button" className="link-sublinhado" onClick={() => ir("verLembretes")}>
              Ver lembretes
            </button>
            .
          </span>
        </div>
      )}

      <AbasDePasta
        opcoes={[
          { valor: "lista", rotulo: "Lista" },
          { valor: "nota", rotulo: "Nota" },
        ]}
        valor={tipo}
        aoMudar={setTipo}
        rotulo="Tipo de lembrete"
      >
        <p className="texto-apoio texto-apoio--colado">{SOBRE_O_TIPO[tipo]}</p>

        {tipo === "lista" ? (
          <CamposDaLista lista={lista} setLista={setLista} />
        ) : (
          <CamposDaNota nota={nota} setNota={setNota} estado={estado} />
        )}
      </AbasDePasta>

      <div className="rodape-fixo">
        <button type="button" className="botao botao--largo" onClick={lancar}>
          {tipo === "lista" ? "Lançar lista" : "Lançar nota"}
        </button>
      </div>
    </div>
  );
}
