import { useState } from "react";
import { Botao, Campo, Ficha, Rotulo, Titulo } from "../componentes/index.js";
import { LISTA_DE_MODOS, modoDe, presetValido } from "../nucleo/modos.js";
import EscolhaDePreset from "./EscolhaDePreset.jsx";

/**
 * A primeira pergunta: que tipo de conjunto é este. A resposta não muda o
 * cálculo, muda com o que ele abre e como a tela pergunta as coisas.
 */
export default function EscolhaDeModo({ aoCriar, aoCancelar, podeCancelar }) {
  const [escolhido, setEscolhido] = useState("moradia");
  const [nome, setNome] = useState("");
  const [pessoas, setPessoas] = useState("");
  // `undefined` = ainda não escolheu; `presetValido` devolve o padrão do modo.
  const [preset, setPreset] = useState(undefined);

  const modo = modoDe(escolhido);
  const presetAtual = presetValido(escolhido, preset);

  const quantas = () => {
    const n = parseInt(pessoas, 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(modo.maximoDeMoradores, n)) : modo.moradores;
  };

  const criar = () =>
    aoCriar(nome.trim() || modo.nome, escolhido, quantas(), presetAtual ?? undefined);

  return (
    <div className="coluna">
      <Ficha>
        <Titulo nota="">
          Criar conjunto
        </Titulo>

        <div className="modo-grade">
          {LISTA_DE_MODOS.map((m) => {
            const ativo = m.chave === escolhido;
            return (
              <button
                type="button"
                key={m.chave}
                className={`modo-cartao ${ativo ? "modo-cartao--ativo" : ""}`}
                aria-pressed={ativo}
                onClick={() => setEscolhido(m.chave)}
              >
                <span className="modo-cartao__topo">
                  <span className="modo-cartao__nome">{m.nome}</span>
                  {!m.pago && <span className="selo selo--livre">grátis</span>}
                </span>
                <span className="modo-cartao__exemplo">{m.exemplo}</span>
                <span className="modo-cartao__descricao">{m.descricao}</span>
              </button>
            );
          })}
        </div>
      </Ficha>

      {presetAtual && (
        <Ficha>
          <Titulo nota="O uso comum é a parte das contas que nenhum aparelho explica. Dá para trocar depois, em Pessoas.">
            Como a república divide o uso comum
          </Titulo>
          <EscolhaDePreset modo={escolhido} valor={presetAtual} aoMudar={setPreset} />
        </Ficha>
      )}

      <Ficha>
        <Titulo>Como chamar</Titulo>

        <div className="linha-campos">
          <Campo
            rotulo="Nome"
            valor={nome}
            aoMudar={setNome}
            placeholder={modo.nome}
            largura="campo--medio"
            texto
          />
          <Campo
            rotulo={modo.palavras.Pessoas}
            valor={pessoas}
            aoMudar={setPessoas}
            placeholder={String(modo.moradores)}
            largura="campo--minimo"
            tipoDeTeclado="numeric"
          />
        </div>

        <p className="dica">{modo.nota}</p>

        <div className="linha-acoes">
          <Botao aoClicar={criar}>Criar {modo.palavras.conjunto}</Botao>
          {podeCancelar && (
            <Botao tipo="fantasma" aoClicar={aoCancelar}>
              Cancelar
            </Botao>
          )}
        </div>

        <p className="nota">
          O nome serve só para você achar este conjunto de novo na lista. Dá
          para mudar depois.
        </p>
      </Ficha>
    </div>
  );
}

export function RotuloDoModo({ chave }) {
  const modo = modoDe(chave);
  return <span className="selo selo--modo">{modo.nome}</span>;
}
