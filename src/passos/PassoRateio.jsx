import { useState } from "react";
import { Alerta, Botao, Ficha, Titulo } from "../componentes/index.js";
import { corDe, nomeOu, reais } from "../nucleo/formato.js";
import { lavagensForaDoCiclo, totalDaFatura } from "../nucleo/adaptador.js";
import { montarRelatorio, nomeDoArquivo } from "../nucleo/relatorio.js";
import RelatorioImpresso from "./RelatorioImpresso.jsx";
import Regua from "./Regua.jsx";
import Apoio from "./Apoio.jsx";
import { AjudaCentavos } from "./ajudas.jsx";

export default function PassoRateio({ estado, resultado, indicePorId, acoes }) {
  const [abertos, setAbertos] = useState({});
  const fecha = Math.abs(resultado.diferenca) < 0.005;

  const centavos = resultado.residuoDeCentavos;
  const sobrouCentavo = fecha && centavos !== 0;
  const quantos =
    Math.abs(centavos) === 1 ? "1 centavo" : `${Math.abs(centavos)} centavos`;

  const veredito = !fecha
    ? `diferença de R$ ${reais(resultado.diferenca)}`
    : sobrouCentavo
      ? centavos > 0
        ? `arredondado, falta ${quantos} para os R$ ${reais(resultado.somaDevida)} devidos`
        : `arredondado, sobra ${quantos} sobre os R$ ${reais(resultado.somaDevida)} devidos`
      : `fecha com os R$ ${reais(resultado.somaDevida)} devidos`;

  const classeDoVeredito = !fecha
    ? "veredito veredito--furado"
    : sobrouCentavo
      ? "veredito veredito--torto"
      : "veredito";

  const alternar = (id) => setAbertos((s) => ({ ...s, [id]: !s[id] }));

  const orfas = lavagensForaDoCiclo(estado);
  const orfasDe = (id) =>
    orfas.filter((o) => (o.participantes ?? [o.moradorId]).includes(id));

  const imprimir = () => window.print();

  const exportarTexto = () => {
    const texto = montarRelatorio(estado, resultado);
    const url = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeDoArquivo(estado);
    link.click();
    URL.revokeObjectURL(url);
  };

  const calibragem = Number(estado.calibragem) || 0;
  const emIgual = Math.round(calibragem * 100);
  const diaCurto = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  return (
    <div className="coluna">
      {resultado.alertas.map((a, i) => (
        <Alerta key={i} nivel={a.nivel}>
          {a.texto}
        </Alerta>
      ))}

      <Ficha>
        <Titulo nota="Traz tudo: as faturas linha a linha, os dias contados de cada um em cada conta, os dias fora, os usos por data e os avisos do que fica para o próximo fechamento.">
          Relatório completo
        </Titulo>
        <div className="linha-acoes">
          <Botao aoClicar={imprimir}>Exportar em PDF</Botao>
          <Botao tipo="fantasma" aoClicar={exportarTexto}>
            Baixar em texto
          </Botao>
        </div>
        <p className="dica">
          O PDF abre a janela de impressão do navegador: escolha "Salvar como PDF" no
          destino. O texto serve para conferir linha a linha ou colar no grupo da casa.
        </p>
      </Ficha>

      <Ficha>
        <Titulo nota="A parte da luz e da água que nenhum aparelho explica. Arraste para ver o efeito de dividir por dias ou por igual.">
          Calibrar o uso comum
        </Titulo>
        <div className="calibragem">
          <span className="calibragem__ponta">por dias</span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={emIgual}
            className="calibragem__barra"
            aria-label="Quanto do uso comum divide por igual"
            onChange={(e) => acoes.definirCalibragem(Number(e.target.value) / 100)}
          />
          <span className="calibragem__ponta">por igual</span>
        </div>
        <p className="dica">
          {emIgual === 0
            ? "Tudo pelos dias em casa: quem viajou paga menos."
            : emIgual === 100
              ? "Tudo por igual: os dias em casa deixam de contar no uso comum."
              : `${100 - emIgual}% por dias em casa, ${emIgual}% por igual.`}
        </p>
      </Ficha>

      <Ficha>
      <AjudaCentavos />
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

                  {orfasDe(m.moradorId).map((o) => (
                    <p className="detalhe-nota" key={`${o.itemId}-${o.dia}`}>
                      {o.item} em {diaCurto(o.dia)}:{" "}
                      {o.quando === "futuro"
                        ? `a ${o.faltando === "luz" ? "energia" : "água"} desse dia vem na próxima fatura e não está cobrada aqui. Marque o mesmo dia no fechamento do mês que vem.`
                        : `a ${o.faltando === "luz" ? "energia" : "água"} desse dia entrou na fatura anterior, que já foi fechada. Aqui não é cobrada de novo.`}
                    </p>
                  ))}
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
            ["Fatura de luz", totalDaFatura(estado.faturas.luz)],
            ["Fatura de água", totalDaFatura(estado.faturas.agua)],
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
      <Apoio resultado={resultado} />

      <RelatorioImpresso estado={estado} resultado={resultado} />
    </div>
  );
}
