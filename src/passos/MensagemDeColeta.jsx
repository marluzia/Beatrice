import { useState } from "react";
import { Botao, Ficha, Titulo } from "../componentes/index.js";
import { montarMensagemDeColeta } from "../nucleo/coleta.js";

/**
 * A mensagem de coleta.
 *
 * Fica no fim do passo de itens porque só depois de a casa estar configurada
 * dá para saber o que perguntar. Sem item por uso, ninguém é perguntado sobre
 * lavagens; sem ar-condicionado, ninguém é perguntado sobre horas.
 */
export default function MensagemDeColeta({ estado }) {
  const [copiado, setCopiado] = useState(false);
  const mensagem = montarMensagemDeColeta(estado);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Navegador sem permissão de área de transferência: o texto está à
      // vista e selecionável, então dá para copiar na mão.
      setCopiado(false);
    }
  };

  return (
    <Ficha>
      <Titulo nota="Cole no grupo da casa. A mensagem pergunta só o que os itens configurados exigem, e pede que todo mundo responda no mesmo lugar, à vista de todos.">
        Juntar os dados do mês
      </Titulo>

      <pre className="mensagem-coleta">{mensagem}</pre>

      <div className="linha-acoes">
        <Botao aoClicar={copiar}>{copiado ? "copiado" : "copiar mensagem"}</Botao>
      </div>
    </Ficha>
  );
}
