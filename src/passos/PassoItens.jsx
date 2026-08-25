import { Ficha, Rotulo, Titulo } from "../componentes/index.js";
import { CATALOGO } from "../nucleo/catalogo.js";
import CartaoItem from "./CartaoItem.jsx";
import { AjudaItens } from "./ajudas.jsx";
import MensagemDeColeta from "./MensagemDeColeta.jsx";

export default function PassoItens({ estado, resultado, indicePorId, acoes }) {
  return (
    <div className="coluna">
      <Ficha>
        <Titulo>
           <AjudaItens />
          O que a casa gasta
        </Titulo>

        {estado.itens.length === 0 ? (
          <p className="vazio">
            Nenhum item. As faturas inteiras vão dividir por dias contados.
          </p>
        ) : (
          <div className="lista-itens">
            {estado.itens.map((i) => (
              <CartaoItem
                key={i.id}
                item={i}
                moradores={estado.moradores}
                indicePorId={indicePorId}
                resultado={resultado}
                acoes={acoes}
              />
            ))}
          </div>
        )}
      </Ficha>

      <Ficha>
        <Titulo nota="Todo item pode ser renomeado depois de adicionado.">Adicionar</Titulo>
        {CATALOGO.map((g) => (
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
