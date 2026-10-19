import { useState } from "react";
import {
  Alerta,
  Botao,
  Campo,
  CampoData,
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
import {
  aoMudarFim,
  aoMudarInicio,
  telaDoQuando,
  trocaDeFormato,
} from "../nucleo/quandoFoi.js";

const NOMES_DOS_RATEIOS = {
  igual: "igual",
  dias: "por dias",
  presenca: "por presença",
  uso: "por uso",
  horas: "por horas",
  porcentagem: "%",
  valor: "R$",
};

const EXPLICACOES_DOS_RATEIOS = {
  igual: "Todo mundo marcado paga a mesma fatia, não importa quanto usou nem quanto tempo ficou.",
  dias: "Cada um paga na proporção dos dias que passou em casa.",
  presenca:
    "O custo de cada dia é dividido entre quem estava em casa naquele dia. Quem ficou sozinho num dia paga aquele dia inteiro. É uma opção para aparelho que gasta o mesmo com uma ou com várias pessoas.",
  uso: "Cada um paga pelas vezes que usou. Um uso dividido entre duas pessoas conta meio para cada.",
  horas:
    "Cada um paga pelas horas que usou. Serve para o que é cobrado por tempo de funcionamento   ar-condicionado, hora de motor.",
  porcentagem: "Cada um declara a própria fatia. Deveria somar 100%.",
  valor:
    "Cada um declara quanto paga, em reais. Esta é a única divisão em que o número é o valor final: a soma precisa bater com o custo do item.",
};

/** As divisões em que cada participante escreve o próprio número. */
const TABELAS = {
  porcentagem: { campo: "porcentagens", sufixo: "%", teclado: "decimal", passo: "qualquer" },
  valor: { campo: "valores", sufixo: "R$", teclado: "decimal", passo: "qualquer" },
  uso: { campo: "usosPorPessoa", sufixo: "usos", teclado: "numeric", passo: "inteiro" },
  horas: { campo: "usosPorPessoa", sufixo: "h", teclado: "decimal", passo: "qualquer" },
};

/**
 * De quais faturas este item puxa dinheiro.
 *
 * Serve para dizer quem pagou um item que sai da fatura: quem pagou aquilo foi
 * quem pagou a conta de onde ele sai, e essa informação já existe em Contas.
 */
function contasDoItem(item, temLuz, temAgua) {
  if (item.especie === "porUso" && item.origemUso === "fatura") {
    return [
      temLuz && Number(String(item.kwhPorUso).replace(",", ".")) > 0 && "luz",
      temAgua && Number(String(item.m3PorUso).replace(",", ".")) > 0 && "agua",
    ].filter(Boolean);
  }

  if (item.especie === "consumo" || item.especie === "porHora") {
    return [item.unidade === "m3" ? "agua" : "luz"];
  }

  return [];
}

const NOME_DA_CONTA = { luz: "conta de luz", agua: "conta de água" };

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
  modo,
}) {
  const [aberto, setAberto] = useState(false);

  const calculado = resultado.itens.find((x) => x.id === item.id);
  const set = (campo, valor) => acoes.editarItem(item.id, campo, valor);
  const rateios = rateiosDoItem(item, modo);

  const porFatura = item.especie === "porUso" && item.origemUso === "fatura";

  const temLuz = faturaAtiva(faturas?.luz);
  const temAgua = faturaAtiva(faturas?.agua);
  const escolheUnidade = temLuz && temAgua;

  // Quem é medido em kWh ou m³ pode ser declarado pelo total do mês ou pelo
  // consumo por hora. Quem é por uso ou em reais não tem essa escolha.
  const podeTrocarEspecie = item.especie === "consumo" || item.especie === "porHora";

  // Só tem pagador o que sai do bolso. O que sai de dentro da fatura já foi
  // pago por quem pagou a conta de luz ou de água; pedir pagador aqui faria a
  // mesma despesa ser contada duas vezes no acerto.
  const saiDoBolso =
    item.especie === "reais" || (item.especie === "porUso" && item.origemUso === "reais");

  const contas = contasDoItem(item, temLuz, temAgua);

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
          {calculado ? `R$ ${reais(calculado.custoTotal)}` : " "}
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
          Falta {falta.join(" e ")} . Lance em Contas para este item entrar na conta.
        </p>
      )}

      {aberto && !bloqueado && (
        <div className="item-corpo">
          {/* Quem pagou vem primeiro, logo abaixo do cabeçalho da despesa:
              é a pergunta que decide se existe acerto ou não, e deixá-la no
              fim fazia a pessoa configurar o item inteiro sem nunca ver que
              ela existia. */}
          <div className="grupo">
            <Rotulo>Quem pagou</Rotulo>

            {saiDoBolso ? (
              <>
                <Seletor
                  valor={item.pagoPor ?? ""}
                  aoMudar={(v) => acoes.definirPagador("item", item.id, v || null)}
                  opcoes={[
                    { valor: "", texto: "cada um pagou a sua parte" },
                    ...moradores.map((m, i) => ({ valor: m.id, texto: nomeOu(m.nome, i) })),
                  ]}
                  texto
                />
                <p className="dica">
                  {item.pagoPor
                    ? "Essa pessoa adiantou pelo grupo: os outros devem a ela no acerto."
                    : "Sem ninguém marcado, vale que cada um pagou a própria parte direto. Não gera dívida entre vocês."}
                </p>
              </>
            ) : (
              <>
                <p className="item-pagador-herdado">
                  {contas.length === 0
                    ? "Sai da fatura."
                    : contas
                        .map((qual) => {
                          const quem = faturas?.[qual]?.pagoPor;
                          const i = moradores.findIndex((m) => m.id === quem);
                          return `${NOME_DA_CONTA[qual]}: ${
                            i < 0 ? "ninguém marcado ainda" : nomeOu(moradores[i].nome, i)
                          }`;
                        })
                        .join(" · ")}
                </p>
              </>
            )}
          </div>

          {dica && <p className="dica">{dica}</p>}

          {/* Aparelho pode ser medido de dois jeitos: o total do mês, ou o que
              ele gasta por hora vezes as horas ligadas. A etiqueta costuma
              trazer o segundo, então vale poder trocar. */}
          {podeTrocarEspecie && (
            <Segmentado
              rotuloDoGrupo="Como medir o aparelho"
              opcoes={[
                { valor: "consumo", texto: "total do mês" },
                { valor: "porHora", texto: "por hora" },
              ]}
              valor={item.especie}
              aoMudar={(v) => set("especie", v)}
            />
          )}

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

          <QuandoFoi item={item} set={set} />

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

          {TABELAS[item.rateio] && item.rateio !== "uso" && item.rateio !== "horas" &&
            item.participantes.length > 0 && (
              <TabelaDeclarada
                item={item}
                moradores={moradores}
                indicePorId={indicePorId}
                custoTotal={calculado?.custoTotal ?? 0}
                set={set}
              />
            )}

          {(item.rateio === "uso" || item.rateio === "horas") && item.participantes.length > 0 && (
            <div className="grupo">
              <Rotulo>{item.rateio === "horas" ? "Horas de cada um" : "Usos de cada um"}</Rotulo>

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
                          : "virá na próxima fatura. Não está cobrada aqui. Lance este mesmo dia no fechamento do mês que vem."}
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
                          sufixo={item.rateio === "horas" ? "h" : undefined}
                          tipoDeTeclado={item.rateio === "horas" ? "decimal" : "numeric"}
                        />
                      );
                    })}
                  </div>

                  <p className="dica">
                    {item.rateio === "horas" ? "Total de horas: " : "Total de usos: "}
                    {totalDeUsos.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                  </p>

                  {porFatura && diasSoltos > 0 && (
                    <Alerta nivel="aviso">
                      Sem as datas, a CEDER não sabe em que ciclo cada uso caiu. Os ciclos de
                      luz e água têm {diasSoltos} {diasSoltos === 1 ? "dia" : "dias"} que uma
                      cobre e a outra não. Um uso nesses dias vai ser cobrado nas duas, e a
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

/**
 * Quando a despesa aconteceu   opcional, e de dois formatos.
 *
 * Um dia só (o mercado do dia 12) ou um período (a diária da casa de praia, de
 * 2 a 9). Sem nada marcado, o item vale para o fechamento inteiro, que é o
 * caso mais comum e por isso é o estado inicial.
 *
 * O período guarda o começo em `data` e o fim em `ate`. Trocar para "dia único"
 * apaga só o fim: a pessoa que marcou o começo não perde o que já digitou.
 */
function QuandoFoi({ item, set }) {
  // A escolha da pessoa vive aqui, e não é deduzida dos campos do item.
  // Deduzir era o bug: num item ainda sem data, escolher "dia" não mudava
  // campo nenhum, a dedução continuava dizendo "sem data", e os campos para
  // digitar a data nunca apareciam   justamente os que ela foi pedir.
  const [escolha, setEscolha] = useState(null);
  const { formato, mostraInicio, mostraFim } = telaDoQuando(item, escolha);

  const aplicar = (mudancas) => {
    for (const [campo, valor] of Object.entries(mudancas)) set(campo, valor);
  };

  const trocar = (novo) => {
    setEscolha(novo);
    aplicar(trocaDeFormato(item, novo));
  };

  return (
    <div className="grupo">
      <Rotulo>Quando foi</Rotulo>

      <Segmentado
        rotuloDoGrupo="Quando a despesa aconteceu"
        opcoes={[
          { valor: "sem", texto: "sem data" },
          { valor: "dia", texto: "dia" },
          { valor: "periodo", texto: "período" },
        ]}
        valor={formato}
        aoMudar={trocar}
      />

      {mostraInicio && (
        <div className="linha-campos">
          <CampoData
            rotulo={mostraFim ? "Início" : "Dia"}
            valor={item.data ?? null}
            aoMudar={(v) => aplicar(aoMudarInicio(item, v))}
            etiqueta={`Data de ${item.nome || "este item"}`}
          />

          {mostraFim && (
            <CampoData
              rotulo="Fim"
              valor={item.ate ?? null}
              aoMudar={(v) => aplicar(aoMudarFim(item, v))}
              etiqueta={`Fim do período de ${item.nome || "este item"}`}
            />
          )}
        </div>
      )}

      <p className="dica">
        {formato === "sem"
          ? "O item vale para o fechamento inteiro e não aparece no calendário."
          : formato === "dia"
            ? "O item aparece nesse dia do calendário e do histórico."
            : "O item aparece no calendário no dia em que começa, dizendo até quando vai."}{" "}
        A data não muda a divisão   ela é o registro de quando a despesa
        aconteceu.
      </p>
    </div>
  );
}

/**
 * As divisões em que cada participante escreve o próprio número: porcentagem e
 * reais.
 *
 * As duas mostram a soma enquanto a pessoa digita, porque as duas podem não
 * fechar   e descobrir isso só no fim, lendo um alerta, é pior do que ver o
 * número andando. Em reais o aviso é duro de propósito: ali o número digitado
 * é o valor final, não uma proporção, e um item que não soma o próprio custo
 * é dinheiro sem dono.
 */
function TabelaDeclarada({ item, moradores, indicePorId, custoTotal, set }) {
  const { campo, sufixo } = TABELAS[item.rateio];
  const tabela = item[campo] ?? {};

  const soma = item.participantes.reduce((t, id) => t + (Number(tabela[id]) || 0), 0);
  const alvo = item.rateio === "porcentagem" ? 100 : custoTotal;
  const diferenca = alvo - soma;
  const fecha = Math.abs(diferenca) < 0.005;

  const escrito = (v) =>
    item.rateio === "porcentagem"
      ? `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
      : `R$ ${reais(v)}`;

  return (
    <div className="grupo">
      <Rotulo>{item.rateio === "porcentagem" ? "Porcentagem de cada um" : "Quanto cada um paga"}</Rotulo>

      <div className="linha-campos">
        {item.participantes.map((id) => {
          const m = moradores.find((x) => x.id === id);
          if (!m) return null;

          return (
            <Campo
              key={id}
              rotulo={nomeOu(m.nome, indicePorId[id])}
              valor={tabela[id] ?? ""}
              aoMudar={(v) => set(campo, { ...tabela, [id]: v })}
              largura="campo--curto"
              placeholder="0"
              sufixo={sufixo}
            />
          );
        })}
      </div>

      {fecha ? (
        <p className="dica">
          Soma: {escrito(soma)}   fecha com {item.rateio === "porcentagem" ? "100%" : "o custo do item"}.
        </p>
      ) : item.rateio === "valor" ? (
        <Alerta nivel="erro">
          Os valores somam {escrito(soma)} e o item custa {escrito(alvo)}:{" "}
          {diferenca > 0
            ? `faltam ${escrito(diferenca)} sem dono.`
            : `sobram ${escrito(-diferenca)} a mais do que o item custa.`}{" "}
          Acerte os valores ou troque a regra de divisão.
        </Alerta>
      ) : (
        <Alerta nivel="aviso">
          As porcentagens somam {escrito(soma)}, não 100%. A divisão sai na proporção
          do que está escrito   confira se é isso mesmo.
        </Alerta>
      )}
    </div>
  );
}
