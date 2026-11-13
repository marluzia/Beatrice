import { presetsDe } from "../nucleo/modos.js";

/**
 * Os jeitos da República dividir o uso comum, como uma lista de rádio. Aparece
 * no passo Pessoas do Fechar contas (a criação e o Configurar têm a mesma
 * lista). Modo sem presets não desenha nada.
 */
export default function EscolhaDePreset({ modo, valor, aoMudar }) {
  const presets = presetsDe(modo);
  if (presets.length === 0) return null;

  return (
    <div className="cartao-lista" role="radiogroup" aria-label="Como a república divide o uso comum">
      {presets.map((p) => {
        const ativo = p.chave === valor;
        return (
          <button
            type="button"
            key={p.chave}
            role="radio"
            aria-checked={ativo}
            className="opcao-radio"
            onClick={() => aoMudar(p.chave)}
          >
            <span className={`radio ${ativo ? "radio--ativo" : ""}`} aria-hidden="true" />
            <span className="opcao-radio__textos">
              <span className="opcao-radio__nome">{p.curto}</span>
              <span>{p.resumo}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
