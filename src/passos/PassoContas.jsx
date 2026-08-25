import { AjudaContas } from "./ajudas.jsx";
import { Campo, Ficha, Rotulo, Segmentado, Seletor, Titulo } from "../componentes/index.js";
import { MESES, reais, tarifa } from "../nucleo/formato.js";
import { tarifaDaFatura, totalDaFatura, valorDoConsumo } from "../nucleo/adaptador.js";

const SUGESTOES = {
  luz: [
    { nome: "Energia elétrica", comportamento: "consumo" },
    { nome: "Iluminação pública", comportamento: "igual" },
    { nome: "Custo de disponibilidade", comportamento: "igual" },
    { nome: "Crédito de energia", comportamento: "consumo" },
  ],
  agua: [
    { nome: "Tarifa água", comportamento: "consumo" },
    { nome: "Coleta / afastamento esgoto", comportamento: "consumo" },
    { nome: "Tratamento esgoto", comportamento: "consumo" },
    { nome: "Custo mínimo fixo", comportamento: "igual" },
  ],
};

function Linha({ qual, linha, acoes }) {
  const nome = linha.nome || "linha";

  return (
    <div className="linha-fatura">
      <input
        type="text"
        className="caixa caixa--texto"
        value={linha.nome}
        placeholder="Nome na fatura"
        aria-label="Nome da linha"
        onChange={(e) => acoes.editarLinha(qual, linha.id, "nome", e.target.value)}
      />
      <div className="linha-fatura__baixo">
        <input
          type="text"
          inputMode="decimal"
          className="caixa linha-fatura__valor"
          value={linha.valor}
          placeholder="R$"
          aria-label={`Valor de ${nome}`}
          onChange={(e) => acoes.editarLinha(qual, linha.id, "valor", e.target.value)}
        />
        <Segmentado
          rotuloDoGrupo={`Comportamento de ${nome}`}
          opcoes={[
            { valor: "consumo", texto: "acompanha o consumo" },
            { valor: "igual", texto: "divide igual" },
          ]}
          valor={linha.comportamento}
          aoMudar={(v) => acoes.editarLinha(qual, linha.id, "comportamento", v)}
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

function BlocoDeFatura({ qual, titulo, fatura, acoes }) {
  const unidade = fatura.unidade === "kwh" ? "kWh" : "m³";
  const consumoEmReais = valorDoConsumo(fatura);
  const preco = tarifaDaFatura(fatura);
  const total = totalDaFatura(fatura);

  return (
    <div className="bloco-fatura">
      <h3>{titulo}</h3>

      <Campo
        rotulo="Consumo faturado"
        sufixo={unidade}
        valor={fatura.consumo}
        aoMudar={(v) => acoes.definirFatura(qual, "consumo", v)}
        placeholder={`Quantidade em ${unidade}`}
      />

      <div className="grupo">
        <Rotulo>Linhas da fatura</Rotulo>

        {fatura.linhas.length === 0 ? (
          <p className="dica">
            Copie os valores de taxas (+) ou bônus (-) das linhas e selecione o que for justo.
          </p>
        ) : (
          <div className="lista-linhas">
            {fatura.linhas.map((linha) => (
              <Linha key={linha.id} qual={qual} linha={linha} acoes={acoes} />
            ))}
          </div>
        )}

        <div className="linha-acoes">
          {SUGESTOES[qual].map((s) => (
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
                confira com o preço impresso na fatura: se não bater, alguma
                linha ficou de fora
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

export default function PassoContas({ estado, resultado, acoes }) {
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1];
  const diasInformados = estado.periodo.dias;

  return (
    <div className="coluna">
      <Ficha>
        <Titulo nota="O mês nomeia o fechamento. Os dias vêm do ciclo de leitura da fatura, que raramente bate com o calendário.">
          Período
        </Titulo>
        <div className="linha-campos">
          <Seletor
            rotulo="Mês"
            valor={estado.periodo.mes}
            aoMudar={(v) => acoes.definirPeriodo("mes", v)}
            opcoes={MESES.map((m, i) => ({ valor: i + 1, texto: m }))}
            largura="campo--curto"
            texto
          />
          <Seletor
            rotulo="Ano"
            valor={estado.periodo.ano}
            aoMudar={(v) => acoes.definirPeriodo("ano", v)}
            opcoes={anos.map((a) => ({ valor: a, texto: String(a) }))}
            largura="campo--minimo"
          />
          <Campo
            rotulo="Dias entre leituras"
            sufixo="dias"
            valor={diasInformados ?? ""}
            aoMudar={(v) => acoes.definirPeriodo("dias", v)}
            placeholder={String(resultado.diasNoPeriodo)}
            largura="campo--minimo"
          />
          <span className="selo">
            {resultado.diasNoPeriodo} dias {diasInformados ? "(da fatura)" : "(do mês)"}
          </span>
        </div>
      </Ficha>

      <Ficha>
        <Titulo>
          Faturas
          <AjudaContas />
        </Titulo>
        <div className="grade-faturas">
          <BlocoDeFatura qual="luz" titulo="Luz" fatura={estado.faturas.luz} acoes={acoes} />
          <BlocoDeFatura qual="agua" titulo="Água" fatura={estado.faturas.agua} acoes={acoes} />
        </div>
      </Ficha>
    </div>
  );
}
