/**
 * As etapas do fechamento numa linha com nós: cada nó tem o número da etapa,
 * e o nome dela fica em cima. A linha entre os nós enche até a etapa atual.
 *
 * No DOM, o número vem antes do nome (o texto do botão termina no nome, como
 * os testes e os leitores de tela esperam); a ordem visual, com o nome em
 * cima, é do CSS.
 *
 * Embaixo da linha, quando a etapa tem mais de uma macrosseção, vão os nomes
 * delas: a pessoa vê onde está e pode pular direto para uma.
 */
export default function Navegacao({
  passos,
  atual,
  aoEscolher,
  bloqueadosApos,
  secoes = null,
  secaoAtual = 0,
  aoEscolherSecao,
}) {
  return (
    <nav className="etapas" aria-label="Etapas">
      <ol className="etapas__lista">
        {passos.map((p, i) => {
          const estado = i === atual ? "atual" : i < atual ? "feita" : "adiante";
          return (
            <li key={p} className={`etapa etapa--${estado}`}>
              <button
                type="button"
                className="etapa__botao"
                aria-current={i === atual ? "step" : undefined}
                disabled={bloqueadosApos !== undefined && i > bloqueadosApos}
                onClick={() => aoEscolher(i)}
              >
                <span className="etapa__no" aria-hidden="true">
                  {estado === "feita" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="etapa__nome">{p}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {secoes && (
        <ol className="subetapas" aria-label="Seções desta etapa">
          {secoes.map((t, n) => (
            <li key={t} className={`subetapa ${n === secaoAtual ? "subetapa--atual" : ""}`}>
              <button
                type="button"
                className="subetapa__botao"
                aria-current={n === secaoAtual ? "location" : undefined}
                onClick={() => aoEscolherSecao?.(n)}
              >
                {t}
              </button>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}
