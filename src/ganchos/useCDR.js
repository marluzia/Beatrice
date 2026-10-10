import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { estadoInicial, novaLinha, novaPessoa, proximoMes } from "../nucleo/estadoInicial.js";
import { periodoDasFaturas } from "../nucleo/calendario.js";
import { calcular } from "../nucleo/adaptador.js";
import { criarItem } from "../nucleo/catalogo.js";
import { modoDe, PADRAO } from "../nucleo/modos.js";
import {
  carregarCasa,
  casaAtual,
  criarCasa,
  definirCasaAtual,
  exportarCasa,
  importarCasa,
  listarCasas,
  removerCasa,
  renomearCasa,
  salvarCasa,
} from "../nucleo/persistencia.js";

export function useCDR() {
  // Qual casa está aberta. `null` é o painel de casas.
  const [idDaCasa, setIdDaCasa] = useState(() => casaAtual());
  const [estado, definir] = useState(() => {
    const id = casaAtual();
    return id ? carregarCasa(id) : null;
  });

  // O índice do painel. Um número que muda obriga a reler a lista de casas
  // depois de criar, renomear ou apagar.
  const [revisao, revisar] = useState(0);
  const casas = useMemo(() => listarCasas(), [revisao]);

  const modo = modoDe(estado?.modo ?? PADRAO);

  // Salva sozinho meio segundo depois da última tecla.
  const agendado = useRef(null);
  useEffect(() => {
    if (!idDaCasa || !estado) return undefined;

    clearTimeout(agendado.current);
    agendado.current = setTimeout(() => {
      salvarCasa(idDaCasa, estado);
      revisar((n) => n + 1);
    }, 500);

    return () => clearTimeout(agendado.current);
  }, [estado, idDaCasa]);

  const resultado = useMemo(() => (estado ? calcular(estado) : null), [estado]);

  const indicePorId = useMemo(() => {
    const mapa = {};
    (estado?.moradores ?? []).forEach((m, i) => (mapa[m.id] = i));
    return mapa;
  }, [estado?.moradores]);

  // ── casas ────────────────────────────────────────────────────────────────

  const abrirCasa = useCallback((id) => {
    const carregada = carregarCasa(id);
    if (!carregada) return false;

    definirCasaAtual(id);
    setIdDaCasa(id);
    definir(carregada);
    revisar((n) => n + 1);
    return true;
  }, []);

  const novaCasa = useCallback((nome, chaveDoModo, quantasPessoas) => {
    const inicial = estadoInicial(chaveDoModo, quantasPessoas);
    const id = criarCasa(nome, inicial);

    setIdDaCasa(id);
    definir(inicial);
    revisar((n) => n + 1);
    return id;
  }, []);

  const fecharCasa = useCallback(() => {
    // Grava o que ainda estiver pendente antes de sair para o painel.
    clearTimeout(agendado.current);
    if (idDaCasa && estado) salvarCasa(idDaCasa, estado);

    definirCasaAtual(null);
    setIdDaCasa(null);
    definir(null);
    revisar((n) => n + 1);
  }, [idDaCasa, estado]);

  const apagarCasa = useCallback(
    (id) => {
      removerCasa(id);
      if (id === idDaCasa) {
        clearTimeout(agendado.current);
        setIdDaCasa(null);
        definir(null);
      }
      revisar((n) => n + 1);
    },
    [idDaCasa],
  );

  const renomear = useCallback((id, nome) => {
    renomearCasa(id, nome);
    revisar((n) => n + 1);
  }, []);

  /** Uma cópia desta casa já virada para o mês seguinte, pronta para preencher. */
  const duplicarParaOProximoMes = useCallback((id, nome) => {
    const base = carregarCasa(id);
    if (!base) return null;

    const novo = proximoMes(base);
    const criado = criarCasa(nome, novo);

    setIdDaCasa(criado);
    definir(novo);
    revisar((n) => n + 1);
    return criado;
  }, []);

  const exportar = useCallback(
    (id) => {
      // Garante que o que está na tela já foi para o depósito antes de exportar.
      if (id === idDaCasa && estado) salvarCasa(id, estado);
      return exportarCasa(id);
    },
    [idDaCasa, estado],
  );

  const importar = useCallback((texto) => {
    const id = importarCasa(texto);
    if (id) revisar((n) => n + 1);
    return id;
  }, []);

  // ── dentro de uma casa ───────────────────────────────────────────────────

  const definirFatura = useCallback((qual, campo, valor) => {
    definir((e) => {
      const faturas = { ...e.faturas, [qual]: { ...e.faturas[qual], [campo]: valor } };

      const periodo =
        campo === "janela" ? { ...e.periodo, ...periodoDasFaturas(faturas, e.periodo) } : e.periodo;

      return { ...e, faturas, periodo };
    });
  }, []);

  const adicionarLinha = useCallback((qual, nome = "", comportamento = "consumo") => {
    definir((e) => ({
      ...e,
      faturas: {
        ...e.faturas,
        [qual]: {
          ...e.faturas[qual],
          linhas: [...e.faturas[qual].linhas, novaLinha(nome, comportamento)],
        },
      },
    }));
  }, []);

  const editarLinha = useCallback((qual, id, campo, valor) => {
    definir((e) => ({
      ...e,
      faturas: {
        ...e.faturas,
        [qual]: {
          ...e.faturas[qual],
          linhas: e.faturas[qual].linhas.map((l) =>
            l.id === id ? { ...l, [campo]: valor } : l,
          ),
        },
      },
    }));
  }, []);

  const removerLinha = useCallback((qual, id) => {
    definir((e) => ({
      ...e,
      faturas: {
        ...e.faturas,
        [qual]: {
          ...e.faturas[qual],
          linhas: e.faturas[qual].linhas.filter((l) => l.id !== id),
        },
      },
    }));
  }, []);

  const definirCalibragem = useCallback((valor) => {
    definir((e) => ({ ...e, calibragem: valor }));
  }, []);

  const definirPeriodo = useCallback((campo, valor) => {
    if (campo === "dias") {
      const texto = String(valor ?? "").trim();
      const n = parseInt(texto, 10);
      definir((e) => ({
        ...e,
        periodo: { ...e.periodo, dias: texto === "" || !Number.isFinite(n) ? undefined : n },
      }));
      return;
    }
    const n = parseInt(valor, 10);
    if (!Number.isFinite(n)) return;
    definir((e) => ({ ...e, periodo: { ...e.periodo, [campo]: n } }));
  }, []);

  const ajustarQuantidadeDeMoradores = useCallback((alvo) => {
    definir((e) => {
      const teto = modoDe(e.modo).maximoDeMoradores;
      const n = Math.max(0, Math.min(teto, alvo));

      const lista = [...e.moradores];
      const novos = [];
      while (lista.length < n) {
        const m = novaPessoa();
        lista.push(m);
        novos.push(m.id);
      }
      while (lista.length > n) lista.pop();
      const vivos = new Set(lista.map((m) => m.id));

      return {
        ...e,
        moradores: lista,
        itens: e.itens.map((i) => ({
          ...i,
          participantes: [...i.participantes.filter((id) => vivos.has(id)), ...novos],
        })),
      };
    });
  }, []);

  const editarMorador = useCallback((id, campo, valor) => {
    definir((e) => ({
      ...e,
      moradores: e.moradores.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)),
    }));
  }, []);

  const adicionarItem = useCallback((modelo) => {
    definir((e) => ({
      ...e,
      itens: [...e.itens, criarItem(modelo, e.moradores.map((m) => m.id))],
    }));
  }, []);

  const removerItem = useCallback((id) => {
    definir((e) => ({ ...e, itens: e.itens.filter((i) => i.id !== id) }));
  }, []);

  const editarItem = useCallback((id, campo, valor) => {
    definir((e) => ({
      ...e,
      itens: e.itens.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)),
    }));
  }, []);

  const alternarParticipante = useCallback((idDoItem, idDoMorador) => {
    definir((e) => ({
      ...e,
      itens: e.itens.map((i) =>
        i.id !== idDoItem
          ? i
          : {
              ...i,
              participantes: i.participantes.includes(idDoMorador)
                ? i.participantes.filter((p) => p !== idDoMorador)
                : [...i.participantes, idDoMorador],
            },
      ),
    }));
  }, []);

  /** Zera esta casa, mantendo o modo e o nome dela. */
  const recomecar = useCallback(() => {
    definir((e) => estadoInicial(e?.modo ?? PADRAO));
  }, []);

  return {
    estado,
    resultado,
    indicePorId,
    modo,
    idDaCasa,
    casas,
    acoes: {
      // casas
      abrirCasa,
      novaCasa,
      fecharCasa,
      apagarCasa,
      renomear,
      duplicarParaOProximoMes,
      exportar,
      importar,
      // dentro de uma casa
      definirFatura,
      adicionarLinha,
      editarLinha,
      removerLinha,
      definirCalibragem,
      definirPeriodo,
      ajustarQuantidadeDeMoradores,
      editarMorador,
      adicionarItem,
      removerItem,
      editarItem,
      alternarParticipante,
      recomecar,
    },
  };
}
