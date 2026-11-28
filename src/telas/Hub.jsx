import { useEffect, useRef, useState } from "react";
import Icone from "../componentes/Icone.jsx";
import FiguraDoTotal from "../componentes/FiguraDoTotal.jsx";
import { TopoDoConjunto } from "../componentes/CabecalhoDoConjunto.jsx";
import { Anel, Avatar, centavosEmDinheiro, dinheiro, TituloDeSecao, tomDoSaldo } from "../componentes/Interface.jsx";
import { OpcoesDeAdicionar } from "./NovoConjunto.jsx";
import FolhaDeCompartilhar from "./FolhaDeCompartilhar.jsx";
import { temPeriodo } from "./Periodo.jsx";
import { destinoDoEvento, hojeEmTudo } from "./comum.js";
import { autoriaDe } from "../nucleo/autoria.js";
import { atrasosDe, balancoDasDespesas, hojeISO, linhaDoMembro, nomeDe, quandoFoi, atividadeDe } from "../nucleo/resumo.js";
import { MESES } from "../nucleo/formato.js";

/** O selo da linha "Fechar contas": quitado, em andamento, em aberto. */
export function situacaoDoFechamento(resumo) {
  const t = resumo?.transferencias ?? [];
  if (resumo?.acerto?.precisaCeder) return { texto: "falta quem cede", tom: "ouro" };
  if (t.length === 0) return null;
  const feitas = t.filter((x) => x.confirmada).length;
  if (feitas === t.length) return { texto: "quitado", tom: "verde" };
  if (feitas > 0) return { texto: "em andamento", tom: "ouro" };
  return { texto: "em aberto", tom: "ouro" };
}

/** O cabeçalho de toda tela de conjunto: "REPÚBLICA GIRASSOL · FECHAMENTO DE OUTUBRO". */
export function sobrescritoDaTela(app) {
  const { estado, modo, nomeDoConjunto } = app;
  return [nomeDoConjunto, modo.faturas !== false ? `Fechamento de ${MESES[estado.periodo.mes - 1]}` : null];
}

