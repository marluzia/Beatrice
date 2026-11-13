import { Ficha, Rotulo, Titulo } from "../componentes/index.js";
import { itensPorGrupo } from "../nucleo/catalogo.js";
import CartaoItem from "./CartaoItem.jsx";
import { AjudaItens } from "./ajudas.jsx";
import MensagemDeColeta from "./MensagemDeColeta.jsx";
import { GRUPOS_DA_SECAO, mostra } from "./secoes.js";

/**
 * O que o conjunto gasta.
 *
 * Cada grupo vem com o título que diz se o dinheiro sai do ciclo de faturas
 * (tem teto) ou corre por fora dele (soma por cima); logo abaixo do título, os
 * botões de adicionar daquele grupo; e depois os itens, em pilha: o último
 * adicionado fica mais perto dos botões.
 *
 * Os dois grupos aparecem um de cada vez ("Continuar" passa do que sai da
 * fatura para o que não sai), e a mensagem de coleta vem depois deles.
 * Num evento é um grupo só, com as categorias de despesa.
 */
export default function PassoItens({ estado, resultado, indicePorId, acoes, modo, secao }) {
  // Sem faturas (evento, temporada), toda despesa é em reais e é um grupo só.
  const evento = modo?.faturas === false;
  const gruposDaSecao = GRUPOS_DA_SECAO[secao] ?? [];
  const grupos = itensPorGrupo(estado.itens, modo, true).filter(
    (g) => evento || !secao || gruposDaSecao.includes(g.grupo),
  );
  const mostraItens = mostra(secao, "despesas", "fatura", "independente", "aparelhos");
  const vazio = grupos.every((g) => g.itens.length === 0);

  return (
    <div className="coluna">
      {mostraItens && (
        <Ficha>
          <Titulo nota="Todo item pode ser renomeado e duplicado depois de adicionado.">
            {/* A ajuda fala de faturas e uso comum: sem faturas, não se aplica. */}
            {!evento && <AjudaItens />}
            O que o conjunto gasta
          </Titulo>

          {grupos.map((g) => (
            <div className="grupo-catalogo" key={g.grupo}>
              <Rotulo>{g.grupo}</Rotulo>

              <div className="grade-catalogo">
                {g.modelos.map((modelo) => (
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

              {/* Em pilha: o último adicionado fica logo embaixo dos botões. */}
              {g.itens.length > 0 && (
                <div className="lista-itens">
                  {[...g.itens].reverse().map((i) => (
                    <CartaoItem
                      key={i.id}
                      item={i}
                      moradores={estado.moradores}
                      indicePorId={indicePorId}
                      resultado={resultado}
                      periodo={estado.periodo}
                      ciclos={estado.ciclos}
                      corte={estado.corte}
                      acoes={acoes}
                      modo={modo}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {vazio && (
            <p className="vazio">
              {evento
                ? "Nenhuma despesa ainda. Adicione pelas categorias acima."
                : secao === "fatura" || secao === "aparelhos"
                  ? "Nenhum item que sai da fatura. Sem eles, as faturas inteiras dividem por dias contados."
                  : secao === "independente"
                    ? "Nenhuma despesa por fora das faturas. Toque em Continuar se não houver."
                    : "Nenhum item. As faturas inteiras vão dividir por dias contados."}
            </p>
          )}
        </Ficha>
      )}

      {mostra(secao, "coleta") && <MensagemDeColeta estado={estado} />}
    </div>
  );
}
