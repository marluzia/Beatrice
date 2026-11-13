import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import {
  Abas,
  Anel,
  Avatar,
  centavosEmDinheiro,
  dinheiro,
  Ladrilho,
  LinhaDeMenu,
  mostrarAviso,
  NomeComItalico,
  SeloPilula,
  Sobrescrito,
  TituloDeSecao,
  TopoDaTela,
  tomDoSaldo,
} from "../componentes/Interface.jsx";
import { CORES_DO_CICLO, GraficoDosCiclos, ParaOndeFoi } from "./graficos.jsx";
import { OpcoesDeAdicionar } from "./NovoConjunto.jsx";
import FolhaDeCompartilhar from "./FolhaDeCompartilhar.jsx";
import PainelDoPeriodo, { temPeriodo } from "./Periodo.jsx";
import {
  atrasosDe,
  balancoDasDespesas,
  curta,
  despesasAvulsas,
  diaDaSemanaCurto,
  historicoDosCiclos,
  hojeISO,
  linhaDoMembro,
  nomeDe,
  periodoDe,
  proximoVencimento,
  quandoFoi,
  atividadeDe,
} from "../nucleo/resumo.js";
import { partesDoTipo } from "./comum.js";
import { MESES } from "../nucleo/formato.js";

/** O selo da linha "Fechar contas": quitado, em andamento, em aberto. */
export function situacaoDoFechamento(resumo) {
  const t = resumo?.transferencias ?? [];
  if (resumo?.acerto?.precisaCeder) return { texto: "falta quem cede", tom: "ouro" };
  if (t.length === 0) return null;
  const feitas = t.filter((x) => x.confirmada).length;
  if (feitas === t.length) return { texto: "quitado", tom: "verde" };
  if (feitas > 0) return { texto: "em andamento", tom: "ouro" };
  return { texto: "em aberto", tom: "ouro" };
}

/** O cabeçalho de toda tela de conjunto: "REPÚBLICA GIRASSOL · FECHAMENTO DE OUTUBRO". */
export function sobrescritoDaTela(app) {
  const { estado, modo, nomeDoConjunto } = app;
  return [nomeDoConjunto, modo.faturas !== false ? `Fechamento de ${MESES[estado.periodo.mes - 1]}` : null];
}

