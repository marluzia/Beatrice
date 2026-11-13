import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { Avatar, Chips, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { ciclosDoRegistro, janelaDaFatura, registravel, registrosDe } from "../nucleo/adaptador.js";
import { dentroDaJanela, janelaDoFechamento, ultimoDiaDaJanela } from "../nucleo/calendario.js";
import { unidadeDoRecurso } from "../nucleo/ciclos.js";
import { num, reais } from "../nucleo/formato.js";
import { curta, diasAte, hojeISO, listaEmFrase, medeHoras, nomeDe } from "../nucleo/resumo.js";
import { dinheiro } from "../componentes/Interface.jsx";

const UNIDADE_NA_TELA = { kWh: "kWh", "m³": "m³", kwh: "kWh", m3: "m³" };

const porHora = (item) => medeHoras(item);

/** Um equipamento da Multi (a lancha): o registro vale em reais, não em kWh ou m³. */
const emReais = (item) => Boolean(item.equipamento) && item.especie === "porUso" && item.origemUso === "reais";

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

function Formulario({ estado, itens, acoes, aoFechar }) {
  const [item, setItem] = useState(itens[0]?.id ?? "");
  const [data, setData] = useState(hojeISO());
  const [quantidade, setQuantidade] = useState("1");
  const escolhido = itens.find((i) => i.id === item);
  const [quem, setQuem] = useState(() => (escolhido ? [...escolhido.participantes] : []));

  const trocarItem = (id) => {
    setItem(id);
    setQuem([...(itens.find((i) => i.id === id)?.participantes ?? [])]);
  };

  return (
    <section className="cartao formulario-registro">
      <h2 className="titulo-secao__texto">
        Novo <em>registro</em>
      </h2>
      <label className="campo-novo">
        <span className="rotulo">Item ou aparelho</span>
        <select className="caixa caixa--texto" value={item} onChange={(e) => trocarItem(e.target.value)}>
          {itens.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
      </label>
      <div className="linha-campos linha-campos--duas">
        <label className="campo-novo">
          <span className="rotulo">Dia</span>
          <input className="caixa caixa--texto" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        <label className="campo-novo">
          <span className="rotulo">{escolhido && porHora(escolhido) ? "Quantas horas" : "Quantas vezes"}</span>
          <input
            className="caixa"
            inputMode="decimal"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </label>
      </div>
      <span className="rotulo">Quem usou</span>
      <div className="fichas-de-pessoa">
        {estado.moradores.map((m, i) => {
          const ativo = quem.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              className={`ficha-pessoa ficha-pessoa--escolha ${ativo ? "ficha-pessoa--ativa" : ""}`}
              aria-pressed={ativo}
              onClick={() => setQuem((q) => (ativo ? q.filter((x) => x !== m.id) : [...q, m.id]))}
            >
              <Avatar nome={nomeDe(estado, m.id)} indice={i} tamanho={28} />
              {nomeDe(estado, m.id)}
            </button>
          );
        })}
      </div>
      <div className="linha-dupla">
        <button type="button" className="botao botao--fantasma" onClick={aoFechar}>
          Cancelar
        </button>
        <button
          type="button"
          className="botao"
          disabled={!item || !data || quem.length === 0}
          onClick={() => {
            acoes.lancarRegistro(item, { data, quantidade, participantes: quem });
            aoFechar();
          }}
        >
          Registrar
        </button>
      </div>
    </section>
  );
}

/** Registros: cada uso de aparelho que sai das faturas, por data. */
export default function Registros({ app, rota }) {
  const { estado, modo, acoes, voltar, ir, nomeDoConjunto, resultado, abrirNotificacoes } = app;
  const doFechamento = janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte);
  const [filtro, setFiltro] = useState("todos");
  const [formulario, setFormulario] = useState(Boolean(rota?.novo));
  const [aberto, setAberto] = useState(null);
  const [tudoDeAntes, setTudoDeAntes] = useState(false);
  const hoje = hojeISO();
  const ANTES_VISIVEIS = 6;

  // Só itens e aparelhos que consomem kWh ou m³, medidos por uso ou por hora.
  const comUso = estado.itens.filter((i) => registravel(i, estado));
  const filtros = [{ valor: "todos", rotulo: "Todos" }, ...comUso.map((i) => ({ valor: i.id, rotulo: i.nome }))];

  const todos = comUso
    .filter((i) => filtro === "todos" || i.id === filtro)
    .flatMap((i) => registrosDe(i).map((r) => ({ item: i, r })))
    .filter(({ r }) => r.data)
    .sort((a, b) => b.r.data.localeCompare(a.r.data));

  const grupos = [
    { chave: "hoje", titulo: `Hoje · ${curta(hoje)}`, lista: todos.filter(({ r }) => r.data === hoje) },
    { chave: "depois", titulo: "Marcados para depois", lista: todos.filter(({ r }) => r.data > hoje) },
    { chave: "semana", titulo: "Esta semana", lista: todos.filter(({ r }) => r.data < hoje && diasAte(r.data, hoje) <= 7) },
    { chave: "antes", titulo: "Antes", lista: todos.filter(({ r }) => diasAte(r.data, hoje) > 7) },
  ].filter((g) => g.lista.length > 0);

  const ligadoA = (item, r) =>
    (estado.lembretes ?? []).find((l) => l.registro === item.id && (!l.data || l.data === r.data)) ?? null;

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} acoes={[{ icone: "sino", rotulo: "Notificações", aoClicar: abrirNotificacoes }]} />
      <Sobrescrito>{nomeDoConjunto}</Sobrescrito>
      <h1 className="titulo-tela titulo-tela--grande">Registros</h1>
      <p className="texto-apoio">
        Usos de itens e aparelhos que consomem kWh ou m³ e saem das faturas
        {modo.equipamentos ? ", e dos equipamentos fora delas (lancha, gerador), que valem em reais" : ""}. Também aparecem
        no calendário.
      </p>

      {comUso.length > 1 && <Chips opcoes={filtros} valor={filtro} aoMudar={setFiltro} />}

      {formulario && comUso.length > 0 && (
        <Formulario estado={estado} itens={comUso} acoes={acoes} aoFechar={() => setFormulario(false)} />
      )}

      {comUso.length === 0 ? (
        <>
          <p className="vazio-suave">
            Registros são de itens e aparelhos que consomem kWh ou m³, medidos por uso (máquina de lavar) ou por hora
            (ar-condicionado, chuveiro). Cadastre um em Configurar conjunto → Itens, com o gasto de cada uso ou hora.
          </p>
          <button type="button" className="botao botao--fantasma botao--largo" onClick={() => ir("configurar", { parte: "itens" })}>
            Cadastrar itens
          </button>
        </>
      ) : grupos.length === 0 ? (
        <p className="vazio-suave">Nenhum uso registrado. Toque em “Novo registro” a cada lavagem ou a cada vez que o ar ligar.</p>
      ) : (
        grupos.map((g) => (
          <div key={g.chave}>
            <p className="rotulo-secao">{g.titulo}</p>
            <div className="cartao-lista">
              {(g.chave === "antes" && !tudoDeAntes ? g.lista.slice(0, ANTES_VISIVEIS) : g.lista).map(({ item, r }) => {
                const ciclos = ciclosDoRegistro(item, estado);
                const dentro = ciclos.filter((c) => dentroDaJanela(r.data, janelaDaFatura(c, estado.periodo)));
                const vezes = num(r.quantidade) || 1;
                const consumo = ciclos.map((c) => ({
                  unidade: UNIDADE_NA_TELA[unidadeDoRecurso(c.recurso)] ?? unidadeDoRecurso(c.recurso),
                  valor: gastoPorVez(item, c.id) * vezes,
                }));
                const valorEmReais = emReais(item) ? num(item.valorPorUso) * vezes : 0;
                const noPeriodo = dentroDaJanela(r.data, doFechamento);
                const lembrete = ligadoA(item, r);
                const chave = `${item.id}-${r.id}`;
                return (
                  <div className="linha-registro" key={chave}>
                    <button type="button" className="linha-registro__botao" onClick={() => setAberto(aberto === chave ? null : chave)}>
                      <span className="linha-registro__icone">
                        <Icone nome="registro" tamanho={20} />
                      </span>
                      <span className="linha-registro__textos">
                        <strong>{item.nome}</strong>
                        <span>
                          {listaEmFrase((r.participantes ?? []).map((id) => nomeDe(estado, id)))} · {quantas(item, r.quantidade)}
                          {g.chave !== "hoje" ? ` · ${curta(r.data)}` : ""}
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
                        {emReais(item) && (
                          <small>{noPeriodo ? "dentro do período" : "fora do período: não entra nesta conta"}</small>
                        )}
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
                    {aberto === chave && (
                      <div className="linha-registro__acoes">
                        <button type="button" className="link-sublinhado" onClick={() => acoes.removerUso(item.id, r.id)}>
                          Apagar este registro
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
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

      {comUso.length > 0 && (
        <section className="cartao-areia">
          <h3>Quanto vale cada uso</h3>
          <p>
            {comUso.some(emReais)
              ? "Equipamento fora das faturas vale o preço da hora ou do uso, em reais, e conta só o que cai dentro do período. "
              : ""}
            Cada registro de aparelho é valorado pelo preço da grandeza (R$ por kWh ou por m³) do ciclo vigente na data do uso.
            {resultado.ciclos.some((c) => c.tarifa > 0)
              ? ` Neste fechamento: ${resultado.ciclos
                  .filter((c) => c.tarifa > 0)
                  .map((c) => `${(c.nome || "conta").toLowerCase()} R$ ${reais(c.tarifa)} por ${unidadeDoRecurso(c.recurso)}`)
                  .join(", ")}.`
              : " O valor aparece quando a fatura daquele ciclo chegar."}
          </p>
        </section>
      )}

      {!formulario && comUso.length > 0 && (
        <div className="rodape-fixo rodape-fixo--sobre-barra">
          <button type="button" className="botao botao--largo" onClick={() => setFormulario(true)}>
            + Novo registro
          </button>
        </div>
      )}
    </div>
  );
}
