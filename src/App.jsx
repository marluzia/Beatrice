import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCDR } from "./ganchos/useCDR.js";
import { Avisos, mostrarAviso, SinoContexto } from "./componentes/Interface.jsx";
import { dadosDoLink, lerLink } from "./nucleo/compartilhar/link.js";
import { definirMoedaAtual } from "./nucleo/moedas.js";
import BarraInferior from "./componentes/BarraInferior.jsx";
import { quemSouEu, resumoDoConjunto } from "./nucleo/resumo.js";
import Inicio from "./telas/Inicio.jsx";
import ListaDeConjuntos from "./telas/ListaDeConjuntos.jsx";
import FolhaDeCriar from "./telas/FolhaDeCriar.jsx";
import NovoConjunto from "./telas/NovoConjunto.jsx";
import Hub from "./telas/Hub.jsx";
import Despesas from "./telas/Despesas.jsx";
import VerDespesas from "./telas/VerDespesas.jsx";
import Historico from "./telas/Historico.jsx";
import LancarDespesa from "./telas/LancarDespesa.jsx";
import Busca from "./telas/Busca.jsx";
import Pessoas from "./telas/Pessoas.jsx";
import Itens from "./telas/Itens.jsx";
import Analise from "./telas/Analise.jsx";
import Lancamento from "./telas/Lancamento.jsx";
import LancarLembrete from "./telas/LancarLembrete.jsx";
import EditarLancamento from "./telas/EditarLancamento.jsx";
import EditarItem from "./telas/EditarItem.jsx";
import VerLembretes from "./telas/VerLembretes.jsx";
import LancarRegistro from "./telas/LancarRegistro.jsx";
import VerRegistros from "./telas/VerRegistros.jsx";
import Saldos from "./telas/Saldos.jsx";
import FecharContas from "./telas/FecharContas.jsx";
import AgendaDoConjunto from "./telas/AgendaDoConjunto.jsx";
import Lembretes from "./telas/Lembretes.jsx";
import Registros from "./telas/Registros.jsx";
import DespesaCiclica from "./telas/DespesaCiclica.jsx";
import Notificacoes from "./telas/Notificacoes.jsx";
import Atividade from "./telas/Atividade.jsx";
import Perfil from "./telas/Perfil.jsx";
import Configurar from "./telas/Configurar.jsx";
import { TelaDoPeriodo } from "./telas/Periodo.jsx";

function aoTopo() {
  try {
    const reduz =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduz ? "auto" : "instant" });
  } catch {
    window.scrollTo(0, 0);
  }
}

/** As telas de dentro de um conjunto, pela chave da rota. */
const TELAS_DO_CONJUNTO = {
  hub: Hub,
  despesas: Despesas,
  verDespesas: VerDespesas,
  historico: Historico,
  lancar: LancarDespesa,
  saldos: Saldos,
  fechar: FecharContas,
  agenda: AgendaDoConjunto,
  pessoas: Pessoas,
  itens: Itens,
  analise: Analise,
  lancamento: Lancamento,
  lancarLembrete: LancarLembrete,
  editarLancamento: EditarLancamento,
  editarItem: EditarItem,
  verLembretes: VerLembretes,
  lancarRegistro: LancarRegistro,
  verRegistros: VerRegistros,
  lembretes: Lembretes,
  registros: Registros,
  ciclo: DespesaCiclica,
  configurar: Configurar,
  notificacoes: Notificacoes,
  periodo: TelaDoPeriodo,
};

/**
 * Dentro de um conjunto, a barra de baixo é a principal do app (Início,
 * Conjuntos, +, Atividade, Perfil) e só aparece no painel e nas seções do
 * menu de cima (Agenda, Análise, Pessoas). Toda outra tela   lançar, ver,
 * Fechar contas, Configurar   esconde a barra, para a pessoa ficar só no
 * que veio fazer.
 */
const SECOES_DO_CONJUNTO = ["agenda", "analise", "pessoas"];
const COM_BARRA_DO_CONJUNTO = new Set(["hub", ...SECOES_DO_CONJUNTO]);

/**
 * Lembretes, Registros e Período eram abas do painel; o painel agora lança e
 * vê pela calculadora. Quem ainda pede essas telas cai em Ver lembretes, Ver
 * registros e na tela do Período.
 */
