import { dinheiro, LinhaDeMenu, mostrarAviso, SetaComBarra, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { autoriaDe, podeEditar } from "../nucleo/autoria.js";
import { registrosDe } from "../nucleo/adaptador.js";
import { ultimoDiaDaJanela } from "../nucleo/calendario.js";
import { modeloPorChave } from "../nucleo/catalogo.js";
import { RECURSOS, unidadeDoRecurso } from "../nucleo/ciclos.js";
import { num, reais } from "../nucleo/formato.js";
import { foraDaConta } from "../nucleo/naConta.js";
import {
  curta,
  hojeISO,
  listaEmFrase,
  nomeDaRegra,
  nomeDe,
  O_QUE_FOI_EDITADO,
  PALAVRA_DO_USO,
  STATUS_DA_DESPESA,
  statusDaDespesa,
  todasAsDespesas,
  valorDeclarado,
} from "../nucleo/resumo.js";
import { totalDaFatura } from "../nucleo/traducao/fatura.js";

const NOME_DO_TIPO = {
  avulsa: "Despesa avulsa",
  ciclica: "Despesa cíclica",
  registro: "Registro de uso",
  lembrete: "Lembrete",
  edicao: "Edição",
};

/** A edição aponta para o lançamento editado: a mesma referência da rota. */
const mesmaRef = (a, b) => a?.tipo === b?.tipo && a?.id === b?.id && (a?.item ?? null) === (b?.item ?? null);

const NOME_DA_REGRA_DO_CICLO = { igual: "igual", dias: "dias", porcentagem: "%", comum: "pela régua do uso comum" };

/** "04/11/2026, 10:20", no fuso de quem olha. */
export function momento(iso) {
  if (!iso) return null;
  if (iso.length <= 10) return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Uma linha da ficha: o rótulo à esquerda, o dado à direita. */
function Dado({ rotulo, children }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="ficha__linha">
      <span className="ficha__rotulo">{rotulo}</span>
      <span className="ficha__dado">{children}</span>
    </div>
  );
}

/** Encontra o lançamento da rota no conjunto, com tudo o que a ficha mostra. */
export function acharLancamento(app, rota) {
  const { estado, resultado } = app;
  const hoje = hojeISO();
  const pessoa = (id) => (id ? nomeDe(estado, id) : null);

  if (rota.tipo === "avulsa") {
    const item = estado.itens.find((i) => i.id === rota.id);
    if (!item) return null;
    const valor = resultado?.itens?.find((x) => x.id === item.id)?.custoTotal ?? valorDeclarado(item);
    return {
      original: item,
      nome: item.nome?.trim() || "Despesa",
      valor,
      status: statusDaDespesa(item, hoje),
      fora: foraDaConta(estado).itens.has(item.id),
      duplicavel: true,
      dados: [
        ["Categoria", modeloPorChave(item.modelo)?.nome ?? null],
        ["Quem pagou", item.pagoPor ? pessoa(item.pagoPor) : "ninguém ainda"],
        ["Como divide", nomeDaRegra(item.rateio)],
        ["Quem paga", listaEmFrase((item.participantes ?? []).map(pessoa))],
        ["Quando foi", item.data ? (item.ate && item.ate > item.data ? `${curta(item.data)} a ${curta(item.ate)}` : momento(item.data)) : null],
      ],
    };
  }

  if (rota.tipo === "ciclica") {
    const c = (estado.ciclos ?? []).find((x) => x.id === rota.id);
    if (!c) return null;
    const medido = Boolean(RECURSOS[c.recurso]);
    const consumo = (c.linhas ?? []).filter((l) => l.comportamento === "consumo").reduce((s, l) => s + num(l.quantidade), 0);
    return {
      original: c,
      nome: c.nome || "Conta",
      valor: totalDaFatura(c),
      status: statusDaDespesa(c, hoje),
      fora: foraDaConta(estado).ciclos.has(c.id),
      duplicavel: false,
      dados: [
        ["Quem pagou", c.pagoPor ? `${pessoa(c.pagoPor)}${c.pagoEm ? `, em ${momento(c.pagoEm.slice(0, 10))}` : ""}` : "ninguém ainda"],
        ["Consumo", medido && consumo > 0 ? `${reais(consumo).replace(",00", "")} ${unidadeDoRecurso(c.recurso)}` : null],
        ["Como divide", medido ? "pelos aparelhos; o resto pela régua do uso comum" : NOME_DA_REGRA_DO_CICLO[c.rateio] ?? "igual"],
        ["Quem paga", "todas as pessoas do conjunto"],
        ["Quando foi", c.janela ? `consumo de ${curta(c.janela.de)} a ${curta(ultimoDiaDaJanela(c.janela))}` : null],
        ["Vencimento", c.vencimento ? momento(c.vencimento) : null],
      ],
    };
  }

  if (rota.tipo === "registro") {
    const item = estado.itens.find((i) => i.id === rota.item);
    const r = item ? registrosDe(item).find((x) => x.id === rota.id) : null;
    if (!r) return null;
    const valor = todasAsDespesas(estado, resultado, hoje).find((d) => d.tipo === "registrada" && d.registro?.id === r.id)?.valor ?? 0;
    const q = num(r.quantidade) || 1;
    return {
      original: r,
      item,
      nome: item.nome?.trim() || "Uso",
      valor,
      duplicavel: true,
      dados: [
        ["Quanto", PALAVRA_DO_USO(item, q)],
        ["Quem usou", listaEmFrase((r.participantes ?? []).map(pessoa))],
        ["Quando foi", momento(r.data)],
      ],
    };
  }

  if (rota.tipo === "lembrete") {
    const l = (estado.lembretes ?? []).find((x) => x.id === rota.id);
    if (!l) return null;
    const feitos = (l.itens ?? []).filter((x) => x.feito).length;
    return {
      original: l,
      nome: l.tipo === "lista" ? l.titulo || "Lista sem nome" : "Nota",
      duplicavel: true,
      dados: [
        ["Tipo", l.tipo === "lista" ? `lista · ${feitos} de ${(l.itens ?? []).length} feitos` : "nota"],
        ["No calendário", l.data ? momento(l.data) : null],
      ],
    };
  }
  if (rota.tipo === "edicao") {
    const ed = (estado.edicoes ?? []).find((x) => x.id === rota.id);
    if (!ed) return null;
    return {
      original: ed,
      nome: `Edição de ${ed.nome?.trim() || "um lançamento"}`,
      duplicavel: false,
      editavel: false,
      dados: [["O que foi editado", `${O_QUE_FOI_EDITADO[ed.ref?.tipo] ?? ""}${ed.nome || ""}`.trim()]],
    };
  }

  return null;
}

/** As edições de um lançamento, da mais recente para a mais antiga. */
export function edicoesDe(estado, ref) {
  return (estado.edicoes ?? [])
    .filter((ed) => mesmaRef(ed.ref, ref))
    .sort((a, b) => String(b.lancadoEm ?? "").localeCompare(String(a.lancadoEm ?? "")));
}

/** O que mudou numa edição: cada campo com o antes e o depois. */
function Mudancas({ mudancas }) {
  if (!mudancas?.length) return null;
  return (
    <section className="cartao ficha mudancas" aria-label="O que mudou">
      {mudancas.map((m, i) => (
        <div className="mudanca" key={`${m.campo}-${i}`}>
          <span className="ficha__rotulo">{m.campo}</span>
          <span className="mudanca__valores">
            <span className="mudanca__antes">{m.antes || "vazio"}</span>
            <span className="mudanca__seta" aria-hidden="true">
              →
            </span>
            <span className="mudanca__depois">{m.depois || "vazio"}</span>
          </span>
        </div>
      ))}
    </section>
  );
}

/**
 * Um lançamento sozinho: uma despesa avulsa, uma fatura, um registro, um
 * lembrete ou uma edição. Mostra os dados dele e quem lançou e quando. O lápis
 * no papel (editar) leva à tela de editar, para quem lançou e para o admin;
 * duplicar faz uma cópia que passa a ser um lançamento de quem duplicou.
 */
export default function Lancamento({ app, rota }) {
  const { estado, acoes, eu, ir, voltar, nomeDoConjunto } = app;
  const lancamento = acharLancamento(app, rota ?? {});

  if (!lancamento) {
    return (
      <div className="tela">
        <TopoDaTela aoVoltar={voltar} />
        <h1 className="titulo-tela titulo-tela--grande">Lançamento</h1>
        <p className="vazio-suave">Este lançamento não existe mais: foi apagado.</p>
      </div>
    );
  }

  const ref = { tipo: rota.tipo, id: rota.id, ...(rota.item ? { item: rota.item } : {}) };
  const { por, em } = autoriaDe(lancamento.original);
  const editavel = lancamento.editavel !== false;
  const pode = editavel && podeEditar(estado, lancamento.original, eu);
  const status = lancamento.status ? STATUS_DA_DESPESA[lancamento.status] : null;
  const edicao = rota.tipo === "edicao" ? lancamento.original : null;
  const edicoes = edicao ? [] : edicoesDe(estado, ref);

  const duplicar = () => {
    let novo = null;
    if (rota.tipo === "avulsa") novo = { tipo: "avulsa", id: acoes.duplicarItem(rota.id) };
    if (rota.tipo === "registro") novo = { tipo: "registro", item: rota.item, id: acoes.duplicarRegistro(rota.item, rota.id, hojeISO()) };
    if (rota.tipo === "lembrete") novo = { tipo: "lembrete", id: acoes.duplicarLembrete(rota.id) };
    if (!novo?.id) return;
    mostrarAviso("Duplicado. A cópia é um lançamento seu.");
    ir("lancamento", novo);
  };

  const icones = [
    ...(pode ? [{ icone: "editar", rotulo: "Editar", aoClicar: () => ir("editarLancamento", ref) }] : []),
    ...(lancamento.duplicavel ? [{ icone: "copiar", rotulo: "Duplicar", aoClicar: duplicar }] : []),
  ];

  return (
    <div className="tela">
      <TopoDaTela aoVoltar={voltar} acoes={icones} />
      <Sobrescrito partes={[NOME_DO_TIPO[rota.tipo], nomeDoConjunto]} />
      <h1 className="titulo-tela titulo-tela--grande">{lancamento.nome}</h1>

      {(status || lancamento.fora) && (
        <div className="selos-do-lancamento">
          {status && <span className={`status-despesa status-despesa--${status.tom}`}>{status.rotulo}</span>}
          {lancamento.fora && <span className="status-despesa status-despesa--neutro">fora da conta</span>}
        </div>
      )}

      {lancamento.valor > 0 && <strong className="valor-do-lancamento">{dinheiro(lancamento.valor)}</strong>}

      {rota.tipo === "lembrete" &&
        (lancamento.original.tipo === "lista" ? (
          // A lista se risca por qualquer um; mudar nome e itens é editar.
          <div className="fichas-da-lista fichas-da-lista--soltas">
            {(lancamento.original.itens ?? []).map((i) => (
              <button
                key={i.id}
                type="button"
                className={`ficha-da-lista ${i.feito ? "ficha-da-lista--feita" : ""}`}
                aria-pressed={i.feito}
                onClick={() => acoes.alternarItemDaLista(lancamento.original.id, i.id)}
              >
                {i.texto}
              </button>
            ))}
            {(lancamento.original.itens ?? []).length === 0 && <p className="vazio-suave">Lista sem itens.</p>}
            {(lancamento.original.itens ?? []).length > 0 && <p className="dica dica--na-lista">Toque num item para riscar.</p>}
          </div>
        ) : (
          <p className="nota-papel nota-papel__texto nota-papel--so-leitura">{lancamento.original.texto || "Nota em branco"}</p>
        ))}

      {edicao && <Mudancas mudancas={edicao.mudancas} />}

      <section className="cartao ficha">
        {lancamento.dados.map(([rotulo, dado]) => (
          <Dado key={rotulo} rotulo={rotulo}>
            {dado}
          </Dado>
        ))}
        <Dado rotulo={edicao ? "Editado por" : "Lançado por"}>
          {por ? `${nomeDe(estado, por)}${por === eu ? " (você)" : ""}` : "sem registro"}
        </Dado>
        <Dado rotulo={edicao ? "Editado em" : "Lançado em"}>{momento(em) ?? "sem registro"}</Dado>
      </section>

      {edicao && (
        <div className="cartao-lista">
          <LinhaDeMenu
            icone="documento"
            titulo="Ver o lançamento editado"
            subtitulo={NOME_DO_TIPO[edicao.ref?.tipo]?.toLowerCase() ?? "lançamento"}
            aoClicar={() => ir("lancamento", edicao.ref)}
          />
        </div>
      )}

      {rota.tipo === "ciclica" && (
        <div className="cartao-lista">
          <LinhaDeMenu
            icone="calendario"
            titulo="Composição e datas"
            subtitulo="as linhas da fatura e a linha do tempo do consumo"
            aoClicar={() => ir("ciclo", { id: rota.id })}
          />
        </div>
      )}

      {edicoes.length > 0 && (
        <section className="edicoes-do-lancamento" aria-label="Edições">
          <h2 className="rotulo-secao">
            {edicoes.length} {edicoes.length === 1 ? "edição" : "edições"}
          </h2>
          <div className="cartao-lista">
            {edicoes.map((ed) => (
              <button key={ed.id} type="button" className="linha-despesa" onClick={() => ir("lancamento", { tipo: "edicao", id: ed.id })}>
                <span>
                  <strong>
                    {ed.lancadoPor ? nomeDe(estado, ed.lancadoPor) : "Alguém"} · {momento(ed.lancadoEm) ?? "sem data"}
                  </strong>
                  <span>{(ed.mudancas ?? []).map((m) => m.campo.toLowerCase()).join(", ") || "sem mudança"}</span>
                </span>
                <SetaComBarra />
              </button>
            ))}
          </div>
        </section>
      )}

      {editavel && !pode && (
        <p className="nota-tipo">
          Só {nomeDe(estado, por)} (quem lançou
          {estado.admin === por ? " e administra o conjunto" : ""})
          {estado.admin && estado.admin !== por ? ` ou ${nomeDe(estado, estado.admin)} (admin)` : ""} pode editar este
          lançamento.{lancamento.duplicavel ? " Duplicar faz uma cópia sua." : ""}
        </p>
      )}
    </div>
  );
}
