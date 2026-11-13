import { useState } from "react";
import {
  Alerta,
  Botao,
  Campo,
  CampoData,
  Rotulo,
  Segmentado,
  SeletorDeDia,
  SeletorDePessoas,
  SimboloDoCiclo,
} from "../componentes/index.js";
import QuemPagou from "./QuemPagou.jsx";
import { medeHoras } from "../nucleo/resumo.js";
import { campoDoConsumo, ciclosDoItem, especiesDe } from "../nucleo/catalogo.js";
import { nomeOu, num, reais } from "../nucleo/formato.js";
import {
  ciclosDoUso,
  faltaParaItem,
  orfasDoItem,
  parteNoRegistro,
  rateiosDoItem,
  registrosDe,
  totalDeclaradoPorHora,
  horasDoAparelho,
} from "../nucleo/adaptador.js";
import {
  diasSemSobreposicao,
  janelaTotal,
  ultimoDiaDaJanela,
} from "../nucleo/calendario.js";
import {
  cicloPorId,
  ciclosMedidos,
  deConta,
  nomeNaFrase,
  unidadeDoRecurso,
} from "../nucleo/ciclos.js";
import {
  aoMudarFim,
  aoMudarInicio,
  telaDoQuando,
  trocaDeFormato,
} from "../nucleo/quandoFoi.js";

const NOMES_DOS_RATEIOS = {
  igual: "igual",
  porcentagem: "%",
  valor: "valor",
  cotas: "cotas",
  ajuste: "ajuste",
  dias: "dias",
  horas: "horas",
  presenca: "presença",
  uso: "uso",
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
  cotas: "Cada um tem um número de cotas: quem tem 2 paga o dobro de quem tem 1. Quem fica em branco tem 1 cota.",
  ajuste:
    "Divide por igual, e cada um pode ter um ajuste em reais: + para pagar a mais, − para pagar a menos. O que sobra depois dos ajustes se divide por igual.",
};

/** As divisões em que cada participante escreve o próprio número. */
const TABELAS = {
  porcentagem: { campo: "porcentagens", sufixo: "%", teclado: "decimal", passo: "qualquer" },
  valor: { campo: "valores", sufixo: "R$", teclado: "decimal", passo: "qualquer" },
  cotas: { campo: "cotas", sufixo: "cotas", teclado: "decimal", passo: "qualquer" },
  ajuste: { campo: "ajustes", sufixo: "R$", teclado: "text", passo: "qualquer" },
  uso: { campo: "usosPorPessoa", sufixo: "usos", teclado: "numeric", passo: "inteiro" },
  horas: { campo: "usosPorPessoa", sufixo: "h", teclado: "decimal", passo: "qualquer" },
};

/** Os ciclos da tabela do item, como objetos do estado (os que existem). */
function contasDoItem(item, estado) {
  return ciclosDoItem(item)
    .map((id) => cicloPorId(estado, id))
    .filter(Boolean);
}

function dicaDoItem(item, estado) {
  if (item.especie !== "porUso" || item.origemUso === "reais") return item.dica;

  const contas = ciclosDoUso(item, estado).map(nomeNaFrase);
  if (contas.length === 0) return item.dica;

  const quais = contas.length === 1 ? contas[0] : `${contas.slice(0, -1).join(", ")} e ${contas.at(-1)}`;
  const metricas = contas.length > 1 ? "o gasto de cada conta" : `o gasto de ${quais}`;

  return `Cada uso puxa ${quais} da fatura. Insira ${metricas} por uso; se não quiser contar uma conta, tire com o x. Cada um paga pelos usos que fez. Um uso entre duas pessoas conta 0,5 para cada.`;
}

const NOMES_DAS_ESPECIES = { consumo: "total do mês", porHora: "por hora", porUso: "por uso" };

/** O rótulo do campo de consumo de um ciclo, conforme o jeito de medir. */
function rotuloDoConsumo(especie, ciclo) {
  const nome = nomeNaFrase(ciclo);
  if (especie === "porHora") return `Gasto por hora (${nome})`;
  if (especie === "porUso") return `Cada uso gasta (${nome})`;
  return `Consumo no mês (${nome})`;
}

