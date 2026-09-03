import { useState } from "react";
import {
  Alerta,
  Botao,
  Campo,
  Pastilha,
  Rotulo,
  Segmentado,
  Seletor,
  SeletorDeDia,
} from "../componentes/index.js";
import { corDe, nomeOu, reais } from "../nucleo/formato.js";
import {
  eventosDe,
  faltaParaItem,
  orfasDoItem,
  parteNoEvento,
  rateiosDoItem,
  totalDeclaradoPorHora,
} from "../nucleo/adaptador.js";
import {
  diasSemSobreposicao,
  faturaAtiva,
  janelaTotal,
  ultimoDiaDaJanela,
} from "../nucleo/calendario.js";

const NOMES_DOS_RATEIOS = {
  igual: "igual",
  dias: "por dias",
  presenca: "por presença",
  uso: "por uso",
};

const EXPLICACOES_DOS_RATEIOS = {
  dias: "Cada um paga na proporção dos dias que passou em casa.",
  presenca: "O custo de cada dia é dividido entre quem estava em casa naquele dia. Quem ficou sozinho num dia paga aquele dia inteiro — é o certo para aparelho que gasta o mesmo com uma ou com várias pessoas.",
};

function dicaDoItem(item, temLuz, temAgua) {
  if (item.especie !== "porUso" || item.origemUso !== "fatura") return item.dica;

  const contas = [temLuz && "luz", temAgua && "água"].filter(Boolean);
  if (contas.length === 0) return item.dica;

  const quais = contas.join(" e ");
  const metricas = contas.length === 2 ? "as métricas de energia e água" : `a métrica de ${quais}`;

  return `Cada ciclo puxa ${quais} da fatura. Insira ${metricas} por ciclo da máquina. Cada um paga pelas lavagens que fez. Uma lavagem por uso entre duas pessoas conta 0,5 para cada.`;
}

