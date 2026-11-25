import TecladoDeDivisao from "../componentes/TecladoDeDivisao.jsx";
import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { Campo, CampoData, Rotulo, SeletorDePessoas } from "../componentes/index.js";
import { dinheiro, mostrarAviso, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { EXPLICACOES_DOS_RATEIOS, TabelaDeclarada } from "../passos/CartaoItem.jsx";
import QuemPagou from "../passos/QuemPagou.jsx";
import { rateiosDoItem } from "../nucleo/adaptador.js";
import { somarDias, ultimoDiaDaJanela } from "../nucleo/calendario.js";
import { catalogoDe, criarItem, GRUPO_INDEPENDENTE, modeloPorChave } from "../nucleo/catalogo.js";
import { naOrdemDaTela, RECURSOS, REGRAS_DO_CICLO, unidadeDoRecurso } from "../nucleo/ciclos.js";
import { comRateioDoModo } from "../nucleo/estadoInicial.js";
import { num } from "../nucleo/formato.js";
import { simboloDe } from "../nucleo/moedas.js";
import { hojeISO, nomeDe } from "../nucleo/resumo.js";
import { sobrescritoDaTela } from "./Hub.jsx";

/** As categorias de despesa avulsa deste conjunto: o catálogo do que sai do bolso. */
export function categoriasAvulsas(modo) {
  const grupos = catalogoDe(modo);
  const doBolso = modo.faturas === false ? grupos : grupos.filter((g) => g.grupo === GRUPO_INDEPENDENTE);
  return doBolso.flatMap((g) => g.itens).filter((m) => !m.equipamento);
}

export const NOME_DA_REGRA_DO_CICLO = {
  igual: "igual",
  dias: "dias",
  porcentagem: "%",
  comum: "pela régua do uso comum",
};

/** Um valor em dinheiro: o símbolo da moeda do conjunto dentro da caixa, antes do número. */
export function CampoDeValor({ rotulo, valor, aoMudar }) {
  return (
    <label className="campo campo--valor">
      <Rotulo solto>{rotulo}</Rotulo>
      <span className="caixa-com-moeda">
        <span className="caixa-com-moeda__simbolo">{simboloDe()}</span>
        <input
          type="text"
          inputMode="decimal"
          value={valor}
          placeholder="0,00"
          onChange={(e) => aoMudar(e.target.value)}
          aria-label={rotulo}
        />
      </span>
    </label>
  );
}

/** O aviso que fica depois de lançar: nada da despesa, só onde conferir. */
function Sucesso({ aoVer }) {
  return (
    <div className="sucesso" role="status">
      <Icone nome="check" tamanho={20} espessura={2.4} />
      <span>
        Sucesso. Confira em{" "}
        <button type="button" className="link-sublinhado" onClick={aoVer}>
          Ver despesas
        </button>
        .
      </span>
    </div>
  );
}

/** As categorias, como botões de catálogo: uma escolhida por vez. */
function Categorias({ opcoes, valor, aoMudar }) {
  return (
    <div className="grupo">
      <Rotulo>Categoria</Rotulo>
      <div className="categorias" role="radiogroup" aria-label="Categoria">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={o.valor === valor}
            className={`botao--catalogo ${o.valor === valor ? "botao--catalogo-ativo" : ""}`}
            onClick={() => aoMudar(o.valor)}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── avulsa ─────────────────────────────────────────────────────────────────

function rascunhoDaAvulsa(modelo, ids, modo, eu, data = null) {
  const base = comRateioDoModo(criarItem(modelo, ids), modo);
  return {
    nome: modelo.nome,
    valor: "",
    pagoPor: eu ?? null,
    rateio: base.rateio,
    participantes: [...ids],
    data: data ?? hojeISO(),
    porcentagens: {},
    valores: {},
    cotas: {},
    ajustes: {},
    usosPorPessoa: {},
  };
}

/** "55.90" guardado vira "55,90" no campo, como se escreve aqui. */
const comVirgula = (v) => (/^-?\d+\.\d+$/.test(String(v ?? "")) ? String(v).replace(".", ",") : String(v ?? ""));

/**
 * O rascunho de uma despesa avulsa que já existe: o que ela tem hoje. Sem
 * data própria, "quando foi" mostra o dia em que ela foi lançada.
 */
export function rascunhoDoItem(item) {
  return {
    nome: item.nome ?? "",
    valor: comVirgula(item.valor),
    pagoPor: item.pagoPor ?? null,
    rateio: item.rateio ?? "igual",
    participantes: [...(item.participantes ?? [])],
    data: item.data ?? item.criadoEm?.slice(0, 10) ?? hojeISO(),
    porcentagens: { ...(item.porcentagens ?? {}) },
    valores: { ...(item.valores ?? {}) },
    cotas: { ...(item.cotas ?? {}) },
    ajustes: { ...(item.ajustes ?? {}) },
    usosPorPessoa: { ...(item.usosPorPessoa ?? {}) },
  };
}

/**
 * O formulário clássico da avulsa. Para lançar, começa em branco; para editar
 * (`edicao`), começa com a despesa como ela está e o botão salva a edição.
 */
export function FormularioDaAvulsa({ app, aoLancar, data, edicao = null }) {
  const { estado, modo, indicePorId, acoes, eu } = app;
  const ids = estado.moradores.map((m) => m.id);
  const doModo = categoriasAvulsas(modo);
  // A categoria de uma despesa antiga pode não estar mais no catálogo do modo.
  const daDespesa = edicao ? modeloPorChave(edicao.item.modelo) : null;
  const categorias = daDespesa && !doModo.some((m) => m.chave === daDespesa.chave) ? [daDespesa, ...doModo] : doModo;
  const [categoria, setCategoria] = useState(daDespesa?.chave ?? categorias[0]?.chave);
  const modelo = modeloPorChave(categoria) ?? categorias[0];
  const [r, setR] = useState(() => (edicao ? rascunhoDoItem(edicao.item) : rascunhoDaAvulsa(modelo, ids, modo, eu, data)));
  const mudar = (campo, valor) => setR((x) => ({ ...x, [campo]: valor }));

  // A despesa como item, para saber quais divisões ela aceita.
  const comoItem = { ...criarItem(modelo, ids), especie: "reais", ...r };
  const regras = rateiosDoItem(comoItem, modo);
  const custo = num(r.valor);

  const escolherCategoria = (chave) => {
    const novo = modeloPorChave(chave);
    setCategoria(chave);
    setR((x) => ({
      ...x,
      // O nome segue a categoria enquanto a pessoa não escreveu outro.
      nome: !x.nome.trim() || x.nome === modelo.nome ? novo.nome : x.nome,
      rateio: comRateioDoModo(criarItem(novo, ids), modo).rateio,
    }));
  };

  const lancar = () => {
    if (!(custo > 0)) return mostrarAviso("Escreva o valor da despesa.");
    if (r.participantes.length === 0) return mostrarAviso("Marque quem paga a despesa.");
    const campos = {
      nome: r.nome.trim() || modelo.nome,
      especie: "reais",
      valor: r.valor,
      pagoPor: r.pagoPor,
      rateio: r.rateio,
      participantes: r.participantes,
      data: r.data,
      porcentagens: r.porcentagens,
      valores: r.valores,
      cotas: r.cotas,
      ajustes: r.ajustes,
      usosPorPessoa: r.usosPorPessoa,
    };
    if (edicao) return edicao.aoSalvar({ ...campos, modelo: modelo.chave ?? edicao.item.modelo ?? null });
    acoes.adicionarItem(modelo, campos);
    setR(rascunhoDaAvulsa(modelo, ids, modo, eu));
    aoLancar();
  };

  const naTabela = ["porcentagem", "valor", "cotas", "ajuste"].includes(r.rateio);
  const porUso = r.rateio === "uso" || r.rateio === "horas";

  return (
    <>
      <Categorias
        opcoes={categorias.map((m) => ({ valor: m.chave, rotulo: m.nome }))}
        valor={categoria}
        aoMudar={escolherCategoria}
      />

      <div className="formulario formulario--classico">
        <Campo rotulo="Nome" valor={r.nome} aoMudar={(v) => mudar("nome", v)} texto rotuloSolto />

        <QuemPagou
          pessoas={estado.moradores}
          indicePorId={indicePorId}
          valor={r.pagoPor}
          aoMudar={(id) => mudar("pagoPor", id)}
          semNinguem="Ninguém marcado: a despesa fica em aberto. Se cada um pagou a própria parte direto, não gera dívida entre vocês."
          comAlguem="Essa pessoa adiantou pelo grupo: os outros devem a ela no acerto."
        />

        <CampoDeValor rotulo="Valor" valor={r.valor} aoMudar={(v) => mudar("valor", v)} />

        <div className="campo-novo">
          <span className="rotulo">Como divide</span>
          <TecladoDeDivisao opcoes={regras} valor={r.rateio} aoMudar={(v) => mudar("rateio", v)} />
          <span className="ajuda-campo">{EXPLICACOES_DOS_RATEIOS[r.rateio]}</span>
        </div>

        <div className="grupo">
          <Rotulo>Quem paga</Rotulo>
          <SeletorDePessoas
            rotulo="Quem paga"
            pessoas={estado.moradores}
            indicePorId={indicePorId}
            selecionados={r.participantes}
            aoMudar={(sel) => mudar("participantes", sel)}
          />
        </div>

        {naTabela && (
          <TabelaDeclarada
            item={comoItem}
            moradores={estado.moradores}
            indicePorId={indicePorId}
            custoTotal={custo}
            set={(campo, valor) => mudar(campo, valor)}
          />
        )}

        {porUso && (
          <div className="grupo">
            <Rotulo>{r.rateio === "horas" ? "Horas de cada um" : "Usos de cada um"}</Rotulo>
            <div className="linha-campos">
              {r.participantes.map((id) => (
                <Campo
                  key={id}
                  rotulo={nomeDe(estado, id)}
                  valor={r.usosPorPessoa[id] ?? ""}
                  aoMudar={(v) => mudar("usosPorPessoa", { ...r.usosPorPessoa, [id]: v })}
                  largura="campo--curto"
                  sufixo={r.rateio === "horas" ? "h" : "usos"}
                  placeholder="0"
                />
              ))}
            </div>
          </div>
        )}

        <CampoData rotulo="Quando foi" valor={r.data} aoMudar={(v) => v && mudar("data", v)} etiqueta="Quando foi" />
      </div>

      {edicao?.rodape}

      <div className="rodape-fixo">
        <button type="button" className="botao botao--largo" onClick={lancar}>
          {edicao ? "Salvar edição" : `Lançar ${custo > 0 ? dinheiro(custo) : "despesa"}`}
        </button>
      </div>
    </>
  );
}

// ── cíclica ────────────────────────────────────────────────────────────────

const OUTRA = "__outra";

/**
 * A fatura começa em branco, mesmo que a conta já tenha valores neste
 * fechamento: lançar não mostra o que já foi lançado (isso é em Ver despesas).
 */
function rascunhoDaCiclica(ciclo, eu) {
  return {
    linhas: {},
    de: null,
    ate: null,
    vencimento: null,
    pagoPor: eu ?? null,
    pagoEm: hojeISO(),
    rateio: ciclo?.rateio ?? "comum",
    porcentagens: ciclo?.porcentagens ?? {},
    // Só para uma conta nova.
    nome: "",
    recurso: "",
    total: "",
    quantidade: "",
  };
}

/** O rascunho de uma fatura que já existe: os valores, as datas e quem pagou. */
export function rascunhoDaFatura(ciclo) {
  return {
    linhas: Object.fromEntries(
      (ciclo.linhas ?? []).map((l) => [l.id, { valor: comVirgula(l.valor), quantidade: comVirgula(l.quantidade) }]),
    ),
    de: ciclo.janela?.de ?? null,
    ate: ciclo.janela ? ultimoDiaDaJanela(ciclo.janela) : null,
    vencimento: ciclo.vencimento ?? null,
    pagoPor: ciclo.pagoPor ?? null,
    pagoEm: ciclo.pagoEm ? ciclo.pagoEm.slice(0, 10) : hojeISO(),
    rateio: ciclo.rateio ?? "comum",
    porcentagens: { ...(ciclo.porcentagens ?? {}) },
    nome: "",
    recurso: "",
    total: "",
    quantidade: "",
  };
}

/**
 * O formulário clássico da cíclica. Para editar (`edicao`), a conta já vem
 * escolhida (não se troca) e o formulário traz a fatura como ela está.
 */
export function FormularioDaCiclica({ app, aoLancar, cicloInicial, edicao = null }) {
  const { estado, indicePorId, acoes, eu } = app;
  const ciclos = naOrdemDaTela(estado.ciclos);
  const [qual, setQual] = useState(() =>
    edicao ? edicao.ciclo.id : ciclos.some((c) => c.id === cicloInicial) ? cicloInicial : ciclos[0]?.id ?? OUTRA,
  );
  const ciclo = edicao ? edicao.ciclo : ciclos.find((c) => c.id === qual) ?? null;
  const [r, setR] = useState(() => (edicao ? rascunhoDaFatura(edicao.ciclo) : rascunhoDaCiclica(ciclo, eu)));
  const mudar = (campo, valor) => setR((x) => ({ ...x, [campo]: valor }));

  const nova = qual === OUTRA;
  const recurso = nova ? r.recurso || null : ciclo?.recurso ?? null;
  const medido = Boolean(RECURSOS[recurso]);
  const unidade = unidadeDoRecurso(recurso);
  const total = nova
    ? num(r.total)
    : (ciclo?.linhas ?? []).reduce((s, l) => s + num(r.linhas[l.id]?.valor), 0);

  const escolher = (id) => {
    setQual(id);
    setR(rascunhoDaCiclica(ciclos.find((c) => c.id === id) ?? null, eu));
  };

  const lancar = () => {
    if (nova && !r.nome.trim()) return mostrarAviso("Dê um nome à conta (gás, aluguel, condomínio).");
    if (!(total > 0)) return mostrarAviso("Escreva o valor da fatura.");
    if (r.de && r.ate && r.ate < r.de) return mostrarAviso("O fim do consumo vem depois do começo.");
    const dados = {
      ...(nova ? { total: r.total, quantidade: r.quantidade } : { linhas: r.linhas }),
      janela: r.de && r.ate ? { de: r.de, ate: somarDias(r.ate, 1) } : undefined,
      vencimento: r.vencimento ?? undefined,
      pagoPor: r.pagoPor,
      pagoEm: r.pagoPor ? r.pagoEm : null,
      rateio: medido ? undefined : r.rateio,
      porcentagens: !medido && r.rateio === "porcentagem" ? r.porcentagens : undefined,
    };
    if (edicao) return edicao.aoSalvar(dados, r);
    const id = nova ? acoes.adicionarCiclo(r.nome.trim(), r.recurso || null) : qual;
    acoes.lancarCiclica(id, dados);
    if (nova) setQual(id);
    aoLancar();
  };

  return (
    <>
      {!edicao && (
        <Categorias
          opcoes={[...ciclos.map((c) => ({ valor: c.id, rotulo: c.nome || "Conta" })), { valor: OUTRA, rotulo: "+ Outra conta" }]}
          valor={qual}
          aoMudar={escolher}
        />
      )}

      {!edicao && !nova && ciclo && (num(ciclo.linhas?.[0]?.valor) > 0 || ciclo.pagoPor) && (
        <p className="nota-tipo">
          {ciclo.nome} já tem fatura neste fechamento. Lançar de novo substitui os valores dela.
        </p>
      )}

      <div className="formulario formulario--classico">
        {nova && (
          <>
            <Campo rotulo="Nome da conta" valor={r.nome} aoMudar={(v) => mudar("nome", v)} texto rotuloSolto placeholder="Gás, aluguel, condomínio" />
            <label className="campo-novo">
              <span className="rotulo">O que ela mede</span>
              <select className="caixa caixa--texto" value={r.recurso} onChange={(e) => mudar("recurso", e.target.value)}>
                <option value="">Só valor (aluguel, condomínio, internet)</option>
                <option value="kwh">Energia, em kWh</option>
                <option value="m3">Volume, em m³ (gás encanado)</option>
              </select>
            </label>
          </>
        )}

        <QuemPagou
          pessoas={estado.moradores}
          indicePorId={indicePorId}
          valor={r.pagoPor}
          aoMudar={(id) => mudar("pagoPor", id)}
          semNinguem="Ninguém marcado: a conta fica em aberto até alguém pagar."
          comAlguem="Essa pessoa pagou a conta: os outros devem a ela no acerto."
        />

        {nova ? (
          <div className="linha-campos linha-campos--duas">
            <CampoDeValor rotulo="Valor da fatura" valor={r.total} aoMudar={(v) => mudar("total", v)} />
            {medido && (
              <Campo rotulo="Consumo" valor={r.quantidade} aoMudar={(v) => mudar("quantidade", v)} sufixo={unidade} placeholder="0" rotuloSolto />
            )}
          </div>
        ) : (
          <div className="grupo">
            <Rotulo>Valor</Rotulo>
            {(ciclo?.linhas ?? []).map((l) => (
              <div key={l.id} className="linha-campos linha-campos--duas">
                <CampoDeValor
                  rotulo={l.nome || "Valor"}
                  valor={r.linhas[l.id]?.valor ?? ""}
                  aoMudar={(v) => mudar("linhas", { ...r.linhas, [l.id]: { ...r.linhas[l.id], valor: v } })}
                />
                {medido && l.comportamento === "consumo" && (
                  <Campo
                    rotulo="Consumo"
                    valor={r.linhas[l.id]?.quantidade ?? ""}
                    aoMudar={(v) => mudar("linhas", { ...r.linhas, [l.id]: { ...r.linhas[l.id], quantidade: v } })}
                    sufixo={unidade}
                    placeholder="0"
                  />
                )}
              </div>
            ))}
            <p className="dica">Total da fatura: {dinheiro(total)}</p>
          </div>
        )}

        <div className="grupo">
          <Rotulo>Como divide</Rotulo>
          {medido ? (
            <p className="dica">
              Pelo consumo de cada aparelho cadastrado em Itens; o que nenhum aparelho explica é uso comum, dividido pela
              régua do conjunto.
            </p>
          ) : (
            <>
              <TecladoDeDivisao opcoes={REGRAS_DO_CICLO} valor={r.rateio} aoMudar={(v) => mudar("rateio", v)} />
              {r.rateio === "porcentagem" && (
                <div className="linha-campos">
                  {estado.moradores.map((m) => (
                    <Campo
                      key={m.id}
                      rotulo={nomeDe(estado, m.id)}
                      valor={r.porcentagens[m.id] ?? ""}
                      aoMudar={(v) => mudar("porcentagens", { ...r.porcentagens, [m.id]: v })}
                      largura="campo--curto"
                      sufixo="%"
                      placeholder="0"
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="grupo">
          <Rotulo>Quem paga</Rotulo>
          <p className="dica">Todas as pessoas do conjunto: {estado.moradores.map((m) => nomeDe(estado, m.id)).join(", ")}.</p>
        </div>

        <div className="grupo">
          <Rotulo>Quando foi</Rotulo>
          <div className="linha-campos linha-campos--duas">
            <CampoData rotulo="Consumo de" valor={r.de} aoMudar={(v) => mudar("de", v)} etiqueta="Começo do consumo" />
            <CampoData rotulo="até" valor={r.ate} aoMudar={(v) => mudar("ate", v)} etiqueta="Fim do consumo" />
          </div>
          <div className="linha-campos linha-campos--duas">
            <CampoData rotulo="Vencimento" valor={r.vencimento} aoMudar={(v) => mudar("vencimento", v)} etiqueta="Vencimento" />
            {r.pagoPor && (
              <CampoData rotulo="Pago em" valor={r.pagoEm} aoMudar={(v) => v && mudar("pagoEm", v)} etiqueta="Pago em" />
            )}
          </div>
        </div>
      </div>

      {edicao?.rodape}

      <div className="rodape-fixo">
        <button type="button" className="botao botao--largo" onClick={lancar}>
          {edicao ? "Salvar edição" : `Lançar ${total > 0 ? dinheiro(total) : "fatura"}`}
        </button>
      </div>
    </>
  );
}

/**
 * A tela de lançar à mão: o título, as categorias e o formulário clássico
 * (quem pagou, valor, como divide, quem paga, quando foi). Depois de lançar,
 * só o aviso de sucesso: o que foi lançado se confere em Ver despesas.
 */
export default function LancarDespesa({ app, rota }) {
  const { modo, ir, voltar } = app;
  const ciclica = rota?.tipo === "ciclica" && modo.faturas !== false;
  const [lancadas, setLancadas] = useState(0);

  const depoisDeLancar = () => {
    setLancadas((n) => n + 1);
    window.scrollTo?.(0, 0);
  };

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito partes={sobrescritoDaTela(app)} />
      <h1 className="titulo-tela titulo-tela--grande">
        Nova <em>{ciclica ? "cíclica" : "avulsa"}</em>
      </h1>
      <p className="texto-apoio">
        {ciclica
          ? "Escolha a conta e preencha a fatura do ciclo."
          : "Escolha a categoria e preencha. Cada despesa entra com quem pagou e como divide."}
      </p>

      {lancadas > 0 && <Sucesso aoVer={() => ir("verDespesas")} />}

      {ciclica ? (
        <FormularioDaCiclica key={lancadas} app={app} aoLancar={depoisDeLancar} cicloInicial={rota?.ciclo} />
      ) : (
        <FormularioDaAvulsa app={app} aoLancar={depoisDeLancar} data={rota?.data ?? null} />
      )}
    </div>
  );
}
