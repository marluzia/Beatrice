import { useState } from "react";
import { AjudaContas } from "./ajudas.jsx";
import { Botao, Campo, CampoData, Ficha, Rotulo, Segmentado, Titulo } from "../componentes/index.js";
import { MESES, reais, tarifa } from "../nucleo/formato.js";
import {
  consumoDaFatura,
  consumoMedido,
  tarifaDaFatura,
  totalDaFatura,
  valorDoConsumo,
} from "../nucleo/adaptador.js";
import {
  LIMITES_DO_CICLO,
  cicloValido,
  diasDaJanela,
  distanciaEmDias,
  faturaAtiva,
  janelaPreenchida,
  janelaValida,
  temCicloInvalido,
} from "../nucleo/calendario.js";

const SUGESTOES = {
  luz: [
    { nome: "Energia elétrica", comportamento: "consumo" },
    { nome: "Iluminação pública", comportamento: "igual" },
    { nome: "Custo de disponibilidade", comportamento: "igual" },
    { nome: "Energia compensada", comportamento: "consumo" },
    { nome: "Energia SCEE isenta", comportamento: "consumo" },
    { nome: "Energia injetada (crédito)", comportamento: "abatimento" },
  ],
  agua: [
    { nome: "Tarifa água", comportamento: "consumo" },
    { nome: "Coleta / afastamento esgoto", comportamento: "consumo" },
    { nome: "Tratamento esgoto", comportamento: "consumo" },
    { nome: "Custo mínimo fixo", comportamento: "igual" },
    { nome: "Parcelamento / juros", comportamento: "igual" },
  ],
};

