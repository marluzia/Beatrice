import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  estadoInicial,
  novaLinha,
  novaPessoa,
  novaTarefa,
  proximoMes,
} from "../nucleo/estadoInicial.js";
import { periodoDasFaturas } from "../nucleo/calendario.js";
import { calcular } from "../nucleo/adaptador.js";
import { criarItem, modeloPorChave } from "../nucleo/catalogo.js";
import { modoDe, PADRAO, polaridadeDe } from "../nucleo/modos.js";
import { novoId } from "../nucleo/formato.js";
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

  /** Quem fica com o centavo que a divisão não fecha. */
  const definirQuemCede = useCallback((id) => {
    definir((e) => ({ ...e, quemCede: id || null }));
  }, []);

  /**
   * A régua do uso comum muda quanto cada um deve, e com isso muda o resíduo:
   * o centavo que faltava pode passar a sobrar, ou sumir. Uma escolha de quem
   * cede feita sobre o valor anterior deixa de valer   ela foi tomada sobre
   * outra conta. Então mexer na régua desfaz a escolha, e a casa decide de novo.
   */
  const definirCalibragem = useCallback((valor) => {
    definir((e) => (e.calibragem === valor ? e : { ...e, calibragem: valor, quemCede: null }));
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

      const moraAqui = (quem) => (quem && vivos.has(quem) ? quem : null);

      return {
        ...e,
        moradores: lista,
        quemCede: moraAqui(e.quemCede),
        // Pagador que saiu da casa deixa de ser pagador: o acerto é entre quem
        // está, e um id morto viraria dinheiro sem dono em silêncio.
        faturas: {
          luz: { ...e.faturas.luz, pagoPor: moraAqui(e.faturas.luz.pagoPor) },
          agua: { ...e.faturas.agua, pagoPor: moraAqui(e.faturas.agua.pagoPor) },
        },
        itens: e.itens.map((i) => ({
          ...i,
          pagoPor: moraAqui(i.pagoPor),
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


  // ── o que acontece num dia ───────────────────────────────────────────────
  //
  // Tudo aqui é lançado pelo calendário. Nenhuma destas ações fala com o
  // motor: elas mexem no mesmo estado de sempre, nos campos que o motor já
  // sabia ler. Tarefa é a única entidade nova, e ela não tem dinheiro.

  /** Liga ou desliga um dia na ausência (ou na estadia) de uma pessoa. */
  const alternarDiaDaPessoa = useCallback((idDoMorador, dia) => {
    definir((e) => {
      const campo = polaridadeDe(e.modo) === "presenca" ? "presencas" : "ausencias";

      return {
        ...e,
        moradores: e.moradores.map((m) => {
          if (m.id !== idDoMorador) return m;
          const dias = Array.isArray(m[campo]) ? m[campo] : [];
          return {
            ...m,
            [campo]: dias.includes(dia)
              ? dias.filter((d) => d !== dia)
              : [...dias, dia].sort(),
          };
        }),
      };
    });
  }, []);

  /** Uma despesa em reais lançada num dia. Vira um item como qualquer outro. */
  const lancarDespesaNoDia = useCallback((dia) => {
    definir((e) => {
      const modelo = modeloPorChave("outra");
      const item = {
        ...criarItem(modelo, e.moradores.map((m) => m.id)),
        nome: "",
        data: dia,
      };
      return { ...e, itens: [...e.itens, item] };
    });
  }, []);

  /** Um uso com data de um item que já existe (uma lavagem, um ciclo). */
  const lancarUsoNoDia = useCallback((idDoItem, dia) => {
    definir((e) => ({
      ...e,
      itens: e.itens.map((i) =>
        i.id !== idDoItem
          ? i
          : {
              ...i,
              rateio: i.rateios?.includes("uso") ? "uso" : i.rateio,
              eventos: [
                ...(i.eventos ?? []),
                { id: novoId("ev"), data: dia, quantidade: "1", participantes: [...i.participantes] },
              ],
            },
      ),
    }));
  }, []);

  const removerUso = useCallback((idDoItem, idDoUso) => {
    definir((e) => ({
      ...e,
      itens: e.itens.map((i) =>
        i.id !== idDoItem ? i : { ...i, eventos: (i.eventos ?? []).filter((u) => u.id !== idDoUso) },
      ),
    }));
  }, []);

  /**
   * Quem desembolsou uma despesa. Vale para as faturas e para os itens que
   * saem do bolso; o que sai de dentro da fatura não tem pagador próprio,
   * porque o dinheiro dele já está no valor da conta.
   */
  const definirPagador = useCallback((alvo, id, quemPagou) => {
    definir((e) =>
      alvo === "fatura"
        ? { ...e, faturas: { ...e.faturas, [id]: { ...e.faturas[id], pagoPor: quemPagou } } }
        : {
            ...e,
            itens: e.itens.map((i) => (i.id === id ? { ...i, pagoPor: quemPagou } : i)),
          },
    );
  }, []);

  /** Trabalho feito por quem mora. Fica registrado e não mexe em valor nenhum. */
  const lancarTarefaNoDia = useCallback((dia) => {
    definir((e) => ({ ...e, tarefas: [...(e.tarefas ?? []), novaTarefa(dia)] }));
  }, []);

  const editarTarefa = useCallback((id, campo, valor) => {
    definir((e) => ({
      ...e,
      tarefas: (e.tarefas ?? []).map((t) => (t.id === id ? { ...t, [campo]: valor } : t)),
    }));
  }, []);

  const removerTarefa = useCallback((id) => {
    definir((e) => ({ ...e, tarefas: (e.tarefas ?? []).filter((t) => t.id !== id) }));
  }, []);

  const alternarResponsavel = useCallback((idDaTarefa, idDoMorador) => {
    definir((e) => ({
      ...e,
      tarefas: (e.tarefas ?? []).map((t) =>
        t.id !== idDaTarefa
          ? t
          : {
              ...t,
              responsaveis: t.responsaveis.includes(idDoMorador)
                ? t.responsaveis.filter((r) => r !== idDoMorador)
                : [...t.responsaveis, idDoMorador],
            },
      ),
    }));
  }, []);

  /** Zera este conjunto, mantendo o modo e o nome dele. */
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
      definirQuemCede,
      definirPeriodo,
      ajustarQuantidadeDeMoradores,
      editarMorador,
      adicionarItem,
      removerItem,
      editarItem,
      alternarParticipante,
      definirPagador,
      // calendário
      alternarDiaDaPessoa,
      lancarDespesaNoDia,
      lancarUsoNoDia,
      removerUso,
      lancarTarefaNoDia,
      editarTarefa,
      removerTarefa,
      alternarResponsavel,
      recomecar,
    },
  };
}