function Membros({ app }) {
  const { estado, modo, acoes, eu } = app;
  const [menu, setMenu] = useState(null);
  const [editando, setEditando] = useState(null);
  const [texto, setTexto] = useState("");

  return (
    <>
      <section className="cartao-adicionar">
        <h3>
          <Icone nome="mais" tamanho={22} espessura={2} /> Adicionar pessoa
        </h3>
        <OpcoesDeAdicionar escuro aoConvidar={(nome) => acoes.adicionarPessoa(nome)} />
        <p className="ajuda-campo">Convidado entra na divisão sem precisar de conta no app.</p>
      </section>

      <TituloDeSecao direita={`${estado.moradores.length} de ${modo.maximoDeMoradores}`}>Membros</TituloDeSecao>

      {estado.moradores.length === 0 ? (
        <p className="vazio-suave">Ninguém ainda. Adicione as pessoas que dividem {modo.palavras.oConjunto}.</p>
      ) : (
        <div className="cartao-lista">
          {estado.moradores.map((m, i) => {
            const nome = nomeDe(estado, m.id);
            const linha = linhaDoMembro(estado, m);
            return (
              <div className="linha-membro" key={m.id}>
                <Avatar nome={nome} indice={i} />
                <div className="linha-membro__textos">
                  {editando === m.id ? (
                    <input
                      className="caixa caixa--texto caixa--compacta"
                      value={texto}
                      autoFocus
                      onChange={(e) => setTexto(e.target.value)}
                      onBlur={() => {
                        acoes.editarMorador(m.id, "nome", texto.trim());
                        setEditando(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      aria-label="Nome"
                    />
                  ) : (
                    <strong>
                      {nome}
                      {m.id === eu && <span className="voce"> (você)</span>}
                      {m.id === estado.admin && <span className="selo-admin">admin</span>}
                    </strong>
                  )}
                  {linha && <span>{linha}</span>}
                  {!linha && m.convidado && <span>convidado</span>}
                </div>
                <button
                  type="button"
                  className="icone-botao"
                  aria-label={`Opções de ${nome}`}
                  aria-expanded={menu === m.id}
                  onClick={() => setMenu(menu === m.id ? null : m.id)}
                >
                  <Icone nome="pontos" tamanho={22} />
                </button>
                {menu === m.id && (
                  <div className="menu-flutuante" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setTexto(m.nome);
                        setEditando(m.id);
                        setMenu(null);
                      }}
                    >
                      Renomear
                    </button>
                    {m.id !== eu && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          acoes.definirVoce(m.id);
                          setMenu(null);
                        }}
                      >
                        Sou eu
                      </button>
                    )}
                    {m.id !== estado.admin && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          acoes.definirCampoDoConjunto("admin", m.id);
                          setMenu(null);
                        }}
                      >
                        Tornar admin
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className="menu-flutuante__perigo"
                      onClick={() => {
                        setMenu(null);
                        if (window.confirm(`Tirar ${nome} de ${modo.palavras.oConjunto}? As despesas pagas por ${nome} ficam sem pagador.`)) {
                          acoes.removerPessoa(m.id);
                        }
                      }}
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/** O painel de um conjunto: saldos, o próximo vencimento, despesas ou pessoas, e o resto. */
export default function Hub({ app }) {
  const { estado, resultado, modo, acoes, resumo, eu, ir, voltar, nomeDoConjunto } = app;
  const [aba, setAba] = useState("despesas");
  const [compartilhando, setCompartilhando] = useState(false);
  const hoje = hojeISO();
  const semFaturas = modo.faturas === false;
  const periodo = periodoDe(estado);
  const mes = MESES[estado.periodo.mes - 1];

  const total = (resumo?.total ?? 0) / 100;
  const aberto = (resumo?.aberto ?? 0) / 100;
  const tom = eu ? tomDoSaldo(aberto) : "zero";
  const corDoAnel = tom === "pagar" ? "var(--vermelho)" : tom === "receber" ? "var(--verde)" : "var(--tinta)";

  const atividade = atividadeDe(estado, { resultado });
  const vencimento = semFaturas ? null : proximoVencimento(estado, hoje);
  const situacao = situacaoDoFechamento(resumo);
  const quantosPix = resumo?.transferencias?.length ?? 0;

  const admin = estado.admin ? nomeDe(estado, estado.admin) : null;

  const subtitulo = semFaturas
    ? modo.chave === "temporada"
      ? `${periodo.texto}${admin ? ` · organizada por ${admin}` : ""}`
      : situacao?.texto === "quitado"
        ? `Contas fechadas${admin ? ` · organizado por ${admin}` : ""}`
        : `Aberto para lançamentos${admin ? ` · organizado por ${admin}` : ""}`
    : `Fechamento de ${mes} · ${periodo.texto}`;

  const sobrescrito = semFaturas
    ? [modo.nome, `${estado.moradores.length} ${estado.moradores.length === 1 ? "pessoa" : "pessoas"}`, estado.desde ? diaDaSemanaCurto(estado.desde) : null]
    : partesDoTipo(estado);

  const atrasos = atrasosDe(estado, hoje);
  const recente = atividade[0] ?? null;

  // O anel do total: o que está em aberto (amarelo) e o que já foi pago
  // (verde-água). Quando tudo foi pago e o acerto entre vocês terminou, preto.
  const balanco = balancoDasDespesas(estado, resultado, hoje);
  const acertoFeito =
    !resumo?.acerto?.precisaCeder && (resumo?.transferencias ?? []).every((t) => t.confirmada);
  const quitado = balanco.aberto < 0.005 && balanco.pago > 0 && acertoFeito;
  const partesDoTotal = quitado
    ? [{ valor: 1, cor: "var(--tinta)" }]
    : [
        { valor: balanco.pago, cor: "var(--agua)" },
        { valor: balanco.aberto, cor: "var(--ouro)" },
      ];
  const notaDoTotal = quitado
    ? "tudo quitado"
    : balanco.aberto > 0 && balanco.pago > 0
      ? `${dinheiro(balanco.pago, { simbolo: false })} pago · ${dinheiro(balanco.aberto, { simbolo: false })} em aberto`
      : balanco.aberto > 0
        ? "tudo em aberto"
        : balanco.pago > 0
          ? "tudo pago · falta o acerto"
          : semFaturas
            ? "lançado até agora"
            : "do período";

  return (
    <div className="tela">
      <TopoDaTela
        aoVoltar={voltar}
        acoes={[
          { icone: "enviar", rotulo: "Compartilhar conjunto", aoClicar: () => setCompartilhando(true) },
          { icone: "info", rotulo: "Sobre o conjunto", aoClicar: () => ir("configurar") },
          { icone: "relogio", rotulo: "Histórico", aoClicar: () => ir("historico") },
          { icone: "sino", rotulo: "Notificações", aoClicar: () => ir("notificacoes"), marcado: resumo?.aPagar > 0 },
        ]}
      />

      <button type="button" className="pilula-config" onClick={() => ir("configurar")}>
        <Icone nome="lapis" tamanho={18} /> <Icone nome="ajustes" tamanho={18} /> Configurar conjunto
      </button>

      <Sobrescrito partes={sobrescrito} />
      <h1 className="titulo-tela titulo-tela--conjunto">
        <NomeComItalico texto={nomeDoConjunto} />
      </h1>
      <p className="texto-apoio texto-apoio--colado">{subtitulo}</p>

      <div className="aneis">
        <div className="cartao-anel">
          <Anel tamanho={140} espessura={13} partes={partesDoTotal}>
            <span className="rotulo">Total</span>
            <strong className="valor-anel">{dinheiro(total)}</strong>
          </Anel>
          <span className={`cartao-anel__nota ${quitado ? "" : "cartao-anel__nota--balanco"}`}>
            {!quitado && balanco.aberto + balanco.pago > 0 && (
              <span className="legenda-anel" aria-hidden="true">
                {balanco.pago > 0 && <i className="legenda-anel__ponto legenda-anel__ponto--agua" />}
                {balanco.aberto > 0 && <i className="legenda-anel__ponto legenda-anel__ponto--ouro" />}
              </span>
            )}
            {notaDoTotal}
          </span>
        </div>
        <div className="cartao-anel">
          <Anel tamanho={140} espessura={13} partes={[{ valor: 1, cor: corDoAnel }]}>
            <span className="rotulo">Meu saldo</span>
            <strong className={`valor-anel valor--${tom}`}>{eu ? centavosEmDinheiro(resumo.aberto, { sinal: true }) : "—"}</strong>
          </Anel>
          {eu ? (
            <span className="cartao-anel__nota">
              {semFaturas
                ? `parte ${dinheiro(resumo.minhaParte / 100, { simbolo: false })} · pagou ${dinheiro(resumo.euPaguei / 100, { simbolo: false })}`
                : `pagar ${dinheiro(resumo.aPagar / 100, { simbolo: false })} · receber ${dinheiro(resumo.aReceber / 100, { simbolo: false })}`}
            </span>
          ) : (
            <button type="button" className="cartao-anel__nota link-sublinhado" onClick={() => setAba("pessoas")}>
              Quem é você aqui?
            </button>
          )}
        </div>
      </div>

      {recente && (
        <section className="recente" aria-label="Recente">
          <h2 className="recente__titulo">Recente</h2>
          <button type="button" className="faixa-aviso" onClick={() => ir("historico")}>
            <span className={`ponto-atividade ponto-atividade--${recente.tipo}`} aria-hidden="true" />
            <span className="faixa-aviso__duas">
              <strong>{recente.texto}</strong>
              <span>
                {quandoFoi(recente.quando, hoje)}
                {recente.tipo === "despesa" && recente.regra
                  ? ` · ${recente.regra}${recente.regra === "igual" ? ` entre ${recente.participantes}` : ""}`
                  : ""}
              </span>
            </span>
            {recente.valor > 0 && <strong className="faixa-aviso__valor">{dinheiro(recente.valor)}</strong>}
          </button>
          {atividade.length > 1 && (
            <button type="button" className="link-mono link-mono--centro" onClick={() => ir("historico")}>
              mostrar mais
            </button>
          )}
        </section>
      )}

      {atrasos.map((a) => (
        <button
          key={a.ciclo.id}
          type="button"
          className="faixa-aviso faixa-aviso--atraso"
          onClick={() => ir("ciclo", { id: a.ciclo.id })}
        >
          <Icone nome="relogio" tamanho={20} className="faixa-aviso__icone" />
          <span>
            {a.ciclo.nome} venceu {curta(a.ciclo.vencimento)} · <strong>ninguém pagou</strong>
          </span>
          <SeloPilula tom="vermelho">atrasada</SeloPilula>
        </button>
      ))}

      {vencimento && (
        <button type="button" className="faixa-aviso" onClick={() => ir("ciclo", { id: vencimento.ciclo.id })}>
          <Icone nome={vencimento.ciclo.id === "agua" ? "gota" : "raio"} tamanho={20} className="faixa-aviso__icone" />
          <span>
            {vencimento.ciclo.nome} de {mes} vence{" "}
            {vencimento.dias === 0 ? "hoje" : vencimento.dias === 1 ? "amanhã" : `em ${vencimento.dias} dias`}
            {vencimento.pagoPor && (
              <>
                {" · "}
                <strong>paga</strong> por {nomeDe(estado, vencimento.pagoPor)}
                {vencimento.pagoEm ? ` em ${curta(vencimento.pagoEm.slice(0, 10))}` : ""}
              </>
            )}
          </span>
          <SeloPilula tom={vencimento.pagoPor ? "verde" : "vermelho"}>{vencimento.pagoPor ? "paga" : "a pagar"}</SeloPilula>
        </button>
      )}

      <Abas
        rotulo="O que ver"
        valor={aba}
        aoMudar={setAba}
        opcoes={[
          { valor: "despesas", rotulo: "Despesas" },
          { valor: "pessoas", rotulo: "Pessoas" },
          ...(temPeriodo(modo) ? [{ valor: "periodo", rotulo: "Período" }] : []),
        ]}
      />

      {aba === "periodo" && temPeriodo(modo) ? (
        <PainelDoPeriodo app={app} />
      ) : aba === "despesas" ? (
        <div className="cartao-lista">
          <LinhaDeMenu
            icone="mais"
            iconeEscuro
            titulo="Lançar despesas"
            subtitulo={semFaturas ? "avulsas, por categoria" : "avulsas e cíclicas"}
            aoClicar={() => ir("despesas")}
          />
          <LinhaDeMenu
            icone="busca"
            titulo="Ver despesas"
            subtitulo="buscar e filtrar tudo o que foi lançado"
            aoClicar={() => ir("verDespesas")}
          />
          <LinhaDeMenu
            icone="saldos"
            titulo="Ver saldos"
            subtitulo={
              semFaturas
                ? situacao?.texto === "quitado"
                  ? "contas fechadas"
                  : `prévia, enquanto ${modo.palavras.oConjunto} está ${modo.chave === "temporada" ? "aberta" : "aberto"}`
                : mes
            }
            aoClicar={() => ir("saldos")}
          />
          <LinhaDeMenu
            icone="trocar"
            titulo="Fechar contas"
            subtitulo={
              semFaturas
                ? `depois ${modo.chave === "temporada" ? "da temporada" : "do evento"}${quantosPix ? ` · ${quantosPix} Pix ${quantosPix === 1 ? "previsto" : "previstos"}` : ""}`
                : mes
            }
            selo={semFaturas ? null : situacao}
            aoClicar={() => ir("fechar")}
          />
        </div>
      ) : (
        <Membros app={app} />
      )}

      <div className={`ladrilhos ${modo.chave === "evento" || modo.chave === "temporada" ? "ladrilhos--dois" : ""}`}>
        {modo.chave === "evento" ? (
          <Ladrilho
            icone="calendario"
            titulo="Calendário"
            subtitulo="só na temporada"
            apagado
            aoClicar={() =>
              mostrarAviso("Evento não conta dias. Para marcar estadias no calendário, crie uma Temporada.")
            }
          />
        ) : (
          <Ladrilho icone="calendario" titulo="Calendário" aoClicar={() => ir("calendario")} />
        )}
        <Ladrilho icone="documento" titulo="Lembretes" aoClicar={() => ir("lembretes")} />
        {!semFaturas && <Ladrilho icone="registro" titulo="Registros" aoClicar={() => ir("registros")} />}
      </div>

      {semFaturas ? (
        <ParaOndeFoi estado={estado} despesas={despesasAvulsas(estado, resultado)} />
      ) : (
        <GraficoDosCiclos estado={estado} historico={historicoDosCiclos(estado)} cores={CORES_DO_CICLO} />
      )}

      {!eu && estado.moradores.length > 0 && (
        <p className="nota-tipo">
          Para ver o seu saldo, diga quem é você: em Pessoas, toque nos três pontinhos e escolha “Sou eu”.
        </p>
      )}

      {compartilhando && <FolhaDeCompartilhar app={app} aoFechar={() => setCompartilhando(false)} />}
    </div>
  );
}
