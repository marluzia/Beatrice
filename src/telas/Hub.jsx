import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import {
  Abas,
  Anel,
  Avatar,
  centavosEmDinheiro,
  dinheiro,
  LinhaDeMenu,
  NomeComItalico,
  SeloPilula,
  TituloDeSecao,
  tomDoSaldo,
} from "../componentes/Interface.jsx";
import { OpcoesDeAdicionar } from "./NovoConjunto.jsx";
import FolhaDeCompartilhar from "./FolhaDeCompartilhar.jsx";
import PainelDoPeriodo, { temPeriodo } from "./Periodo.jsx";
import Registros from "./Registros.jsx";
import {
  atrasosDe,
  balancoDasDespesas,
  curta,
  hojeISO,
  linhaDoMembro,
  nomeDe,
  proximoVencimento,
  quandoFoi,
  atividadeDe,
} from "../nucleo/resumo.js";
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

export function Membros({ app }) {
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

/**
 * O cabeçalho do conjunto, como o de um grupo de conversa: numa caixa creme,
 * a seta de voltar, o nome e, embaixo dele, os membros (círculos um por cima
 * do outro, da esquerda para a direita, e quantos são); à direita, os três
 * pontos com o menu. Quanto mais gente, mais os círculos se sobrepõem para
 * caber na largura (até sobrar só a borda de cada um).
 */
export function CabecalhoDoConjunto({ estado, nome, aoVoltar, aoVerPessoas, menuAberto, aoAbrirMenu }) {
  const n = estado.moradores.length;
  const quantos = `${n} ${n === 1 ? "pessoa" : "pessoas"}`;
  return (
    <header className="cabecalho-conjunto">
      <button type="button" className="icone-botao" onClick={aoVoltar} aria-label="Voltar">
        <Icone nome="voltar" tamanho={24} />
      </button>
      <div className="cabecalho-conjunto__meio">
        <h1 className="cabecalho-conjunto__titulo">
          <NomeComItalico texto={nome} />
        </h1>
        <button type="button" className="membros-em-fila" onClick={aoVerPessoas} aria-label={`${quantos}: ver pessoas`}>
          {n > 0 && (
            <span className="membros-em-fila__rolo" aria-hidden="true">
              {estado.moradores.map((m, i) => (
                <span className="membros-em-fila__lugar" key={m.id} style={{ zIndex: n - i }}>
                  <Avatar nome={nomeDe(estado, m.id)} indice={i} tamanho={24} />
                </span>
              ))}
            </span>
          )}
          <span className="membros-em-fila__quantos">{quantos}</span>
        </button>
      </div>
      <button
        type="button"
        className="icone-botao"
        onClick={aoAbrirMenu}
        aria-label="Mais opções"
        aria-expanded={menuAberto}
      >
        <Icone nome="pontos" tamanho={24} />
      </button>
    </header>
  );
}

/** A legenda de um anel: a bolinha da cor, o nome e o valor. */
function Legenda({ itens }) {
  return (
    <span className="legenda-do-anel">
      {itens.map((i) => (
        <span key={i.rotulo} className="legenda-do-anel__item">
          <i className={`legenda-anel__ponto legenda-anel__ponto--${i.cor}`} aria-hidden="true" />
          <span>{i.rotulo}</span>
          <strong>{dinheiro(i.valor, { simbolo: false })}</strong>
        </span>
      ))}
    </span>
  );
}

/** O painel de um conjunto: saldos, o próximo vencimento, despesas ou pessoas, e o resto. */
/**
 * As abas do painel. Evento: Despesas e Lembretes. Temporada: Período antes.
 * As casas e a Multi: Período, Despesas, Lembretes e Registros.
 */
export function abasDoPainel(modo) {
  const semFaturas = modo.faturas === false;
  return [
    ...(temPeriodo(modo) ? [{ valor: "periodo", rotulo: "Período" }] : []),
    { valor: "despesas", rotulo: "Despesas" },
    { valor: "lembretes", rotulo: "Lembretes" },
    ...(semFaturas ? [] : [{ valor: "registros", rotulo: "Registros" }]),
  ];
}

export default function Hub({ app, rota }) {
  const { estado, resultado, modo, acoes, resumo, eu, ir, voltar, nomeDoConjunto } = app;
  const [aba, setAba] = useState(rota?.aba ?? "despesas");
  const abas = abasDoPainel(modo);
  const abaVisivel = abas.some((a) => a.valor === aba) ? aba : "despesas";
  const [compartilhando, setCompartilhando] = useState(false);
  const [menu, setMenu] = useState(false);
  const hoje = hojeISO();
  const semFaturas = modo.faturas === false;
  const mes = MESES[estado.periodo.mes - 1];

  const total = (resumo?.total ?? 0) / 100;
  const aberto = (resumo?.aberto ?? 0) / 100;
  const tom = eu ? tomDoSaldo(aberto) : "zero";

  const atividade = atividadeDe(estado, { resultado });
  const vencimento = semFaturas ? null : proximoVencimento(estado, hoje);
  const situacao = situacaoDoFechamento(resumo);
  const quantosPix = resumo?.transferencias?.length ?? 0;

  const atrasos = atrasosDe(estado, hoje);
  const recentes = atividade.slice(0, 5);

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
  return (
    <div className="tela">
      <CabecalhoDoConjunto
        estado={estado}
        nome={nomeDoConjunto}
        aoVoltar={voltar}
        aoVerPessoas={() => ir("pessoas")}
        menuAberto={menu}
        aoAbrirMenu={() => setMenu((v) => !v)}
      />

      {menu && (
        <div className="menu-pontos__fundo" onClick={() => setMenu(false)}>
          <div className="menu-pontos" role="menu" aria-label="Mais opções" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              role="menuitem"
              className="menu-pontos__item"
              onClick={() => {
                setMenu(false);
                setCompartilhando(true);
              }}
            >
              <Icone nome="enviar" tamanho={20} /> Compartilhar
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-pontos__item"
              onClick={() => {
                setMenu(false);
                ir("historico");
              }}
            >
              <Icone nome="relogio" tamanho={20} /> Histórico
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-pontos__item"
              onClick={() => {
                setMenu(false);
                ir("configurar");
              }}
            >
              <Icone nome="engrenagem" tamanho={20} /> Configurar conjunto
            </button>
          </div>
        </div>
      )}


      <div className="aneis">
        <div className="cartao-anel">
          <Anel tamanho={140} partes={partesDoTotal}>
            <span className="rotulo">Total</span>
            <strong className="valor-anel">{dinheiro(total)}</strong>
          </Anel>
          <Legenda
            itens={[
              { cor: "agua", rotulo: "pago", valor: balanco.pago },
              { cor: "ouro", rotulo: "aberto", valor: balanco.aberto },
            ]}
          />
        </div>
        <div className="cartao-anel">
          <Anel
            tamanho={140}
            partes={
              eu
                ? [
                    { valor: resumo.aPagar, cor: "var(--vermelho)" },
                    { valor: resumo.aReceber, cor: "var(--verde)" },
                  ]
                : [{ valor: 1, cor: "var(--tinta)" }]
            }
          >
            <span className="rotulo">Meu saldo</span>
            <strong className={`valor-anel valor--${tom}`}>{eu ? centavosEmDinheiro(resumo.aberto, { sinal: true }) : "—"}</strong>
          </Anel>
          {eu ? (
            <Legenda
              itens={[
                { cor: "vermelho", rotulo: "pagar", valor: resumo.aPagar / 100 },
                { cor: "verde", rotulo: "receber", valor: resumo.aReceber / 100 },
              ]}
            />
          ) : (
            <button type="button" className="cartao-anel__nota link-sublinhado" onClick={() => ir("pessoas")}>
              Quem é você aqui?
            </button>
          )}
        </div>
      </div>

      {atrasos.map((a) => (
        <button
          key={a.ciclo.id}
          type="button"
          className="faixa-aviso faixa-aviso--atraso"
          onClick={() => ir("lancamento", { tipo: "ciclica", id: a.ciclo.id })}
        >
          <Icone nome="relogio" tamanho={20} className="faixa-aviso__icone" />
          <span>
            {a.ciclo.nome} venceu {curta(a.ciclo.vencimento)} · <strong>ninguém pagou</strong>
          </span>
          <SeloPilula tom="vermelho">atrasada</SeloPilula>
        </button>
      ))}

      {vencimento && (
        <button type="button" className="faixa-aviso" onClick={() => ir("lancamento", { tipo: "ciclica", id: vencimento.ciclo.id })}>
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

      <Abas rotulo="O que ver" valor={abaVisivel} aoMudar={setAba} opcoes={abas} />

      {abaVisivel === "periodo" ? (
        <PainelDoPeriodo app={app} />
      ) : abaVisivel === "lembretes" ? (
        <div className="cartao-lista">
          <LinhaDeMenu
            icone="mais"
            iconeEscuro
            titulo="Lançar lembretes"
            subtitulo="listas e notas"
            aoClicar={() => ir("lancarLembrete")}
          />
          <LinhaDeMenu
            icone="busca"
            titulo="Ver lembretes"
            subtitulo={`${(estado.lembretes ?? []).length} ${(estado.lembretes ?? []).length === 1 ? "lembrete" : "lembretes"} · buscar e filtrar`}
            aoClicar={() => ir("verLembretes")}
          />
        </div>
      ) : abaVisivel === "registros" ? (
        <Registros app={app} />
      ) : (
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
      )}

      {recentes.length > 0 && (
        <section className="recente" aria-label="Recente">
          <h2 className="recente__titulo">Recente</h2>
          {recentes.map((r, i) => (
            <button
              key={`${r.quando}-${i}`}
              type="button"
              className="faixa-aviso"
              onClick={() => (r.ref ? ir("lancamento", r.ref) : ir("historico"))}
            >
              <span className={`ponto-atividade ponto-atividade--${r.tipo}`} aria-hidden="true" />
              <span className="faixa-aviso__duas">
                <strong>{r.texto}</strong>
                <span>
                  {quandoFoi(r.quando, hoje)}
                  {r.tipo === "despesa" && r.regra ? ` · ${r.regra}${r.regra === "igual" ? ` entre ${r.participantes}` : ""}` : ""}
                </span>
              </span>
              {r.valor > 0 && <strong className="faixa-aviso__valor">{dinheiro(r.valor)}</strong>}
            </button>
          ))}
          {atividade.length > recentes.length && (
            <button type="button" className="link-mono link-mono--centro" onClick={() => ir("historico")}>
              mostrar mais
            </button>
          )}
        </section>
      )}

      {!eu && estado.moradores.length > 0 && (
        <p className="nota-tipo">
          Para ver o seu saldo, diga quem é você: em Pessoas (na barra de baixo), toque nos três pontinhos e escolha “Sou eu”.
        </p>
      )}

      {compartilhando && <FolhaDeCompartilhar app={app} aoFechar={() => setCompartilhando(false)} />}
    </div>
  );
}
