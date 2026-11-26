import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  comRateioDoModo,
  estadoDeCriacao,
  estadoInicial,
  novaLinha,
  novaPessoa,
  novaTarefa,
  novoLembrete,
  proximoMes,
} from "../nucleo/estadoInicial.js";
import { atividadeDe, hojeISO, medeHoras, nomeDe, quemSouEu, resumoDoConjunto } from "../nucleo/resumo.js";
import { comMovimento } from "../nucleo/movimentos.js";
import { carimbo } from "../nucleo/autoria.js";
import { comMarcacao } from "../nucleo/marcacao.js";
import { guardarPerfil, lerPerfil } from "../nucleo/perfil.js";
import {
  corteNosLimites,
  corteValido,
  janelaDoFechamento,
  limitesDoCorte,
  mesDaMaiorParte,
  periodoDasFaturas,
  somarDias,
  janelaNosLimitesDeHoje,
} from "../nucleo/calendario.js";
import { calcular } from "../nucleo/adaptador.js";
import { criarItem, duplicarItem, modeloPorChave } from "../nucleo/catalogo.js";
import { calibragemFixa, modoDoConjunto, PADRAO, presetValido } from "../nucleo/modos.js";
import { novoId } from "../nucleo/formato.js";
import { ehDeFabrica, MAXIMO_DE_CICLOS, novoCiclo, RECURSOS } from "../nucleo/ciclos.js";
import {
  carregarConjunto,
  criarConjunto,
  definirConjuntoAtual,
  exportarConjunto,
  importarConjunto,
  listarConjuntos,
  marcarComoVisto,
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

  // Quem usa este navegador: o nome que acha "você" nos conjuntos.
  const [perfil, definirPerfilBruto] = useState(() => lerPerfil());
  // As ações leem o perfil na hora de lançar (para carimbar quem lançou).
  const perfilAgora = useRef(perfil);
  perfilAgora.current = perfil;
  const autorDe = (e) => quemSouEu(e, perfilAgora.current);
  /** O conjunto recém-criado, com o "fulano criou o conjunto" e a hora. */
  const criado = (e) => {
    const quem = autorDe(e) ?? e.admin ?? null;
    return comMovimento(e, { tipo: "criou", quem, nomeDeQuem: quem ? nomeDe(e, quem) : perfilAgora.current?.nome?.trim() || "" });
  };
  const mudarPerfil = useCallback((mudar) => {
    definirPerfilBruto((p) => {
      const novo = mudar(p);
      guardarPerfil(novo);
      return novo;
    });
  }, []);

  // Todos os conjuntos de uma vez, com o saldo de você em cada um: é o que o
  // Início e a lista de Conjuntos mostram. Relido a cada gravação.
  const panorama = useMemo(
    () =>
      conjuntos
        .map((ficha) => {
          const e = carregarConjunto(ficha.id);
          if (!e) return null;
          try {
            const resumo = resumoDoConjunto(e, { perfil });
            return { ficha, estado: e, resumo, atividade: atividadeDe(e, { resultado: resumo.resultado }) };
          } catch {
            return { ficha, estado: e, resumo: null, atividade: [] };
          }
        })
        .filter(Boolean),
    [conjuntos, perfil],
  );

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
    marcarComoVisto(id);
    setIdDoConjunto(id);
    definir(carregada);
    revisar((n) => n + 1);
    return true;
  }, []);

  const novoConjunto = useCallback((nome, chaveDoModo, quantasPessoas, chaveDoPreset) => {
    const inicial = criado(estadoInicial(chaveDoModo, quantasPessoas, chaveDoPreset));
    const id = criarConjunto(nome, inicial);

    setIdDoConjunto(id);
    definir(inicial);
    revisar((n) => n + 1);
    return id;
  }, []);

  /**
   * O conjunto como a tela de criação pede: com nome, descrição, data e as
   * pessoas pelo nome (a primeira é você).
   */
  const criarConjuntoNovo = useCallback(({ nome, ...pedido }) => {
    const inicial = criado(estadoDeCriacao(pedido));
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

  /** Relê todos os conjuntos do navegador (o botão de atualizar do Início). */
  const recarregar = useCallback(() => revisar((n) => n + 1), []);

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

  /** Um ciclo novo, criado pela casa: gás, aluguel, condomínio. Até oito no total. Devolve o id. */
  const adicionarCiclo = useCallback((nome, recurso) => {
    const novo = novoCiclo(nome, recurso);
    definir((e) => {
      if ((e.ciclos ?? []).length >= MAXIMO_DE_CICLOS) return e;
      return { ...e, ciclos: [...(e.ciclos ?? []), novo] };
    });
    return novo.id;
  }, []);

  /**
   * Lança uma despesa cíclica pelo formulário: liga a conta e escreve de uma
   * vez as linhas (valor e consumo), o período de consumo, o vencimento,
   * quem pagou e, numa conta só de valor, como divide.
   */
  /** A fatura de um ciclo com os dados de Lançar (ou de Editar) despesa cíclica. */
  const comFatura = (e, id, dados, marca = {}) => {
    const novo = mexerNoCiclo(e, id, (c) => ({
      ...c,
      ...marca,
      ativa: true,
      janela: dados.janela ?? c.janela,
      vencimento: dados.vencimento !== undefined ? dados.vencimento : c.vencimento,
      pagoPor: dados.pagoPor ?? null,
      pagoEm: dados.pagoPor
        ? dados.pagoEm
          ? dados.pagoEm.length > 10
            ? dados.pagoEm
            : `${dados.pagoEm}T12:00:00.000Z`
          : new Date().toISOString()
        : null,
      // Ou cada linha pelo id, ou um total só na primeira (a conta acabou de nascer).
      linhas: (c.linhas ?? []).map((l, i) =>
        dados.linhas?.[l.id]
          ? { ...l, ...dados.linhas[l.id] }
          : i === 0 && dados.total !== undefined
            ? { ...l, valor: String(dados.total), quantidade: String(dados.quantidade ?? l.quantidade ?? "") }
            : l,
      ),
      ...(dados.rateio && !RECURSOS[c.recurso] ? { rateio: dados.rateio } : {}),
      ...(dados.porcentagens && !RECURSOS[c.recurso] ? { porcentagens: dados.porcentagens } : {}),
    }));
    const periodo = dados.janela ? { ...e.periodo, ...periodoDasFaturas(novo.ciclos, e.periodo) } : e.periodo;
    return { ...novo, periodo };
  };

  const lancarCiclica = useCallback((id, dados = {}) => {
    definir((e) => comFatura(e, id, dados, carimbo(autorDe(e))));
  }, []);

  // ── edições ──────────────────────────────────────────────────────────────
  //
  // Editar um lançamento também é um lançamento: a edição guarda quem editou,
  // quando, o que foi editado (ref) e o que mudou (antes e depois, já em
  // texto). Quem lançou o original continua sendo quem lançou.

  const comEdicao = (e, ref, nome, mudancas) =>
    mudancas?.length
      ? {
          ...e,
          edicoes: [...(e.edicoes ?? []), { id: novoId("ed"), ref, nome: nome ?? "", mudancas, ...carimbo(autorDe(e)) }],
        }
      : e;

  /** Uma despesa avulsa: os campos do formulário de lançar. */
  const salvarEdicaoDaAvulsa = useCallback((id, campos, mudancas) => {
    definir((e) => {
      const antes = e.itens.find((i) => i.id === id);
      if (!antes) return e;
      const depois = { ...e, itens: e.itens.map((i) => (i.id === id ? { ...i, ...campos } : i)) };
      return comEdicao(depois, { tipo: "avulsa", id }, campos.nome ?? antes.nome, mudancas);
    });
  }, []);

  /** Um item inteiro (editado no cartão): fica o id, os registros e quem lançou. */
  const salvarEdicaoDoItem = useCallback((id, item, mudancas) => {
    definir((e) => {
      const antes = e.itens.find((i) => i.id === id);
      if (!antes) return e;
      const fixo = {
        id,
        registrosDeUso: antes.registrosDeUso,
        lancadoPor: antes.lancadoPor,
        lancadoEm: antes.lancadoEm,
        criadoEm: antes.criadoEm,
      };
      const depois = { ...e, itens: e.itens.map((i) => (i.id === id ? { ...item, ...fixo } : i)) };
      return comEdicao(depois, { tipo: "avulsa", id }, item.nome ?? antes.nome, mudancas);
    });
  }, []);

  /** A fatura de uma despesa cíclica. Quem lançou continua o mesmo. */
  const salvarEdicaoDaCiclica = useCallback((id, dados, mudancas) => {
    definir((e) => {
      const antes = (e.ciclos ?? []).find((c) => c.id === id);
      if (!antes) return e;
      return comEdicao(comFatura(e, id, dados), { tipo: "ciclica", id }, antes.nome, mudancas);
    });
  }, []);

  const salvarEdicaoDoRegistro = useCallback((idDoItem, idDoUso, campos, mudancas) => {
    definir((e) => {
      const item = e.itens.find((i) => i.id === idDoItem);
      if (!item) return e;
      const depois = {
        ...e,
        itens: e.itens.map((i) =>
          i.id !== idDoItem
            ? i
            : { ...i, registrosDeUso: (i.registrosDeUso ?? []).map((u) => (u.id === idDoUso ? { ...u, ...campos } : u)) },
        ),
      };
      return comEdicao(depois, { tipo: "registro", item: idDoItem, id: idDoUso }, item.nome, mudancas);
    });
  }, []);

  const salvarEdicaoDoLembrete = useCallback((id, campos, mudancas) => {
    definir((e) => {
      const antes = (e.lembretes ?? []).find((l) => l.id === id);
      if (!antes) return e;
      const depois = { ...e, lembretes: e.lembretes.map((l) => (l.id === id ? { ...l, ...campos } : l)) };
      const nome = (antes.tipo === "lista" ? campos.titulo ?? antes.titulo : campos.texto ?? antes.texto) || "Lembrete";
      return comEdicao(depois, { tipo: "lembrete", id }, nome, mudancas);
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
      // E nunca começa mais de 40 dias antes de hoje, nem termina mais de 2 anos depois.
      const dosCiclos = corteNosLimites(janela, limitesDoCorte(e.ciclos, e.periodo));
      const ajustado = dosCiclos && janelaNosLimitesDeHoje(dosCiclos, hojeISO());
      if (!ajustado) return e;
      return {
        ...e,
        corte: ajustado,
        periodo: { ...e.periodo, ...(mesDaMaiorParte(ajustado) ?? {}) },
      };
    });
  }, []);

  /** Desliga o corte (null) ou liga com o período que já estava valendo. */
  /**
   * O período da temporada: do início ao fim, sem os limites do corte das
   * casas (que não passam de 30 dias dos ciclos   a temporada não tem ciclo).
   * `fim` é o último dia, incluído.
   */
  const definirPeriodoDaTemporada = useCallback((inicio, fim) => {
    if (!inicio || !fim || fim < inicio) return;
    definir((e) => {
      // Início até 40 dias antes de hoje; fim até 2 anos depois.
      const corte = janelaNosLimitesDeHoje({ de: inicio, ate: somarDias(fim, 1) }, hojeISO());
      if (!corte || !corteValido(corte)) return e;
      return { ...e, corte, periodo: { ...e.periodo, ...(mesDaMaiorParte(corte) ?? {}) } };
    });
  }, []);

  /**
   * Uma despesa de antes do período entra na conta deste fechamento ou não.
   * `tipo` é "avulsa" (um item) ou "ciclica" (uma fatura).
   */
  const definirNaConta = useCallback((tipo, id, naConta) => {
    definir((e) =>
      tipo === "ciclica"
        ? { ...e, ciclos: e.ciclos.map((c) => (c.id === id ? { ...c, naConta: Boolean(naConta) } : c)) }
        : { ...e, itens: e.itens.map((i) => (i.id === id ? { ...i, naConta: Boolean(naConta) } : i)) },
    );
  }, []);

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

  const adicionarItem = useCallback((modelo, campos = {}) => {
    const id = novoId("i");
    definir((e) => ({
      ...e,
      itens: [
        ...e.itens,
        {
          ...comRateioDoModo(criarItem(modelo, e.moradores.map((m) => m.id)), modoDoConjunto(e)),
          id,
          criadoEm: new Date().toISOString(),
          lancadoPor: autorDe(e),
          ...campos,
        },
      ],
    }));
    return id;
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
  /** Duplica uma despesa. A cópia é um lançamento novo, de quem duplicou, com a hora de agora. Devolve o id. */
  const duplicarUmItem = useCallback((idDoItem) => {
    const id = novoId("i");
    definir((e) => {
      const i = e.itens.findIndex((x) => x.id === idDoItem);
      if (i < 0) return e;
      const itens = [...e.itens];
      itens.splice(i + 1, 0, {
        ...duplicarItem(e.itens[i]),
        id,
        criadoEm: new Date().toISOString(),
        ...carimbo(autorDe(e)),
      });
      return { ...e, itens };
    });
    return id;
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
  // Tudo aqui é lançado pela agenda. Nenhuma destas ações fala com o
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
        ...comRateioDoModo(criarItem(modelo, e.moradores.map((m) => m.id)), modoDoConjunto(e)),
        nome: "",
        data: dia,
        criadoEm: new Date().toISOString(),
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
              // Registrar usos de um aparelho por uso passa a dividir por uso;
              // num aparelho por hora, os registros dão as horas e a regra fica.
              rateio: i.especie === "porUso" && i.rateios?.includes("uso") ? "uso" : i.rateio,
              registrosDeUso: [
                ...(i.registrosDeUso ?? []),
                { id: novoId("ev"), data: dia, quantidade: "1", participantes: [...i.participantes], ...carimbo(autorDe(e)) },
              ],
            },
      ),
    }));
  }, []);

  /** Muda um registro de uso: a data, a quantidade, quem usou. */
  const editarRegistro = useCallback((idDoItem, idDoUso, campos) => {
    definir((e) => ({
      ...e,
      itens: e.itens.map((i) =>
        i.id !== idDoItem
          ? i
          : { ...i, registrosDeUso: (i.registrosDeUso ?? []).map((u) => (u.id === idDoUso ? { ...u, ...campos } : u)) },
      ),
    }));
  }, []);

  /** Duplica um registro com a data de hoje. A cópia é de quem duplicou. Devolve o id. */
  const duplicarRegistro = useCallback((idDoItem, idDoUso, hoje) => {
    const id = novoId("ev");
    definir((e) => ({
      ...e,
      itens: e.itens.map((i) => {
        if (i.id !== idDoItem) return i;
        const original = (i.registrosDeUso ?? []).find((u) => u.id === idDoUso);
        if (!original) return i;
        const copia = { ...original, id, data: hoje, participantes: [...(original.participantes ?? [])], ...carimbo(autorDe(e)) };
        return { ...i, registrosDeUso: [...(i.registrosDeUso ?? []), copia] };
      }),
    }));
    return id;
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
        ? mexerNoCiclo(e, id, (c) => ({
            ...c,
            pagoPor: quemPagou,
            // Quando foi marcada como paga: é o que a atividade e a agenda mostram.
            pagoEm: quemPagou ? (c.pagoPor === quemPagou && c.pagoEm ? c.pagoEm : new Date().toISOString()) : null,
          }))
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

  // ── pessoas pelo nome ────────────────────────────────────────────────────

  /**
   * Uma pessoa nova, pelo nome. Entra como convidada (sem conta no app) e em
   * todas as despesas, como quem soma pelo contador.
   */
  const adicionarPessoa = useCallback((nome, { convidado = true } = {}) => {
    definir((e) => {
      const teto = modoDoConjunto(e).maximoDeMoradores;
      if (e.moradores.length >= teto) return e;
      const m = novaPessoa(String(nome ?? "").trim(), convidado);
      const quem = autorDe(e);
      const com = {
        ...e,
        moradores: [...e.moradores, m],
        itens: e.itens.map((i) => ({ ...i, participantes: [...i.participantes, m.id] })),
      };
      return comMovimento(com, { tipo: "adicionou", quem, nomeDeQuem: quem ? nomeDe(e, quem) : perfilAgora.current?.nome?.trim() || "", alvo: m.id });
    });
  }, []);

  /** Tira uma pessoa e tudo o que apontava para ela (pagador, quem cede, participações). */
  const removerPessoa = useCallback((id) => {
    definir((e) => {
      if (!e.moradores.some((m) => m.id === id)) return e;
      const fica = (quem) => (quem === id ? null : quem);
      const autor = autorDe(e);
      e = comMovimento(
        e,
        autor === id ? { tipo: "saiu", quem: id, alvo: id } : { tipo: "removeu", quem: autor, alvo: id, nomeDeQuem: autor ? undefined : perfilAgora.current?.nome?.trim() || "" },
      );
      return {
        ...e,
        moradores: e.moradores.filter((m) => m.id !== id),
        quemCede: fica(e.quemCede),
        voce: fica(e.voce),
        admin: fica(e.admin),
        ciclos: (e.ciclos ?? []).map((c) => ({ ...c, pagoPor: fica(c.pagoPor), pagoEm: c.pagoPor === id ? null : c.pagoEm })),
        itens: e.itens.map((i) => ({
          ...i,
          pagoPor: fica(i.pagoPor),
          participantes: i.participantes.filter((p) => p !== id),
          registrosDeUso: (i.registrosDeUso ?? []).map((r) => ({
            ...r,
            participantes: (r.participantes ?? []).filter((p) => p !== id),
          })),
        })),
        tarefas: (e.tarefas ?? []).map((t) => ({ ...t, responsaveis: t.responsaveis.filter((r) => r !== id) })),
      };
    });
  }, []);

  /**
   * Na Multi: a agenda marca a estadia ("presenca") ou os dias fora
   * ("ausencia"). As marcas de cada um são convertidas, sem mudar os dias.
   */
  const definirMarcacao = useCallback((nova) => {
    definir((e) => comMarcacao(e, nova));
  }, []);

  /** Quem é você neste conjunto. */
  const definirVoce = useCallback((id) => {
    // Dizer "sou eu" é entrar no conjunto: o "fulano adicionou" dá lugar ao "entrou".
    definir((e) => {
      const com = { ...e, voce: id || null };
      return id && e.moradores.some((m) => m.id === id) ? comMovimento(com, { tipo: "entrou", quem: id, alvo: id }) : com;
    });
  }, []);

  /** Campos do conjunto que o cálculo não lê: descrição, desde quando. */
  const definirCampoDoConjunto = useCallback((campo, valor) => {
    if (!["descricao", "desde", "admin"].includes(campo)) return;
    definir((e) => ({ ...e, [campo]: valor }));
  }, []);

  // ── lembretes ────────────────────────────────────────────────────────────

  const mexerNoLembrete = (e, id, mudar) => ({
    ...e,
    lembretes: (e.lembretes ?? []).map((l) => (l.id === id ? mudar(l) : l)),
  });

  const adicionarLembrete = useCallback((tipo, campos = {}) => {
    const novo = novoLembrete(tipo, campos);
    definir((e) => {
      const autor = novo.autor ?? autorDe(e);
      return { ...e, lembretes: [...(e.lembretes ?? []), { ...novo, autor, lancadoPor: autor, lancadoEm: novo.criadoEm }] };
    });
    return novo.id;
  }, []);

  /** Duplica um lembrete (a lista volta sem nada riscado). A cópia é de quem duplicou. Devolve o id. */
  const duplicarLembrete = useCallback((idDoLembrete) => {
    const id = novoId("lb");
    definir((e) => {
      const l = (e.lembretes ?? []).find((x) => x.id === idDoLembrete);
      if (!l) return e;
      const agora = new Date().toISOString();
      const autor = autorDe(e);
      const copia = {
        ...l,
        id,
        itens: (l.itens ?? []).map((x) => ({ ...x, id: novoId("li"), feito: false })),
        autor,
        lancadoPor: autor,
        lancadoEm: agora,
        criadoEm: agora,
      };
      return { ...e, lembretes: [...(e.lembretes ?? []), copia] };
    });
    return id;
  }, []);

  const editarLembrete = useCallback((id, campos) => {
    definir((e) => mexerNoLembrete(e, id, (l) => ({ ...l, ...campos })));
  }, []);

  const removerLembrete = useCallback((id) => {
    definir((e) => ({ ...e, lembretes: (e.lembretes ?? []).filter((l) => l.id !== id) }));
  }, []);

  const adicionarItemNaLista = useCallback((id, texto) => {
    const limpo = String(texto ?? "").trim();
    if (!limpo) return;
    definir((e) =>
      mexerNoLembrete(e, id, (l) => ({ ...l, itens: [...l.itens, { id: novoId("li"), texto: limpo, feito: false }] })),
    );
  }, []);

  const alternarItemDaLista = useCallback((id, idDoItem) => {
    definir((e) =>
      mexerNoLembrete(e, id, (l) => ({
        ...l,
        itens: l.itens.map((x) => (x.id === idDoItem ? { ...x, feito: !x.feito } : x)),
      })),
    );
  }, []);

  const removerItemDaLista = useCallback((id, idDoItem) => {
    definir((e) => mexerNoLembrete(e, id, (l) => ({ ...l, itens: l.itens.filter((x) => x.id !== idDoItem) })));
  }, []);

  // ── acerto ───────────────────────────────────────────────────────────────

  /** Marca (ou desmarca) uma transferência do acerto como feita. */
  const confirmarPagamento = useCallback((chave, feito = true) => {
    definir((e) => {
      const pagamentos = { ...(e.pagamentos ?? {}) };
      if (feito) pagamentos[chave] = { em: new Date().toISOString() };
      else delete pagamentos[chave];
      return { ...e, pagamentos };
    });
  }, []);

  /** Um uso com data, já com quantidade e quem usou: a tela Registros. */
  const lancarRegistro = useCallback((idDoItem, { data, quantidade = "1", participantes, unidade, divisao, pagoPor } = {}) => {
    definir((e) => ({
      ...e,
      itens: e.itens.map((i) =>
        i.id !== idDoItem
          ? i
          : {
              ...i,
              // Com registros, quem paga e como divide são de cada registro: o
              // item passa a dividir pelos registros (horas ou usos de cada um).
              rateio: medeHoras(i) ? "horas" : "uso",
              registrosDeUso: [
                ...(i.registrosDeUso ?? []),
                {
                  id: novoId("ev"),
                  data,
                  quantidade: String(quantidade ?? "1"),
                  // Num equipamento com vários preços: mês, dia, hora ou uso.
                  ...(unidade ? { unidade } : {}),
                  // Como divide entre quem paga: igual, percentual ou cotas.
                  ...(divisao && divisao.tipo !== "igual" ? { divisao } : {}),
                  // Só no avulso: quem pagou este uso (no cíclico, é quem pagou a fatura).
                  ...(pagoPor !== undefined ? { pagoPor } : {}),
                  participantes: participantes?.length ? [...participantes] : [...i.participantes],
                  ...carimbo(autorDe(e)),
                },
              ],
            },
      ),
    }));
  }, []);

  // ── perfil ───────────────────────────────────────────────────────────────

  const definirNomeDoPerfil = useCallback((nome) => mudarPerfil((p) => ({ ...p, nome })), [mudarPerfil]);
  const definirAviso = useCallback(
    (chave, ligado) => mudarPerfil((p) => ({ ...p, avisos: { ...p.avisos, [chave]: Boolean(ligado) } })),
    [mudarPerfil],
  );

  /** Zera este conjunto, mantendo o modo e o nome dele. */
  const recomecar = useCallback(() => {
    definir((e) => {
      // Zera os números e mantém quem é quem: as mesmas pessoas, você, a descrição.
      const novo = estadoInicial(e?.modo ?? PADRAO, e?.moradores?.length, e?.preset ?? undefined);
      const moradores = (e?.moradores ?? []).map((m) => ({ ...novaPessoa(m.nome, m.convidado), id: m.id }));
      const ids = moradores.map((m) => m.id);
      return {
        ...novo,
        moradores,
        itens: novo.itens.map((i) => ({ ...i, participantes: ids })),
        voce: e?.voce ?? null,
        admin: e?.admin ?? null,
        descricao: e?.descricao ?? "",
        desde: e?.desde ?? null,
        lembretes: e?.lembretes ?? [],
      };
    });
  }, []);

  return {
    estado,
    resultado,
    indicePorId,
    modo,
    idDoConjunto,
    conjuntos,
    perfil,
    panorama,
    acoes: {
      // conjuntos
      abrirConjunto,
      novoConjunto,
      criarConjuntoNovo,
      recarregar,
      fecharConjunto,
      apagarConjunto,
      renomear,
      duplicarParaOProximoMes,
      exportar,
      importar,
      // dentro de um conjunto
      definirCiclo,
      adicionarCiclo,
      lancarCiclica,
      salvarEdicaoDaAvulsa,
      salvarEdicaoDoItem,
      salvarEdicaoDaCiclica,
      salvarEdicaoDoRegistro,
      salvarEdicaoDoLembrete,
      editarRegistro,
      duplicarRegistro,
      duplicarLembrete,
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
      definirPeriodoDaTemporada,
      definirNaConta,
      alternarCorte,
      definirValorDoCiclo,
      definirPagador,
      // agenda
      alternarDiaDaPessoa,
      lancarDespesaNoDia,
      lancarUsoNoDia,
      removerUso,
      lancarTarefaNoDia,
      editarTarefa,
      removerTarefa,
      alternarResponsavel,
      recomecar,
      // pessoas, lembretes, acerto, perfil
      adicionarPessoa,
      removerPessoa,
      definirVoce,
      definirMarcacao,
      definirCampoDoConjunto,
      adicionarLembrete,
      editarLembrete,
      removerLembrete,
      adicionarItemNaLista,
      alternarItemDaLista,
      removerItemDaLista,
      confirmarPagamento,
      lancarRegistro,
      definirNomeDoPerfil,
      definirAviso,
    },
  };
}
