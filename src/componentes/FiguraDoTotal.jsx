// O total do conjunto desenhado com as pessoas dele: uma pessoa é uma pizza,
// duas são um segmento de reta (um ponto para cada), e de três em diante um
// polígono com um vértice por pessoa. O contorno se divide nas partes (pago,
// aberto) como o anel; o miolo leva o que vier como filho.

const MEIO_PI = Math.PI / 2;

/** Os vértices do polígono regular de `n` lados, o primeiro no alto, em sentido horário. */
export function verticesDoPoligono(n, centro, raio) {
  return Array.from({ length: n }, (_, i) => {
    const angulo = -MEIO_PI + (2 * Math.PI * i) / n;
    return [centro + raio * Math.cos(angulo), centro + raio * Math.sin(angulo)];
  });
}

/** As partes que aparecem, com a fração de cada uma no contorno. */
function fracoes(partes) {
  const visiveis = partes.filter((p) => p.valor > 0);
  const total = visiveis.reduce((s, p) => s + p.valor, 0);
  return total > 0 ? visiveis.map((p) => ({ cor: p.cor, fracao: p.valor / total })) : [];
}

/** O mesmo contorno, uma vez por parte, cada uma num trecho (comprimento medido de 0 a 1). */
function TrechosDoContorno({ partes, folga, espessura, fundo, children: forma }) {
  const lista = fracoes(partes);
  if (lista.length === 0) return forma({ stroke: fundo, strokeWidth: espessura });
  const gap = lista.length > 1 ? folga : 0;
  let inicio = 0;
  return lista.map((p, i) => {
    const props = {
      key: i,
      stroke: p.cor,
      strokeWidth: espessura,
      pathLength: 1,
      strokeDasharray: `${Math.max(0, p.fracao - gap)} 1`,
      strokeDashoffset: -(inicio + gap / 2),
    };
    inicio += p.fracao;
    return forma(props);
  });
}

/** Uma fatia da pizza, de `de` a `ate` (frações da volta, a partir do alto). */
function fatia(c, r, de, ate) {
  if (ate - de >= 0.9999) return null;
  const ponto = (f) => [c + r * Math.cos(-MEIO_PI + 2 * Math.PI * f), c + r * Math.sin(-MEIO_PI + 2 * Math.PI * f)];
  const [x1, y1] = ponto(de);
  const [x2, y2] = ponto(ate);
  return `M${c} ${c} L${x1} ${y1} A${r} ${r} 0 ${ate - de > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`;
}

export default function FiguraDoTotal({
  pessoas,
  partes,
  tamanho = 140,
  espessura = 9,
  folga = 0.018,
  fundo = "var(--areia)",
  children,
}) {
  const n = Math.max(1, Math.floor(pessoas || 1));
  const c = tamanho / 2;
  const ponto = Math.max(3.5, espessura * 0.55);
  const margem = espessura / 2 + ponto + 1;
  const forma = n === 1 ? "pizza" : n === 2 ? "segmento" : "poligono";

  let desenho;
  if (forma === "pizza") {
    const lista = fracoes(partes);
    const r = c - 1;
    let inicio = 0;
    desenho =
      lista.length === 0 ? (
        <circle cx={c} cy={c} r={r} fill={fundo} />
      ) : (
        lista.map((p, i) => {
          const d = fatia(c, r, inicio, inicio + p.fracao);
          inicio += p.fracao;
          return d ? <path key={i} d={d} fill={p.cor} /> : <circle key={i} cx={c} cy={c} r={r} fill={p.cor} />;
        })
      );
  } else if (forma === "segmento") {
    const [x1, x2] = [margem, tamanho - margem];
    desenho = (
      <>
        <TrechosDoContorno partes={partes} folga={folga} espessura={espessura} fundo={fundo}>
          {(props) => <line {...props} x1={x1} y1={c} x2={x2} y2={c} strokeLinecap="butt" />}
        </TrechosDoContorno>
        <circle cx={x1} cy={c} r={ponto} className="figura-total__ponto" />
        <circle cx={x2} cy={c} r={ponto} className="figura-total__ponto" />
      </>
    );
  } else {
    const vertices = verticesDoPoligono(n, c, c - margem);
    const d = `M${vertices.map(([x, y]) => `${x} ${y}`).join(" L")} Z`;
    desenho = (
      <>
        <TrechosDoContorno partes={partes} folga={folga} espessura={espessura} fundo={fundo}>
          {(props) => <path {...props} d={d} fill="none" strokeLinejoin="round" />}
        </TrechosDoContorno>
        {vertices.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={ponto} className="figura-total__ponto" />
        ))}
      </>
    );
  }

  return (
    <div className={`figura-total figura-total--${forma}`} style={{ width: tamanho, height: tamanho }} data-pessoas={n}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden="true">
        {desenho}
      </svg>
      <div className="figura-total__miolo">{children}</div>
    </div>
  );
}
