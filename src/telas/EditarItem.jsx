import { mostrarAviso, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import CartaoItem from "../passos/CartaoItem.jsx";
import { ehEquipamento } from "../nucleo/catalogo.js";

/**
 * Editar item (seção Itens): um aparelho ou equipamento sozinho, no
 * cartão de sempre. É configuração do conjunto, não lançamento: o que muda
 * vale na hora. Uma despesa se edita em Editar despesa.
 */
export default function EditarItem({ app, rota }) {
  const { estado, resultado, indicePorId, modo, acoes, voltar, nomeDoConjunto } = app;
  const item = estado.itens.find((i) => i.id === rota?.id);

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito partes={[nomeDoConjunto, "Itens"]} />
      <h1 className="titulo-tela titulo-tela--grande">
        {rota?.novo ? "Novo" : "Editar"} <em>item</em>
      </h1>

      {!item ? (
        <p className="vazio-suave">Este item não existe mais.</p>
      ) : (
        <>
          <p className="texto-apoio">
            {ehEquipamento(item)
              ? "As características deste item avulso: em que unidades ele é cobrado e o preço de cada uma. Cada registro de uso vira uma despesa registrada, no preço da unidade vezes a quantidade."
              : "As características deste item: de quais contas ele puxa e quanto gasta por mês, por hora ou por uso. Cada registro de uso vira uma despesa registrada, valorada pelo preço do kWh ou do m³ de cada fatura ligada, e é descontada dela; o que sobra da fatura é o uso comum."}{" "}
            O que muda aqui vale na hora, para todos os registros deste item.
          </p>
          <CartaoItem
            item={item}
            moradores={estado.moradores}
            indicePorId={indicePorId}
            resultado={resultado}
            periodo={estado.periodo}
            ciclos={estado.ciclos}
            corte={estado.corte}
            acoes={acoes}
            modo={modo}
            sozinho
            soConfiguracao
          />
          <button
            type="button"
            className="apagar-lancamento"
            onClick={() => {
              if (!window.confirm(`Apagar ${item.nome || "este item"}? Os registros dele saem junto.`)) return;
              acoes.removerItem(item.id);
              voltar();
              mostrarAviso("Item apagado.");
            }}
          >
            Apagar este item
          </button>
        </>
      )}

      <div className="rodape-fixo">
        <button type="button" className="botao botao--largo" onClick={voltar}>
          Pronto
        </button>
      </div>
    </div>
  );
}
