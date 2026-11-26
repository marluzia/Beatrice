import { CabecalhoDaSecao, rotuloDaAba } from "../componentes/CabecalhoDoConjunto.jsx";
import { ItensDoConjunto } from "./Configurar.jsx";

/**
 * Itens: os aparelhos que saem das faturas e, na Multi, os equipamentos que
 * não saem de fatura nenhuma. São eles que recebem os registros de uso.
 */
export default function Itens({ app }) {
  const { voltar, modo } = app;
  return (
    <div className="tela">
      <CabecalhoDaSecao app={app} secao="Registros" subsecao="Itens" />
      <p className="texto-apoio">
        Itens e aparelhos que consomem kWh ou m³ e saem das faturas: geladeira, máquina de lavar, ar-condicionado,
        chuveiro.
        {modo.equipamentos
          ? " E os equipamentos que não saem de fatura nenhuma, como embarcações, jet ski e gerador, com custo por hora ou por uso."
          : ""}{" "}
        São eles que recebem os registros de uso.
      </p>
      <ItensDoConjunto app={app} />
    </div>
  );
}
