import Icone from "./Icone.jsx";

const SECOES = [
  { chave: "hub", nome: "Conjunto", icone: "circulo" },
  { chave: "agenda", nome: "Agenda", icone: "agenda" },
  null,
  { chave: "analise", nome: "Análise", icone: "analise" },
  { chave: "pessoas", nome: "Pessoas", icone: "pessoas" },
];

/**
 * A barra de baixo de dentro de um conjunto. Toma o lugar da barra do app só
 * enquanto se navega por este conjunto: Conjunto (o painel), Agenda, o
 * botão de criar no meio (como na barra do app), Análise e Pessoas. Para
 * voltar ao resto do app, a seta do topo. Fonte, folga e ícone são os da
 * barra do app (as mesmas classes `barra-inferior__aba`).
 */
export default function BarraDoConjunto({ secao, aoEscolher, aoCriar, criando = false, semAgenda = false }) {
  return (
    <nav className="barra-inferior barra-do-conjunto" aria-label="Seções do conjunto">
      {SECOES.map((s) => {
        if (s === null) {
          return (
            <div className="barra-inferior__meio" key="meio">
              <button
                type="button"
                className="botao-criar"
                onClick={aoCriar}
                aria-label={criando ? "Fechar" : "Criar"}
                aria-expanded={criando}
              >
                <span className="botao-criar__sombra" aria-hidden="true" />
                <span className="botao-criar__face">
                  <Icone nome={criando ? "x" : "mais"} tamanho={26} espessura={2} />
                </span>
              </button>
            </div>
          );
        }
        const ativa = secao === s.chave;
        const apagada = s.chave === "agenda" && semAgenda;
        return (
          <button
            key={s.chave}
            type="button"
            className={`barra-inferior__aba barra-do-conjunto__secao ${ativa ? "barra-inferior__aba--ativa barra-do-conjunto__secao--ativa" : ""} ${apagada ? "barra-do-conjunto__secao--apagada" : ""}`}
            aria-current={ativa ? "page" : undefined}
            onClick={() => aoEscolher(s.chave)}
          >
            <Icone nome={s.icone} tamanho={26} espessura={1.7} />
            <span>{s.nome}</span>
          </button>
        );
      })}
    </nav>
  );
}
