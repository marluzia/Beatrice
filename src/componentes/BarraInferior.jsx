import Icone from "./Icone.jsx";
import MarcaR from "./MarcaR.jsx";

const ABAS = [
  { chave: "inicio", nome: "Início", icone: "casa" },
  { chave: "conjuntos", nome: "Conjuntos", icone: "conjuntos" },
  null,
  { chave: "atividade", nome: "Atividade", icone: "atividade" },
  { chave: "perfil", nome: "Perfil", icone: "perfil" },
];

/**
 * A barra de baixo: quatro abas e, no meio, o botão de criar (o "+" preto com
 * a sombra mostarda). Com a folha de criar aberta, o "+" vira "×".
 */
export default function BarraInferior({ aba, aoEscolher, aoCriar, criando = false }) {
  return (
    <nav className="barra-inferior" aria-label="Seções do app">
      {ABAS.map((a, i) =>
        a === null ? (
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
        ) : (
          <button
            key={a.chave}
            type="button"
            className={`barra-inferior__aba ${aba === a.chave ? "barra-inferior__aba--ativa" : ""}`}
            aria-current={aba === a.chave ? "page" : undefined}
            onClick={() => aoEscolher(a.chave)}
          >
            {a.icone === "perfil" ? (
              <MarcaR tamanho={30} titulo="" className="barra-inferior__marca" />
            ) : (
              <Icone nome={a.icone} tamanho={26} espessura={1.7} />
            )}
            <span>{a.nome}</span>
          </button>
        ),
      )}
    </nav>
  );
}
