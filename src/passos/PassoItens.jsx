import { Ficha, Rotulo, Titulo } from "../componentes/index.js";
import { CATALOGO } from "../nucleo/catalogo.js";
import CartaoItem from "./CartaoItem.jsx";
import { AjudaItens } from "./ajudas.jsx";
import MensagemDeColeta from "./MensagemDeColeta.jsx";

export default function PassoItens({ estado, resultado, indicePorId, acoes }) {
  return (
    <div className="coluna">
      <Ficha>
        <Titulo nota="Itens de luz e água são retirados das faturas antes do rateio comum, então têm teto. Itens em reais somam por cima e não têm teto nenhum. 
        Alguns itens, como máquinas de lavar, geladeiras e ar-condicionado têm métricas de gastos por mês ou ciclo disponibilizadas pelo fabricante. Insira-os nos campos indicados se deseja um cáclulo mais específico. 
        A categoria por uso, em 'como divide', aceita números decimais que compreendem partes de 1 uso compartilhado entre duas ou mais pessoas.">
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

      <AjudaItens />

      <MensagemDeColeta estado={estado} />
    </div>
  );
}
