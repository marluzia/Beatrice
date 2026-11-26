import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { Campo, CampoData } from "../componentes/index.js";
import ListaDePessoas from "../componentes/ListaDePessoas.jsx";
import { AbasDePasta, mostrarAviso } from "../componentes/Interface.jsx";
import { CabecalhoDaSecao, rotuloDaAba } from "../componentes/CabecalhoDoConjunto.jsx";
import { novoId } from "../nucleo/formato.js";

const SOBRE_O_TIPO = {
  lista: "Uma lista para riscar: o mercado da semana, o que levar na viagem.",
  nota: "Um recado para o grupo: a senha do wi-fi, lavar as toalhas no sábado.",
};

const listaEmBranco = (data = null) => ({ titulo: "", novo: "", itens: [], data, pessoas: [] });
const notaEmBranco = (data = null) => ({ texto: "", data, pessoas: [] });

/** O rascunho de um lembrete que já existe (para editar). */
export const rascunhoDoLembrete = (l) => ({
  ...(l.tipo === "lista"
    ? { titulo: l.titulo ?? "", novo: "", itens: (l.itens ?? []).map((x) => ({ ...x })) }
    : { texto: l.texto ?? "" }),
  data: l.data ?? null,
  pessoas: [...(l.pessoas ?? [])],
});

/**
 * O que todo lembrete tem além do conteúdo: a data agendada (a da agenda e da
 * notificação; sem ela, vale o dia do lançamento) e as pessoas marcadas.
 */
export function CamposDoLembrete({ rascunho, setRascunho, estado, indicePorId }) {
  return (
    <>
      <CampoData
        rotulo="Data agendada (opcional)"
        valor={rascunho.data ?? null}
        aoMudar={(v) => setRascunho((r) => ({ ...r, data: v }))}
        etiqueta="Data agendada do lembrete"
      />
      <p className="ajuda-campo">Sem data, vale o dia do lançamento: é nela que o lembrete aparece na agenda e chega a notificação.</p>
      {estado.moradores.length > 0 && (
        <div className="grupo">
          <span className="rotulo">Marcar pessoas (opcional)</span>
          <ListaDePessoas
            rotulo="Pessoas marcadas"
            pessoas={estado.moradores}
            indicePorId={indicePorId}
            selecionados={rascunho.pessoas ?? []}
            aoMudar={(sel) => setRascunho((r) => ({ ...r, pessoas: sel }))}
          />
          <p className="ajuda-campo">A notificação vai para quem estiver marcado. Sem ninguém, vai para o grupo todo.</p>
        </div>
      )}
    </>
  );
}

/** Os itens da lista, com o que estiver escrito no campo de novo item. */
export const itensDaLista = (lista) => [
  ...lista.itens,
  ...(lista.novo.trim() ? [{ id: novoId("li"), texto: lista.novo.trim(), feito: false }] : []),
];

/** Nome e itens de uma lista, a data agendada e as pessoas marcadas. */
export function CamposDaLista({ lista, setLista, estado, indicePorId }) {
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
      <CamposDoLembrete rascunho={lista} setRascunho={setLista} estado={estado} indicePorId={indicePorId} />
    </div>
  );
}

/** O texto da nota, a data agendada e as pessoas marcadas. (Quem se vincula a uma nota é o registro.) */
export function CamposDaNota({ nota, setNota, estado, indicePorId }) {
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
      <CamposDoLembrete rascunho={nota} setRascunho={setNota} estado={estado} indicePorId={indicePorId} />
    </div>
  );
}

/**
 * Lançar lembretes: a pasta Lista | Nota e o formulário de cada uma. Como em
 * Lançar despesas, depois de lançar só aparece o aviso de sucesso; o que foi
 * lançado se confere em Ver lembretes.
 */
export default function LancarLembrete({ app, rota }) {
  const { estado, acoes, ir, voltar, indicePorId } = app;
  const [tipo, setTipo] = useState(rota?.tipo === "nota" ? "nota" : "lista");
  const [lista, setLista] = useState(() => listaEmBranco(rota?.data ?? null));
  const [nota, setNota] = useState(() => notaEmBranco(rota?.data ?? null));
  const [lancados, setLancados] = useState(0);

  const lancar = () => {
    if (tipo === "lista") {
      const itens = itensDaLista(lista);
      if (!lista.titulo.trim() && itens.length === 0) return mostrarAviso("Dê um nome à lista ou escreva um item.");
      acoes.adicionarLembrete("lista", { titulo: lista.titulo.trim(), itens, data: lista.data ?? null, pessoas: lista.pessoas });
      setLista(listaEmBranco());
    } else {
      if (!nota.texto.trim()) return mostrarAviso("Escreva a nota.");
      acoes.adicionarLembrete("nota", { texto: nota.texto.trim(), data: nota.data ?? null, pessoas: nota.pessoas });
      setNota(notaEmBranco());
    }
    setLancados((n) => n + 1);
    window.scrollTo?.(0, 0);
  };

  return (
    <div className="tela tela--com-rodape">
      <CabecalhoDaSecao app={app} secao="Lançar lembretes" subsecao={tipo === "lista" ? "Lista" : "Nota"} />
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
          <CamposDaLista lista={lista} setLista={setLista} estado={estado} indicePorId={indicePorId} />
        ) : (
          <CamposDaNota nota={nota} setNota={setNota} estado={estado} indicePorId={indicePorId} />
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
