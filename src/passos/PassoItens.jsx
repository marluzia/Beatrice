import { Ficha, Rotulo, Titulo } from "../componentes/index.js";
import { catalogoDe, itensPorGrupo } from "../nucleo/catalogo.js";
import CartaoItem from "./CartaoItem.jsx";
import MensagemDeColeta from "./MensagemDeColeta.jsx";

/**
 * O que a casa gasta, e o que ela pode acrescentar.
 *
 * As duas listas usam as mesmas categorias   o que sai do ciclo de faturas e o
 * que corre por fora dele. Antes a de cima era uma lista corrida e a de baixo
 * era agrupada, e a mesma despesa aparecia em lugares de formato diferente nas
 * duas. A categoria não é decoração: ela diz se o dinheiro daquele item tem
 * teto (a fatura) ou não.
 */
export default function PassoItens({ estado, resultado, indicePorId, acoes, modo }) {
  const grupos = itensPorGrupo(estado.itens, modo);

  return (
    <div className="coluna">
      <Ficha>
        <Titulo>O que a casa gasta</Titulo>

        {estado.itens.length === 0 ? (
          <p className="vazio">
            Nenhum item. As faturas inteiras vão dividir por dias contados.
          </p>
        ) : (
          grupos.map((g) => (
            <div className="grupo-catalogo" key={g.grupo}>
              <Rotulo>{g.grupo}</Rotulo>
              <div className="lista-itens">
                {g.itens.map((i) => (
                  <CartaoItem
                    key={i.id}
                    item={i}
                    moradores={estado.moradores}
                    indicePorId={indicePorId}
                    resultado={resultado}
                    periodo={estado.periodo}
                    faturas={estado.faturas}
                    acoes={acoes}
                    modo={modo}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </Ficha>

      <Ficha>
        <Titulo nota="Todo item pode ser renomeado depois de adicionado.">Adicionar</Titulo>
        {catalogoDe(modo).map((g) => (
          <div className="grupo-catalogo" key={g.grupo}>
            <Rotulo>{g.grupo}</Rotulo>
            <div className="grade-catalogo">
              {g.itens.map((modelo) => (
                <button
                  key={modelo.chave}
                  type="button"
                  className="botao--catalogo"
                  onClick={() => acoes.adicionarItem(modelo)}
                >
                  + {modelo.nome}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Ficha>

      <MensagemDeColeta estado={estado} />
    </div>
  );
}
