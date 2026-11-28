import Icone from "./Icone.jsx";
import { BotaoSino, NomeComItalico } from "./Interface.jsx";

/**
 * O cabeçalho de dentro de um conjunto, como o de um grupo de conversa: numa
 * caixa creme de ponta a ponta, a seta de voltar e o nome do conjunto.
 *
 * No painel e nas seções do menu de cima (Agenda, Análise, Pessoas), só o
 * nome, no meio da altura do cabeçalho, e à direita os três pontos ou as
 * ações da tela. Com `aoAbrir`, tocar no nome abre Configurar conjunto.
 *
 * Em toda outra tela do conjunto, embaixo do nome vem onde se está: a seção e,
 * quando há, a subseção (`subtitulo`, um texto ou uma lista: "Lançar despesas ›
 * Cíclica"), e não há menu. Ações da tela (editar, duplicar) vão à direita.
 */
export default function CabecalhoDoConjunto({
  nome,
  aoVoltar,
  subtitulo = null,
  aoAbrir = null,
  menuAberto = false,
  aoAbrirMenu = null,
  acoes = [],
}) {
  const partes = (Array.isArray(subtitulo) ? subtitulo : [subtitulo]).filter((x) => typeof x === "string" && x.trim());
  return (
    <header className="cabecalho-conjunto">
      <button type="button" className="icone-botao" onClick={aoVoltar} aria-label="Voltar">
        <Icone nome="voltar" tamanho={24} />
      </button>
      <div className={`cabecalho-conjunto__meio ${aoAbrir ? "cabecalho-conjunto__meio--abre" : ""}`}>
        {aoAbrir && <button type="button" className="cabecalho-conjunto__abrir" onClick={aoAbrir} aria-label="Configurar conjunto" />}
        <h1 className="cabecalho-conjunto__titulo">
          <NomeComItalico texto={nome} />
        </h1>
        {partes.length > 0 && (
          <h2 className="cabecalho-conjunto__subtitulo">
            {partes.map((p, i) =>
              i === 0 ? (
                p
              ) : (
                <span key={i}>
                  {" "}
                  <span className="cabecalho-conjunto__seta">›</span> {p}
                </span>
              ),
            )}
          </h2>
        )}
      </div>
      {aoAbrirMenu ? (
        <button type="button" className="icone-botao" onClick={aoAbrirMenu} aria-label="Mais opções" aria-expanded={menuAberto}>
          <Icone nome="pontos" tamanho={24} />
        </button>
      ) : acoes.length > 0 ? (
        <div className="cabecalho-conjunto__acoes">
          {acoes.map((a) => (
            <button key={a.icone} type="button" className="icone-botao" onClick={a.aoClicar} aria-label={a.rotulo}>
              <Icone nome={a.icone} tamanho={24} />
            </button>
          ))}
        </div>
      ) : (
        <span className="cabecalho-conjunto__vazio" aria-hidden="true" />
      )}
    </header>
  );
}

/**
 * O mesmo cabeçalho nas telas do app fora de um conjunto (Conjuntos,
 * Atividade, Perfil, Buscar, Notificações): a caixa creme, a seta de voltar à
 * esquerda e o título, no tamanho do nome de um conjunto. Com `comSino`, o
 * sino das notificações fica no canto direito.
 */
export function CabecalhoDaAba({ titulo, aoVoltar, comSino = false }) {
  return (
    <header className="cabecalho-conjunto cabecalho-conjunto--aba">
      <button type="button" className="icone-botao" onClick={aoVoltar} aria-label="Voltar">
        <Icone nome="voltar" tamanho={24} />
      </button>
      <div className="cabecalho-conjunto__meio">
        <h1 className="cabecalho-conjunto__titulo">{titulo}</h1>
      </div>
      {comSino ? <BotaoSino /> : <span className="cabecalho-conjunto__vazio" aria-hidden="true" />}
    </header>
  );
}

/** O texto de uma aba (as opções das pastas têm `rotulo`, às vezes com um selo dentro). */
export function rotuloDaAba(opcoes, valor) {
  const o = (opcoes ?? []).find((x) => x.valor === valor);
  if (!o) return null;
  return typeof o.rotulo === "string" ? o.rotulo : o.texto ?? null;
}

/**
 * O cabeçalho de toda tela de dentro de um conjunto: o nome do conjunto e,
 * embaixo, a seção e a subseção ("Lançar despesas › Cíclica").
 */
export function CabecalhoDaSecao({ app, secao, subsecao = null, acoes = [], aoVoltar }) {
  return (
    <CabecalhoDoConjunto
      estado={app.estado}
      nome={app.nomeDoConjunto}
      aoVoltar={aoVoltar ?? app.voltar}
      subtitulo={[secao, subsecao]}
      acoes={acoes}
    />
  );
}

/** As seções do menu de cima de um conjunto, sem ícones. */
const SECOES = [
  { chave: "hub", nome: "Painel" },
  { chave: "agenda", nome: "Agenda" },
  { chave: "analise", nome: "Análise" },
  { chave: "pessoas", nome: "Pessoas" },
];

/** O menu de cima de um conjunto, logo abaixo do cabeçalho: Painel, Agenda, Análise e Pessoas. */
export function MenuDoConjunto({ app, atual }) {
  return (
    <nav className="menu-do-conjunto" aria-label="Seções do conjunto">
      {SECOES.map((s) => (
        <button
          key={s.chave}
          type="button"
          className={`menu-do-conjunto__secao ${atual === s.chave ? "menu-do-conjunto__secao--atual" : ""}`}
          aria-current={atual === s.chave ? "page" : undefined}
          onClick={() => (atual === s.chave ? null : s.chave === "hub" ? app.irAoPainel() : app.irParaSecao(s.chave))}
        >
          {s.nome}
        </button>
      ))}
    </nav>
  );
}

/**
 * O topo do painel e das seções: o cabeçalho (o nome; tocar abre Configurar
 * conjunto) e o menu de cima. Os dois ficam presos no alto ao rolar a tela.
 */
export function TopoDoConjunto({ app, atual, aoAbrirMenu = null, menuAberto = false, acoes = [] }) {
  return (
    <div className="topo-do-conjunto">
      <CabecalhoDoConjunto
        estado={app.estado}
        nome={app.nomeDoConjunto}
        aoVoltar={app.voltar}
        aoAbrir={() => app.ir("configurar")}
        aoAbrirMenu={aoAbrirMenu}
        menuAberto={menuAberto}
        acoes={acoes}
      />
      <MenuDoConjunto app={app} atual={atual} />
    </div>
  );
}
