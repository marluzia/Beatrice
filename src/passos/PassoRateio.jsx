import { useState } from "react";
import { Alerta, Botao, Ficha, Titulo } from "../componentes/index.js";
import { corDe, nomeOu, reais } from "../nucleo/formato.js";
import { lavagensForaDoCiclo, totalDaFatura } from "../nucleo/adaptador.js";
import { montarRelatorio, nomeDoArquivo } from "../nucleo/relatorio.js";
import { cessaoDe } from "../nucleo/cessao.js";
import { reguaVisivel } from "../nucleo/modos.js";
import { ciclosLigados, deConta } from "../nucleo/ciclos.js";
import RelatorioImpresso from "./RelatorioImpresso.jsx";
import Regua from "./Regua.jsx";
import Acerto from "./Acerto.jsx";
import QuemCede from "./QuemCede.jsx";
import Apoio from "./Apoio.jsx";
import { AjudaCentavos } from "./ajudas.jsx";
import { mostra } from "./secoes.js";

export default function PassoRateio({ estado, resultado, indicePorId, acoes, modo, nomeDoConjunto, secao, eu = null, ir }) {
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

  // Quanto cada um deve de verdade, em centavos, com o resíduo já no colo de
  // quem cedeu. É daqui que sai o número da tela: o total solto do motor tem
  // casas decimais que ninguém consegue pagar.
  const cessao = cessaoDe(estado, resultado);
  const deveDe = (id) => (cessao.porMorador[id] ?? 0) / 100;

  // O texto do resíduo é mostrado dentro de "Quem cede". Repeti-lo no topo
  // faria a mesma frase aparecer duas vezes na mesma tela.
  const alertasGerais = resultado.alertas.filter((a) => !a.texto.includes("sistema monetário"));


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
  const temporada = modo?.presenca === "presenca";
  const diaCurto = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  return (
    <div className="coluna">
      {mostra(secao, "divisao") && (
      <>
      {/* O aviso de arredondamento sai daqui: ele agora mora dentro de "Quem
          cede", junto da decisão que pede. Os outros alertas continuam no topo
          porque não há o que decidir sobre eles nesta tela. */}
      {alertasGerais.map((a, i) => (
        <Alerta key={i} nivel={a.nivel}>
          {a.texto}
        </Alerta>
      ))}

      {/* Sem fatura não existe sobra para calibrar: num evento este cartão não
          teria o que fazer. Nos presets fechados da República (Moderada,
          Comunal, Temporal) a casa já decidiu, e a régua não aparece. */}
      {reguaVisivel(estado) && (
      <Ficha>
        <Titulo nota="A parte das contas que nenhum aparelho explica. Arraste para ponderar por dias ou por igual.">
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
            ? temporada
              ? "Tudo pelos dias de estadia: quem não foi não paga nada do uso comum."
              : "Tudo pelos dias em casa: quem viajou paga menos."
            : emIgual === 100
              ? temporada
                ? "Tudo por igual: os dias de estadia deixam de contar no uso comum."
                : "Tudo por igual: os dias em casa deixam de contar no uso comum."
              : `${100 - emIgual}% por ${temporada ? "dias de estadia" : "dias em casa"}, ${emIgual}% por igual.`}
        </p>

        {/* Numa república os dias de cada um são parecidos e a régua muda pouco.
            Num espaço de temporada ela muda a conta inteira, então o
            argumento aparece na hora em que a decisão está sendo tomada. */}
      </Ficha>
      )}

      {/* Quem cede vem antes: a escolha muda os valores logo abaixo. */}
      <QuemCede
        estado={estado}
        resultado={resultado}
        indicePorId={indicePorId}
        acoes={acoes}
      />

      <Ficha>
      <AjudaCentavos />
        <Titulo nota="O rateio do fechamento, pessoa a pessoa. Toque em uma para ver de onde veio cada centavo.">
          Quanto cada um deve
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
                <span className="pessoa-total">R$ {reais(deveDe(m.moradorId))}</span>
                {cessao.quemCede === m.moradorId && cessao.residuo !== 0 && (
                  <span className="pessoa-cedeu" title="ficou com o centavo que não fecha">
                    cede {Math.abs(cessao.residuo)}
                  </span>
                )}
              </button>

              {abertos[m.moradorId] && (
                <div className="detalhe">
                  {m.linhas.map((l, j) => (
                    <div className="detalhe-linha" key={j}>
                      <span>{l.nome}</span>
                      <span>{reais(l.valor)}</span>
                    </div>
                  ))}
                  {modo?.faturas !== false && (
                    <div className="detalhe-resumo">
                      {[
                        ...ciclosLigados(estado).map(
                          (c) => `${(c.nome || "Conta").toUpperCase()} ${reais(m.porCiclo?.[c.id] ?? 0)}`,
                        ),
                        `REAIS ${reais(m.reais)}`,
                      ].join(" · ")}
                    </div>
                  )}

                  {orfasDe(m.moradorId).map((o) => (
                    <p className="detalhe-nota" key={`${o.itemId}-${o.dia}`}>
                      {o.item} em {diaCurto(o.dia)}:{" "}
                      {o.quando === "futuro"
                        ? `a parte de ${o.nomeDoCiclo} desse dia vem na próxima fatura e não está cobrada aqui. Marque o mesmo dia no fechamento do mês que vem.`
                        : `a parte de ${o.nomeDoCiclo} desse dia entrou na fatura anterior, que já foi fechada. Aqui não é cobrada de novo.`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sem dono para o centavo, estes valores somados não dão o devido  
            e dizer isso é mais honesto do que escolher um dono em silêncio
            para a linha fechar. */}
        {cessao.precisaEscolher && (
          <p className="dica dica--alerta">
            Somados, estes valores dão R$ {reais(resultado.somaCobradaArredondada)} e o
            devido é R$ {reais(resultado.somaDevida)}. A diferença é a moeda que ainda
            não tem dono: escolha em <strong>Quem cede</strong>, acima.
          </p>
        )}
      </Ficha>
      </>
      )}

      {mostra(secao, "acerto") && (
      <Acerto
        estado={estado}
        resultado={resultado}
        indicePorId={indicePorId}
        modo={modo}
        nomeDoConjunto={nomeDoConjunto}
        travado={cessao.precisaEscolher}
        acoes={acoes}
        eu={eu}
        ir={ir}
      />
      )}

      {mostra(secao, "conferencia") && (
      <>
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
            // Num evento não há fatura nenhuma: listar luz e água zeradas é
            // encher a conferência de linha que não existe.
            ...(modo?.faturas === false
              ? []
              : ciclosLigados(estado).map((c) => [`Fatura ${deConta(c)}`, totalDaFatura(c)])),
            ["Despesas em reais", resultado.totalEmReais],
          ].map(([rotulo, valor]) => (
            <div className="conferencia-linha" key={rotulo}>
              <span>{rotulo}</span>
              <span>{reais(valor)}</span>
            </div>
          ))}
          <div className="conferencia-total">
            <span>Cobrado dos envolvidos</span>
            <span>R$ {reais(resultado.somaCobrada)}</span>
          </div>
          {/* A linha "somando os valores arredondados" saiu daqui. Ela existia
              quando não havia quem cede: mostrava a soma torta e deixava a casa
              com ela. Hoje ou alguém assumiu o centavo e a soma fecha exata, ou
              ninguém assumiu   e o que falta dizer é isso, não repetir o número
              torto. O veredito abaixo já diz as duas coisas. */}
          <p className={classeDoVeredito}>{veredito}</p>
        </div>
      </Ficha>

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
          destino. O texto serve para conferir linha a linha ou colar no grupo.
        </p>
      </Ficha>

      <Apoio resultado={resultado} />
      </>
      )}

      <RelatorioImpresso estado={estado} resultado={resultado} />
    </div>
  );
}