const sufixoDoConsumo = (especie, ciclo) => {
  const unidade = unidadeDoRecurso(ciclo?.recurso) || "unid.";
  return especie === "porHora" ? `${unidade}/h` : unidade;
};

export default function CartaoItem({
  item,
  moradores,
  indicePorId,
  resultado,
  periodo,
  ciclos,
  corte = null,
  acoes,
  modo,
}) {
  // O pedaço do estado que este cartão consulta: os ciclos e o período.
  const estado = { ciclos, periodo, corte, itens: [item], moradores };
  const [aberto, setAberto] = useState(false);

  const calculado = resultado.itens.find((x) => x.id === item.id);
  const set = (campo, valor) => acoes.editarItem(item.id, campo, valor);
  const rateios = rateiosDoItem(item, modo);

  const porFatura = item.especie === "porUso" && item.origemUso !== "reais";
  const campo = campoDoConsumo(item);
  const tabela = campo ? item[campo] ?? {} : {};
  const medidos = ciclosMedidos(estado);

  // Os jeitos de medir que este item oferece. Um item "por uso" que sai do
  // bolso (a faxina) não troca de jeito: o preço da diária é o que conta.
  const especies = especiesDe(item).filter((e) => e !== "reais");
  const podeTrocarEspecie = especies.length > 1 && item.origemUso !== "reais";

  // Só tem pagador o que sai do bolso. O que sai de dentro da fatura já foi
  // pago por quem pagou a conta de onde ele sai; pedir pagador aqui faria a
  // mesma despesa ser contada duas vezes no acerto.
  const saiDoBolso =
    item.especie === "reais" || (item.especie === "porUso" && item.origemUso === "reais");

  const contas = contasDoItem(item, estado);

  const diasSoltos = diasSemSobreposicao(ciclosDoUso(item, estado), periodo);

  const dica = dicaDoItem(item, estado);

  const eventos = registrosDe(item);

  // A lancha da Multi também registra cada uso com data, como a máquina.
  const comRegistro = porFatura || Boolean(item.equipamento);
  const emHoras = medeHoras(item);
  const [porData, setPorData] = useState(comRegistro);
  const datado = comRegistro && (eventos.length > 0 || porData);

  const totalDeUsos = (item.participantes ?? []).reduce((soma, id) => {
    if (eventos.length > 0) return soma + eventos.reduce((s, e) => s + parteNoRegistro(e, id), 0);
    return soma + (Number(item.usosPorPessoa?.[id]) || 0);
  }, 0);

  const trocarEventos = (lista) => set("registrosDeUso", lista);

  const adicionarEvento = () => {
    const limite = janelaTotal(ciclos, periodo, corte);
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

  const editarEvento = (id, chave, valor) =>
    trocarEventos(eventos.map((e) => (e.id === id ? { ...e, [chave]: valor } : e)));

  const removerEvento = (id) => trocarEventos(eventos.filter((e) => e.id !== id));

  const voltarAosTotais = () => {
    trocarEventos([]);
    setPorData(false);
  };

  /**
   * Trocar o jeito de medir leva junto as contas escolhidas, com os números
   * em branco: um total do mês não vira, por engano, gasto por hora.
   */
  const trocarEspecie = (nova) => {
    const alvo = campoDoConsumo({ ...item, especie: nova, origemUso: "fatura" });
    if (alvo && Object.keys(item[alvo] ?? {}).length === 0) {
      set(alvo, Object.fromEntries(Object.keys(tabela).map((id) => [id, ""])));
    }
    if (nova === "porUso") set("origemUso", "fatura");
    set("especie", nova);
  };

  /** Liga ou tira (o x) uma conta da tabela de consumo do aparelho. */
  const alternarCiclo = (id) => {
    if (!campo) return;
    if (id in tabela) {
      const { [id]: _fora, ...resto } = tabela;
      set(campo, resto);
    } else {
      set(campo, { ...tabela, [id]: "" });
    }
  };

  const orfas = porFatura ? orfasDoItem(item, estado) : [];
  const orfasDoRegistro = (id) => orfas.filter((o) => o.registroId === id);

  const diaCurto = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  const oQueFalta = (o) => (o.faltando === "luz" ? "energia" : `parte de ${o.nomeDoCiclo}`);

  const falta = faltaParaItem(item, estado);
  const bloqueado = falta.length > 0;

  const participantes = moradores.filter((m) => item.participantes.includes(m.id));
  const totaisPorHora = item.especie === "porHora" ? totalDeclaradoPorHora(item) : {};

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
          className="item-acao"
          aria-label={`Duplicar ${item.nome}`}
          title="Duplicar"
          onClick={() => acoes.duplicarItem?.(item.id)}
        >
          duplicar
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
          Falta {falta.join(" e ")}. Ligue e preencha em Faturas para este item entrar na conta.
        </p>
      )}

      {aberto && !bloqueado && (
        <div className="item-corpo">
          {/* Quem pagou vem primeiro, logo abaixo do nome da despesa: é a
              pergunta que decide se existe acerto ou não. */}
          {saiDoBolso ? (
            <QuemPagou
              pessoas={moradores}
              indicePorId={indicePorId}
              valor={item.pagoPor ?? null}
              aoMudar={(id) => acoes.definirPagador("item", item.id, id)}
              semNinguem="Ninguém marcado: a despesa fica em aberto. Se cada um pagou a própria parte direto, não gera dívida entre vocês."
              comAlguem="Essa pessoa adiantou pelo grupo: os outros devem a ela no acerto."
            />
          ) : (
            <div className="grupo">
              <Rotulo>Quem pagou</Rotulo>
              <p className="item-pagador-herdado">
                {contas.length === 0
                  ? "Sai da fatura de quem pagou a conta."
                  : contas
                      .map((ciclo) => {
                        const i = moradores.findIndex((m) => m.id === ciclo.pagoPor);
                        return `conta ${deConta(ciclo)}: ${
                          i < 0 ? "ninguém marcado ainda" : nomeOu(moradores[i].nome, i)
                        }`;
                      })
                      .join(" · ")}
              </p>
            </div>
          )}

          {dica && <p className="dica">{dica}</p>}

          {/* Como medir: total do mês, por hora ou por uso, conforme o item. */}
          {podeTrocarEspecie && (
            <Segmentado
              rotuloDoGrupo="Como medir"
              opcoes={especies.map((e) => ({ valor: e, texto: NOMES_DAS_ESPECIES[e] }))}
              valor={item.especie}
              aoMudar={trocarEspecie}
            />
          )}

          {/* De quais contas o aparelho puxa. Livre: a pessoa escolhe e tira
              com o x. Fixo (a geladeira é luz): não há escolha. */}
          {campo && item.ciclosLivres && (
            <div className="grupo">
              <Rotulo>Puxa de quais contas</Rotulo>
              {medidos.length === 0 ? (
                <p className="dica">Nenhuma conta medida ligada. Ligue luz, água ou outra em Faturas.</p>
              ) : (
                <div className="linha-acoes">
                  {medidos.map((c) => {
                    const dentro = c.id in tabela;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`botao botao--catalogo ${dentro ? "botao--ligado" : ""}`}
                        aria-pressed={dentro}
                        onClick={() => alternarCiclo(c.id)}
                      >
                        <SimboloDoCiclo ciclo={c} tamanho={11} /> {c.nome}
                      </button>
                    );
                  })}
                </div>
              )}
              {Object.keys(tabela).length === 0 && medidos.length > 0 && (
                <p className="dica dica--alerta">Escolha de qual conta este aparelho puxa.</p>
              )}
            </div>
          )}

          <div className="linha-campos">
            {campo &&
              Object.keys(tabela).map((id) => {
                const ciclo = cicloPorId(estado, id);
                const desligado = !ciclo || !medidos.some((c) => c.id === id);
                return (
                  <span className="campo-com-x" key={id}>
                    <Campo
                      rotulo={ciclo ? rotuloDoConsumo(item.especie, ciclo) : "Conta removida"}
                      sufixo={sufixoDoConsumo(item.especie, ciclo)}
                      valor={tabela[id] ?? ""}
                      aoMudar={(v) => set(campo, { ...tabela, [id]: v })}
                      largura="campo--curto"
                      placeholder="0"
                    />
                    {item.ciclosLivres && (
                      <button
                        type="button"
                        className="linha-fatura__remover"
                        aria-label={`Não contar ${ciclo?.nome ?? "esta conta"}`}
                        title="Não contar esta conta"
                        onClick={() => alternarCiclo(id)}
                      >
                        ×
                      </button>
                    )}
                    {!item.ciclosLivres && ciclo && (
                      <span className="selo">sai da conta {deConta(ciclo)}</span>
                    )}
                    {desligado && <span className="selo selo--erro">desligada em Faturas</span>}
                  </span>
                );
              })}

            {item.especie === "porHora" && registrosDe(item).length > 0 && (
              <p className="dica">
                As horas vêm dos {registrosDe(item).length} registros deste aparelho (
                {horasDoAparelho(item).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} h), cada uma no ciclo em que
                caiu. Veja e lance em Registros.
              </p>
            )}

            {item.especie === "porHora" && registrosDe(item).length === 0 && (
              <Campo
                rotulo="Horas ligado no mês"
                sufixo="h"
                valor={item.horas}
                aoMudar={(v) => set("horas", v)}
                largura="campo--curto"
                placeholder="0"
              />
            )}

            {item.especie === "porUso" && item.origemUso === "reais" && (
              <Campo
                rotulo={emHoras ? "Cada hora custa" : "Cada uso custa"}
                sufixo="R$"
                valor={item.valorPorUso}
                aoMudar={(v) => set("valorPorUso", v)}
                largura="campo--curto"
                placeholder="0,00"
              />
            )}

            {item.especie === "porUso" && item.rateio !== "uso" && item.rateio !== "horas" && (
              <Campo
                rotulo="Usos no mês"
                valor={item.usos}
                aoMudar={(v) => set("usos", v)}
                largura="campo--minimo"
                placeholder="0"
                tipoDeTeclado="numeric"
              />
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

          {item.especie === "porHora" &&
            Object.entries(totaisPorHora).some(([, v]) => v > 0) && (
              <p className="dica">
                Dá{" "}
                {Object.entries(totaisPorHora)
                  .filter(([, v]) => v > 0)
                  .map(([id, v]) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${unidadeDoRecurso(cicloPorId(estado, id)?.recurso)}`)
                  .join(" e ")}{" "}
                no mês, descontados da fatura antes do uso comum.
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
            <SeletorDePessoas
              rotulo="Quem paga"
              pessoas={moradores}
              indicePorId={indicePorId}
              selecionados={item.participantes}
              aoMudar={(ids) => acoes.definirParticipantes(item.id, ids)}
            />
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

              {comRegistro && (
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
                          limite={janelaTotal(ciclos, periodo, corte)}
                          etiqueta="Dia do uso"
                        />
                        <Campo
                          valor={evento.quantidade}
                          aoMudar={(v) => editarEvento(evento.id, "quantidade", v)}
                          sufixo={emHoras ? "h" : "usos"}
                          largura="campo--minimo"
                          placeholder="1"
                          rotulo={emHoras ? "Quantas horas" : "Quantas vezes"}
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

                      <SeletorDePessoas
                        rotulo="Quem usou"
                        pessoas={participantes}
                        indicePorId={indicePorId}
                        selecionados={evento.participantes}
                        aoMudar={(ids) => editarEvento(evento.id, "participantes", ids)}
                      />

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

                      {/* O aviso de fora do ciclo fica embaixo de quem usou,
                          no lançamento a que ele se refere. */}
                      {orfasDoRegistro(evento.id).map((o) => (
                        <p className="dica dica--alerta" key={`${o.registroId}-${o.faltando}`}>
                          <strong>{diaCurto(o.dia)}</strong>: este uso está fora do ciclo da conta de{" "}
                          {o.nomeDoCiclo}, então a {oQueFalta(o)} dele{" "}
                          {o.quando === "passado"
                            ? "entrou na fatura anterior, que já foi fechada. Aqui ela não é cobrada de novo."
                            : "virá na próxima fatura. Não está cobrada aqui. Lance este mesmo dia no fechamento do mês que vem."}
                        </p>
                      ))}
                    </div>
                  ))}

                  <Botao tipo="fantasma" aoClicar={adicionarEvento}>
                    + adicionar uso
                  </Botao>

                  <p className="dica">
                    Os usos valem de {diaCurto(janelaTotal(ciclos, periodo, corte).de)} a{" "}
                    {diaCurto(ultimoDiaDaJanela(janelaTotal(ciclos, periodo, corte)))}, que é o que
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
                      Sem as datas, a CEDER não sabe em que ciclo cada uso caiu. As contas
                      deste item têm {diasSoltos} {diasSoltos === 1 ? "dia" : "dias"} que uma
                      cobre e outra não. Um uso nesses dias vai ser cobrado em todas, e a
                      conta fica imprecisa. Lançar por data resolve.
                    </Alerta>
                  )}
                </>
              )}
            </div>
          )}

          {/* Quando foi é sempre a última seção. Com usos lançados por data,
              cada uso já diz quando foi, e a data do item não se aplica. */}
          {eventos.length > 0 ? (
            <div className="grupo">
              <Rotulo>Quando foi</Rotulo>
              <p className="dica">
                Desativado: este item tem usos com data, e cada um já diz quando foi.
              </p>
            </div>
          ) : (
            <QuandoFoi item={item} set={set} />
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
  const { campo, sufixo, teclado } = TABELAS[item.rateio];
  const tabela = item[campo] ?? {};
  const regra = item.rateio;

  const soma = item.participantes.reduce((t, id) => t + num(tabela[id]), 0);
  const alvo = regra === "porcentagem" ? 100 : custoTotal;
  const diferenca = alvo - soma;
  const fecha = Math.abs(diferenca) < 0.005;

  const escrito = (v) =>
    regra === "porcentagem" ? `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%` : `R$ ${reais(v)}`;

  // Ajuste: a parte de cada um é o resto por igual mais o ajuste dele.
  const quantos = item.participantes.length;
  const base = quantos > 0 ? (custoTotal - soma) / quantos : 0;
  const parteNoAjuste = (id) => base + num(tabela[id]);

  const rotulo = {
    porcentagem: "Porcentagem de cada um",
    valor: "Quanto cada um paga",
    cotas: "Cotas de cada um",
    ajuste: "Ajuste de cada um (+ ou −)",
  }[regra];

  return (
    <div className="grupo">
      <Rotulo>{rotulo}</Rotulo>

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
              placeholder={regra === "cotas" ? "1" : "0"}
              sufixo={sufixo}
              tipoDeTeclado={teclado}
            />
          );
        })}
      </div>

      {regra === "cotas" ? (
        <p className="dica">
          {item.participantes
            .map((id) => {
              const m = moradores.find((x) => x.id === id);
              const c = String(tabela[id] ?? "").trim() === "" ? 1 : Math.max(0, num(tabela[id]));
              return `${nomeOu(m?.nome, indicePorId[id])} ${c.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
            })
            .join(" · ")}
          {"  "}cota(s).
        </p>
      ) : regra === "ajuste" ? (
        item.participantes.some((id) => parteNoAjuste(id) < -0.005) ? (
          <Alerta nivel="aviso">
            Os ajustes passam do que o item custa ({escrito(custoTotal)}): alguém ficaria com parte negativa. Essa parte vira
            zero e o resto se divide na proporção do que sobrou.
          </Alerta>
        ) : (
          <p className="dica">
            Fica:{" "}
            {item.participantes
              .map((id) => {
                const m = moradores.find((x) => x.id === id);
                return `${nomeOu(m?.nome, indicePorId[id])} ${escrito(parteNoAjuste(id))}`;
              })
              .join(" · ")}
            .
          </p>
        )
      ) : fecha ? (
        <p className="dica">
          Soma: {escrito(soma)}   fecha com {regra === "porcentagem" ? "100%" : "o custo do item"}.
        </p>
      ) : regra === "valor" ? (
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
