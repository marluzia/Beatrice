import { SetaComBarra } from "../componentes/Interface.jsx";
import { simboloDe } from "../nucleo/moedas.js";
import { useState } from "react";
import { Botao, Campo, Ficha, Pastilha, Segmentado, SimboloDoCiclo, Titulo } from "../componentes/index.js";
import { ciclosLigados, naOrdemDaTela } from "../nucleo/ciclos.js";
import {
  cicloValido,
  NOMES_CURTOS_DOS_DIAS,
  chaveDoMes,
  dentroDaJanela,
  janelaDoFechamento,
  janelaTotal,
  mesAnterior,
  mesDoDia,
  mesSeguinte,
  partesDoDia,
  semanasDoMes,
  ultimoDiaDaJanela,
} from "../nucleo/calendario.js";
import { MESES, corDe, nomeOu, reais } from "../nucleo/formato.js";
import { agendaPorDia, ROTULO_DA_NATUREZA } from "../nucleo/agenda.js";
import { registravel } from "../nucleo/adaptador.js";
import { diaPorExtenso, hojeISO } from "../nucleo/resumo.js";
import { totalDaFatura } from "../nucleo/traducao/fatura.js";

const reaisDaConta = (c) => reais(totalDaFatura(c));
import { mostra } from "./secoes.js";

const diaCurto = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const diaLongo = (iso) => {
  const p = partesDoDia(iso);
  return p ? `${p.dia} de ${MESES[p.mes - 1]}` : iso;
};

const CORES = {
  presenca: "var(--laranja)",
  uso: "var(--verde)",
  despesa: "var(--ouro)",
};

/** O que a legenda chama cada natureza. */
const NOME_NA_LEGENDA = { uso: "Registro", despesa: "Despesa" };

/** Tarefa não existe mais: o calendário só lança despesa, registro e lembrete. */
const semTarefa = (lista) => lista.filter((e) => e.natureza !== "tarefa");

/**
 * O calendário do conjunto: um mês, e o que aconteceu em cada dia.
 *
 * É o passo onde tudo que tem data é lançado   quem esteve (ou não esteve),
 * que aparelho rodou, que despesa caiu e que tarefa foi feita. O que o
 * calendário escreve são os mesmos campos que o motor já lia antes; ele é uma
 * porta de entrada, não um cálculo novo.
 *
 * A lista embaixo é o histórico: o mês em ordem, para a casa conferir o que
 * foi lançado e enxergar o que ficou sem marcação.
 */
/**
 * Um lançamento do dia como linha só de ver: tocar abre o lançamento sozinho.
 * É o que o calendário do conjunto usa; dentro de Fechar contas, os
 * lançamentos do dia continuam editáveis ali mesmo.
 */
function LinhaDoDia({ selo, titulo, detalhe, valor, cor, aoAbrir }) {
  return (
    <button type="button" className="linha-do-dia" onClick={aoAbrir}>
      <i className="marca marca--losango" style={{ background: cor }} aria-hidden="true" />
      <span className="linha-do-dia__textos">
        <strong>{titulo}</strong>
        <span>
          {selo}
          {detalhe ? ` · ${detalhe}` : ""}
        </span>
      </span>
      {valor && <strong className="linha-do-dia__valor">{valor}</strong>}
      <SetaComBarra />
    </button>
  );
}

