// As peças pequenas das telas novas: anel, avatar, topo, título, abas,
// linhas de lista, ladrilhos e o aviso que some sozinho.

import { useEffect, useState } from "react";
import Icone from "./Icone.jsx";
import { reais } from "../nucleo/formato.js";

// ── dinheiro ───────────────────────────────────────────────────────────────

const MENOS = "−";

/** "R$ 179,44"; com `sinal`, "−R$ 179,44" ou "+R$ 83,00". Recebe reais. */
export function dinheiro(valor, { sinal = false, simbolo = true } = {}) {
  const v = Math.abs(valor) < 0.005 ? 0 : valor;
  const corpo = `${simbolo ? "R$ " : ""}${reais(Math.abs(v))}`;
  if (!sinal || v === 0) return v < 0 && !sinal ? `${MENOS}${corpo}` : corpo;
  return `${v < 0 ? MENOS : "+"}${corpo}`;
}

/** O mesmo, a partir de centavos. */
export const centavosEmDinheiro = (c, opcoes) => dinheiro((c ?? 0) / 100, opcoes);

/** Cor do saldo: vermelho a pagar, verde a receber, tinta no zero. */
export const tomDoSaldo = (v) => (v < -0.004 ? "pagar" : v > 0.004 ? "receber" : "zero");

// ── avatar ─────────────────────────────────────────────────────────────────

export const CORES_DAS_PESSOAS = ["#b4432f", "#2f6a95", "#c9962a", "#23633f", "#6b5b95", "#1f7a7a", "#8c6a3d", "#a34f76", "#4a7c2f", "#8a4b7d"];
export const corDaPessoa = (i) => CORES_DAS_PESSOAS[(i ?? 0) % CORES_DAS_PESSOAS.length];

