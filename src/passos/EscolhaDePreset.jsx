import { presetsDe } from "../nucleo/modos.js";

/**
 * Os presets da República, como cartões. Aparece na criação do conjunto e no
 * passo de moradores, que é onde mora a configuração da casa. Modo sem presets
 * não desenha nada.
 */
export default function EscolhaDePreset({ modo, valor, aoMudar }) {
  const presets = presetsDe(modo);
  if (presets.length === 0) return null;

  return (
    <div className="modo-grade" role="group" aria-label="Como a república divide o uso comum">
      {presets.map((p) => {
        const ativo = p.chave === valor;
        return (
          <button
            type="button"
            key={p.chave}
            className={`modo-cartao ${ativo ? "modo-cartao--ativo" : ""}`}
            aria-pressed={ativo}
            onClick={() => aoMudar(p.chave)}
          >
            <span className="modo-cartao__topo">
              <span className="modo-cartao__nome">{p.curto}</span>
              {p.regua && <span className="selo selo--livre">régua</span>}
            </span>
            <span className="modo-cartao__descricao">{p.resumo}</span>
          </button>
        );
      })}
    </div>
  );
}
