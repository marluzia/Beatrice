import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { estadoInicial, novaLinha } from "../nucleo/estadoInicial.js";
import { periodoDasFaturas } from "../nucleo/calendario.js";
import { calcular } from "../nucleo/adaptador.js";
import { criarItem } from "../nucleo/catalogo.js";
import { novoId } from "../nucleo/formato.js";
import { carregarCasa, limparCasa, salvarCasa } from "../nucleo/persistencia.js";

const MAXIMO_DE_MORADORES = 20;

export function useCDR() {
  const [estado, definir] = useState(() => carregarCasa() ?? estadoInicial());

  const agendado = useRef(null);
  useEffect(() => {
    clearTimeout(agendado.current);
    agendado.current = setTimeout(() => salvarCasa(estado), 500);
    return () => clearTimeout(agendado.current);
  }, [estado]);

  const resultado = useMemo(() => calcular(estado), [estado]);

  const indicePorId = useMemo(() => {
    const mapa = {};
    estado.moradores.forEach((m, i) => (mapa[m.id] = i));
    return mapa;
  }, [estado.moradores]);

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
      const n = Math.max(0, Math.min(MAXIMO_DE_MORADORES, alvo));
      const lista = [...e.moradores];
      const novos = [];
      while (lista.length < n) {
        const m = { id: novoId("m"), nome: "", diasFora: "", ausencias: [] };
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

  const recomecar = useCallback(() => {
    limparCasa();
    definir(estadoInicial());
  }, []);

  return {
    estado,
    resultado,
    indicePorId,
    acoes: {
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
