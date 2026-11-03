import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  estadoInicial,
  novaLinha,
  novaPessoa,
  novaTarefa,
  proximoMes,
} from "../nucleo/estadoInicial.js";
import {
  corteNosLimites,
  corteValido,
  janelaDoFechamento,
  limitesDoCorte,
  mesDaMaiorParte,
  periodoDasFaturas,
} from "../nucleo/calendario.js";
import { calcular } from "../nucleo/adaptador.js";
import { criarItem, duplicarItem, modeloPorChave } from "../nucleo/catalogo.js";
import { calibragemFixa, modoDoConjunto, PADRAO, presetValido } from "../nucleo/modos.js";
import { novoId } from "../nucleo/formato.js";
import { ehDeFabrica, MAXIMO_DE_CICLOS, novoCiclo } from "../nucleo/ciclos.js";
import {
  carregarConjunto,
  criarConjunto,
  definirConjuntoAtual,
  exportarConjunto,
  importarConjunto,
  listarConjuntos,
  removerConjunto,
  renomearConjunto,
  salvarConjunto,
} from "../nucleo/persistencia.js";

export function useCDR() {
  // Qual conjunto está aberto. `null` é o painel de conjuntos. O programa
  // sempre abre no painel: quem administra escolhe o conjunto a cada entrada,
  // em vez de cair no último que ficou aberto.
  const [idDoConjunto, setIdDoConjunto] = useState(null);
  const [estado, definir] = useState(null);

  // O índice do painel. Um número que muda obriga a reler a lista de conjuntos
  // depois de criar, renomear ou apagar.
  const [revisao, revisar] = useState(0);
  const conjuntos = useMemo(() => listarConjuntos(), [revisao]);

  // O modo como este conjunto o usa: um evento longo conta dias.
  const modo = modoDoConjunto(estado ?? { modo: PADRAO });

  // Salva sozinho meio segundo depois da última tecla.
  const agendado = useRef(null);
  useEffect(() => {
    if (!idDoConjunto || !estado) return undefined;

    clearTimeout(agendado.current);
    agendado.current = setTimeout(() => {
      salvarConjunto(idDoConjunto, estado);
      revisar((n) => n + 1);
    }, 500);

    return () => clearTimeout(agendado.current);
  }, [estado, idDoConjunto]);

  const resultado = useMemo(() => (estado ? calcular(estado) : null), [estado]);

  const indicePorId = useMemo(() => {
    const mapa = {};
    (estado?.moradores ?? []).forEach((m, i) => (mapa[m.id] = i));
    return mapa;
  }, [estado?.moradores]);

  // ── conjuntos ────────────────────────────────────────────────────────────────

  const abrirConjunto = useCallback((id) => {
    const carregada = carregarConjunto(id);
    if (!carregada) return false;

    definirConjuntoAtual(id);
    setIdDoConjunto(id);
    definir(carregada);
    revisar((n) => n + 1);
    return true;
  }, []);

  const novoConjunto = useCallback((nome, chaveDoModo, quantasPessoas, chaveDoPreset) => {
    const inicial = estadoInicial(chaveDoModo, quantasPessoas, chaveDoPreset);
    const id = criarConjunto(nome, inicial);

    setIdDoConjunto(id);
    definir(inicial);
    revisar((n) => n + 1);
    return id;
  }, []);

  const fecharConjunto = useCallback(() => {
    // Grava o que ainda estiver pendente antes de sair para o painel.
    clearTimeout(agendado.current);
    if (idDoConjunto && estado) salvarConjunto(idDoConjunto, estado);

    definirConjuntoAtual(null);
    setIdDoConjunto(null);
    definir(null);
    revisar((n) => n + 1);
  }, [idDoConjunto, estado]);

  const apagarConjunto = useCallback(
    (id) => {
      removerConjunto(id);
      if (id === idDoConjunto) {
        clearTimeout(agendado.current);
        setIdDoConjunto(null);
        definir(null);
      }
      revisar((n) => n + 1);
    },
    [idDoConjunto],
  );

  const renomear = useCallback((id, nome) => {
    renomearConjunto(id, nome);
    revisar((n) => n + 1);
  }, []);

  /** Uma cópia deste conjunto já virada para o mês seguinte, pronta para preencher. */
  const duplicarParaOProximoMes = useCallback((id, nome) => {
    const base = carregarConjunto(id);
    if (!base) return null;

    const novo = proximoMes(base);
    const criado = criarConjunto(nome, novo);

    setIdDoConjunto(criado);
    definir(novo);
    revisar((n) => n + 1);
    return criado;
  }, []);

  const exportar = useCallback(
    (id) => {
      // Garante que o que está na tela já foi para o depósito antes de exportar.
      if (id === idDoConjunto && estado) salvarConjunto(id, estado);
      return exportarConjunto(id);
    },
    [idDoConjunto, estado],
  );

  const importar = useCallback((texto) => {
    const id = importarConjunto(texto);
    if (id) revisar((n) => n + 1);
    return id;
  }, []);

  // ── dentro de um conjunto ───────────────────────────────────────────────────

  // ── ciclos ───────────────────────────────────────────────────────────────

  /** Troca um ciclo pelo id, deixando os outros como estão. */
  const mexerNoCiclo = (e, id, mudar) => ({
    ...e,
    ciclos: (e.ciclos ?? []).map((c) => (c.id === id ? mudar(c) : c)),
  });

  /**
   * Muda um campo de um ciclo (nome, ativa, janela, vencimento, recurso). As
   * datas de leitura também acertam o mês de referência, como sempre fizeram.
   */
  const definirCiclo = useCallback((id, campo, valor) => {
    definir((e) => {
      const novo = mexerNoCiclo(e, id, (c) => ({ ...c, [campo]: valor }));
      const periodo =
        campo === "janela" ? { ...e.periodo, ...periodoDasFaturas(novo.ciclos, e.periodo) } : e.periodo;
      return { ...novo, periodo };
    });
  }, []);

  /** Um ciclo novo, criado pela casa: gás, aluguel, condomínio. Até oito no total. */
  const adicionarCiclo = useCallback((nome, recurso) => {
    definir((e) => {
      if ((e.ciclos ?? []).length >= MAXIMO_DE_CICLOS) return e;
      return { ...e, ciclos: [...(e.ciclos ?? []), novoCiclo(nome, recurso)] };
    });
  }, []);

  /**
   * Tira um ciclo criado pela casa. Luz e água não saem: desligam. Item que
   * saía do ciclo removido fica sem conta, e o cartão dele pede uma.
   */
  const removerCiclo = useCallback((id) => {
    definir((e) => {
      const alvo = (e.ciclos ?? []).find((c) => c.id === id);
      if (!alvo || ehDeFabrica(alvo)) return e;
      return {
        ...e,
        ciclos: e.ciclos.filter((c) => c.id !== id),
        itens: e.itens.map((i) => {
          const semEle = { ...i };
          if (i.ciclo === id) semEle.ciclo = null;
          if (i.porUsoPorCiclo && id in i.porUsoPorCiclo) {
            const { [id]: _fora, ...resto } = i.porUsoPorCiclo;
            semEle.porUsoPorCiclo = resto;
          }
          return semEle;
        }),
      };
    });
  }, []);

  /** O dia do mês em que o período fecha. Vazio desfaz o corte. */
  const definirCorte = useCallback((valor) => {
    const n = parseInt(String(valor ?? "").trim(), 10);
    definir((e) => ({ ...e, corte: Number.isInteger(n) && n >= 1 && n <= 31 ? n : null }));
  }, []);

  /**
   * O corte escolhido como uma data: o dia vira o corte, e o mês e o ano dela
   * viram o mês de referência do fechamento (22/08/2026 fecha agosto no dia 22).
   */
  const definirDataDeCorte = useCallback((iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
    if (!m) return;
    const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
    definir((e) => ({ ...e, corte: dia, periodo: { ...e.periodo, mes, ano } }));
  }, []);

  /**
   * O período de corte escolhido pelo grupo: início e fim (o fim é o último
   * dia contado; guardado como `ate`, o dia seguinte). O mês em que cai a
   * maior parte dele vira o mês do fechamento. Vale também para as bolinhas
   * da barra do período, que mandam a janela pronta.
   */
  const definirJanelaDeCorte = useCallback((janela) => {
    if (!janela || !corteValido(janela)) return;
    definir((e) => {
      // O corte não passa de 30 dias antes do primeiro ciclo nem de 30 dias
      // depois do último: o que vier de fora é trazido para a borda.
      const ajustado = corteNosLimites(janela, limitesDoCorte(e.ciclos, e.periodo));
      if (!ajustado) return e;
      return {
        ...e,
        corte: ajustado,
        periodo: { ...e.periodo, ...(mesDaMaiorParte(ajustado) ?? {}) },
      };
    });
  }, []);

  /** Desliga o corte (null) ou liga com o período que já estava valendo. */
  const alternarCorte = useCallback((ligar) => {
    definir((e) =>
      ligar
        ? { ...e, corte: janelaDoFechamento(e.ciclos, e.periodo, null) }
        : { ...e, corte: null },
    );
  }, []);

  /** O valor de uma conta só de valor: uma linha, que vira o total da conta. */
  const definirValorDoCiclo = useCallback((id, valor) => {
    definir((e) =>
      mexerNoCiclo(e, id, (c) => {
        const [primeira, ...resto] = c.linhas ?? [];
        const linha = primeira ?? novaLinha(c.nome, "consumo");
        return { ...c, linhas: [{ ...linha, valor }, ...resto] };
      }),
    );
  }, []);

  const adicionarLinha = useCallback((idDoCiclo, nome = "", comportamento = "consumo") => {
    definir((e) =>
      mexerNoCiclo(e, idDoCiclo, (c) => ({ ...c, linhas: [...c.linhas, novaLinha(nome, comportamento)] })),
    );
  }, []);

  const editarLinha = useCallback((idDoCiclo, id, campo, valor) => {
    definir((e) =>
      mexerNoCiclo(e, idDoCiclo, (c) => ({
        ...c,
        linhas: c.linhas.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)),
      })),
    );
  }, []);

  const removerLinha = useCallback((idDoCiclo, id) => {
    definir((e) =>
      mexerNoCiclo(e, idDoCiclo, (c) => ({ ...c, linhas: c.linhas.filter((l) => l.id !== id) })),
    );
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
    definir((e) => {
      // Num preset fechado a régua não aparece; se algo chamar isto mesmo
      // assim, o preset continua mandando.
      if (calibragemFixa(e) !== null || e.calibragem === valor) return e;
      return { ...e, calibragem: valor, quemCede: null };
    });
  }, []);

  /**
   * Troca o preset da República. Preset fechado leva a régua para o ponto dele;
   * a Livre herda a calibragem que estava valendo, para a troca não mexer em
   * nenhum número. Se a calibragem mudou, quem cede volta a ficar em aberto  
   * pelo mesmo motivo de `definirCalibragem`.
   */
  const definirPreset = useCallback((chave) => {
    definir((e) => {
      const preset = presetValido(e.modo, chave);
      if (!preset || preset === e.preset) return e;

      const fixa = calibragemFixa({ modo: e.modo, preset });
      const calibragem = fixa ?? e.calibragem;
      const mudou = calibragem !== e.calibragem;
      return { ...e, preset, calibragem, quemCede: mudou ? null : e.quemCede };
    });
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
      const teto = modoDoConjunto(e).maximoDeMoradores;
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
        ciclos: (e.ciclos ?? []).map((c) => ({ ...c, pagoPor: moraAqui(c.pagoPor) })),
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

  /** Marca todo mundo, ou ninguém, num item: a marcação rápida de "quem paga". */
  const definirParticipantes = useCallback((idDoItem, ids) => {
    definir((e) => ({
      ...e,
      itens: e.itens.map((i) => (i.id === idDoItem ? { ...i, participantes: [...ids] } : i)),
    }));
  }, []);

  /** Uma cópia do item logo abaixo dele, com id novo. */
  const duplicarUmItem = useCallback((idDoItem) => {
    definir((e) => {
      const i = e.itens.findIndex((x) => x.id === idDoItem);
      if (i < 0) return e;
      const itens = [...e.itens];
      itens.splice(i + 1, 0, duplicarItem(e.itens[i]));
      return { ...e, itens };
    });
  }, []);

  /**
   * Liga ou desliga o evento longo. Ligar troca "igual" por "por dias" nos
   * itens, que é o motivo de ligar; desligar devolve "por dias" para "igual",
   * porque num evento curto não há dia contado e "por dias" dividiria igual
   * calado.
   */
  const definirEventoLongo = useCallback((ligado) => {
    definir((e) => ({
      ...e,
      eventoLongo: Boolean(ligado),
      itens: e.itens.map((i) => {
        if (ligado && i.rateio === "igual") return { ...i, rateio: "dias" };
        if (!ligado && (i.rateio === "dias" || i.rateio === "presenca")) return { ...i, rateio: "igual" };
        return i;
      }),
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
      const campo = modoDoConjunto(e).presenca === "presenca" ? "presencas" : "ausencias";

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
              registrosDeUso: [
                ...(i.registrosDeUso ?? []),
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
        i.id !== idDoItem
          ? i
          : { ...i, registrosDeUso: (i.registrosDeUso ?? []).filter((u) => u.id !== idDoUso) },
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
        ? mexerNoCiclo(e, id, (c) => ({ ...c, pagoPor: quemPagou }))
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
    definir((e) => estadoInicial(e?.modo ?? PADRAO, undefined, e?.preset ?? undefined));
  }, []);

  return {
    estado,
    resultado,
    indicePorId,
    modo,
    idDoConjunto,
    conjuntos,
    acoes: {
      // conjuntos
      abrirConjunto,
      novoConjunto,
      fecharConjunto,
      apagarConjunto,
      renomear,
      duplicarParaOProximoMes,
      exportar,
      importar,
      // dentro de um conjunto
      definirCiclo,
      adicionarCiclo,
      removerCiclo,
      definirCorte,
      adicionarLinha,
      editarLinha,
      removerLinha,
      definirCalibragem,
      definirPreset,
      definirQuemCede,
      definirPeriodo,
      ajustarQuantidadeDeMoradores,
      editarMorador,
      adicionarItem,
      removerItem,
      editarItem,
      alternarParticipante,
      definirParticipantes,
      duplicarItem: duplicarUmItem,
      definirEventoLongo,
      definirDataDeCorte,
      definirJanelaDeCorte,
      alternarCorte,
      definirValorDoCiclo,
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
