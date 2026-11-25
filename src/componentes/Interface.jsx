// As peças pequenas das telas novas: anel, avatar, topo, título, abas,
// linhas de lista, ladrilhos e o aviso que some sozinho.

import { simboloDe } from "../nucleo/moedas.js";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import { reais } from "../nucleo/formato.js";

// ── dinheiro ───────────────────────────────────────────────────────────────

const MENOS = "−";

/** "R$ 179,44" (ou "US$…", na moeda do conjunto); com `sinal`, "−R$ 179,44" ou "+R$ 83,00". */
export function dinheiro(valor, { sinal = false, simbolo = true, moeda } = {}) {
  const v = Math.abs(valor) < 0.005 ? 0 : valor;
  // Sem moeda dita, a do conjunto aberto.
  const corpo = `${simbolo ? `${simboloDe(moeda)} ` : ""}${reais(Math.abs(v))}`;
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
/**
 * O sino de toda tela: o App diz o que ele abre e se há aviso pendente. O
 * TopoDaTela sempre o põe no canto direito, depois das outras ações.
 */
export const SinoContexto = createContext(null);

/** O botão do sino, igual em toda tela. */
export function BotaoSino() {
  const sino = useContext(SinoContexto);
  if (!sino) return null;
  return (
    <button type="button" className="icone-botao" aria-label="Notificações" onClick={sino.abrir}>
      <Icone nome="sino" tamanho={24} />
      {sino.pendente && <span className="ponto-aviso" />}
    </button>
  );
}

export function TopoDaTela({ aoVoltar, fechar = false, acoes = [], esquerda = null, semSino = false }) {
  const outras = acoes.filter((a) => a.icone !== "sino");
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
        {outras.map((a) => (
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
        {!semSino && <BotaoSino />}
      </div>
    </div>
  );
}

const LIGACOES = new Set(["de", "do", "da", "dos", "das", "e", "a", "o", "em", "no", "na"]);

/**
 * O nome com o fim marcado em <em> (sem serifa nem itálico): "República
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

/** Título de seção com um rótulo mono à direita. */
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
      <SetaComBarra />
    </button>
  );
}

/** Espaço entre duas abas na mesma fileira (o `column-gap` de `.pasta__fileira`). */
const VAO_ENTRE_ABAS = 3;

const semMovimento = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Divide as abas em fileiras: cada fileira leva as abas que cabem na
 * largura, na ordem, cada uma do tamanho do próprio nome.
 */
function emFileiras(opcoes, larguras, espaco) {
  if (!larguras || larguras.length !== opcoes.length || !(espaco > 0)) return [opcoes];
  const fileiras = [[]];
  let usado = 0;
  opcoes.forEach((o, i) => {
    const w = Math.min(larguras[i], espaco);
    const atual = fileiras[fileiras.length - 1];
    const com = atual.length === 0 ? w : usado + VAO_ENTRE_ABAS + w;
    if (atual.length > 0 && com > espaco) {
      fileiras.push([o]);
      usado = w;
    } else {
      atual.push(o);
      usado = com;
    }
  });
  return fileiras;
}

/**
 * Abas como as de uma pasta de arquivo: a aba escolhida se emenda com o
 * conteúdo embaixo, as outras ficam atrás. Para os filtros de busca e para
 * escolher entre Avulsa e Cíclica.
 *
 * Quando as abas não cabem numa linha, elas se dividem em fileiras, cada uma
 * numa folha: as de trás ficam numa folha atrás, e a fileira da aba escolhida
 * sempre vem para a frente, colada no conteúdo. Ao trocar de fileira, as abas
 * deslizam até o lugar novo (FLIP), a não ser com movimento reduzido.
 */
export function AbasDePasta({ opcoes, valor, aoMudar, rotulo, children }) {
  const abas = useRef(null);
  const botoes = useRef(new Map());
  const antes = useRef(null);
  // A largura de cada aba (no tamanho do nome, em negrito como fica a
  // escolhida) e a da caixa: daí sai quantas cabem em cada fileira.
  const [medida, setMedida] = useState(null);
  const chave = opcoes.map((o) => `${o.valor}:${typeof o.rotulo === "string" ? o.rotulo : ""}`).join("|");

  useLayoutEffect(() => {
    const caixa = abas.current;
    if (!caixa) return undefined;
    const medir = () => {
      caixa.classList.add("pasta__abas--medindo");
      const larguras = opcoes.map((o) => Math.ceil(botoes.current.get(o.valor)?.getBoundingClientRect().width ?? 0));
      caixa.classList.remove("pasta__abas--medindo");
      const espaco = caixa.clientWidth;
      const nova = larguras.every((w) => w > 0) && espaco > 0 ? { larguras, espaco } : null;
      setMedida((velha) => (JSON.stringify(velha) === JSON.stringify(nova) ? velha : nova));
    };
    medir();
    let vivo = true;
    document.fonts?.ready?.then(() => vivo && medir());
    // Girar o celular ou mudar a janela muda quantas cabem por fileira.
    let largura = caixa.clientWidth;
    const observador =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            if (caixa.clientWidth === largura) return;
            largura = caixa.clientWidth;
            medir();
          })
        : null;
    observador?.observe(caixa);
    return () => {
      vivo = false;
      observador?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const fileiras = emFileiras(opcoes, medida?.larguras, medida?.espaco);
  const daEscolhida = Math.max(
    0,
    fileiras.findIndex((f) => f.some((o) => o.valor === valor)),
  );
  // A fileira da aba escolhida vai para a frente; as outras mantêm a ordem.
  const ordem = [...fileiras.filter((_, i) => i !== daEscolhida), fileiras[daEscolhida]];
  const emCamadas = ordem.length > 1;
  const primeira = ordem[ordem.length - 1][0]?.valor === valor;

  const escolher = (v) => {
    if (v === valor) return;
    if (emCamadas && !semMovimento()) {
      const posicoes = new Map();
      botoes.current.forEach((el, k) => posicoes.set(k, el.getBoundingClientRect()));
      antes.current = { posicoes, comFoco: abas.current?.contains(document.activeElement) };
    }
    aoMudar(v);
  };

  // FLIP: cada aba sai de onde estava e desliza até o lugar novo.
  useLayoutEffect(() => {
    const anterior = antes.current;
    antes.current = null;
    const caixa = abas.current;
    if (!anterior || !caixa) return;
    // Mover a fileira no DOM tira o foco da aba clicada; devolve.
    if (anterior.comFoco) botoes.current.get(valor)?.focus({ preventScroll: true });
    const animacoes = [];
    botoes.current.forEach((el, k) => {
      const de = anterior.posicoes.get(k);
      if (!de || typeof el.animate !== "function") return;
      const para = el.getBoundingClientRect();
      const dx = de.left - para.left;
      const dy = de.top - para.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      animacoes.push(
        el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }], {
          duration: 460,
          easing: "cubic-bezier(0.22, 0.9, 0.24, 1)",
        }),
      );
    });
    if (animacoes.length === 0) return;
    caixa.classList.add("pasta__abas--animando");
    Promise.allSettled(animacoes.map((a) => a.finished)).then(() => caixa.classList.remove("pasta__abas--animando"));
  }, [valor]);

  return (
    <div className={`pasta ${emCamadas ? "pasta--em-camadas" : ""}`}>
      <div className="pasta__abas" role="tablist" aria-label={rotulo} ref={abas}>
        {ordem.map((fileira, i) => (
          <div
            key={fileira[0].valor}
            role="presentation"
            className={`pasta__fileira ${emCamadas ? (i === ordem.length - 1 ? "pasta__fileira--frente" : "pasta__fileira--atras") : ""}`}
          >
            {fileira.map((o) => {
              const ativa = o.valor === valor;
              return (
                <button
                  key={o.valor}
                  ref={(el) => (el ? botoes.current.set(o.valor, el) : botoes.current.delete(o.valor))}
                  type="button"
                  role="tab"
                  aria-selected={ativa}
                  className={`pasta__aba ${ativa ? "pasta__aba--ativa" : ""}`}
                  data-rotulo={typeof o.rotulo === "string" ? o.rotulo : undefined}
                  onClick={() => escolher(o.valor)}
                >
                  {o.rotulo}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className={`pasta__conteudo ${primeira ? "pasta__conteudo--primeira" : ""}`} role="tabpanel">
        {children}
      </div>
    </div>
  );
}

/** A seta "›" do fim de uma linha, separada do texto por uma barra à esquerda. */
export function SetaComBarra({ tamanho = 18 }) {
  return (
    <span className="seta-com-barra" aria-hidden="true">
      <Icone nome="seta" tamanho={tamanho} />
    </span>
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