export function Membros({ app }) {
  const { estado, modo, acoes, eu } = app;
  const [menu, setMenu] = useState(null);
  const [editando, setEditando] = useState(null);
  const [texto, setTexto] = useState("");

  return (
    <>
      <section className="cartao-adicionar">
        <h3>
          <Icone nome="mais" tamanho={22} espessura={2} /> Adicionar pessoa
        </h3>
        <OpcoesDeAdicionar escuro aoConvidar={(nome) => acoes.adicionarPessoa(nome)} />
        <p className="ajuda-campo">Convidado entra na divisão sem precisar de conta no app.</p>
      </section>

      <TituloDeSecao direita={`${estado.moradores.length} de ${modo.maximoDeMoradores}`}>Membros</TituloDeSecao>

      {estado.moradores.length === 0 ? (
        <p className="vazio-suave">Ninguém ainda. Adicione as pessoas que dividem {modo.palavras.oConjunto}.</p>
      ) : (
        <div className="cartao-lista">
          {estado.moradores.map((m, i) => {
            const nome = nomeDe(estado, m.id);
            const linha = linhaDoMembro(estado, m);
            return (
              <div className="linha-membro" key={m.id}>
                <Avatar nome={nome} indice={i} />
                <div className="linha-membro__textos">
                  {editando === m.id ? (
                    <input
                      className="caixa caixa--texto caixa--compacta"
                      value={texto}
                      autoFocus
                      onChange={(e) => setTexto(e.target.value)}
                      onBlur={() => {
                        acoes.editarMorador(m.id, "nome", texto.trim());
                        setEditando(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      aria-label="Nome"
                    />
                  ) : (
                    <strong>
                      {nome}
                      {m.id === eu && <span className="voce"> (você)</span>}
                      {m.id === estado.admin && <span className="selo-admin">admin</span>}
                    </strong>
                  )}
                  {linha && <span>{linha}</span>}
                  {!linha && m.convidado && <span>convidado</span>}
                </div>
                <button
                  type="button"
                  className="icone-botao"
                  aria-label={`Opções de ${nome}`}
                  aria-expanded={menu === m.id}
                  onClick={() => setMenu(menu === m.id ? null : m.id)}
                >
                  <Icone nome="pontos" tamanho={22} />
                </button>
                {menu === m.id && (
                  <div className="menu-flutuante" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setTexto(m.nome);
                        setEditando(m.id);
                        setMenu(null);
                      }}
                    >
                      Renomear
                    </button>
                    {m.id !== eu && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          acoes.definirVoce(m.id);
                          setMenu(null);
                        }}
                      >
                        Sou eu
                      </button>
                    )}
                    {m.id !== estado.admin && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          acoes.definirCampoDoConjunto("admin", m.id);
                          setMenu(null);
                        }}
                      >
                        Tornar admin
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className="menu-flutuante__perigo"
                      onClick={() => {
                        setMenu(null);
                        if (
                          window.confirm(`Tirar ${nome} de ${modo.palavras.oConjunto}? As despesas pagas por ${nome} ficam sem pagador.`)
                        ) {
                          acoes.removerPessoa(m.id);
                        }
                      }}
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/** A legenda de um anel: a bolinha da cor, o nome e o valor. */
function Legenda({ itens }) {
  return (
    <span className="legenda-do-anel">
      {itens.map((i) => (
        <span key={i.rotulo} className="legenda-do-anel__item">
          <i className={`legenda-anel__ponto legenda-anel__ponto--${i.cor}`} aria-hidden="true" />
          <span>{i.rotulo}</span>
          <strong>{dinheiro(i.valor, { simbolo: false })}</strong>
        </span>
      ))}
    </span>
  );
}

/** Os lembretes de hoje deste conjunto (da pessoa ou de todos): o que vai no quadro. */
function doQuadro(app, hoje) {
  const { estado, resumo, idDoConjunto, nomeDoConjunto, resultado } = app;
  const p = {
    ficha: { id: idDoConjunto, nome: nomeDoConjunto },
    estado,
    resumo,
    atividade: atividadeDe(estado, { resultado }),
  };
  return hojeEmTudo([p], hoje).filter((ev) => ev.tipo === "lembrete");
}

/**
 * O quadro de fixados do painel, de madeira: os lembretes de hoje, cada um
 * num post-it com o título e quem lançou, embaixo do
 * alfinete. O alfinete fica sempre no
 * topo, no centro, para fixar mais um (leva a lançar um lembrete).
 */
function QuadroDoDia({ app, hoje }) {
  const { ir, estado } = app;
  const lista = doQuadro(app, hoje);
  const autor = (ev) => {
    const { por } = autoriaDe((estado.lembretes ?? []).find((l) => l.id === ev.lembrete));
    return por ? nomeDe(estado, por) : null;
  };
  return (
    <section className={`quadro-do-dia ${lista.length === 0 ? "quadro-do-dia--vazio" : ""}`} aria-label="Fixados">
      <button type="button" className="quadro-do-dia__fixar" onClick={() => ir("lancarLembrete")} aria-label="Fixar um lembrete">
        <Icone nome="pin" tamanho={24} />
      </button>
      {lista.length > 0 && (
        <ul className="quadro-do-dia__lista">
          {lista.map((ev) => {
            const destino = destinoDoEvento(ev);
            return (
              <li key={ev.id}>
                <button type="button" className="post-it post-it--no-quadro" onClick={() => ir(destino.tela, destino)}>
                  <strong className="post-it__titulo">{ev.titulo}</strong>
                  {autor(ev) && <span className="post-it__autor">por {autor(ev)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** As quatro teclas da calculadora do painel: só o símbolo; o nome aparece no visor. */
const TECLAS = [
  { chave: "lancar", nome: "Lançar", icone: "importar" },
  { chave: "ver", nome: "Ver", icone: "olho" },
  { chave: "acertar", nome: "Acertar", icone: "trocar" },
  { chave: "exportar", nome: "Exportar", icone: "exportar" },
];

/**
 * O que cada operação oferece no visor, neste conjunto: cada opção com o
 * ícone, o nome e uma linha que diz o que há nela.
 */
function opcoesDaOperacao(operacao, modo) {
  const comRegistros = modo.faturas !== false || Boolean(modo.equipamentos);
  // Despesas, lembretes, itens e registros têm o mesmo subtítulo em Lançar e em Ver.
  const SUBTITULO = {
    despesas: modo.faturas === false ? "avulsas, por categoria" : "avulsas e cíclicas",
    lembretes: "listas e notas",
    itens: "aparelhos ou equipamentos",
    registros: "uso de itens",
  };
  switch (operacao) {
    case "lancar":
      return [
        { nome: "Despesas", icone: "sacola", subtitulo: SUBTITULO.despesas, tela: "despesas" },
        { nome: "Lembretes", icone: "nota", subtitulo: SUBTITULO.lembretes, tela: "lancarLembrete" },
        ...(comRegistros
          ? [
              { nome: "Item", icone: "itens", subtitulo: SUBTITULO.itens, tela: "itens" },
              { nome: "Registro", icone: "registro", subtitulo: SUBTITULO.registros, tela: "lancarRegistro" },
            ]
          : []),
      ];
    case "ver":
      return [
        { nome: "Despesas", icone: "sacola", subtitulo: SUBTITULO.despesas, tela: "verDespesas" },
        { nome: "Lembretes", icone: "nota", subtitulo: SUBTITULO.lembretes, tela: "verLembretes" },
        ...(comRegistros
          ? [
              { nome: "Itens", icone: "itens", subtitulo: SUBTITULO.itens, tela: "itens" },
              { nome: "Registros", icone: "registro", subtitulo: SUBTITULO.registros, tela: "verRegistros" },
            ]
          : []),
        { nome: "Histórico", icone: "relogio", subtitulo: "tudo o que aconteceu no conjunto", tela: "historico" },
      ];
    case "acertar":
      return [
        ...(temPeriodo(modo) ? [{ nome: "Período", icone: "agenda", subtitulo: "os dias de cada um", tela: "periodo" }] : []),
        { nome: "Despesas", icone: "saldos", subtitulo: "os saldos: quem deve a quem", tela: "saldos" },
        { nome: "Conjunto", icone: "trocar", subtitulo: "fechar as contas e fazer os Pix", tela: "fechar" },
      ];
    case "exportar":
      return [
        { nome: "Relatórios", icone: "documento", subtitulo: "o rateio, para imprimir ou salvar", tela: "fechar", params: { passo: "rateio" } },
        { nome: "Conjunto", icone: "link", subtitulo: "link ou QR Code para outra pessoa", compartilhar: true },
      ];
    default:
      return [];
  }
}

/**
 * A calculadora do painel: as teclas em cima, só com o símbolo (lançar, ver,
 * acertar e exportar), e o visor embaixo, com o nome da operação (ou
 * "Selecionar operação") e as opções dela, uma por linha.
 */
function CalculadoraDoConjunto({ app, aoCompartilhar }) {
  const { modo, ir } = app;
  const [operacao, setOperacao] = useState(null);
  const tecla = TECLAS.find((t) => t.chave === operacao) ?? null;
  const opcoes = opcoesDaOperacao(operacao, modo);
  const caixa = useRef(null);
  // Ao abrir uma operação, a tela acompanha: rola até as opções aparecerem inteiras.
  useEffect(() => {
    if (!operacao || !caixa.current?.scrollIntoView) return;
    const suave = !(typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    caixa.current.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "nearest" });
  }, [operacao]);
  return (
    <section className="calculadora-do-conjunto" aria-label="Operações do conjunto" ref={caixa}>
      <div className="calculadora-do-conjunto__teclas">
        {TECLAS.map((t) => (
          <button
            key={t.chave}
            type="button"
            className={`calculadora-do-conjunto__tecla ${operacao === t.chave ? "calculadora-do-conjunto__tecla--ativa" : ""}`}
            aria-label={t.nome}
            aria-pressed={operacao === t.chave}
            onClick={() => setOperacao((v) => (v === t.chave ? null : t.chave))}
          >
            <Icone nome={t.icone} tamanho={26} />
          </button>
        ))}
      </div>
      <div className="calculadora-do-conjunto__visor" aria-live="polite">
        <h2 className="calculadora-do-conjunto__titulo">{tecla ? tecla.nome : "Selecionar operação"}</h2>
        {tecla ? (
          <div className="calculadora-do-conjunto__opcoes">
            {opcoes.map((o) => (
              <button
                key={o.nome}
                type="button"
                className="calculadora-do-conjunto__opcao"
                aria-label={o.nome}
                onClick={() => (o.compartilhar ? aoCompartilhar() : ir(o.tela, o.params ?? {}))}
              >
                <span className="calculadora-do-conjunto__icone" aria-hidden="true">
                  <Icone nome={o.icone} tamanho={20} />
                </span>
                <span className="calculadora-do-conjunto__textos" aria-hidden="true">
                  <strong>{o.nome}</strong>
                  <span>{o.subtitulo}</span>
                </span>
                <Icone nome="seta" tamanho={18} />
              </button>
            ))}
          </div>
        ) : (
          <p className="calculadora-do-conjunto__pronta" aria-hidden="true">
            0
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * O painel de um conjunto, de cima para baixo: o cabeçalho (o nome e os
 * membros; tocar abre Configurar), o menu de cima (Painel, Agenda, Análise,
 * Pessoas), o quadro de madeira com o que é de hoje, os dois saldos, a
 * calculadora das operações e o Recente.
 */
export default function Hub({ app }) {
  const { estado, resultado, resumo, eu, ir } = app;
  const [compartilhando, setCompartilhando] = useState(false);
  const [menu, setMenu] = useState(false);
  const hoje = hojeISO();

  const total = (resumo?.total ?? 0) / 100;
  const aberto = (resumo?.aberto ?? 0) / 100;
  const tom = eu ? tomDoSaldo(aberto) : "zero";

  const atividade = atividadeDe(estado, { resultado });
  const recentes = atividade.slice(0, 5);

  // O total: o que está em aberto (amarelo) e o que já foi pago (verde-água).
  // Quando tudo foi pago e o acerto entre vocês terminou, preto.
  const balanco = balancoDasDespesas(estado, resultado, hoje);
  const acertoFeito = !resumo?.acerto?.precisaCeder && (resumo?.transferencias ?? []).every((t) => t.confirmada);
  const quitado = balanco.aberto < 0.005 && balanco.pago > 0 && acertoFeito;
  const partesDoTotal = quitado
    ? [{ valor: 1, cor: "var(--tinta)" }]
    : [
        { valor: balanco.pago, cor: "var(--agua)" },
        { valor: balanco.aberto, cor: "var(--ouro)" },
      ];

  return (
    <div className="tela">
      <TopoDoConjunto app={app} atual="hub" menuAberto={menu} aoAbrirMenu={() => setMenu((v) => !v)} />

      {menu && (
        <div className="menu-pontos__fundo" onClick={() => setMenu(false)}>
          <div className="menu-pontos" role="menu" aria-label="Mais opções" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              role="menuitem"
              className="menu-pontos__item"
              onClick={() => {
                setMenu(false);
                setCompartilhando(true);
              }}
            >
              <Icone nome="enviar" tamanho={20} /> Compartilhar
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-pontos__item"
              onClick={() => {
                setMenu(false);
                ir("historico");
              }}
            >
              <Icone nome="relogio" tamanho={20} /> Histórico
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-pontos__item"
              onClick={() => {
                setMenu(false);
                ir("configurar");
              }}
            >
              <Icone nome="engrenagem" tamanho={20} /> Configurar conjunto
            </button>
          </div>
        </div>
      )}

      <QuadroDoDia app={app} hoje={hoje} />

      <div className="aneis">
        <div className="cartao-anel">
          <FiguraDoTotal tamanho={140} pessoas={estado.moradores.length} partes={partesDoTotal}>
            <span className="rotulo">Total</span>
          </FiguraDoTotal>
          <strong className="valor-anel">{dinheiro(total)}</strong>
          <Legenda
            itens={[
              { cor: "agua", rotulo: "pago", valor: balanco.pago },
              { cor: "ouro", rotulo: "aberto", valor: balanco.aberto },
            ]}
          />
        </div>
        <div className="cartao-anel">
          <Anel
            tamanho={140}
            partes={
              eu
                ? [
                    { valor: resumo.aPagar, cor: "var(--vermelho)" },
                    { valor: resumo.aReceber, cor: "var(--verde)" },
                  ]
                : [{ valor: 1, cor: "var(--tinta)" }]
            }
          >
            <span className="rotulo">Meu saldo</span>
          </Anel>
          <strong className={`valor-anel valor--${tom}`}>{eu ? centavosEmDinheiro(resumo.aberto, { sinal: true }) : "—"}</strong>
          {eu ? (
            <Legenda
              itens={[
                {
                  cor: "vermelho",
                  rotulo: "pagar",
                  valor: resumo.aPagar / 100,
                },
                {
                  cor: "verde",
                  rotulo: "receber",
                  valor: resumo.aReceber / 100,
                },
              ]}
            />
          ) : (
            <button type="button" className="cartao-anel__nota link-sublinhado" onClick={() => app.irParaSecao("pessoas")}>
              Quem é você aqui?
            </button>
          )}
        </div>
      </div>

      <CalculadoraDoConjunto app={app} aoCompartilhar={() => setCompartilhando(true)} />

      {recentes.length > 0 && (
        <section className="recente" aria-label="Recente">
          <h2 className="recente__titulo">Recente</h2>
          {recentes.map((r, i) => (
            <button
              key={`${r.quando}-${i}`}
              type="button"
              className="faixa-aviso"
              onClick={() => (r.ref ? ir("lancamento", r.ref) : ir("historico"))}
            >
              <span className={`ponto-atividade ponto-atividade--${r.tipo}`} aria-hidden="true" />
              <span className="faixa-aviso__duas">
                <strong>{r.texto}</strong>
                <span>
                  {quandoFoi(r.quando, hoje)}
                  {r.tipo === "despesa" && r.regra ? ` · ${r.regra}${r.regra === "igual" ? ` entre ${r.participantes}` : ""}` : ""}
                </span>
              </span>
              {r.valor > 0 && <strong className="faixa-aviso__valor">{dinheiro(r.valor)}</strong>}
            </button>
          ))}
          {atividade.length > recentes.length && (
            <button type="button" className="link-mono link-mono--centro" onClick={() => ir("historico")}>
              mostrar mais
            </button>
          )}
        </section>
      )}

      {!eu && estado.moradores.length > 0 && (
        <p className="nota-tipo">Para ver o seu saldo, diga quem é você: em Pessoas, toque nos três pontinhos e escolha “Sou eu”.</p>
      )}

      {compartilhando && <FolhaDeCompartilhar app={app} aoFechar={() => setCompartilhando(false)} />}
    </div>
  );
}
