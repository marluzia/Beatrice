import { useState } from "react";
import { Botao, Campo, Ficha, Pastilha, Titulo } from "../componentes/index.js";
import {
  NOMES_CURTOS_DOS_DIAS,
  chaveDoMes,
  dentroDaJanela,
  janelaTotal,
  mesAnterior,
  mesDoDia,
  mesSeguinte,
  partesDoDia,
  semanasDoMes,
  ultimoDiaDaJanela,
} from "../nucleo/calendario.js";
import { MESES, corDe, nomeOu } from "../nucleo/formato.js";
import { agendaPorDia, ROTULO_DA_NATUREZA } from "../nucleo/agenda.js";

const diaCurto = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const diaLongo = (iso) => {
  const p = partesDoDia(iso);
  return p ? `${p.dia} de ${MESES[p.mes - 1]}` : iso;
};

const CORES = {
  presenca: "var(--tinta)",
  uso: "var(--ok)",
  despesa: "var(--aviso)",
  tarefa: "var(--tinta-fraca)",
};

/**
 * O calendário do conjunto: um mês, e o que aconteceu em cada dia.
 *
 * É o passo onde tudo que tem data é lançado — quem esteve (ou não esteve),
 * que aparelho rodou, que despesa caiu e que tarefa foi feita. O que o
 * calendário escreve são os mesmos campos que o motor já lia antes; ele é uma
 * porta de entrada, não um cálculo novo.
 *
 * A lista embaixo é o histórico: o mês em ordem, para a casa conferir o que
 * foi lançado e enxergar o que ficou sem marcação.
 */
export default function PassoCalendario({ estado, acoes, modo }) {
  const limite = modo.faturas ? janelaTotal(estado.faturas, estado.periodo) : null;

  const inicio = limite?.de ? partesDoDia(limite.de) : null;
  const [visivel, setVisivel] = useState(
    inicio ? { mes: inicio.mes, ano: inicio.ano } : { mes: estado.periodo.mes, ano: estado.periodo.ano },
  );
  const [aberto, setAberto] = useState(null);

  const porDia = agendaPorDia(estado);
  const semanas = semanasDoMes(visivel.mes, visivel.ano);

  const mesAtual = chaveDoMes(visivel);
  const podeVoltar = !limite || mesAtual > mesDoDia(limite.de);
  const podeAvancar = !limite || mesAtual < mesDoDia(ultimoDiaDaJanela(limite));

  const polaridade = modo.presenca;
  const rotuloPresenca = ROTULO_DA_NATUREZA.presenca[polaridade];
  const campo = polaridade === "presenca" ? "presencas" : "ausencias";

  const itensComUso = estado.itens.filter(
    (i) => i.especie === "porUso" && i.participantes.length > 0,
  );

  const tarefaPorId = (id) => (estado.tarefas ?? []).find((t) => t.id === id);

  return (
    <div className="coluna">
      <Ficha>
        <Titulo
          nota={
            polaridade === "nenhuma"
              ? "Lance aqui o que aconteceu em cada dia do evento."
              : `Toque num dia para lançar ${rotuloPresenca.toLowerCase()}, uso de aparelho, despesa ou tarefa.`
          }
        >
          O mês do conjunto
        </Titulo>

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
            {MESES[visivel.mes - 1]} {visivel.ano}
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

            const doDia = porDia[dia] ?? [];
            const cobre = !limite || dentroDaJanela(dia, limite);
            const numero = partesDoDia(dia).dia;
            const naturezas = [...new Set(doDia.map((e) => e.natureza))];

            const classes = [
              "calendario-dia",
              "calendario-dia--agenda",
              aberto === dia ? "calendario-dia--aberto" : "",
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
                  (cobre ? "" : ", fora dos ciclos das faturas")
                }
                onClick={() => setAberto(aberto === dia ? null : dia)}
              >
                {numero}
                {naturezas.length > 0 && (
                  <span className="marcas" aria-hidden="true">
                    {naturezas.map((n) => (
                      <i key={n} className="marca" style={{ background: CORES[n] }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="legenda-agenda" aria-hidden="true">
          {polaridade !== "nenhuma" && (
            <span>
              <i className="marca" style={{ background: CORES.presenca }} /> {rotuloPresenca}
            </span>
          )}
          <span>
            <i className="marca" style={{ background: CORES.uso }} /> Uso
          </span>
          <span>
            <i className="marca" style={{ background: CORES.despesa }} /> Despesa
          </span>
          <span>
            <i className="marca" style={{ background: CORES.tarefa }} /> Tarefa
          </span>
        </div>
      </Ficha>

      {aberto && (
        <Ficha>
          <Titulo nota={`O que aconteceu em ${diaLongo(aberto)}.`}>{diaCurto(aberto)}</Titulo>

          {polaridade !== "nenhuma" && estado.moradores.length > 0 && (
            <>
              <p className="dica">
                {polaridade === "presenca"
                  ? "Quem esteve na propriedade neste dia:"
                  : "Quem não dormiu em casa neste dia:"}
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

          <div className="linha-acoes">
            <Botao tipo="fantasma" aoClicar={() => acoes.lancarDespesaNoDia(aberto)}>
              + Despesa
            </Botao>
            <Botao tipo="fantasma" aoClicar={() => acoes.lancarTarefaNoDia(aberto)}>
              + Tarefa
            </Botao>
          </div>

          {itensComUso.length > 0 && (
            <>
              <p className="dica">Lançar um uso neste dia:</p>
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

          <LancamentosDoDia
            eventos={porDia[aberto] ?? []}
            estado={estado}
            acoes={acoes}
            polaridade={polaridade}
            tarefaPorId={tarefaPorId}
          />
        </Ficha>
      )}

      <Historico porDia={porDia} polaridade={polaridade} aoAbrir={setAberto} />
    </div>
  );
}

/** Os lançamentos do dia aberto, cada um com o que dá para editar nele. */
function LancamentosDoDia({ eventos, estado, acoes, polaridade, tarefaPorId }) {
  if (eventos.length === 0) {
    return <p className="vazio">Nada lançado neste dia ainda.</p>;
  }

  return (
    <div className="lancamentos">
      {eventos.map((e) => {
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
                  rotulo="R$"
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
                A regra de divisão desta despesa fica no passo de Itens, junto
                com as outras.
              </p>
            </div>
          );
        }

        if (e.natureza === "uso") {
          return (
            <div className="lancamento" key={e.id}>
              <div className="lancamento__topo">
                <span className="selo selo--modo">Uso</span>
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
                <strong>{e.titulo}</strong> — {e.detalhe}
              </p>
              <p className="nota">
                Quem participou e quantas vezes se ajusta no cartão deste item,
                no passo de Itens.
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
                    <strong>{e.titulo}</strong> — {e.detalhe}
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
