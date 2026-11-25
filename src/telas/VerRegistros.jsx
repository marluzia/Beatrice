import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { AbasDePasta, dinheiro, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { ciclosDoRegistro, janelaDaFatura, registravel, registrosDe } from "../nucleo/adaptador.js";
import { dentroDaJanela, janelaDoFechamento, ultimoDiaDaJanela } from "../nucleo/calendario.js";
import { unidadeDoRecurso } from "../nucleo/ciclos.js";
import { num, reais } from "../nucleo/formato.js";
import { simboloDe } from "../nucleo/moedas.js";
import { quantidadeNaUnidade, valorDoRegistro } from "../nucleo/precos.js";
import { curta, diasAte, hojeISO, listaEmFrase, medeHoras, nomeDe } from "../nucleo/resumo.js";
import { sobrescritoDaTela } from "./Hub.jsx";

const UNIDADE_NA_TELA = { kWh: "kWh", "m³": "m³", kwh: "kWh", m3: "m³" };

export const porHora = (item) => medeHoras(item);

/** Um equipamento da Multi (a lancha): o registro vale em reais, não em kWh ou m³. */
export const emReais = (item) => Boolean(item.equipamento) && item.especie === "porUso" && item.origemUso === "reais";

/** "1 lavagem", "2 lavagens", "5 horas", "3 usos". */
function quantas(item, n) {
  const q = num(n) || 1;
  const [um, varios] = porHora(item)
    ? ["hora", "horas"]
    : item.modelo === "maquina"
      ? ["lavagem", "lavagens"]
      : ["uso", "usos"];
  return `${reais(q).replace(",00", "")} ${q === 1 ? um : varios}`;
}

/** Quanto um registro puxa de um ciclo: as vezes (ou horas) vezes o gasto de cada uma. */
const gastoPorVez = (item, ciclo) =>
  num((item.especie === "porHora" ? item.porHoraPorCiclo : item.porUsoPorCiclo)?.[ciclo]);

const normal = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Todos os registros de uso do conjunto, do mais novo para o mais velho. */
export function todosOsRegistros(estado) {
  return estado.itens
    .filter((i) => registravel(i, estado))
    .flatMap((i) => registrosDe(i).map((r) => ({ item: i, r })))
    .filter(({ r }) => r.data)
    .sort((a, b) => b.r.data.localeCompare(a.r.data));
}

function LinhaDeRegistro({ app, item, r, mostrarDia }) {
  const { estado, ir } = app;
  const doFechamento = janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte);
  const ciclos = ciclosDoRegistro(item, estado);
  const dentro = ciclos.filter((c) => dentroDaJanela(r.data, janelaDaFatura(c, estado.periodo)));
  const vezes = num(r.quantidade) || 1;
  const consumo = ciclos.map((c) => ({
    unidade: UNIDADE_NA_TELA[unidadeDoRecurso(c.recurso)] ?? unidadeDoRecurso(c.recurso),
    valor: gastoPorVez(item, c.id) * vezes,
  }));
  const valorEmReais = emReais(item) ? valorDoRegistro(item, r) : 0;
  const noPeriodo = dentroDaJanela(r.data, doFechamento);
  const lembrete =
    (estado.lembretes ?? []).find((l) => l.registro === item.id && (!l.data || l.data === r.data)) ?? null;

  return (
    <div className="linha-registro">
      <button
        type="button"
        className="linha-registro__botao"
        onClick={() => ir("lancamento", { tipo: "registro", item: item.id, id: r.id })}
      >
        <span className="linha-registro__icone">
          <Icone nome="registro" tamanho={20} />
        </span>
        <span className="linha-registro__textos">
          <strong>{item.nome}</strong>
          <span>
            {listaEmFrase((r.participantes ?? []).map((id) => nomeDe(estado, id)))} ·{" "}
            {emReais(item) ? quantidadeNaUnidade(item, r) : quantas(item, r.quantidade)}
            {mostrarDia ? ` · ${curta(r.data)}` : ""}
          </span>
          {ciclos.length > 0 && (
            <small>
              {dentro.length > 0
                ? dentro
                    .map((c) => {
                      const j = janelaDaFatura(c, estado.periodo);
                      return `${(c.nome || "conta").toLowerCase()}: ciclo ${curta(j.de)}–${curta(ultimoDiaDaJanela(j))}`;
                    })
                    .join(" · ")
                : "fora dos ciclos lançados: entra na próxima fatura"}
            </small>
          )}
          {emReais(item) && <small>{noPeriodo ? "dentro do período" : "fora do período: não entra nesta conta"}</small>}
          {lembrete && (
            <span className="vinculo vinculo--pequeno">
              <Icone nome="documento" tamanho={14} /> do lembrete “{lembrete.texto || lembrete.titulo}”
            </span>
          )}
        </span>
        <span className="linha-registro__valor">
          {valorEmReais > 0 && <strong>{dinheiro(valorEmReais)}</strong>}
          {consumo
            .filter((c) => c.valor > 0)
            .map((c) => (
              <strong key={c.unidade}>
                {reais(c.valor).replace(/,?0+$/, "").replace(/,$/, "")} {c.unidade}
              </strong>
            ))}
        </span>
      </button>
    </div>
  );
}

