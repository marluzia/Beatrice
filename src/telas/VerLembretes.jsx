import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { AbasDePasta, mostrarAviso, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { autoriaDe } from "../nucleo/autoria.js";
import { curta, nomeDe } from "../nucleo/resumo.js";
import { OpcoesDoLancamento } from "./linhasDeDespesa.jsx";
import { sobrescritoDaTela } from "./Hub.jsx";

const normal = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const tituloDe = (l) => (l.tipo === "lista" ? l.titulo || "Lista sem nome" : l.texto || "Nota em branco");

/** Ver lembretes: as listas e as notas, com busca e a pasta Todos | Listas | Notas. */
export default function VerLembretes({ app }) {
  const { estado, acoes, ir, voltar } = app;
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [escolhido, setEscolhido] = useState(null);

  const termo = normal(busca.trim());
  const todos = [...(estado.lembretes ?? [])].sort((a, b) =>
    String(autoriaDe(b).em ?? "").localeCompare(String(autoriaDe(a).em ?? "")),
  );
  const lista = todos.filter(
    (l) =>
      (tipo === "todos" || l.tipo === tipo) &&
      (!termo || [l.titulo, l.texto, ...(l.itens ?? []).map((x) => x.texto)].some((t) => normal(t).includes(termo))),
  );

  const detalhe = (l) => {
    const { por, em } = autoriaDe(l);
    const feitos = (l.itens ?? []).filter((x) => x.feito).length;
    return [
      l.tipo === "lista" ? `${feitos} de ${(l.itens ?? []).length} feitos` : l.data ? `para ${curta(l.data)}` : null,
      por ? nomeDe(estado, por) : null,
      em ? curta(em.slice(0, 10)) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito partes={sobrescritoDaTela(app)} />
      <h1 className="titulo-tela titulo-tela--grande">
        Ver <em>lembretes</em>
      </h1>

      <label className="busca">
        <Icone nome="busca" tamanho={22} />
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar lembrete" aria-label="Buscar lembrete" />
      </label>

      <AbasDePasta
        opcoes={[
          { valor: "todos", rotulo: "Todos" },
          { valor: "lista", rotulo: "Listas" },
          { valor: "nota", rotulo: "Notas" },
        ]}
        valor={tipo}
        aoMudar={setTipo}
        rotulo="Tipo de lembrete"
      >
        {lista.length === 0 ? (
          <p className="vazio-suave vazio-suave--na-pasta">
            {todos.length === 0 ? "Nenhum lembrete lançado ainda." : "Nenhum lembrete com essa busca."}
          </p>
        ) : (
          <>
            <p className="rotulo-secao rotulo-secao--na-pasta">
              {lista.length} {lista.length === 1 ? "lembrete" : "lembretes"}
            </p>
            <div className="cartao-lista">
              {lista.map((l) => (
                <button key={l.id} type="button" className="linha-despesa" onClick={() => setEscolhido(l)}>
                  <span>
                    <strong>{tituloDe(l)}</strong>
                    <span>
                      <span className={`tipo-despesa tipo-despesa--${l.tipo === "lista" ? "lembrete" : "nota"}`}>{l.tipo}</span>{" "}
                      {detalhe(l)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </AbasDePasta>

      {escolhido && (
        <OpcoesDoLancamento
          titulo={tituloDe(escolhido)}
          detalhe={detalhe(escolhido)}
          textoDeDuplicar={escolhido.tipo === "lista" ? "A mesma lista, sem nada riscado, lançada por você" : undefined}
          aoFechar={() => setEscolhido(null)}
          aoAbrir={() => {
            const id = escolhido.id;
            setEscolhido(null);
            ir("lancamento", { tipo: "lembrete", id });
          }}
          aoDuplicar={() => {
            acoes.duplicarLembrete(escolhido.id);
            setEscolhido(null);
            mostrarAviso("Lembrete duplicado. A cópia é sua.");
          }}
        />
      )}

      <div className="rodape-fixo">
        <button type="button" className="botao botao--largo" onClick={() => ir("lancarLembrete")}>
          + Lançar lembrete
        </button>
      </div>
    </div>
  );
}