export default function PassoCalendario({
  estado,
  acoes,
  modo,
  secao,
  irParaSecao,
  diaAberto,
  aoAbrirDia,
  solto = false,
  aoAbrirLancamento = null,
  aoLancarNoDia = null,
}) {
  // Com faturas, o calendário vai dos ciclos; na temporada, do período dela
  // (as estadias fora dele não contam); no evento, não há limite.
  const temporada = modo.chave === "temporada";
  const limite = modo.faturas
    ? janelaTotal(estado.ciclos, estado.periodo, estado.corte)
    : temporada
      ? janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte)
      : null;
  const [comLegenda, setComLegenda] = useState(false);

  // Solto (a tela Calendário), abre no mês do dia aberto   hoje   e anda livre
  // pelos meses; dentro do Fechar contas, fica nos meses que as faturas cobrem.
  const inicio = solto && diaAberto ? partesDoDia(diaAberto) : limite?.de ? partesDoDia(limite.de) : null;
  const [visivel, setVisivel] = useState(
    inicio ? { mes: inicio.mes, ano: inicio.ano } : { mes: estado.periodo.mes, ano: estado.periodo.ano },
  );
  // O dia aberto pode vir de fora (a tela Calendário controla e põe o botão
  // "+ Lançar no dia" embaixo); sem isso, fica aqui dentro.
  const [abertoAqui, setAbertoAqui] = useState(null);
  const aberto = aoAbrirDia ? diaAberto ?? null : abertoAqui;
  const setAberto = aoAbrirDia ?? setAbertoAqui;
  const hoje = hojeISO();
  const lembretesDoDia = (dia) => (estado.lembretes ?? []).filter((l) => l.data === dia);
  // As contas que vencem no dia: entram como despesa na marquinha e na lista do dia.
  const vencimentosDoDia = (dia) => ciclosLigados(estado).filter((c) => c.vencimento === dia);
  const nomeDaPessoa = (id) => {
    const i = estado.moradores.findIndex((m) => m.id === id);
    return i < 0 ? "" : nomeOu(estado.moradores[i].nome, i);
  };

  const porDia = agendaPorDia(estado);
  const semanas = semanasDoMes(visivel.mes, visivel.ano);

  const mesAtual = chaveDoMes(visivel);
  const podeVoltar = solto || !limite || mesAtual > mesDoDia(limite.de);
  const podeAvancar = solto || !limite || mesAtual < mesDoDia(ultimoDiaDaJanela(limite));

  const polaridade = modo.presenca;
  const ligados = naOrdemDaTela(ciclosLigados(estado)).filter((c) => cicloValido(c.janela));
  const rotuloPresenca = ROTULO_DA_NATUREZA.presenca[polaridade];
  const campo = polaridade === "presenca" ? "presencas" : "ausencias";

  // Só aparelhos que consomem kWh ou m³ e se medem por uso ou por hora.
  const itensComUso = estado.itens.filter((i) => registravel(i, estado) && i.participantes.length > 0);

  const tarefaPorId = (id) => (estado.tarefas ?? []).find((t) => t.id === id);

  // Um dia tocado no histórico abre no calendário, no mês dele.
  const abrirDoHistorico = (dia) => {
    const p = partesDoDia(dia);
    if (p) setVisivel({ mes: p.mes, ano: p.ano });
    setAberto(dia);
    irParaSecao?.("mes");
  };

  return (
    <div className={`coluna ${solto ? "calendario-solto" : ""}`}>
      {mostra(secao, "mes") && (
      <>
      <Ficha>
        {!solto && (
          <Titulo
            nota={
              polaridade === "nenhuma"
                ? "Lance aqui o que aconteceu em cada dia do evento."
                : `Toque num dia para lançar ${rotuloPresenca.toLowerCase()}, uso de aparelho, despesa ou tarefa.`
            }
          >
            O mês do conjunto
          </Titulo>
        )}

        {/* Na Multi o conjunto escolhe o que marcar: a estadia ou os dias fora. */}
        {modo.marcacaoEscolhida && acoes.definirMarcacao && (
          <div className="marcacao-do-calendario">
            <span className="rotulo">Marcar no calendário</span>
            <Segmentado
              rotuloDoGrupo="O que o calendário marca"
              opcoes={[
                { valor: "presenca", texto: "Estadia" },
                { valor: "ausencia", texto: "Dias fora" },
              ]}
              valor={polaridade}
              aoMudar={(v) => acoes.definirMarcacao(v)}
            />
          </div>
        )}

        <div className="calendario-topo">
          <button
            type="button"
            className="calendario-seta"
            aria-label="Mês anterior"
            disabled={!podeVoltar}
            onClick={() => {
              setVisivel(mesAnterior(visivel));
              setAberto(null);
            }}
          >
            ‹
          </button>
          <span className="calendario-titulo">
            {MESES[visivel.mes - 1]} <em>{visivel.ano}</em>
          </span>
          <button
            type="button"
            className="calendario-seta"
            aria-label="Próximo mês"
            disabled={!podeAvancar}
            onClick={() => {
              setVisivel(mesSeguinte(visivel));
              setAberto(null);
            }}
          >
            ›
          </button>
        </div>

        <div className="calendario-grade calendario-grade--agenda">
          {NOMES_CURTOS_DOS_DIAS.map((letra, i) => (
            <span key={`c${i}`} className="calendario-cabeca" aria-hidden="true">
              {letra}
            </span>
          ))}

          {semanas.flat().map((dia, i) => {
            if (!dia) return <span key={`v${i}`} className="calendario-vazio" />;

            const doDia = semTarefa(porDia[dia] ?? []);
            const cobre = (solto && !temporada) || !limite || dentroDaJanela(dia, limite);
            const numero = partesDoDia(dia).dia;
            const naturezas = [...new Set([...doDia.map((e) => e.natureza), ...(vencimentosDoDia(dia).length ? ["despesa"] : [])])];
            // Os ciclos ligados que cobrem este dia: gota, raio ou círculo no topo.
            const doCiclo = ligados.filter((c) => dentroDaJanela(dia, c.janela));

            const classes = [
              "calendario-dia",
              "calendario-dia--agenda",
              aberto === dia ? "calendario-dia--aberto" : "",
              dia === hoje ? "calendario-dia--hoje" : "",
              lembretesDoDia(dia).length > 0 ? "calendario-dia--lembrete" : "",
              cobre ? "" : "calendario-dia--fora",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={dia}
                type="button"
                className={classes}
                aria-pressed={aberto === dia}
                aria-label={
                  `${numero} de ${MESES[visivel.mes - 1]}` +
                  (doDia.length === 0
                    ? ", sem lançamentos"
                    : `, ${doDia.length} ${doDia.length === 1 ? "lançamento" : "lançamentos"}`) +
                  (cobre ? "" : temporada ? ", fora do período da temporada" : ", fora dos ciclos das faturas")
                }
                onClick={() => setAberto(aberto === dia ? null : dia)}
              >
                <span className="calendario-ciclos" aria-hidden="true">
                  {doCiclo.map((c) => (
                    <SimboloDoCiclo key={c.id} ciclo={c} tamanho={8} />
                  ))}
                </span>
                {numero}
                {naturezas.length > 0 && (
                  <span className="marcas" aria-hidden="true">
                    {naturezas.map((n) => (
                      <i key={n} className="marca marca--losango" style={{ background: CORES[n] }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button type="button" className="legenda-alternar" aria-expanded={comLegenda} onClick={() => setComLegenda((v) => !v)}>
          {comLegenda ? "Ocultar legenda" : "Mostrar legenda"}
        </button>

        {comLegenda && (
          <div className={`legenda-agenda ${ligados.length === 0 ? "legenda-agenda--so-acoes" : ""}`}>
            {ligados.length > 0 && (
              <div className="legenda-agenda__coluna">
                <span className="rotulo">Ciclos</span>
                {ligados.map((c) => (
                  <span key={c.id} className="legenda-agenda__ciclo">
                    <SimboloDoCiclo ciclo={c} tamanho={14} />
                    <span>
                      {c.nome || "Conta"}
                      <small>
                        {diaCurto(c.janela.de)} a {diaCurto(ultimoDiaDaJanela(c.janela))}
                      </small>
                    </span>
                  </span>
                ))}
              </div>
            )}
            <div className="legenda-agenda__coluna">
              <span className="rotulo">Ações</span>
              <div className="legenda-agenda__acoes">
                <span>
                  <i className="marca marca--losango" style={{ background: CORES.despesa }} /> {NOME_NA_LEGENDA.despesa}
                </span>
                {polaridade !== "nenhuma" && (
                  <span>
                    <i className="marca marca--losango" style={{ background: CORES.presenca }} /> {rotuloPresenca}
                  </span>
                )}
                <span>
                  <i className="marca marca--losango" style={{ background: CORES.uso }} /> {NOME_NA_LEGENDA.uso}
                </span>
                <span>
                  <i className="marca marca--canto" /> Lembrete
                </span>
              </div>
            </div>
          </div>
        )}
      </Ficha>

      {aberto && (
        <Ficha>
          <h3 className="titulo-do-dia">
            {diaPorExtenso(aberto).semana}, <em>{diaPorExtenso(aberto).resto}</em>
          </h3>

          {aoAbrirLancamento &&
            vencimentosDoDia(aberto).map((c) => (
              <LinhaDoDia
                key={c.id}
                selo="despesa cíclica"
                titulo={`${c.nome || "Conta"} de ${MESES[estado.periodo.mes - 1]} vence`}
                detalhe={c.pagoPor ? `paga por ${nomeDaPessoa(c.pagoPor)}` : "ninguém pagou ainda"}
                valor={reaisDaConta(c)}
                cor={CORES.despesa}
                aoAbrir={() => aoAbrirLancamento({ tipo: "ciclica", id: c.id })}
              />
            ))}

          {!aoAbrirLancamento && vencimentosDoDia(aberto).map((c) => (
            <div className="vencimento-do-dia" key={c.id}>
              <i className="marca marca--losango" style={{ background: CORES.despesa }} aria-hidden="true" />
              <span>
                <strong>
                  {c.nome || "Conta"} de {MESES[estado.periodo.mes - 1]} vence
                </strong>
                <span>
                  despesa cíclica ·{" "}
                  {c.pagoPor
                    ? `paga por ${nomeDaPessoa(c.pagoPor)}${c.pagoEm ? ` em ${diaCurto(c.pagoEm.slice(0, 10))}` : ""}`
                    : "ninguém pagou ainda"}
                </span>
              </span>
              <strong>{reaisDaConta(c)}</strong>
            </div>
          ))}

          {temporada && limite && !dentroDaJanela(aberto, limite) && (
            <p className="dica">Fora do período da temporada: estadias marcadas aqui não contam.</p>
          )}

          {polaridade !== "nenhuma" && estado.moradores.length > 0 && (!temporada || !limite || dentroDaJanela(aberto, limite)) && (
            <>
              <p className="dica">
                {polaridade === "presenca"
                  ? `Quem esteve ${modo.palavras.noLugar ?? "no espaço"} neste dia:`
                  : "Quem não dormiu em casa nesta noite:"}
              </p>
              <div className="pastilhas">
                {estado.moradores.map((m, i) => (
                  <Pastilha
                    key={m.id}
                    cor={corDe(i)}
                    nome={nomeOu(m.nome, i)}
                    ativo={(m[campo] ?? []).includes(aberto)}
                    aoClicar={() => acoes.alternarDiaDaPessoa(m.id, aberto)}
                  />
                ))}
              </div>
            </>
          )}

          <div className="linha-acoes" id="acoes-do-dia">
            <Botao
              tipo="fantasma"
              aoClicar={() => (aoLancarNoDia ? aoLancarNoDia("despesa", aberto) : acoes.lancarDespesaNoDia(aberto))}
            >
              + Despesa
            </Botao>
            {acoes.adicionarLembrete && (
              <Botao
                tipo="fantasma"
                aoClicar={() =>
                  aoLancarNoDia ? aoLancarNoDia("lembrete", aberto) : acoes.adicionarLembrete("nota", { data: aberto })
                }
              >
                + Lembrete
              </Botao>
            )}
          </div>

          {aoAbrirLancamento &&
            lembretesDoDia(aberto).map((l) => (
              <LinhaDoDia
                key={l.id}
                selo={l.tipo === "lista" ? "lista" : "nota"}
                titulo={(l.tipo === "lista" ? l.titulo : l.texto) || "Lembrete"}
                cor={CORES.lembrete ?? "var(--azul)"}
                aoAbrir={() => aoAbrirLancamento({ tipo: "lembrete", id: l.id })}
              />
            ))}

          {!aoAbrirLancamento && lembretesDoDia(aberto).map((l) => (
            <div className="lancamento lancamento--lembrete" key={l.id}>
              <div className="lancamento__topo">
                <span className="selo selo--modo">Lembrete</span>
                <button
                  type="button"
                  className="linha-fatura__remover"
                  aria-label="Apagar lembrete"
                  onClick={() => acoes.removerLembrete(l.id)}
                >
                  ×
                </button>
              </div>
              <Campo
                valor={l.tipo === "lista" ? l.titulo : l.texto}
                aoMudar={(v) => acoes.editarLembrete(l.id, l.tipo === "lista" ? { titulo: v } : { texto: v })}
                placeholder="Lavar as toalhas, levar o lixo…"
                texto
              />
            </div>
          ))}

          {itensComUso.length > 0 && (
            <>
              <p className="dica">Registrar um uso neste dia:</p>
              <div className="linha-acoes">
                {itensComUso.map((i) => (
                  <Botao
                    key={i.id}
                    tipo="fantasma"
                    aoClicar={() => acoes.lancarUsoNoDia(i.id, aberto)}
                  >
                    + {i.nome}
                  </Botao>
                ))}
              </div>
            </>
          )}

          {aoAbrirLancamento ? (
            semTarefa(porDia[aberto] ?? [])
              .filter((e) => e.natureza === "despesa" || e.natureza === "uso")
              .map((e) => (
                <LinhaDoDia
                  key={e.id}
                  selo={e.natureza === "uso" ? "registro" : "despesa avulsa"}
                  titulo={e.titulo || (e.natureza === "uso" ? "Uso" : "Despesa")}
                  detalhe={e.detalhe}
                  cor={e.natureza === "uso" ? CORES.uso : CORES.despesa}
                  aoAbrir={() =>
                    aoAbrirLancamento(
                      e.natureza === "uso"
                        ? { tipo: "registro", item: e.itemId, id: e.usoId }
                        : { tipo: "avulsa", id: e.itemId },
                    )
                  }
                />
              ))
          ) : (
            <LancamentosDoDia
              marcacoes={semTarefa(porDia[aberto] ?? [])}
              estado={estado}
              acoes={acoes}
              polaridade={polaridade}
              tarefaPorId={tarefaPorId}
            />
          )}
        </Ficha>
      )}
      </>
      )}

      {mostra(secao, "historico") && (
        <Historico
          porDia={Object.fromEntries(Object.entries(porDia).map(([d, l]) => [d, semTarefa(l)]).filter(([, l]) => l.length > 0))}
          polaridade={polaridade}
          aoAbrir={abrirDoHistorico}
        />
      )}
    </div>
  );
}

/** Os lançamentos do dia aberto, cada um com o que dá para editar nele. */
function LancamentosDoDia({ marcacoes, estado, acoes, polaridade, tarefaPorId }) {
  if (marcacoes.length === 0) {
    return <p className="vazio">Nada lançado neste dia ainda.</p>;
  }

  return (
    <div className="lancamentos">
      {marcacoes.map((e) => {
        if (e.natureza === "tarefa") {
          const tarefa = tarefaPorId(e.tarefaId);
          if (!tarefa) return null;

          return (
            <div className="lancamento" key={e.id}>
              <div className="lancamento__topo">
                <span className="selo selo--modo">Tarefa</span>
                <button
                  type="button"
                  className="linha-fatura__remover"
                  aria-label={`Apagar ${e.titulo}`}
                  onClick={() => acoes.removerTarefa(tarefa.id)}
                >
                  ×
                </button>
              </div>

              <Campo
                valor={tarefa.nome}
                aoMudar={(v) => acoes.editarTarefa(tarefa.id, "nome", v)}
                placeholder="Lavar louça, passar pano, tirar o lixo…"
                texto
              />

              <div className="pastilhas">
                {estado.moradores.map((m, i) => (
                  <Pastilha
                    key={m.id}
                    cor={corDe(i)}
                    nome={nomeOu(m.nome, i)}
                    ativo={tarefa.responsaveis.includes(m.id)}
                    aoClicar={() => acoes.alternarResponsavel(tarefa.id, m.id)}
                  />
                ))}
              </div>

              <p className="nota">
                Tarefa fica registrada e não muda valor nenhum. Faxineira paga é
                despesa, não tarefa.
              </p>
            </div>
          );
        }

        if (e.natureza === "despesa") {
          const item = estado.itens.find((i) => i.id === e.itemId);
          if (!item) return null;

          return (
            <div className="lancamento" key={e.id}>
              <div className="lancamento__topo">
                <span className="selo selo--modo">Despesa</span>
                <button
                  type="button"
                  className="linha-fatura__remover"
                  aria-label={`Apagar ${e.titulo}`}
                  onClick={() => acoes.removerItem(item.id)}
                >
                  ×
                </button>
              </div>

              <div className="linha-campos">
                <Campo
                  valor={item.nome}
                  aoMudar={(v) => acoes.editarItem(item.id, "nome", v)}
                  placeholder="Galão, gás, mercado…"
                  texto
                />
                <Campo
                  rotulo={simboloDe()}
                  valor={item.valor}
                  aoMudar={(v) => acoes.editarItem(item.id, "valor", v)}
                  largura="campo--curto"
                  placeholder="0,00"
                  rotuloSolto
                />
              </div>

              <div className="pastilhas">
                {estado.moradores.map((m, i) => (
                  <Pastilha
                    key={m.id}
                    cor={corDe(i)}
                    nome={nomeOu(m.nome, i)}
                    ativo={item.participantes.includes(m.id)}
                    aoClicar={() => acoes.alternarParticipante(item.id, m.id)}
                  />
                ))}
              </div>

              <p className="nota">
                A divisão desta despesa (igual, %, valor, cotas, ajuste, dias…)
                se escolhe no cartão dela, em Despesas.
              </p>
            </div>
          );
        }

        if (e.natureza === "uso") {
          return (
            <div className="lancamento" key={e.id}>
              <div className="lancamento__topo">
                <span className="selo selo--modo">Registro</span>
                <button
                  type="button"
                  className="linha-fatura__remover"
                  aria-label={`Apagar uso de ${e.titulo}`}
                  onClick={() => acoes.removerUso(e.itemId, e.usoId)}
                >
                  ×
                </button>
              </div>
              <p className="lancamento__texto">
                <strong>{e.titulo}</strong>   {e.detalhe}
              </p>
              <p className="nota">
                Quem participou e quantas vezes se ajusta em Registros.
              </p>
            </div>
          );
        }

        // presença
        return (
          <div className="lancamento" key={e.id}>
            <div className="lancamento__topo">
              <span className="selo selo--modo">
                {ROTULO_DA_NATUREZA.presenca[polaridade]}
              </span>
            </div>
            <p className="lancamento__texto">
              <strong>{e.titulo}</strong> {e.detalhe}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * O mês em ordem. Serve para conferir o que foi lançado e, principalmente,
 * para ver o que não foi: um ciclo inteiro sem marcação nenhuma é a causa
 * mais comum de um fechamento que a casa acha errado.
 */
function Historico({ porDia, polaridade, aoAbrir }) {
  const dias = Object.keys(porDia).sort();

  return (
    <Ficha>
      <Titulo nota="Tudo o que foi lançado neste conjunto, em ordem. É por aqui que se encontra o dia que ficou em branco.">
        Histórico
      </Titulo>

      {dias.length === 0 ? (
        <p className="vazio">
          Nenhum lançamento ainda. Toque num dia do calendário para começar.
        </p>
      ) : (
        <ol className="historico">
          {dias.map((dia) => (
            <li className="historico__dia" key={dia}>
              <button
                type="button"
                className="historico__data"
                onClick={() => aoAbrir(dia)}
              >
                {diaLongo(dia)}
              </button>
              <ul>
                {porDia[dia].map((e) => (
                  <li key={e.id}>
                    <i className="marca" style={{ background: CORES[e.natureza] }} />
                    <span className="historico__rotulo">
                      {e.natureza === "presenca"
                        ? ROTULO_DA_NATUREZA.presenca[polaridade]
                        : ROTULO_DA_NATUREZA[e.natureza]}
                    </span>
                    <strong>{e.titulo}</strong>   {e.detalhe}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </Ficha>
  );
}
