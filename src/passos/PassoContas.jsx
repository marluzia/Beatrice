import { Campo, Ficha, Seletor, Titulo } from "../componentes/index.js";
import { MESES, tarifa } from "../nucleo/formato.js";

export default function PassoContas({ estado, resultado, acoes }) {
  const f = estado.faturas;
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1];

  return (
    <div className="coluna">
      <Ficha>
        <Titulo nota="A data define o período de contagem.">
          Mês de referência
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
          <span className="selo">{resultado.diasNoPeriodo} dias no período</span>
        </div>
      </Ficha>

      <Ficha>
        <Titulo nota="Insira os totais impressos em cada fatura: o consumo medido e o valor cobrado. O CDR deduz a tarifa.">
          Faturas
        </Titulo>
        <div className="grade-faturas">
          <div className="bloco-fatura">
            <h3>Luz</h3>
            <Campo
              rotulo="Consumo"
              sufixo="kWh"
              valor={f.luzKwh}
              aoMudar={(v) => acoes.definirFatura("luzKwh", v)}
              placeholder="Valor em kWh"
            />
            <Campo
              rotulo="Valor da fatura"
              sufixo="R$"
              valor={f.luzValor}
              aoMudar={(v) => acoes.definirFatura("luzValor", v)}
              placeholder="Valor em R$"
            />
            <p className={resultado.tarifaLuz > 0 ? "tarifa tarifa--viva" : "tarifa"}>
              {resultado.tarifaLuz > 0
                ? `R$ ${tarifa(resultado.tarifaLuz)} por kWh`
                : "a tarifa aparece aqui"}
            </p>
          </div>

          <div className="bloco-fatura">
            <h3>Água</h3>
            <Campo
              rotulo="Consumo"
              sufixo="m³"
              valor={f.aguaM3}
              aoMudar={(v) => acoes.definirFatura("aguaM3", v)}
              placeholder="Valor em m³"
            />
            <Campo
              rotulo="Valor da fatura"
              sufixo="R$"
              valor={f.aguaValor}
              aoMudar={(v) => acoes.definirFatura("aguaValor", v)}
              placeholder="Valor em R$"
            />
            <p className={resultado.tarifaAgua > 0 ? "tarifa tarifa--viva" : "tarifa"}>
              {resultado.tarifaAgua > 0
                ? `R$ ${tarifa(resultado.tarifaAgua)} por m³`
                : "a tarifa aparece aqui"}
            </p>
          </div>
        </div>
      </Ficha>
    </div>
  );
}