function Linha({ qual, linha, unidade, acoes }) {
  const nome = linha.nome || "linha";
  const editar = (campo, valor) => acoes.editarLinha(qual, linha.id, campo, valor);

  return (
    <div className="linha-fatura">
      <input
        type="text"
        className="caixa caixa--texto"
        value={linha.nome}
        placeholder="Nome na fatura"
        aria-label="Nome da linha"
        onChange={(e) => editar("nome", e.target.value)}
      />
      <div className="linha-fatura__baixo">
        <input
          type="text"
          inputMode="decimal"
          className="caixa linha-fatura__quantidade"
          value={linha.quantidade ?? ""}
          placeholder={unidade}
          aria-label={`Quantidade de ${nome} em ${unidade}`}
          onChange={(e) => editar("quantidade", e.target.value)}
        />
        <input
          type="text"
          inputMode="decimal"
          className="caixa linha-fatura__valor"
          value={linha.valor}
          placeholder="R$"
          aria-label={`Valor de ${nome}`}
          onChange={(e) => editar("valor", e.target.value)}
        />
        <Segmentado
          rotuloDoGrupo={`Comportamento de ${nome}`}
          opcoes={[
            { valor: "consumo", texto: "acompanha o consumo" },
            { valor: "abatimento", texto: "abate o consumo" },
            { valor: "igual", texto: "divide igual" },
          ]}
          valor={linha.comportamento}
          aoMudar={(v) => editar("comportamento", v)}
        />
        <button
          type="button"
          className="linha-fatura__remover"
          aria-label={`Remover ${nome}`}
          onClick={() => acoes.removerLinha(qual, linha.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function CicloDeLeitura({ qual, titulo, fatura, periodo, acoes }) {
  const janela = fatura.janela ?? null;

  const [malEscrita, setMalEscrita] = useState({});

  const definir = (campo, valor) =>
    acoes.definirFatura(qual, "janela", { ...(janela ?? {}), [campo]: valor || null });

  const marcar = (campo, ruim) => setMalEscrita((m) => ({ ...m, [campo]: ruim }));

  const vazio = !janela?.de && !janela?.ate;
  const completa = janelaPreenchida(janela);
  const escritaRuim = Boolean(malEscrita.de || malEscrita.ate);
  const dias = completa && janelaValida(janela) ? distanciaEmDias(janela.de, janela.ate) : 0;

  let selo = `${diasDaJanela(null, periodo)} dias (do mês)`;
  let erro = false;

  if (escritaRuim) {
    selo = "ERRO: Data inválida";
    erro = true;
  } else if (completa && !janelaValida(janela)) {
    selo = "ERRO: Data final antes da inicial";
    erro = true;
  } else if (completa && !cicloValido(janela)) {
    selo = `${dias} dias. Ciclo tem entre ${LIMITES_DO_CICLO.minimo} e ${LIMITES_DO_CICLO.maximo}`;
    erro = true;
  } else if (completa) {
    selo = `${dias} dias`;
  } else if (!vazio) {
    selo = `PERÍODO ${titulo.toUpperCase()}`;
  }

  return (
    <div className="ciclo">
      <span className="ciclo-nome">{titulo}</span>
      <CampoData
        valor={janela?.de ?? null}
        aoMudar={(v) => definir("de", v)}
        aoInvalidar={(ruim) => marcar("de", ruim)}
        etiqueta={`Leitura anterior da ${titulo.toLowerCase()}`}
      />
      <span className="ciclo-seta" aria-hidden="true">
        →
      </span>
      <CampoData
        valor={janela?.ate ?? null}
        aoMudar={(v) => definir("ate", v)}
        aoInvalidar={(ruim) => marcar("ate", ruim)}
        etiqueta={`Leitura atual da ${titulo.toLowerCase()}`}
      />
      <span className={`selo ${erro ? "selo--erro" : ""}`} role={erro ? "alert" : undefined}>
        {selo}
      </span>
    </div>
  );
}

function BlocoDeFatura({ qual, titulo, fatura, acoes }) {
  const unidade = fatura.unidade === "kwh" ? "kWh" : "m³";

  const jaLancadas = new Set(fatura.linhas.map((l) => l.nome.trim().toLowerCase()));
  const porUsar = SUGESTOES[qual].filter((s) => !jaLancadas.has(s.nome.toLowerCase()));

  const somado = consumoMedido(fatura);
  const consumoEmReais = valorDoConsumo(fatura);
  const preco = tarifaDaFatura(fatura);
  const total = totalDaFatura(fatura);

  return (
    <div className="bloco-fatura">
      <h3>{titulo}</h3>

      <div className="consumo-somado">
        <span className="rotulo rotulo-solto">Consumo faturado</span>
        {somado > 0 ? (
          <>
            <strong>
              {somado.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {unidade}
            </strong>
            <em>somado das quantidades das linhas</em>
          </>
        ) : (
          <>
            <strong className="consumo-somado--vazio">— {unidade}</strong>
            <em>
              preencha a quantidade nas linhas de consumo abaixo
            </em>
          </>
        )}
      </div>

      <div className="grupo">
        <Rotulo>Linhas da fatura</Rotulo>

        {fatura.linhas.length === 0 ? (
          <p className="dica">
            Copie cada linha da fatura com a quantidade e o valor. "Abate o
            consumo" é para crédito de energia compensada: o valor entra
            negativo, mas a quantidade não soma de novo, é a mesma energia da
            linha que ele abate.
          </p>
        ) : (
          <div className="lista-linhas">
            {fatura.linhas.map((linha) => (
              <Linha
                key={linha.id}
                qual={qual}
                linha={linha}
                unidade={unidade}
                acoes={acoes}
              />
            ))}
          </div>
        )}

        <div className="linha-acoes">
          {porUsar.map((s) => (
            <button
              key={s.nome}
              type="button"
              className="botao botao--catalogo"
              onClick={() => acoes.adicionarLinha(qual, s.nome, s.comportamento)}
            >
              + {s.nome}
            </button>
          ))}
          <button
            type="button"
            className="botao botao--catalogo"
            onClick={() => acoes.adicionarLinha(qual)}
          >
            + outra
          </button>
        </div>
      </div>

      {(total !== 0 || consumoEmReais !== 0) && (
        <div className="resumo-fatura">
          {preco !== 0 && (
            <p className="tarifa tarifa--viva">
              R$ {tarifa(preco)} por {unidade}
              <span className="resumo-fatura__nota">
                preço efetivo do mês, já com impostos e créditos: não é a
                tarifa impressa na fatura
              </span>
            </p>
          )}
          <p className="total-fatura">
            Total da fatura: <strong>R$ {reais(total)}</strong>
            <span>confira com o valor a pagar</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default function PassoContas({ estado, acoes }) {
  const { mes, ano } = estado.periodo;

  const indefinido = temCicloInvalido(estado.faturas);

  return (
    <div className="coluna">
      <Ficha>
        <Titulo>
          Contas e Período
        </Titulo>

        <div className="grupo">
          <Rotulo>Quais contas você tem neste fechamento</Rotulo>
          <p className="dica">
            Desativar uma fatura afeta o cálculo de um aparelho que depende de seus dados. 
          </p>
          <div className="linha-acoes">
            {[
              ["luz", "Energia elétrica"],
              ["agua", "Água"],
            ].map(([qual, nome]) => {
              const ligada = faturaAtiva(estado.faturas[qual]);
              return (
                <button
                  key={qual}
                  type="button"
                  className={`botao botao--catalogo ${ligada ? "botao--ligado" : ""}`}
                  aria-pressed={ligada}
                  onClick={() => acoes.definirFatura(qual, "ativa", !ligada)}
                >
                  {ligada ? "✓" : "○"} {nome}
                </button>
              );
            })}
          </div>
          {!faturaAtiva(estado.faturas.luz) && !faturaAtiva(estado.faturas.agua) && (
            <p className="dica">
              Sem nenhuma das duas, sobram apenas as despesas em reais.
            </p>
          )}
        </div>

        <div className="grupo">
          <Rotulo>Qual Período considerado</Rotulo>
          <p className="periodo-deduzido">
            {indefinido ? (
              <strong>Fechamento indefinido</strong>
            ) : (
              <>
                Fechamento de{" "}
                <strong>
                  {MESES[mes - 1]} de {ano}
                </strong>
              </>
            )}
          </p>
          <p className="dica">
            Cada fatura tem o seu ciclo de leitura, com datas inicial e final impressas.
          </p>
          <div className="ciclos">
            {faturaAtiva(estado.faturas.luz) && (
              <CicloDeLeitura
                qual="luz"
                titulo="Luz"
                fatura={estado.faturas.luz}
                periodo={estado.periodo}
                acoes={acoes}
              />
            )}
            {faturaAtiva(estado.faturas.agua) && (
              <CicloDeLeitura
                qual="agua"
                titulo="Água"
                fatura={estado.faturas.agua}
                periodo={estado.periodo}
                acoes={acoes}
              />
            )}
          </div>
        </div>
      </Ficha>

      <Ficha>
        <Titulo>
          Faturas
          <AjudaContas />
        </Titulo>
        <div className="grade-faturas">
          {faturaAtiva(estado.faturas.luz) && (
            <BlocoDeFatura qual="luz" titulo="Luz" fatura={estado.faturas.luz} acoes={acoes} />
          )}
          {faturaAtiva(estado.faturas.agua) && (
            <BlocoDeFatura qual="agua" titulo="Água" fatura={estado.faturas.agua} acoes={acoes} />
          )}
        </div>
      </Ficha>
    </div>
  );
}
