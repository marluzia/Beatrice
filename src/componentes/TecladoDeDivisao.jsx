import { simboloDe } from "../nucleo/moedas.js";

/** A tecla de cada regra de divisão: o símbolo grande, como numa calculadora. */
const TECLAS = {
  igual: { simbolo: "=", nome: "igual" },
  dias: { simbolo: "×d", nome: "dias" },
  horas: { simbolo: "×h", nome: "horas" },
  uso: { simbolo: "×u", nome: "uso" },
  presenca: { simbolo: "÷d", nome: "presença" },
  porcentagem: { simbolo: "%", nome: "percentual" },
  valor: { simbolo: null, nome: "valor" },
  cotas: { simbolo: "÷", nome: "cotas" },
  ajuste: { simbolo: "±", nome: "ajuste" },
  comum: { simbolo: "Σ", nome: "uso comum" },
};

/**
 * A ordem das teclas em toda calculadora: primeiro o que se declara (igual,
 * cotas, percentual, valor, ajuste), depois o que se mede (presença, dias,
 * horas, uso). Regra que não está aqui vai para o fim.
 */
export const ORDEM_DA_CALCULADORA = ["igual", "cotas", "porcentagem", "valor", "ajuste", "presenca", "dias", "horas", "uso"];

/** As regras pedidas, na ordem da calculadora. */
export const naOrdemDaCalculadora = (regras) => {
  const posicao = (r) => {
    const i = ORDEM_DA_CALCULADORA.indexOf(typeof r === "string" ? r : r.valor);
    return i < 0 ? ORDEM_DA_CALCULADORA.length : i;
  };
  return [...regras].sort((a, b) => posicao(a) - posicao(b));
};

/**
 * "Como divide" como o teclado de uma calculadora: uma tecla por regra, com o
 * símbolo grande e o nome embaixo. A tecla escolhida fica acesa.
 *
 * `opcoes` são as chaves das regras (["igual", "dias", …]) ou objetos
 * { valor, texto } para dar outro nome a uma delas.
 */
export default function TecladoDeDivisao({ opcoes, valor, aoMudar, rotulo = "Como divide" }) {
  return (
    <div className="teclado-divisao" role="radiogroup" aria-label={rotulo}>
      {opcoes.map((o) => {
        const chave = typeof o === "string" ? o : o.valor;
        const tecla = TECLAS[chave] ?? { simbolo: chave.slice(0, 1).toUpperCase(), nome: chave };
        const nome = (typeof o === "object" && o.nome) || tecla.nome;
        const ativa = chave === valor;
        return (
          <button
            key={chave}
            type="button"
            role="radio"
            aria-checked={ativa}
            aria-label={nome}
            className={`teclado-divisao__tecla ${ativa ? "teclado-divisao__tecla--ativa" : ""}`}
            onClick={() => aoMudar(chave)}
          >
            <span className="teclado-divisao__simbolo" aria-hidden="true">
              {tecla.simbolo ?? simboloDe()}
            </span>
            <span className="teclado-divisao__nome" aria-hidden="true">
              {nome}
            </span>
          </button>
        );
      })}
    </div>
  );
}