/**
 * Ver registros: os usos lançados, com busca e a pasta Todos | um item por
 * aba, agrupados por quando (hoje, marcados para depois, esta semana, antes).
 */
export default function VerRegistros({ app }) {
  const { estado, resultado, ir, voltar } = app;
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [tudoDeAntes, setTudoDeAntes] = useState(false);
  const hoje = hojeISO();
  const ANTES_VISIVEIS = 6;

  const comUso = estado.itens.filter((i) => registravel(i, estado));
  const filtros = [{ valor: "todos", rotulo: "Todos" }, ...comUso.map((i) => ({ valor: i.id, rotulo: i.nome }))];
  const filtroValido = filtros.some((f) => f.valor === filtro) ? filtro : "todos";

  const termo = normal(busca.trim());
  const todos = todosOsRegistros(estado);
  const lista = todos.filter(
    ({ item, r }) =>
      (filtroValido === "todos" || item.id === filtroValido) &&
      (!termo ||
        [item.nome, ...(r.participantes ?? []).map((id) => nomeDe(estado, id)), curta(r.data)].some((t) =>
          normal(t).includes(termo),
        )),
  );

  const grupos = [
    { chave: "hoje", titulo: `Hoje · ${curta(hoje)}`, lista: lista.filter(({ r }) => r.data === hoje) },
    { chave: "depois", titulo: "Marcados para depois", lista: lista.filter(({ r }) => r.data > hoje) },
    { chave: "semana", titulo: "Esta semana", lista: lista.filter(({ r }) => r.data < hoje && diasAte(r.data, hoje) <= 7) },
    { chave: "antes", titulo: "Antes", lista: lista.filter(({ r }) => diasAte(r.data, hoje) > 7) },
  ].filter((g) => g.lista.length > 0);

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito partes={sobrescritoDaTela(app)} />
      <h1 className="titulo-tela titulo-tela--grande">
        Ver <em>registros</em>
      </h1>

      <label className="busca">
        <Icone nome="busca" tamanho={22} />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar registro"
          aria-label="Buscar registro"
        />
      </label>

      <AbasDePasta opcoes={filtros} valor={filtroValido} aoMudar={setFiltro} rotulo="Item do registro">
        {grupos.length === 0 ? (
          <p className="vazio-suave vazio-suave--na-pasta">
            {todos.length === 0 ? "Nenhum uso registrado ainda." : "Nenhum registro com essa busca."}
          </p>
        ) : (
          grupos.map((g) => (
            <div key={g.chave} className="grupo-na-pasta">
              <p className="rotulo-secao rotulo-secao--na-pasta">{g.titulo}</p>
              <div className="cartao-lista">
                {(g.chave === "antes" && !tudoDeAntes ? g.lista.slice(0, ANTES_VISIVEIS) : g.lista).map(({ item, r }) => (
                  <LinhaDeRegistro key={`${item.id}-${r.id}`} app={app} item={item} r={r} mostrarDia={g.chave !== "hoje"} />
                ))}
                {g.chave === "antes" && g.lista.length > ANTES_VISIVEIS && (
                  <button type="button" className="linha-despesa linha-despesa--mais" onClick={() => setTudoDeAntes((v) => !v)}>
                    <strong>{tudoDeAntes ? "Mostrar menos" : `Ver os outros ${g.lista.length - ANTES_VISIVEIS} registros`}</strong>
                    <Icone nome={tudoDeAntes ? "baixo" : "seta"} tamanho={18} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </AbasDePasta>

      {comUso.length > 0 && (
        <section className="cartao-areia">
          <h3>Quanto vale cada uso</h3>
          <p>
            {comUso.some(emReais)
              ? "Equipamento fora das faturas vale o preço da hora ou do uso, em reais, e conta só o que cai dentro do período. "
              : ""}
            Cada registro de aparelho é valorado pelo preço da grandeza ({simboloDe()} por kWh ou por m³) do ciclo vigente na data do uso.
            {resultado.ciclos.some((c) => c.tarifa > 0)
              ? ` Neste fechamento: ${resultado.ciclos
                  .filter((c) => c.tarifa > 0)
                  .map((c) => `${(c.nome || "conta").toLowerCase()} ${simboloDe()} ${reais(c.tarifa)} por ${unidadeDoRecurso(c.recurso)}`)
                  .join(", ")}.`
              : " O valor aparece quando a fatura daquele ciclo chegar."}
          </p>
        </section>
      )}

      <div className="rodape-fixo">
        <button type="button" className="botao botao--largo" onClick={() => ir("lancarRegistro")}>
          + Lançar registro
        </button>
      </div>
    </div>
  );
}
