import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCDR } from "./ganchos/useCDR.js";
import { Avisos, mostrarAviso } from "./componentes/Interface.jsx";
import { dadosDoLink, lerLink } from "./nucleo/compartilhar/link.js";
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
import Saldos from "./telas/Saldos.jsx";
import FecharContas from "./telas/FecharContas.jsx";
import Editor from "./telas/Editor.jsx";
import CalendarioDoConjunto from "./telas/CalendarioDoConjunto.jsx";
import Lembretes from "./telas/Lembretes.jsx";
import Registros from "./telas/Registros.jsx";
import DespesaCiclica from "./telas/DespesaCiclica.jsx";
import Notificacoes from "./telas/Notificacoes.jsx";
import Atividade from "./telas/Atividade.jsx";
import Perfil from "./telas/Perfil.jsx";
import Configurar from "./telas/Configurar.jsx";

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
  saldos: Saldos,
  fechar: FecharContas,
  editar: Editor,
  calendario: CalendarioDoConjunto,
  lembretes: Lembretes,
  registros: Registros,
  ciclo: DespesaCiclica,
  configurar: Configurar,
  notificacoes: Notificacoes,
};

/**
 * As seções do conjunto: as que o hub abre direto. Só elas mostram a barra de baixo;
 * qualquer outra tela (lançar, ver despesas, composição, fechar, configurar…) esconde
 * a barra para a pessoa ficar só na ação.
 */
const SECOES_COM_BARRA = new Set(["hub", "despesas", "verDespesas", "saldos", "calendario", "lembretes", "registros"]);

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

  const ir = useCallback((tela, params = {}) => {
    setPilha((p) => [...p, { tela, ...params }]);
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
      setPilha(destino ? [{ tela: "hub" }, destino] : [{ tela: "hub" }]);
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
    abrir,
    sairDoConjunto,
    escolherAba,
    comecarACriar,
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
  } else if (fora?.tela === "notificacoes" && !estado) {
    comBarra = false;
    corpo = <Notificacoes app={app} aoVoltar={() => setFora(null)} />;
  } else if (estado) {
    const rota = pilha[pilha.length - 1] ?? { tela: "hub" };
    const Tela = TELAS_DO_CONJUNTO[rota.tela] ?? Hub;
    comBarra = SECOES_COM_BARRA.has(rota.tela);
    abaAtiva = "conjuntos";
    corpo = <Tela key={`${idDoConjunto}-${pilha.length}-${rota.tela}`} app={app} rota={rota} />;
  } else if (aba === "conjuntos") {
    corpo = <ListaDeConjuntos app={app} />;
  } else if (aba === "atividade") {
    corpo = <Atividade app={app} />;
  } else if (aba === "perfil") {
    corpo = <Perfil app={app} />;
  } else {
    corpo = <Inicio app={app} />;
  }

  return (
    <div className={`app ${comBarra ? "app--com-barra" : ""}`}>
      <main className="app__corpo">{corpo}</main>

      {folha && <FolhaDeCriar app={app} aoFechar={() => setFolha(false)} />}

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
  );
}
