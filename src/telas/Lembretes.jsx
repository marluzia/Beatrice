import { useEffect, useRef, useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { Abas, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { nomeDe } from "../nucleo/resumo.js";

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const diaEMes = (iso) => (iso ? `${Number(iso.slice(8, 10))} ${MESES_CURTOS[Number(iso.slice(5, 7)) - 1]}` : "");

export function Lista({ lembrete, acoes, abertoDeInicio }) {
  const [todos, setTodos] = useState(false);
  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState(abertoDeInicio);
  const feitos = lembrete.itens.filter((i) => i.feito).length;
  const total = lembrete.itens.length;
  const visiveis = todos ? lembrete.itens : lembrete.itens.slice(0, 5);

  const somar = () => {
    acoes.adicionarItemNaLista(lembrete.id, novo);
    setNovo("");
  };

  return (
    <article className="cartao-listinha">
      <div className="cartao-listinha__topo">
        {editando ? (
          <input
            className="caixa caixa--texto caixa--compacta"
            value={lembrete.titulo}
            autoFocus
            placeholder="Nome da lista"
            onChange={(e) => acoes.editarLembrete(lembrete.id, { titulo: e.target.value })}
            onBlur={() => setEditando(false)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            aria-label="Nome da lista"
          />
        ) : (
          <button type="button" className="cartao-listinha__titulo" onClick={() => setEditando(true)}>
            {lembrete.titulo || "Lista sem nome"}
          </button>
        )}
        <span className="cartao-listinha__conta">
          {feitos} de {total}
        </span>
      </div>
      <div className="progresso" aria-hidden="true">
        <span style={{ width: `${total ? (feitos / total) * 100 : 0}%` }} />
      </div>
      <div className="fichas-da-lista">
        {visiveis.map((i) => (
          <button
            key={i.id}
            type="button"
            className={`ficha-da-lista ${i.feito ? "ficha-da-lista--feita" : ""}`}
            aria-pressed={i.feito}
            onClick={() => acoes.alternarItemDaLista(lembrete.id, i.id)}
          >
            {i.texto}
          </button>
        ))}
        {!todos && total > 5 && (
          <button type="button" className="ficha-da-lista" onClick={() => setTodos(true)}>
            + {total - 5}
          </button>
        )}
      </div>
      <div className="convidar convidar--lista">
        <input
          className="caixa caixa--texto caixa--compacta"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && somar()}
          placeholder="Novo item"
          aria-label="Novo item da lista"
        />
        <button type="button" className="icone-botao icone-botao--cheio" onClick={somar} aria-label="Somar item">
          <Icone nome="mais" tamanho={20} espessura={2} />
        </button>
        <button
          type="button"
          className="icone-botao"
          aria-label="Apagar lista"
          onClick={() => window.confirm("Apagar esta lista?") && acoes.removerLembrete(lembrete.id)}
        >
          <Icone nome="lixo" tamanho={20} />
        </button>
      </div>
    </article>
  );
}

export function Nota({ lembrete, estado, acoes, abertoDeInicio }) {
  const [editando, setEditando] = useState(abertoDeInicio);
  const area = useRef(null);
  useEffect(() => {
    if (editando) area.current?.focus();
  }, [editando]);

  const registro = lembrete.registro ? estado.itens.find((i) => i.id === lembrete.registro) : null;
  const comUso = estado.itens.filter((i) => i.especie === "porUso");
  const autor = lembrete.autor ? nomeDe(estado, lembrete.autor) : null;
  const rodape = [autor, diaEMes((lembrete.criadoEm ?? "").slice(0, 10)), lembrete.data ? "aparece na agenda" : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="nota-papel">
      {editando ? (
        <div className="nota-papel__edicao">
          <textarea
            ref={area}
            className="nota-papel__texto nota-papel__texto--campo"
            value={lembrete.texto}
            rows={3}
            placeholder="A senha do wi-fi, lavar as toalhas no sábado…"
            onChange={(e) => acoes.editarLembrete(lembrete.id, { texto: e.target.value })}
            aria-label="Texto da nota"
          />
          <label className="nota-papel__campo">
            <span className="rotulo">Na agenda</span>
            <input
              type="date"
              className="caixa caixa--texto caixa--compacta"
              value={lembrete.data ?? ""}
              onChange={(e) => acoes.editarLembrete(lembrete.id, { data: e.target.value || null })}
            />
          </label>
          {comUso.length > 0 && (
            <label className="nota-papel__campo">
              <span className="rotulo">Vincular a um registro</span>
              <select
                className="caixa caixa--texto caixa--compacta"
                value={lembrete.registro ?? ""}
                onChange={(e) => acoes.editarLembrete(lembrete.id, { registro: e.target.value || null })}
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
          <div className="linha-dupla">
            <button
              type="button"
              className="botao botao--fantasma"
              onClick={() => window.confirm("Apagar esta nota?") && acoes.removerLembrete(lembrete.id)}
            >
              Apagar
            </button>
            <button type="button" className="botao" onClick={() => setEditando(false)}>
              Pronto
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="nota-papel__ver" onClick={() => setEditando(true)}>
          <span className="nota-papel__texto">{lembrete.texto || "Nota em branco"}</span>
          {registro && (
            <span className="vinculo">
              <Icone nome="registro" tamanho={16} /> Vinculado ao registro · {registro.nome}
            </span>
          )}
          {rodape && <span className="nota-papel__rodape">{rodape}</span>}
        </button>
      )}
    </article>
  );
}

/** Lembretes: listas (com itens para riscar) e notas (papel amarelo). Nada aqui mexe em dinheiro. */
/**
 * Lembretes: listas e notas do grupo. `embutido` é a aba Lembretes do painel
 * do conjunto: sem topo nem título, e o botão de criar no fim da aba.
 */
export default function Lembretes({ app, rota, embutido = false }) {
  const { estado, acoes, voltar, nomeDoConjunto, abrirNotificacoes } = app;
  const [filtro, setFiltro] = useState("tudo");
  const [escolhendo, setEscolhendo] = useState(false);
  const [recem, setRecem] = useState(null);

  // Vindo do "+" com Lista ou Nota escolhida: cria na hora, já aberto.
  const criado = useRef(false);
  useEffect(() => {
    if (rota?.novo && !criado.current) {
      criado.current = true;
      setRecem(acoes.adicionarLembrete(rota.novo));
    }
  }, [rota?.novo, acoes]);

  const lembretes = estado.lembretes ?? [];
  const listas = lembretes.filter((l) => l.tipo === "lista");
  const notas = lembretes.filter((l) => l.tipo === "nota");

  const criar = (tipo) => {
    setRecem(acoes.adicionarLembrete(tipo));
    setEscolhendo(false);
    setFiltro("tudo");
  };

  return (
    <div className={embutido ? "aba-do-painel" : "tela tela--com-rodape"}>
      {!embutido && (
        <>
          <TopoDaTela aoVoltar={voltar} acoes={[{ icone: "sino", rotulo: "Notificações", aoClicar: abrirNotificacoes }]} />
          <Sobrescrito>{nomeDoConjunto}</Sobrescrito>
          <h1 className="titulo-tela titulo-tela--grande">Lembretes</h1>
        </>
      )}

      <Abas
        rotulo="Filtrar lembretes"
        valor={filtro}
        aoMudar={setFiltro}
        opcoes={[
          { valor: "tudo", rotulo: "Tudo" },
          { valor: "listas", rotulo: "Listas" },
          { valor: "notas", rotulo: "Notas" },
        ]}
      />

      {lembretes.length === 0 && (
        <p className="vazio-suave">
          Listas de mercado, a senha do wi-fi, quem lava as toalhas no sábado. Lembretes não mexem em dinheiro nenhum.
        </p>
      )}

      {filtro !== "notas" && listas.length > 0 && (
        <>
          <p className="rotulo-secao">Listas</p>
          <div className="pilha">
            {listas.map((l) => (
              <Lista key={l.id} lembrete={l} acoes={acoes} abertoDeInicio={l.id === recem} />
            ))}
          </div>
        </>
      )}

      {filtro !== "listas" && notas.length > 0 && (
        <>
          <p className="rotulo-secao">Notas</p>
          <div className="pilha">
            {notas.map((l) => (
              <Nota key={l.id} lembrete={l} estado={estado} acoes={acoes} abertoDeInicio={l.id === recem} />
            ))}
          </div>
        </>
      )}

      <div className={embutido ? "acao-da-aba" : "rodape-fixo rodape-fixo--sobre-barra"}>
        {escolhendo ? (
          <div className="linha-dupla">
            <button type="button" className="botao botao--fantasma" onClick={() => criar("lista")}>
              <Icone nome="lista" tamanho={20} /> Lista
            </button>
            <button type="button" className="botao" onClick={() => criar("nota")}>
              <Icone nome="nota" tamanho={20} /> Nota
            </button>
          </div>
        ) : (
          <button type="button" className="botao botao--largo" onClick={() => setEscolhendo(true)}>
            + Novo lembrete
          </button>
        )}
      </div>
    </div>
  );
}
