import { useState } from "react";
import { Botao, Ficha, Titulo } from "../componentes/index.js";

const CHAVE_PIX = "marialuziasodre@hotmail.com";

export default function Apoio({ resultado }) {
  const [copiado, setCopiado] = useState(false);

  if (resultado.moradores.length === 0) return null;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(CHAVE_PIX);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <Ficha>
      <Titulo nota="O CDR é desenvolvido de forma independente e continua em evolução. Se ele facilitou o fechamento das contas da sua casa, uma contribuição ajuda a manter o projeto de pé.">
        Gostou do CDR? 💖
      </Titulo>

      <p className="apoio-chave">{CHAVE_PIX}</p>

      <div className="linha-acoes">
        <Botao tipo="fantasma" aoClicar={copiar}>
          {copiado ? "copiado" : "copiar chave PIX"}
        </Botao>
      </div>

      <p className="apoio-rodape">Contribuição voluntária · qualquer valor ajuda</p>
    </Ficha>
  );
}