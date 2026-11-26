import Icone from "./Icone.jsx";
import { Avatar, BotaoSino, NomeComItalico } from "./Interface.jsx";
import { nomeDe } from "../nucleo/resumo.js";

/**
 * O cabeçalho de dentro de um conjunto, como o de um grupo de conversa: numa
 * caixa creme de ponta a ponta, a seta de voltar e o nome do conjunto.
 *
 * No painel, embaixo do nome vêm os membros (círculos um por cima do outro,
 * da esquerda para a direita, e quantos são) e, à direita, os três pontos com
 * o menu. Quanto mais gente, mais os círculos se sobrepõem para caber na
 * largura (até sobrar só a borda de cada um).
 *
 * Em toda outra tela do conjunto, embaixo do nome vem onde se está: a seção e,
 * quando há, a subseção (`subtitulo`, um texto ou uma lista: "Lançar despesas ›
 * Cíclica"), e não há menu. Ações da tela (editar, duplicar) vão à direita.
 */
export default function CabecalhoDoConjunto({
  estado,
  nome,
  aoVoltar,
  subtitulo = null,
  aoVerPessoas,
  menuAberto = false,
  aoAbrirMenu = null,
  acoes = [],
}) {
  const partes = (Array.isArray(subtitulo) ? subtitulo : [subtitulo]).filter((x) => typeof x === "string" && x.trim());
  const n = estado.moradores.length;
  const quantos = `${n} ${n === 1 ? "pessoa" : "pessoas"}`;
  return (
    <header className="cabecalho-conjunto">
      <button type="button" className="icone-botao" onClick={aoVoltar} aria-label="Voltar">
        <Icone nome="voltar" tamanho={24} />
      </button>
      <div className="cabecalho-conjunto__meio">
        <h1 className="cabecalho-conjunto__titulo">
          <NomeComItalico texto={nome} />
        </h1>
        {partes.length > 0 ? (
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
        ) : (
          <button type="button" className="membros-em-fila" onClick={aoVerPessoas} aria-label={`${quantos}: ver pessoas`}>
            {n > 0 && (
              <span className="membros-em-fila__rolo" aria-hidden="true">
                {estado.moradores.map((m, i) => (
                  <span className="membros-em-fila__lugar" key={m.id} style={{ zIndex: n - i }}>
                    <Avatar nome={nomeDe(estado, m.id)} indice={i} tamanho={24} />
                  </span>
                ))}
              </span>
            )}
            <span className="membros-em-fila__quantos">{quantos}</span>
          </button>
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
