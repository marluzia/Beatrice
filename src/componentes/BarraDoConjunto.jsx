import Icone from "./Icone.jsx";

const SECOES = [
  { chave: "hub", nome: "Início", icone: "casa" },
  { chave: "calendario", nome: "Calendário", icone: "calendario" },
  { chave: "analise", nome: "Análise", icone: "analise" },
  { chave: "pessoas", nome: "Pessoas", icone: "pessoas" },
];

/**
 * A barra de baixo de dentro de um conjunto. Toma o lugar da barra do app só
 * enquanto se navega por este conjunto: Início (o painel), Calendário, Análise
 * e Pessoas, no
 * amarelo do app. Para voltar ao resto do app, a seta do topo. Fonte, folga e
 * ícone são os da barra do app (as mesmas classes `barra-inferior__aba`).
 */
export default function BarraDoConjunto({ secao, aoEscolher, semCalendario = false }) {
  return (
    <nav
      className="barra-inferior barra-do-conjunto"
      aria-label="Seções do conjunto"
      style={{ "--secoes": SECOES.length }}
    >
      {SECOES.map((s) => {
        const ativa = secao === s.chave;
        const apagada = s.chave === "calendario" && semCalendario;
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
