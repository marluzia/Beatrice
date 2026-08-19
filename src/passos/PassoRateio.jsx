import { useState } from "react";
import { Alerta, Ficha, Titulo } from "../componentes/index.js";
import { corDe, nomeOu, num, reais } from "../nucleo/formato.js";
import Regua from "./Regua.jsx";

export default function PassoRateio({ estado, resultado, indicePorId }) {
  const [abertos, setAbertos] = useState({});
  const fecha = Math.abs(resultado.diferenca) < 0.005;
  const f = estado.faturas;

  /**
   * Três vereditos. a conta pode fechar em números e mesmo assim
   * não fechar em dinheiro: cem reais para três pessoas dá 33,33 para cada
   * uma, e 33,33 três vezes são 99,99. Dizer "fecha certinho" nesse caso é f
   */
  const centavos = resultado.residuoDeCentavos;
  const sobrouCentavo = fecha && centavos !== 0;
  const quantos =
    Math.abs(centavos) === 1 ? "1 centavo" : `${Math.abs(centavos)} centavos`;

  const veredito = !fecha
    ? `diferença de R$ ${reais(resultado.diferenca)}`
    : sobrouCentavo
      ? centavos > 0
        ? `arredondado ao centavo, falta ${quantos} para os R$ ${reais(resultado.somaDevida)} devidos`
        : `arredondado ao centavo, sobra ${quantos} sobre os R$ ${reais(resultado.somaDevida)} devidos`
      : `fecha com os R$ ${reais(resultado.somaDevida)} devidos`;

  const classeDoVeredito = !fecha
    ? "veredito veredito--furado"
    : sobrouCentavo
      ? "veredito veredito--torto"
      : "veredito";

  const alternar = (id) => setAbertos((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="coluna">
      {resultado.alertas.map((a, i) => (
        <Alerta key={i} nivel={a.nivel}>
          {a.texto}
        </Alerta>
      ))}

      <Ficha>
        <Titulo nota="Toque em uma pessoa para ver de onde veio cada centavo.">
          Quanto cada um paga
        </Titulo>
        <div>
          {resultado.moradores.map((m, i) => (
            <div className="pessoa" key={m.moradorId}>
              <button
                type="button"
                className="pessoa-linha"
                aria-expanded={!!abertos[m.moradorId]}
                onClick={() => alternar(m.moradorId)}
              >
                <span className="ponto" style={{ background: corDe(i) }} />
                <span className="pessoa-nome">{nomeOu(m.nome, i)}</span>
                <span className="pessoa-dias">{m.diasContados}d</span>
                <span className="pessoa-total">R$ {reais(m.total)}</span>
              </button>

              {abertos[m.moradorId] && (
                <div className="detalhe">
                  {m.linhas.map((l, j) => (
                    <div className="detalhe-linha" key={j}>
                      <span>{l.nome}</span>
                      <span>{reais(l.valor)}</span>
                    </div>
                  ))}
                  <div className="detalhe-resumo">
                    LUZ {reais(m.luz)} · ÁGUA {reais(m.agua)} · REAIS {reais(m.reais)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Ficha>

      <Ficha>
        <Titulo nota="Cada barra é um item inteiro. A largura de cada cor é a fatia daquela pessoa.">
          Como cada item foi dividido
        </Titulo>
        {resultado.itens.map((i) => (
          <Regua
            key={i.id}
            item={i}
            moradores={estado.moradores}
            indicePorId={indicePorId}
          />
        ))}
      </Ficha>

      <Ficha>
        <Titulo nota="As faturas têm teto: o que não foi atribuído a um aparelho virou uso comum. As despesas em reais somam por cima.">
          Conferência
        </Titulo>
        <div className="conferencia">
          {[
            ["Fatura de luz", num(f.luzValor)],
            ["Fatura de água", num(f.aguaValor)],
            ["Despesas em reais", resultado.totalEmReais],
          ].map(([rotulo, valor]) => (
            <div className="conferencia-linha" key={rotulo}>
              <span>{rotulo}</span>
              <span>{reais(valor)}</span>
            </div>
          ))}
          <div className="conferencia-total">
            <span>Cobrado dos moradores</span>
            <span>R$ {reais(resultado.somaCobrada)}</span>
          </div>
          {sobrouCentavo && (
            <div className="conferencia-linha">
              <span>Somando os valores arredondados</span>
              <span>{reais(resultado.somaCobradaArredondada)}</span>
            </div>
          )}
          <p className={classeDoVeredito}>{veredito}</p>
        </div>
      </Ficha>
    </div>
  );
}
