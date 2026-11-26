import { useState } from "react";
import { Campo, CampoData, Rotulo } from "../componentes/index.js";
import ListaDePessoas from "../componentes/ListaDePessoas.jsx";
import { dinheiro, mostrarAviso } from "../componentes/Interface.jsx";
import { CabecalhoDaSecao, rotuloDaAba } from "../componentes/CabecalhoDoConjunto.jsx";
import { autoriaDe, podeEditar } from "../nucleo/autoria.js";
import { modeloPorChave } from "../nucleo/catalogo.js";
import { RECURSOS, unidadeDoRecurso } from "../nucleo/ciclos.js";
import { num } from "../nucleo/formato.js";
import { listaEmFrase, medeHoras, nomeDaRegra, nomeDe, PALAVRA_DO_USO } from "../nucleo/resumo.js";
import CartaoItem from "../passos/CartaoItem.jsx";
import { acharLancamento, momento } from "./Lancamento.jsx";
import {
  FormularioDaAvulsa,
  FormularioDaCiclica,
  NOME_DA_REGRA_DO_CICLO,
  rascunhoDaFatura,
  rascunhoDoItem,
} from "./LancarDespesa.jsx";
import { CamposDaLista, CamposDaNota, itensDaLista, rascunhoDoLembrete } from "./LancarLembrete.jsx";
import { CampoNotaDoRegistro } from "./LancarRegistro.jsx";

const PALAVRA = { avulsa: "despesa", ciclica: "despesa", registro: "registro", lembrete: "lembrete" };
const APAGAR = { avulsa: "Apagar esta despesa", registro: "Apagar este registro", lembrete: "Apagar este lembrete" };

/** Só o que mudou: cada campo com o antes e o depois, já em texto. */
const soOQueMudou = (campos) =>
  campos
    .map(([campo, antes, depois]) => ({ campo, antes: antes ?? "", depois: depois ?? "" }))
    .filter((m) => m.antes !== m.depois);

/** Os textos com que uma edição descreve as pessoas, o pagador e as partes. */
function textos(estado) {
  const nomes = (ids) =>
    listaEmFrase(estado.moradores.filter((m) => (ids ?? []).includes(m.id)).map((m) => nomeDe(estado, m.id))) || "ninguém";
  const pagador = (id) => (id ? nomeDe(estado, id) : "ninguém");
  const partes = (d) => {
    const porRegra = {
      porcentagem: ["porcentagens", (v) => `${v}%`],
      valor: ["valores", (v) => dinheiro(num(v))],
      cotas: ["cotas", (v) => `${v}`],
      ajuste: ["ajustes", (v) => dinheiro(num(v))],
      uso: ["usosPorPessoa", (v) => `${v}`],
      horas: ["usosPorPessoa", (v) => `${v} h`],
    }[d.rateio];
    if (!porRegra) return "";
    const [campo, como] = porRegra;
    return estado.moradores
      .filter((m) => String(d[campo]?.[m.id] ?? "").trim() !== "")
      .map((m) => `${nomeDe(estado, m.id)} ${como(d[campo][m.id])}`)
      .join(", ");
  };
  return { nomes, pagador, partes };
}

/** A tela de cada tipo termina igual: o aviso de quem não pode, ou o "apagar". */
function Apagar({ tipo, aoApagar }) {
  if (!APAGAR[tipo]) return null;
  return (
    <button type="button" className="apagar-lancamento" onClick={aoApagar}>
      {APAGAR[tipo]}
    </button>
  );
}

// ── despesa avulsa que não é "em reais" (faxina por uso, equipamento) ──────

/**
 * O cartão do item, mexendo num rascunho: nada muda no conjunto até salvar.
 * As ações do cartão escrevem no rascunho.
 */
function EdicaoNoCartao({ app, item, aoSalvar, rodape }) {
  const { estado, resultado, indicePorId, modo } = app;
  const [r, setR] = useState(() => structuredClone(item));
  const acoesDoRascunho = {
    editarItem: (_id, campo, valor) => setR((x) => ({ ...x, [campo]: valor })),
    definirParticipantes: (_id, ids) => setR((x) => ({ ...x, participantes: [...ids] })),
    definirPagador: (_alvo, _id, quem) => setR((x) => ({ ...x, pagoPor: quem })),
    alternarParticipante: (_id, pessoa) =>
      setR((x) => ({
        ...x,
        participantes: x.participantes.includes(pessoa)
          ? x.participantes.filter((p) => p !== pessoa)
          : [...x.participantes, pessoa],
      })),
    removerItem: () => {},
  };
  return (
    <>
      <CartaoItem
        item={r}
        moradores={estado.moradores}
        indicePorId={indicePorId}
        resultado={resultado}
        periodo={estado.periodo}
        ciclos={estado.ciclos}
        corte={estado.corte}
        acoes={acoesDoRascunho}
        modo={modo}
        sozinho
      />
      {rodape}
      <div className="rodape-fixo">
        <button type="button" className="botao botao--largo" onClick={() => aoSalvar(r)}>
          Salvar edição
        </button>
      </div>
    </>
  );
}