export default function CartaoItem({
  item,
  moradores,
  indicePorId,
  resultado,
  periodo,
  faturas,
  acoes,
}) {
  const [aberto, setAberto] = useState(false);

  const calculado = resultado.itens.find((x) => x.id === item.id);
  const set = (campo, valor) => acoes.editarItem(item.id, campo, valor);
  const rateios = rateiosDoItem(item);

  const porFatura = item.especie === "porUso" && item.origemUso === "fatura";

  const temLuz = faturaAtiva(faturas?.luz);
  const temAgua = faturaAtiva(faturas?.agua);
  const escolheUnidade = temLuz && temAgua;

  const diasSoltos = diasSemSobreposicao(faturas, periodo);

  const dica = dicaDoItem(item, temLuz, temAgua);

  const eventos = eventosDe(item);

  const [porData, setPorData] = useState(porFatura);
  const datado = porFatura && (eventos.length > 0 || porData);

  const totalDeUsos = (item.participantes ?? []).reduce((soma, id) => {
    if (eventos.length > 0) return soma + eventos.reduce((s, e) => s + parteNoEvento(e, id), 0);
    return soma + (Number(item.usosPorPessoa?.[id]) || 0);
  }, 0);

  const trocarEventos = (lista) => set("eventos", lista);

  const adicionarEvento = () => {
    const limite = janelaTotal(faturas, periodo);
    trocarEventos([
      ...eventos,
      {
        id: `ev${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        data: limite.de,
        quantidade: "1",
        participantes: [],
      },
    ]);
  };

  const editarEvento = (id, campo, valor) =>
    trocarEventos(eventos.map((e) => (e.id === id ? { ...e, [campo]: valor } : e)));

  const alternarNoEvento = (id, moradorId) =>
    trocarEventos(
      eventos.map((e) => {
        if (e.id !== id) return e;
        const dentro = e.participantes.includes(moradorId);
        return {
          ...e,
          participantes: dentro
            ? e.participantes.filter((x) => x !== moradorId)
            : [...e.participantes, moradorId],
        };
      }),
    );

  const removerEvento = (id) => trocarEventos(eventos.filter((e) => e.id !== id));

  const voltarAosTotais = () => {
    trocarEventos([]);
    setPorData(false);
  };

  const orfas = porFatura ? orfasDoItem(item, faturas, periodo) : [];

  const nomeDe = (id) => {
    const m = moradores.find((x) => x.id === id);
    return m ? nomeOu(m.nome, indicePorId[id]) : "alguém";
  };
  const diaCurto = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  const oQueFalta = (o) => (o.faltando === "luz" ? "energia" : "água");

  const falta = faltaParaItem(item, faturas);
  const bloqueado = falta.length > 0;

  return (
    <div className="cartao-item">
      <div className="item-topo">
        <input
          type="text"
          className="item-nome"
          value={item.nome}
          aria-label="Nome do item"
          onChange={(e) => set("nome", e.target.value)}
        />
        <span className="item-valor">
          {calculado ? `R$ ${reais(calculado.custoTotal)}` : "—"}
        </span>
        <button
          type="button"
          className="item-acao"
          aria-expanded={aberto && !bloqueado}
          disabled={bloqueado}
          onClick={() => setAberto(!aberto)}
        >
          {aberto && !bloqueado ? "fechar" : "ajustar"}
        </button>
        <button
          type="button"
          className="item-acao item-acao--remover"
          aria-label={`Remover ${item.nome}`}
          onClick={() => acoes.removerItem(item.id)}
        >
          ×
        </button>
      </div>

      {bloqueado && (
        <p className="item-falta">
          Falta {falta.join(" e ")} — lance em Contas para este item entrar na conta.
        </p>
      )}

      {aberto && !bloqueado && (
        <div className="item-corpo">
          {dica && <p className="dica">{dica}</p>}

          <div className="linha-campos">
            {item.especie === "consumo" && (
              <>
                <Campo
                  rotulo="Consumo no mês"
                  valor={item.quantidade}
                  aoMudar={(v) => set("quantidade", v)}
                  largura="campo--curto"
                  placeholder="0"
                />
                {escolheUnidade ? (
                  <Seletor
                    rotulo="Unidade"
                    valor={item.unidade}
                    aoMudar={(v) => set("unidade", v)}
                    opcoes={[
                      { valor: "kwh", texto: "kWh · sai da luz" },
                      { valor: "m3", texto: "m³ · sai da água" },
                    ]}
                    texto
                  />
                ) : (
                  <span className="selo">
                    {item.unidade === "m3" ? "m³ · sai da água" : "kWh · sai da luz"}
                  </span>
                )}
              </>
            )}

            {item.especie === "porHora" && (
              <>
                <Campo
                  rotulo="Consumo do aparelho"
                  sufixo={item.unidade === "kwh" ? "kWh/h" : "m³/h"}
                  valor={item.porHora}
                  aoMudar={(v) => set("porHora", v)}
                  largura="campo--curto"
                  placeholder="0"
                />
                <Campo
                  rotulo="Horas ligado no mês"
                  sufixo="h"
                  valor={item.horas}
                  aoMudar={(v) => set("horas", v)}
                  largura="campo--curto"
                  placeholder="0"
                />
                {escolheUnidade ? (
                  <Seletor
                    rotulo="Unidade"
                    valor={item.unidade}
                    aoMudar={(v) => set("unidade", v)}
                    opcoes={[
                      { valor: "kwh", texto: "kWh · sai da luz" },
                      { valor: "m3", texto: "m³ · sai da água" },
                    ]}
                    texto
                  />
                ) : (
                  <span className="selo">
                    {item.unidade === "m3" ? "m³ · sai da água" : "kWh · sai da luz"}
                  </span>
                )}
              </>
            )}

            {item.especie === "porUso" && (
              <>
                <Seletor
                  rotulo="Cada uso sai de"
                  valor={item.origemUso}
                  aoMudar={(v) => set("origemUso", v)}
                  opcoes={[
                    { valor: "fatura", texto: "da fatura de luz e água" },
                    { valor: "reais", texto: "do bolso, em reais" },
                  ]}
                  texto
                />
                {item.origemUso === "reais" ? (
                  <Campo
                    rotulo="Cada uso custa"
                    sufixo="R$"
                    valor={item.valorPorUso}
                    aoMudar={(v) => set("valorPorUso", v)}
                    largura="campo--curto"
                    placeholder="0,00"
                  />
                ) : (
                  <>
                    {temLuz && (
                      <Campo
                        rotulo="Cada uso gasta"
                        sufixo="kWh"
                        valor={item.kwhPorUso}
                        aoMudar={(v) => set("kwhPorUso", v)}
                        largura="campo--curto"
                      />
                    )}
                    {temAgua && (
                      <Campo
                        rotulo="Cada uso gasta"
                        sufixo="m³"
                        valor={item.m3PorUso}
                        aoMudar={(v) => set("m3PorUso", v)}
                        largura="campo--curto"
                      />
                    )}
                  </>
                )}
                {item.rateio !== "uso" && (
                  <Campo
                    rotulo="Usos no mês"
                    valor={item.usos}
                    aoMudar={(v) => set("usos", v)}
                    largura="campo--minimo"
                    placeholder="0"
                    tipoDeTeclado="numeric"
                  />
                )}
              </>
            )}

            {item.especie === "reais" && (
              <Campo
                rotulo="Valor"
                sufixo="R$"
                valor={item.valor}
                aoMudar={(v) => set("valor", v)}
                largura="campo--curto"
                placeholder="0,00"
              />
            )}
          </div>

          {item.especie === "porHora" && totalDeclaradoPorHora(item) > 0 && (
            <p className="dica">
              Dá {totalDeclaradoPorHora(item).toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
              })}{" "}
              {item.unidade === "kwh" ? "kWh" : "m³"} no mês, descontados da fatura antes do
              uso comum.
            </p>
          )}

          <div className="grupo">
            <Rotulo>Como divide</Rotulo>
            <Segmentado
              rotuloDoGrupo="Como divide"
              opcoes={rateios.map((r) => ({ valor: r, texto: NOMES_DOS_RATEIOS[r] }))}
              valor={item.rateio}
              aoMudar={(v) => set("rateio", v)}
            />
            {EXPLICACOES_DOS_RATEIOS[item.rateio] && (
              <p className="dica">{EXPLICACOES_DOS_RATEIOS[item.rateio]}</p>
            )}
          </div>

          <div className="grupo">
            <Rotulo>Quem paga</Rotulo>
            <div className="pastilhas">
              {moradores.map((m) => (
                <Pastilha
                  key={m.id}
                  cor={corDe(indicePorId[m.id])}
                  nome={nomeOu(m.nome, indicePorId[m.id])}
                  ativo={item.participantes.includes(m.id)}
                  aoClicar={() => acoes.alternarParticipante(item.id, m.id)}
                />
              ))}
            </div>
          </div>

          {item.rateio === "uso" && item.participantes.length > 0 && (
            <div className="grupo">
              <Rotulo>Usos de cada um</Rotulo>

              {orfas.length > 0 && (
                <Alerta nivel="aviso">
                  <ul className="lista-orfas">
                    {orfas.map((o) => (
                      <li key={`${o.eventoId}-${o.faltando}`}>
                        <strong>{diaCurto(o.dia)}</strong>: esse uso está fora do ciclo da
                        conta de {o.faltando === "luz" ? "luz" : "água"}, então a{" "}
                        {oQueFalta(o)} dele{" "}
                        {o.quando === "passado"
                          ? "entrou na fatura anterior, que já foi fechada. Aqui ela não é cobrada de novo."
                          : "virá na próxima fatura. Não está cobrada aqui — lance este mesmo dia no fechamento do mês que vem."}
                      </li>
                    ))}
                  </ul>
                </Alerta>
              )}

              {porFatura && (
                <Segmentado
                  rotuloDoGrupo="Como lançar os usos"
                  opcoes={[
                    { valor: "data", texto: "uso com data" },
                    { valor: "total", texto: "uso sem data" },
                  ]}
                  valor={datado ? "data" : "total"}
                  aoMudar={(v) => (v === "data" ? setPorData(true) : voltarAosTotais())}
                />
              )}

              {datado ? (
                <>
                  <p className="dica">
                    Cada lançamento é um uso que aconteceu: data, quantas vezes e quem
                    participou. Dois usos no mesmo dia são dois lançamentos, ou um com
                    quantidade 2. Uso dividido entre duas pessoas conta meio para cada.
                  </p>

                  {eventos.map((evento) => (
                    <div className="evento-uso" key={evento.id}>
                      <div className="evento-uso__topo">
                        <SeletorDeDia
                          valor={evento.data}
                          aoMudar={(v) => editarEvento(evento.id, "data", v)}
                          periodo={periodo}
                          limite={janelaTotal(faturas, periodo)}
                          etiqueta="Dia do uso"
                        />
                        <Campo
                          valor={evento.quantidade}
                          aoMudar={(v) => editarEvento(evento.id, "quantidade", v)}
                          sufixo="usos"
                          largura="campo--minimo"
                          placeholder="1"
                          rotulo="Quantas vezes"
                          rotuloSolto
                        />
                        <button
                          type="button"
                          className="linha-fatura__remover"
                          aria-label={`Remover uso de ${evento.data}`}
                          onClick={() => removerEvento(evento.id)}
                        >
                          ×
                        </button>
                      </div>

                      <div className="pastilhas">
                        {moradores
                          .filter((m) => item.participantes.includes(m.id))
                          .map((m) => (
                            <Pastilha
                              key={m.id}
                              cor={corDe(indicePorId[m.id])}
                              nome={nomeOu(m.nome, indicePorId[m.id])}
                              ativo={evento.participantes.includes(m.id)}
                              aoClicar={() => alternarNoEvento(evento.id, m.id)}
                            />
                          ))}
                      </div>

                      {evento.participantes.length === 0 && (
                        <p className="dica dica--alerta">
                          Marque quem usou. Sem ninguém, este lançamento não
                          entra na conta.
                        </p>
                      )}

                      {evento.participantes.length > 1 && (
                        <p className="dica">
                          Dividido entre {evento.participantes.length}:{" "}
                          {(
                            (Number(evento.quantidade) || 1) / evento.participantes.length
                          ).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
                          para cada.
                        </p>
                      )}
                    </div>
                  ))}

                  <Botao tipo="fantasma" aoClicar={adicionarEvento}>
                    + adicionar uso
                  </Botao>

                  <p className="dica">
                    Os usos valem de {diaCurto(janelaTotal(faturas, periodo).de)} a{" "}
                    {diaCurto(ultimoDiaDaJanela(janelaTotal(faturas, periodo)))}, que é o que
                    as faturas cobrem juntas.
                  </p>

                  <p className="dica">
                    Total lançado: {totalDeUsos.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} usos
                  </p>
                </>
              ) : (
                <>
                  <div className="linha-campos">
                    {item.participantes.map((id) => {
                      const m = moradores.find((x) => x.id === id);
                      if (!m) return null;
                      return (
                        <Campo
                          key={id}
                          rotulo={nomeOu(m.nome, indicePorId[id])}
                          valor={item.usosPorPessoa?.[id] ?? ""}
                          aoMudar={(v) => set("usosPorPessoa", { ...item.usosPorPessoa, [id]: v })}
                          largura="campo--minimo"
                          placeholder="0"
                        />
                      );
                    })}
                  </div>

                  <p className="dica">
                    Total de usos:{" "}
                    {totalDeUsos.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                  </p>

                  {porFatura && diasSoltos > 0 && (
                    <Alerta nivel="aviso">
                      Sem as datas, o CDR não sabe em que ciclo cada uso caiu. Os ciclos de
                      luz e água têm {diasSoltos} {diasSoltos === 1 ? "dia" : "dias"} que uma
                      cobre e a outra não — um uso nesses dias vai ser cobrado nas duas, e a
                      conta fica imprecisa. Lançar por data resolve.
                    </Alerta>
                  )}

                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
