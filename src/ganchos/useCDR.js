import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { estadoInicial } from "../nucleo/estadoInicial.js";
import { calcular } from "../nucleo/adaptador.js";
import { criarItem } from "../nucleo/catalogo.js";
import { novoId } from "../nucleo/formato.js";
import { carregarCasa, limparCasa, salvarCasa } from "../nucleo/persistencia.js";

const MAXIMO_DE_MORADORES = 20;

export function useCDR() {
  // Abre com o que estiver salvo neste navegador; se não houver nada
  // confiável, começa uma casa nova.
  const [estado, definir] = useState(() => carregarCasa() ?? estadoInicial());

  /**
   * Salva a cada mudança, mas não a cada tecla: esperar meio segundo de
   * silêncio evita escrever no disco a cada dígito digitado num campo.
   */
  const agendado = useRef(null);
  useEffect(() => {
    clearTimeout(agendado.current);
    agendado.current = setTimeout(() => salvarCasa(estado), 500);
    return () => clearTimeout(agendado.current);
  }, [estado]);

  const resultado = useMemo(() => calcular(estado), [estado]);

  /** Posição de cada morador na lista, é ela que decide a cor. */
  const indicePorId = useMemo(() => {
    const mapa = {};
    estado.moradores.forEach((m, i) => (mapa[m.id] = i));
    return mapa;
  }, [estado.moradores]);

  const definirFatura = useCallback((campo, valor) => {
    definir((e) => ({ ...e, faturas: { ...e.faturas, [campo]: valor } }));
  }, []);

  const definirPeriodo = useCallback((campo, valor) => {
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
        const m = { id: novoId("m"), nome: "", diasFora: "" };
        lista.push(m);
        novos.push(m.id);
      }
      while (lista.length > n) lista.pop();
      const vivos = new Set(lista.map((m) => m.id));

      return {
        ...e,
        moradores: lista,
        // quem entra depois passa a participar dos itens que já existem;
        // quem sai é apagado de todos eles.
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