// ── registro ───────────────────────────────────────────────────────────────

function EdicaoDoRegistro({ app, item, registro, aoSalvar, rodape }) {
  const { estado, indicePorId } = app;
  const [r, setR] = useState(() => ({
    data: registro.data ?? null,
    quantidade: String(registro.quantidade ?? "1"),
    participantes: [...(registro.participantes ?? [])],
    nota: registro.nota ?? null,
  }));
  const mudar = (campo, valor) => setR((x) => ({ ...x, [campo]: valor }));
  return (
    <>
      <div className="formulario formulario--classico">
        <div className="grupo">
          <Rotulo>Item</Rotulo>
          <p className="dica">{item.nome}</p>
        </div>
        <Campo
          rotulo={medeHoras(item) ? "Quantas horas" : "Quantas vezes"}
          valor={r.quantidade}
          aoMudar={(v) => mudar("quantidade", v)}
          rotuloSolto
          largura="campo--curto"
        />
        <div className="grupo">
          <Rotulo>Quem divide</Rotulo>
          <ListaDePessoas
            rotulo="Quem divide"
            pessoas={estado.moradores}
            indicePorId={indicePorId}
            selecionados={r.participantes}
            aoMudar={(sel) => mudar("participantes", sel)}
          />
        </div>
        <CampoData rotulo="Quando foi" valor={r.data} aoMudar={(v) => v && mudar("data", v)} etiqueta="Data do registro" />
        <CampoNotaDoRegistro estado={estado} valor={r.nota} aoMudar={(v) => mudar("nota", v)} />
      </div>
      {rodape}
      <div className="rodape-fixo">
        <button type="button" className="botao botao--largo" onClick={() => aoSalvar(r)}>
          Salvar edição
        </button>
      </div>
    </>
  );
}

// ── lembrete ───────────────────────────────────────────────────────────────

function EdicaoDoLembrete({ app, lembrete, aoSalvar, rodape }) {
  const [r, setR] = useState(() => rascunhoDoLembrete(lembrete));
  return (
    <>
      {lembrete.tipo === "lista" ? (
        <CamposDaLista lista={r} setLista={setR} estado={app.estado} indicePorId={app.indicePorId} />
      ) : (
        <CamposDaNota nota={r} setNota={setR} estado={app.estado} indicePorId={app.indicePorId} />
      )}
      {rodape}
      <div className="rodape-fixo">
        <button type="button" className="botao botao--largo" onClick={() => aoSalvar(r)}>
          Salvar edição
        </button>
      </div>
    </>
  );
}

/**
 * Editar despesa (ou registro, ou lembrete): o mesmo formulário de lançar,
 * já com o que o lançamento tem. Salvar lança uma edição: quem editou,
 * quando e o que mudou, antes e depois. Quem lançou o original não muda.
 */