export function Avatar({ nome, indice, tamanho = 44 }) {
  const cor = corDaPessoa(indice);
  const claro = cor === "#c9962a";
  return (
    <span
      className="avatar"
      style={{ background: cor, color: claro ? "#1b1a17" : "#faf6ec", width: tamanho, height: tamanho, fontSize: tamanho * 0.38 }}
      aria-hidden="true"
    >
      {(String(nome ?? "").trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

// ── anel ───────────────────────────────────────────────────────────────────

/**
 * Um anel de partes: `partes = [{ valor, cor }]`. Com uma parte só, é o anel
 * cheio. O miolo recebe o que vier como filho.
 */
export function Anel({ partes, tamanho = 200, espessura = 22, folga = 0.018, children, fundo = "var(--areia)" }) {
  const r = (tamanho - espessura) / 2;
  const c = tamanho / 2;
  const total = partes.reduce((s, p) => s + Math.max(0, p.valor), 0);
  const visiveis = partes.filter((p) => p.valor > 0);
  const circ = 2 * Math.PI * r;

  let inicio = 0;
  const arcos =
    total > 0
      ? visiveis.map((p) => {
          const fracao = p.valor / total;
          const gap = visiveis.length > 1 ? folga : 0;
          const comprimento = Math.max(0, fracao - gap) * circ;
          const deslocamento = -(inicio + gap / 2) * circ;
          inicio += fracao;
          return { cor: p.cor, comprimento, deslocamento };
        })
      : [];

  return (
    <div className="anel" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden="true">
        {arcos.length === 0 && <circle cx={c} cy={c} r={r} fill="none" stroke={fundo} strokeWidth={espessura} />}
        {arcos.map((a, i) => (
          <circle
            key={i}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={a.cor}
            strokeWidth={espessura}
            strokeDasharray={`${a.comprimento} ${circ}`}
            strokeDashoffset={a.deslocamento}
            transform={`rotate(-90 ${c} ${c})`}
          />
        ))}
      </svg>
      <div className="anel__miolo">{children}</div>
    </div>
  );
}

// ── topo e títulos ─────────────────────────────────────────────────────────

/** A barra de cima: voltar (ou fechar) à esquerda e ícones à direita. */
export function TopoDaTela({ aoVoltar, fechar = false, acoes = [], esquerda = null }) {
  return (
    <div className="topo-tela">
      {aoVoltar ? (
        <button type="button" className="icone-botao" onClick={aoVoltar} aria-label={fechar ? "Fechar" : "Voltar"}>
          <Icone nome={fechar ? "x" : "voltar"} tamanho={24} />
        </button>
      ) : (
        esquerda ?? <span />
      )}
      <div className="topo-tela__acoes">
        {acoes.map((a) => (
          <button
            key={a.icone}
            type="button"
            className={`icone-botao ${a.marcado ? "icone-botao--marcado" : ""}`}
            onClick={a.aoClicar}
            aria-label={a.rotulo}
          >
            <Icone nome={a.icone} tamanho={24} />
          </button>
        ))}
      </div>
    </div>
  );
}

const LIGACOES = new Set(["de", "do", "da", "dos", "das", "e", "a", "o", "em", "no", "na"]);

/**
 * O nome em serifa com o fim em itálico, como no Figma: "República
 * *Girassol*", "Churrasco *do sábado*". Nome de uma palavra só fica reto.
 */
export function NomeComItalico({ texto, italico }) {
  const t = String(texto ?? "").trim();
  if (italico !== undefined) {
    return (
      <>
        {t} <em>{italico}</em>
      </>
    );
  }
  const palavras = t.split(/\s+/);
  if (palavras.length < 2) return <>{t}</>;
  let corte = palavras.length - 1;
  while (corte > 1 && LIGACOES.has(palavras[corte - 1].toLowerCase())) corte -= 1;
  return (
    <>
      {palavras.slice(0, corte).join(" ")} <em>{palavras.slice(corte).join(" ")}</em>
    </>
  );
}

/** Rótulo mono pequeno em caixa alta, com pontos entre as partes. */
export function Sobrescrito({ partes, children }) {
  const lista = partes ? partes.filter(Boolean) : null;
  return <p className="sobrescrito">{lista ? lista.join(" · ") : children}</p>;
}

/** Título de seção em serifa com um rótulo mono à direita. */
export function TituloDeSecao({ children, direita, aoClicarDireita }) {
  return (
    <div className="titulo-secao">
      <h2 className="titulo-secao__texto">{children}</h2>
      {direita &&
        (aoClicarDireita ? (
          <button type="button" className="titulo-secao__direita titulo-secao__direita--botao" onClick={aoClicarDireita}>
            {direita}
          </button>
        ) : (
          <span className="titulo-secao__direita">{direita}</span>
        ))}
    </div>
  );
}

// ── abas, chips, linhas ────────────────────────────────────────────────────

/** Duas ou três abas grandes (Despesas | Pessoas). */
export function Abas({ opcoes, valor, aoMudar, rotulo }) {
  return (
    <div className="abas" role="tablist" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="tab"
          aria-selected={o.valor === valor}
          className={`abas__aba ${o.valor === valor ? "abas__aba--ativa" : ""}`}
          onClick={() => aoMudar(o.valor)}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Uma fileira de chips de filtro (Tudo, Despesas, Lembretes…). */
export function Chips({ opcoes, valor, aoMudar }) {
  return (
    <div className="chips">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          className={`chip ${o.valor === valor ? "chip--ativo" : ""}`}
          aria-pressed={o.valor === valor}
          onClick={() => aoMudar(o.valor)}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Uma linha de menu: ícone num quadrado, título, subtítulo, selo e seta. */
export function LinhaDeMenu({ icone, iconeEscuro = false, titulo, subtitulo, selo, aoClicar, desabilitado }) {
  return (
    <button type="button" className="linha-menu" onClick={aoClicar} disabled={desabilitado}>
      <span className={`linha-menu__icone ${iconeEscuro ? "linha-menu__icone--escuro" : ""}`}>
        <Icone nome={icone} tamanho={20} />
      </span>
      <span className="linha-menu__textos">
        <strong>{titulo}</strong>
        {subtitulo && <span>{subtitulo}</span>}
      </span>
      {selo && <span className={`selo-pilula selo-pilula--${selo.tom ?? "ouro"}`}>{selo.texto}</span>}
      <Icone nome="seta" tamanho={18} className="linha-menu__seta" />
    </button>
  );
}

/** Ladrilho quadrado com ícone e nome (Calendário, Lembretes, Registros). */
export function Ladrilho({ icone, titulo, subtitulo, aoClicar, apagado = false }) {
  return (
    <button type="button" className={`ladrilho ${apagado ? "ladrilho--apagado" : ""}`} onClick={aoClicar}>
      <Icone nome={icone} tamanho={28} />
      <strong>{titulo}</strong>
      {subtitulo && <span>{subtitulo}</span>}
    </button>
  );
}

export function SeloPilula({ tom = "ouro", children }) {
  return <span className={`selo-pilula selo-pilula--${tom}`}>{children}</span>;
}

// ── aviso que some ─────────────────────────────────────────────────────────

let avisar = () => {};

/** Mostra um aviso curto embaixo da tela ("Em breve"). */
export const mostrarAviso = (texto) => avisar(texto);

export function Avisos() {
  const [texto, setTexto] = useState(null);
  useEffect(() => {
    let relogio = null;
    avisar = (t) => {
      setTexto(t);
      clearTimeout(relogio);
      relogio = setTimeout(() => setTexto(null), 2600);
    };
    return () => {
      avisar = () => {};
      clearTimeout(relogio);
    };
  }, []);
  if (!texto) return null;
  return (
    <div className="aviso-flutuante" role="status">
      {texto}
    </div>
  );
}

/** O aviso padrão do que ainda não existe. */
export const emBreve = (oque) => mostrarAviso(`${oque}: em breve.`);
