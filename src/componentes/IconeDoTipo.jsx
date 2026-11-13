/**
 * As figuras de cada tipo de conjunto (e das ações de criar): formas
 * geométricas chapadas em azul, vermelho, mostarda, verde e preto, num
 * azulejo arredondado. Cada tipo tem a sua, para a lista bater o olho.
 */
const AZUL = "#3f7fae";
const VERMELHO = "#b4432f";
const OURO = "#c9962a";
const VERDE = "#23633f";
const TINTA = "#1b1a17";
const LARANJA = "#d9772b";
const MARROM = "#5c3a21";

const arco = (x0, x1, topo, base) => {
  const r = (x1 - x0) / 2;
  return `M${x0} ${base}V${topo + r}A${r} ${r} 0 0 1 ${x1} ${topo + r}V${base}Z`;
};

const FIGURAS = {
  // Um cone de cabeça para baixo com confete saindo: a festa.
  evento: {
    fundo: "#e6dcc6",
    desenho: (
      <>
        <path d="M12.5 22h23L24 42.5z" fill={TINTA} />
        <circle cx="18.5" cy="14.5" r="6.5" fill={AZUL} />
        <circle cx="31" cy="13" r="4.3" fill={VERMELHO} />
        <circle cx="25.5" cy="6.2" r="2.7" fill={OURO} />
      </>
    ),
  },
  temporada: {
    fundo: "#e6dcc6",
    desenho: (
      <>
        <circle cx="31" cy="17" r="7.5" fill={OURO} />
        <path d="M22 39c0-6 4.5-10 10-10s8 3.5 8 10z" fill={VERDE} />
        <path d="M8 39 18 20l10 19z" fill={TINTA} />
      </>
    ),
  },
  familia: {
    fundo: "#e6dcc6",
    desenho: (
      <>
        <path d={arco(21, 37, 13, 38)} fill={MARROM} />
        <path d={arco(10, 25, 16, 38)} fill={LARANJA} />
      </>
    ),
  },
  moradia: {
    fundo: "#e6dcc6",
    desenho: (
      <>
        <path d="M8 23 20 11l12 12z" fill={VERMELHO} />
        <rect x="11" y="23" width="18" height="15" fill={TINTA} />
        <rect x="24" y="28" width="13" height="10" fill={OURO} />
      </>
    ),
  },
  multipro: {
    fundo: "#e6dcc6",
    desenho: (
      <>
        <path d="M11 28a13 13 0 0 1 26 0z" fill={OURO} />
        <path d="M24 10v15l8-2z" fill={VERDE} />
        <path d="M9 29h30l-5 9H14z" fill={TINTA} />
      </>
    ),
  },
  novoConjunto: {
    fundo: "#2c2a26",
    desenho: (
      <>
        <circle cx="17" cy="20" r="9" fill={AZUL} />
        <path d="M13 36 24 15l11 21z" fill={OURO} />
        <rect x="26" y="27" width="11" height="11" fill={VERMELHO} />
      </>
    ),
  },
  novaDespesa: {
    fundo: "#f2d8cf",
    desenho: (
      <>
        <rect x="12" y="9" width="20" height="28" fill="#faf6ec" stroke={TINTA} strokeWidth="1.8" />
        <path d="M16 15h12M16 19.5h12M16 24h8" stroke={TINTA} strokeWidth="1.8" />
        <path d="M27 38l6.5-12L40 38z" fill={VERMELHO} />
      </>
    ),
  },
  novoRegistro: {
    fundo: "#dce4e5",
    desenho: (
      <g fill="none" stroke="#3d6670" strokeWidth="2.2" strokeLinecap="round">
        <rect x="13" y="11" width="22" height="26" rx="4" />
        <circle cx="24" cy="25" r="6.5" />
        <path d="M21 28l6-6" />
      </g>
    ),
  },
  novoLembrete: {
    fundo: "#d4e4ef",
    desenho: (
      <>
        <path d="M8 31 19 15l11 16z" fill={AZUL} />
        <circle cx="31" cy="17" r="6" fill={OURO} />
        <rect x="16" y="28" width="10" height="10" fill={TINTA} />
      </>
    ),
  },
  // Configurar: Dados gerais. Uma ficha em planos: a folha inclinada, o
  // círculo de quem é, as duas linhas do que se escreve.
  dadosGerais: {
    fundo: "#e6dcc6",
    desenho: (
      <>
        <path d="M12 12.5 31 9l3.6 26.5-19 3.5z" fill={TINTA} />
        <circle cx="16.5" cy="15.5" r="6.5" fill={AZUL} />
        <path d="M22 23.5h17v5.2H22z" fill={OURO} />
        <path d="M22 31.5h11v5.2H22z" fill={VERMELHO} />
      </>
    ),
  },
  // Configurar: Itens. Um aparelho em planos: o corpo, o tambor que gira, o
  // raio da energia e a gota da água.
  itens: {
    fundo: "#e6dcc6",
    desenho: (
      <>
        <path d="M9 15h21v24H9z" fill={TINTA} />
        <circle cx="19.5" cy="28" r="7" fill={OURO} />
        <path d="M33 6h7.5l-5 9.5h4L30.5 29l2.5-10.5h-4z" fill={VERMELHO} />
        <path d="M37 30c-3 3.6-4.4 5.8-4.4 7.6a4.4 4.4 0 0 0 8.8 0c0-1.8-1.4-4-4.4-7.6z" fill={AZUL} />
      </>
    ),
  },
};

export default function IconeDoTipo({ tipo, tamanho = 56, semFundo = false }) {
  const figura = FIGURAS[tipo] ?? FIGURAS.evento;
  return (
    <svg className="icone-do-tipo" width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true">
      {!semFundo && <rect width="48" height="48" rx="11" fill={figura.fundo} />}
      {figura.desenho}
    </svg>
  );
}