export default function EditarLancamento({ app, rota }) {
  const { estado, acoes, eu, voltar, voltarSem, nomeDoConjunto } = app;
  const lancamento = rota ? acharLancamento(app, rota) : null;
  const palavra = PALAVRA[rota?.tipo] ?? "lançamento";

  const topo = <CabecalhoDaSecao app={app} secao={`Editar ${palavra}`} subsecao={lancamento?.nome ?? null} />;

  if (!lancamento || lancamento.editavel === false) {
    return (
      <div className="tela">
        {topo}
        <p className="vazio-suave">Este lançamento não existe mais ou não se edita.</p>
      </div>
    );
  }

  const original = lancamento.original;
  if (!podeEditar(estado, original, eu)) {
    const { por } = autoriaDe(original);
    return (
      <div className="tela">
        {topo}
        <p className="nota-tipo">
          Só {nomeDe(estado, por)} (quem lançou){estado.admin && estado.admin !== por ? ` ou ${nomeDe(estado, estado.admin)} (admin)` : ""}{" "}
          pode editar este lançamento.
        </p>
      </div>
    );
  }

  const { nomes, pagador, partes } = textos(estado);

  /** Salva, ou avisa que nada mudou. */
  const salvar = (mudancas, gravar) => {
    if (mudancas.length === 0) return mostrarAviso("Nada mudou.");
    gravar(mudancas);
    voltar();
    mostrarAviso("Sucesso. A edição foi lançada.");
  };

  const apagar = () => {
    if (!window.confirm(`${APAGAR[rota.tipo]}?`)) return;
    if (rota.tipo === "avulsa") acoes.removerItem(rota.id);
    if (rota.tipo === "registro") acoes.removerUso(rota.item, rota.id);
    if (rota.tipo === "lembrete") acoes.removerLembrete(rota.id);
    voltarSem(["lancamento", "editarLancamento"]);
    mostrarAviso("Apagado.");
  };
  const rodape = <Apagar tipo={rota.tipo} aoApagar={apagar} />;

  let formulario = null;

  if (rota.tipo === "avulsa" && (original.especie ?? "reais") === "reais") {
    formulario = (
      <FormularioDaAvulsa
        app={app}
        edicao={{
          item: original,
          rodape,
          aoSalvar: (preenchidos) => {
            const antes = { ...rascunhoDoItem(original), modelo: original.modelo ?? null };
            // Uma despesa sem data própria continua sem, se ninguém mexeu no dia.
            const { data, ...resto } = preenchidos;
            const campos = !original.data && data === antes.data ? resto : preenchidos;
            const depois = { ...antes, ...preenchidos };
            salvar(
              soOQueMudou([
                ["Categoria", modeloPorChave(antes.modelo)?.nome, modeloPorChave(depois.modelo)?.nome],
                ["Nome", antes.nome, depois.nome],
                ["Quem pagou", pagador(antes.pagoPor), pagador(depois.pagoPor)],
                ["Valor", dinheiro(num(antes.valor)), dinheiro(num(depois.valor))],
                ["Quem divide", nomes(antes.participantes), nomes(depois.participantes)],
                ["Como divide", nomeDaRegra(antes.rateio), nomeDaRegra(depois.rateio)],
                ["Partes de cada um", partes(antes), partes(depois)],
                ["Data agendada", momento(antes.data), momento(depois.data)],
                ["Vencimento", momento(antes.vencimento) ?? "", momento(depois.vencimento) ?? ""],
              ]),
              (m) => acoes.salvarEdicaoDaAvulsa(rota.id, campos, m),
            );
          },
        }}
      />
    );
  } else if (rota.tipo === "avulsa") {
    formulario = (
      <EdicaoNoCartao
        app={app}
        item={original}
        rodape={rodape}
        aoSalvar={(depois) => {
          const antes = original;
          const mexidos = ["nome", "pagoPor", "valor", "valorPorUso", "usos", "rateio", "participantes", "data", "ate"];
          const outros = Object.keys({ ...antes, ...depois }).filter(
            (k) => !mexidos.includes(k) && JSON.stringify(antes[k] ?? null) !== JSON.stringify(depois[k] ?? null),
          );
          salvar(
            soOQueMudou([
              ["Nome", antes.nome, depois.nome],
              ["Quem pagou", pagador(antes.pagoPor), pagador(depois.pagoPor)],
              ["Valor", antes.valor ? dinheiro(num(antes.valor)) : "", depois.valor ? dinheiro(num(depois.valor)) : ""],
              [
                "Valor por uso",
                antes.valorPorUso ? dinheiro(num(antes.valorPorUso)) : "",
                depois.valorPorUso ? dinheiro(num(depois.valorPorUso)) : "",
              ],
              ["Usos", String(antes.usos ?? ""), String(depois.usos ?? "")],
              ["Como divide", nomeDaRegra(antes.rateio), nomeDaRegra(depois.rateio)],
              ["Quem paga", nomes(antes.participantes), nomes(depois.participantes)],
              ["Quando foi", momento(antes.data), momento(depois.data)],
              ["Outros ajustes", "", outros.length ? "mudaram" : ""],
            ]),
            (m) => acoes.salvarEdicaoDoItem(rota.id, depois, m),
          );
        }}
      />
    );
  } else if (rota.tipo === "ciclica") {
    const medido = Boolean(RECURSOS[original.recurso]);
    const unidade = unidadeDoRecurso(original.recurso);
    const descrever = (r) => {
      const linhas = original.linhas ?? [];
      const porLinha = linhas.flatMap((l) => {
        const sufixo = linhas.length > 1 ? ` de ${l.nome || "linha"}` : "";
        const valor = r.linhas[l.id]?.valor;
        const consumo = r.linhas[l.id]?.quantidade;
        return [
          [`Valor${sufixo}`, String(valor ?? "").trim() ? dinheiro(num(valor)) : ""],
          ...(medido && l.comportamento === "consumo"
            ? [[`Consumo${sufixo}`, String(consumo ?? "").trim() ? `${consumo} ${unidade}` : ""]]
            : []),
        ];
      });
      return [
        ...porLinha,
        ["Quem pagou", pagador(r.pagoPor)],
        ["Pago em", r.pagoPor ? momento(r.pagoEm) : ""],
        ["Quem divide", r.participantes ? nomes(r.participantes) : "todas as pessoas"],
        ["Como divide", r.divisao === "registros" ? "registros + régua" : `calculadora · ${NOME_DA_REGRA_DO_CICLO[r.rateio] ?? r.rateio}`],
        ["Partes de cada um", r.divisao === "calculadora" && r.rateio === "porcentagem" ? partes({ rateio: "porcentagem", porcentagens: r.porcentagens }) : ""],
        ["Consumo de", r.de && r.ate ? `${momento(r.de)} a ${momento(r.ate)}` : ""],
        ["Vencimento", momento(r.vencimento) ?? ""],
      ];
    };
    formulario = (
      <FormularioDaCiclica
        app={app}
        edicao={{
          ciclo: original,
          rodape: null,
          aoSalvar: (dados, r) => {
            const antes = descrever(rascunhoDaFatura(original));
            const depois = descrever(r);
            salvar(
              soOQueMudou(antes.map(([campo, a], i) => [campo, a, depois[i][1]])),
              (m) => acoes.salvarEdicaoDaCiclica(rota.id, dados, m),
            );
          },
        }}
      />
    );
  } else if (rota.tipo === "registro") {
    const item = lancamento.item;
    const textoDaNota = (id) => (id ? (estado.lembretes ?? []).find((l) => l.id === id)?.texto ?? "" : "");
    const quanto = (q) => PALAVRA_DO_USO(item, q);
    formulario = (
      <EdicaoDoRegistro
        app={app}
        item={item}
        registro={original}
        rodape={rodape}
        aoSalvar={(r) => {
          if (!(num(r.quantidade) > 0)) return mostrarAviso("Escreva quantas vezes (ou horas).");
          if (r.participantes.length === 0) return mostrarAviso("Marque quem divide.");
          salvar(
            soOQueMudou([
              ["Quanto", quanto(original.quantidade), quanto(r.quantidade)],
              ["Quem divide", nomes(original.participantes), nomes(r.participantes)],
              ["Quando foi", momento(original.data), momento(r.data)],
              ["Nota", textoDaNota(original.nota), textoDaNota(r.nota)],
            ]),
            (m) => acoes.salvarEdicaoDoRegistro(rota.item, rota.id, r, m),
          );
        }}
      />
    );
  } else if (rota.tipo === "lembrete") {
    formulario = (
      <EdicaoDoLembrete
        app={app}
        lembrete={original}
        rodape={rodape}
        aoSalvar={(r) => {
          if (original.tipo === "lista") {
            const itens = itensDaLista(r);
            if (!r.titulo.trim() && itens.length === 0) return mostrarAviso("Dê um nome à lista ou escreva um item.");
            const textoDosItens = (lista) => lista.map((x) => x.texto).join(", ");
            salvar(
              soOQueMudou([
                ["Nome", original.titulo ?? "", r.titulo.trim()],
                ["Itens", textoDosItens(original.itens ?? []), textoDosItens(itens)],
                ["Data agendada", momento(original.data) ?? "", momento(r.data) ?? ""],
                ["Pessoas marcadas", nomes(original.pessoas ?? []), nomes(r.pessoas ?? [])],
              ]),
              (m) => acoes.salvarEdicaoDoLembrete(rota.id, { titulo: r.titulo.trim(), itens, data: r.data ?? null, pessoas: r.pessoas ?? [] }, m),
            );
          } else {
            if (!r.texto.trim()) return mostrarAviso("Escreva a nota.");
            salvar(
              soOQueMudou([
                ["Texto", original.texto ?? "", r.texto.trim()],
                ["Data agendada", momento(original.data) ?? "", momento(r.data) ?? ""],
                ["Pessoas marcadas", nomes(original.pessoas ?? []), nomes(r.pessoas ?? [])],
              ]),
              (m) => acoes.salvarEdicaoDoLembrete(rota.id, { texto: r.texto.trim(), data: r.data ?? null, pessoas: r.pessoas ?? [] }, m),
            );
          }
        }}
      />
    );
  }

  return (
    <div className="tela tela--com-rodape">
      {topo}
      <p className="texto-apoio">
        Mude o que precisar e salve. A edição entra como um lançamento seu, com a data de agora, e fica no histórico.
      </p>
      {formulario}
    </div>
  );
}