const PARA_ONDE_FOI = { lembretes: "verLembretes", registros: "verRegistros" };
const naAba = (destino) => (destino && PARA_ONDE_FOI[destino.tela] ? { ...destino, tela: PARA_ONDE_FOI[destino.tela] } : destino);

export default function App() {
  const cdr = useCDR();
  const { estado, resultado, modo, acoes, conjuntos, panorama, perfil, idDoConjunto } = cdr;

  // A aba de baixo, quando nenhum conjunto está aberto.
  const [aba, setAba] = useState("inicio");
  // As telas abertas dentro do conjunto, a última por cima.
  const [pilha, setPilha] = useState([{ tela: "hub" }]);
  // Telas que não são de conjunto nenhum: criar, notificações.
  const [fora, setFora] = useState(null);
  const [folha, setFolha] = useState(false);
  // Uma tela pode tirar a barra de baixo por um tempo (a agenda, com um dia escolhido).
  const [barraOculta, setBarraOculta] = useState(false);
  const esconderBarra = useCallback((sim) => setBarraOculta(Boolean(sim)), []);

  const ir = useCallback((tela, params = {}) => {
    setPilha((p) => [...p, naAba({ tela, ...params })]);
    aoTopo();
  }, []);

  /** Uma das seções da barra do conjunto: fica logo acima do painel. */
  const irParaSecao = useCallback((tela) => {
    setPilha([{ tela: "hub" }, { tela }]);
    setFolha(false);
    aoTopo();
  }, []);

  /** Conjunto, na barra do conjunto: o painel, sem nada empilhado. */
  const irAoPainel = useCallback(() => {
    setPilha([{ tela: "hub" }]);
    setFolha(false);
    aoTopo();
  }, []);

  /** Troca a tela de cima por outra (sem empilhar). */
  const trocar = useCallback((tela, params = {}) => {
    setPilha((p) => [...p.slice(0, -1), { tela, ...params }]);
    aoTopo();
  }, []);

  const sairDoConjunto = useCallback(() => {
    acoes.fecharConjunto();
    setPilha([{ tela: "hub" }]);
    aoTopo();
  }, [acoes]);

  /**
   * Volta e tira também as telas de baixo que eram do lançamento apagado
   * (apagar em Editar despesa não cai em "este lançamento não existe mais").
   */
  const voltarSem = useCallback((telas) => {
    setPilha((p) => {
      let q = p.slice(0, -1);
      while (q.length > 1 && telas.includes(q[q.length - 1].tela)) q = q.slice(0, -1);
      return q.length ? q : [{ tela: "hub" }];
    });
    aoTopo();
  }, []);

  const voltar = useCallback(() => {
    if (pilha.length > 1) {
      setPilha((p) => p.slice(0, -1));
      aoTopo();
      return;
    }
    sairDoConjunto();
  }, [pilha.length, sairDoConjunto]);

  /** Abre um conjunto, já numa tela de dentro dele se `destino` vier. */
  const abrir = useCallback(
    (id, destino = null) => {
      if (id !== idDoConjunto) {
        // Grava o que estiver pendente no conjunto aberto antes de trocar.
        if (estado) acoes.fecharConjunto();
        if (!acoes.abrirConjunto(id)) return;
      }
      const alvo = naAba(destino);
      setPilha(!alvo ? [{ tela: "hub" }] : alvo.tela === "hub" ? [alvo] : [{ tela: "hub" }, alvo]);
      setFora(null);
      setFolha(false);
      aoTopo();
    },
    [acoes, idDoConjunto, estado],
  );

  const escolherAba = useCallback(
    (chave) => {
      if (estado) acoes.fecharConjunto();
      setPilha([{ tela: "hub" }]);
      setFora(null);
      setFolha(false);
      setAba(chave);
      aoTopo();
    },
    [acoes, estado],
  );

  const comecarACriar = useCallback(() => {
    setFolha(false);
    if (estado) acoes.fecharConjunto();
    setFora({ tela: "criar" });
    aoTopo();
  }, [acoes, estado]);

  // Um link de conjunto (…#conjunto=…) abre a cópia que veio nele.
  const ultimoLink = useRef(null);
  useEffect(() => {
    const abrirDoLink = async () => {
      const dados = dadosDoLink(window.location.hash);
      if (!dados || ultimoLink.current === dados) return;
      ultimoLink.current = dados;
      try {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch {
        /* sem history: o # fica, e o ref impede abrir duas vezes */
      }
      let id = null;
      try {
        id = acoes.importar(await lerLink(dados));
      } catch {
        id = null;
      }
      if (!id) {
        mostrarAviso("Não consegui abrir esse link de conjunto. Peça um link novo para quem enviou.");
        return;
      }
      abrir(id);
      mostrarAviso("Conjunto aberto pelo link. É uma cópia: o que mudar aqui não muda para quem enviou.");
    };
    abrirDoLink();
    window.addEventListener("hashchange", abrirDoLink);
    return () => window.removeEventListener("hashchange", abrirDoLink);
  }, [acoes, abrir]);

  const nomeDoConjunto = conjuntos.find((c) => c.id === idDoConjunto)?.nome;

  // Dentro de um conjunto, todo valor sai na moeda dele; fora, em real (quem
  // mostra valores de vários conjuntos diz a moeda de cada um).
  definirMoedaAtual(estado?.moeda);

  // O saldo de você no conjunto aberto, ao vivo (o panorama só relê ao gravar).
  const resumo = useMemo(
    () => (estado && resultado ? resumoDoConjunto(estado, { perfil, resultado }) : null),
    [estado, resultado, perfil],
  );
  const eu = estado ? quemSouEu(estado, perfil) : null;

  const app = {
    ...cdr,
    nomeDoConjunto,
    resumo,
    eu,
    ir,
    trocar,
    voltar,
    voltarSem,
    abrir,
    sairDoConjunto,
    escolherAba,
    comecarACriar,
    esconderBarra,
    irParaSecao,
    irAoPainel,
    abrirBusca: ({ aba: abaDaBusca = "conjuntos", animar = false } = {}) => {
      setFora({ tela: "busca", aba: abaDaBusca, animar });
      aoTopo();
    },
    abrirNotificacoes: () => {
      if (estado) ir("notificacoes");
      else setFora({ tela: "notificacoes" });
      aoTopo();
    },
  };

  let corpo;
  let comBarra = true;
  let abaAtiva = aba;

  if (fora?.tela === "criar") {
    comBarra = false;
    corpo = (
      <NovoConjunto
        app={app}
        aoCancelar={() => setFora(null)}
        aoCriar={(pedido) => {
          acoes.criarConjuntoNovo(pedido);
          setPilha([{ tela: "hub" }]);
          setFora(null);
          setAba("conjuntos");
          aoTopo();
        }}
      />
    );
  } else if (fora?.tela === "busca") {
    comBarra = false;
    corpo = <Busca app={app} abaInicial={fora.aba} animar={fora.animar} aoVoltar={() => setFora(null)} />;
  } else if (fora?.tela === "notificacoes" && !estado) {
    comBarra = false;
    corpo = <Notificacoes app={app} aoVoltar={() => setFora(null)} />;
  } else if (estado) {
    const rota = pilha[pilha.length - 1] ?? { tela: "hub" };
    const Tela = TELAS_DO_CONJUNTO[rota.tela] ?? Hub;
    comBarra = COM_BARRA_DO_CONJUNTO.has(rota.tela);
    abaAtiva = "conjuntos";
    corpo = <Tela key={`${idDoConjunto}-${pilha.length}-${rota.tela}-${rota.vez ?? ""}`} app={app} rota={rota} />;
  } else if (aba === "conjuntos") {
    corpo = <ListaDeConjuntos app={app} />;
  } else if (aba === "atividade") {
    corpo = <Atividade app={app} />;
  } else if (aba === "perfil") {
    corpo = <Perfil app={app} />;
  } else {
    corpo = <Inicio app={app} />;
  }

  if (barraOculta) comBarra = false;

  const sino = { abrir: app.abrirNotificacoes, pendente: panorama.some((p) => p.resumo?.aPagar > 0) };

  return (
    <SinoContexto.Provider value={sino}>
    <div className={`app ${comBarra ? "app--com-barra" : ""}`}>
      <main className="app__corpo">{corpo}</main>

      {folha && <FolhaDeCriar app={app} aoFechar={() => setFolha(false)} />}

      {/* Dentro de um conjunto também vale a barra principal: tocar nela sai do conjunto. */}
      {comBarra && (
        <BarraInferior
          aba={abaAtiva}
          aoEscolher={escolherAba}
          aoCriar={() => setFolha((f) => !f)}
          criando={folha}
        />
      )}

      <Avisos />
    </div>
    </SinoContexto.Provider>
  );
}
