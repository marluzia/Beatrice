import { simboloDe } from "./moedas.js";
import {
  consumoDaFatura,
  datasMarcadas,
  diasContadosNaFatura,
  polaridadeDoConjunto,
  janelaDaFatura,
  itemParaMotor,
  lavagensForaDoCiclo,
  tarifaDaFatura,
  totalDaFatura,
  valorDoConsumo,
} from "./adaptador.js";
import { consumoDe } from "./motor.ts";
import { modoDe, presetDe } from "./modos.js";
import { diasDaJanela, faturaAtiva, janelaValida } from "./calendario.js";
import { ciclosDe, ciclosLigados, ehMedido, nomeNaFrase, unidadeDoRecurso } from "./ciclos.js";
import { historicoEmTexto } from "./agenda.js";
import { acertoDe } from "./acerto.js";
import { cessaoDe } from "./cessao.js";
import { MESES, nomeOu, reais } from "./formato.js";

const diaCurto = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : " ");

/** Numa república marcam-se os dias fora; numa temporada, os dias de estadia. */
const rotuloDasDatas = (estado) =>
  polaridadeDoConjunto(estado) === "presenca" ? "dias de estadia marcados" : "dias fora marcados";

const diaLongo = (iso) =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : " ";

const numero = (v, casas = 2) =>
  Number(v).toLocaleString("pt-BR", { maximumFractionDigits: casas });

const regua = (texto) => `${texto}\n${"=".repeat(texto.length)}`;

export function dadosDoRelatorio(estado, resultado) {
  const { mes, ano } = estado.periodo;
  const calibragem = Math.round((Number(estado.calibragem) || 0) * 100);

  const faturas = ciclosDe(estado).map((fatura) => {
    const id = fatura.id;
    const nome = fatura.nome || "Conta";
    const unidade = unidadeDoRecurso(fatura.recurso);
    if (!faturaAtiva(fatura)) return { id, nome, unidade, medido: ehMedido(fatura), ativa: false };

    const janela = janelaDaFatura(fatura, estado.periodo);
    return {
      id,
      nome,
      unidade,
      medido: ehMedido(fatura),
      ativa: true,
      ciclo: janelaValida(fatura?.janela)
        ? `${diaLongo(fatura.janela.de)} a ${diaLongo(fatura.janela.ate)}`
        : "sem datas de leitura (vale o mês de referência)",
      dias: diasDaJanela(janela, estado.periodo),
      consumo: consumoDaFatura(fatura),
      total: totalDaFatura(fatura),
      consumoEmReais: valorDoConsumo(fatura),
      tarifa: tarifaDaFatura(fatura),
      linhas: (fatura.linhas ?? []).map((l) => ({
        nome: l.nome || "sem nome",
        quantidade: l.quantidade ? `${numero(l.quantidade)} ${unidade}` : " ",
        valor: Number(String(l.valor).replace(",", ".")) || 0,
        comportamento: l.comportamento,
      })),
    };
  });

  // O consumo físico de cada item, antes de virar dinheiro. É o que permite
  // conferir o relatório contra a etiqueta do aparelho e contra a fatura: sem
  // os kWh, "Ar-condicionado R$ 180" é um número que a casa só pode aceitar.
  const janelas = Object.fromEntries(
    ciclosLigados(estado).map((c) => [c.id, janelaDaFatura(c, estado.periodo)]),
  );

  const itens = resultado.itens
    .map((item) => {
      const doEstado = estado.itens.find((i) => i.id === item.id);
      if (!doEstado) return null;

      const fisico = consumoDe(itemParaMotor(doEstado, janelas));
      const medidas = [];
      for (const [id, quantidade] of Object.entries(fisico.porCiclo)) {
        const ciclo = ciclosDe(estado).find((c) => c.id === id);
        if (!quantidade || !ehMedido(ciclo)) continue;
        const casas = ciclo.recurso === "kwh" ? 2 : 3;
        medidas.push(`${numero(quantidade, casas)} ${unidadeDoRecurso(ciclo.recurso)}`);
      }

      return {
        nome: item.nome,
        custoTotal: item.custoTotal,
        rateio: doEstado.rateio,
        consumo: medidas.join(" · "),
      };
    })
    .filter(Boolean);

  const orfas = lavagensForaDoCiclo(estado);

  const pessoas = resultado.moradores.map((calculado, indice) => {
    const morador = estado.moradores.find((m) => m.id === calculado.moradorId) ?? {};
    const ausencias = datasMarcadas(morador, polaridadeDoConjunto(estado));

    const presenca = ciclosLigados(estado)
      .map((fatura) => {
        return {
          conta: nomeNaFrase(fatura),
          contados: diasContadosNaFatura(morador, fatura, estado.periodo, polaridadeDoConjunto(estado)),
          de: diasDaJanela(janelaDaFatura(fatura, estado.periodo), estado.periodo),
        };
      });

    const participacoes = resultado.itens
      .map((item) => {
        const fatia = item.fatias.find((f) => f.moradorId === calculado.moradorId);
        if (!fatia) return null;

        const doEstado = estado.itens.find((i) => i.id === item.id);
        let detalhe = "";

        if (doEstado?.rateio === "uso") {
          const registros = (doEstado.registrosDeUso ?? []).filter((ev) =>
            (ev.participantes ?? []).includes(calculado.moradorId),
          );
          detalhe = registros.length
            ? `usos: ${registros
                .map(
                  (ev) =>
                    `${diaCurto(ev.data)}${(ev.participantes ?? []).length > 1 ? " (dividido)" : ""}`,
                )
                .join(", ")}`
            : `${numero(doEstado.usosPorPessoa?.[calculado.moradorId] ?? 0)} usos declarados`;
        } else if (doEstado?.rateio === "dias") detalhe = "divide por dias em casa";
        else if (doEstado?.rateio === "presenca") detalhe = "divide por presença";
        else if (doEstado?.rateio === "igual") detalhe = "divide igual";

        return {
          item: item.nome,
          proporcao: fatia.proporcao,
          total: fatia.total,
          detalhe,
        };
      })
      .filter(Boolean);

    return {
      nome: nomeOu(morador.nome, indice),
      total: calculado.total,
      presenca,
      ausencias,
      linhas: calculado.linhas,
      /** Quanto a pessoa deve de cada ciclo ligado, na ordem do conjunto. */
      porCiclo: ciclosLigados(estado).map((c) => ({
        nome: c.nome || "Conta",
        valor: calculado.porCiclo?.[c.id] ?? 0,
      })),
      reais: calculado.reais,
      participacoes,
      pendencias: orfas.filter((o) =>
        (o.participantes ?? []).includes(calculado.moradorId),
      ),
    };
  });

  const residuo = resultado.residuoDeCentavos;
  const quantos = Math.abs(residuo);

  // ── o registro do dinheiro ───────────────────────────────────────────────
  //
  // Quanto cada um deve é só metade do fechamento. A outra metade é quem
  // desembolsou e quem transfere para quem   e era justamente a parte que não
  // ficava registrada em lugar nenhum do relatório.
  const acerto = acertoDe(estado, resultado);

  const nomeDoMorador = (id) => {
    const i = estado.moradores.findIndex((m) => m.id === id);
    return i < 0 ? null : nomeOu(estado.moradores[i].nome, i);
  };

  const pagamentos = acerto.despesas.map((d) => ({
    nome: d.nome,
    valor: d.centavos / 100,
    quemPagou: nomeDoMorador(d.pagoPor),
  }));

  const quemCedeu = nomeDoMorador(estado.quemCede);

  // O acerto fica em aberto se falta ceder em qualquer um dos dois resíduos: o
  // do fechamento inteiro (que a tela usa para travar) ou o do próprio acerto,
  // que olha só o que alguém centralizou. Os dois números são diferentes, e
  // basta um deles pendurado para as transferências não fecharem.
  const emAberto = acerto.precisaCeder || cessaoDe(estado, resultado).precisaEscolher;

  // Qual conjunto é este. O mesmo relatório sai para uma república e para uma
  // multipropriedade, e as duas leem os mesmos números de maneiras diferentes:
  // "30 dias contados" é o normal numa e é quase o mês inteiro de estadia na
  // outra. Quem recebe o PDF precisa saber de qual se trata.
  const modo = modoDe(estado.modo);

  return {
    titulo: `Fechamento de ${MESES[mes - 1]} de ${ano}`,
    geradoEm: new Date().toLocaleString("pt-BR"),
    tipo: {
      nome: modo.nome,
      exemplo: modo.exemplo,
      // Numa república marcam-se os dias fora; numa temporada, os de estadia.
      presenca: polaridadeDoConjunto(estado) === "presenca" ? "estadia" : "ausência",
    },
    calibragem,
    /** O preset da República, quando há um: diz que a régua foi decidida de antemão. */
    preset: presetDe(estado)?.nome ?? null,
    faturas,
    itens,
    pessoas,
    /** Quem desembolsou cada despesa. `quemPagou` nulo = cada um pagou a sua parte. */
    pagamentos,

    /** De quem para quem, e quanto. É o que vira Pix. */
    acerto: {
      saldos: acerto.saldos.map((s) => ({
        nome: s.nome,
        adiantou: s.pagou / 100,
        parte: s.deve / 100,
        saldo: s.saldo / 100,
      })),
      transferencias: acerto.transferencias.map((t) => ({
        de: t.deNome,
        para: t.paraNome,
        valor: t.centavos / 100,
      })),
      // Ninguém centralizou nada: não há dívida entre o grupo, e isso é um
      // resultado, não uma falta de dado.
      semCentralizacao: acerto.totalCentralizado === 0,
      emAberto,
      diretas: acerto.diretas.map((d) => ({ nome: d.nome, valor: d.centavos / 100 })),
    },

    conferencia: {
      somaDevida: resultado.somaDevida,
      somaCobrada: resultado.somaCobrada,
      diferenca: resultado.diferenca,
      // A linha dos valores arredondados saiu daqui. Ela existia quando não
      // havia quem cede: mostrava a soma torta e deixava a casa com ela. Hoje
      // ou alguém assumiu o centavo, e a soma fecha exata, ou ninguém assumiu,
      // e o que falta dizer é isso   não repetir o número torto.
      centavos:
        residuo === 0
          ? null
          : quemCedeu
            ? `A divisão não fecha em dinheiro por ${quantos} ` +
              `${quantos === 1 ? "centavo" : "centavos"}. ${quemCedeu} cedeu, e com isso ` +
              "a soma bate exatamente com o valor devido."
            : `A divisão não fecha em dinheiro por ${quantos} ` +
              `${quantos === 1 ? "centavo" : "centavos"} e ninguém assumiu a moeda ainda. ` +
              "O fechamento está em aberto até o grupo escolher quem cede.",
    },
    alertas: resultado.alertas,
  };
}

export function montarRelatorio(estado, resultado) {
  const d = dadosDoRelatorio(estado, resultado);
  const linhas = [
    regua(`CEDER   ${d.titulo}`),
    "",
    `Conjunto: ${d.tipo.nome}${d.tipo.exemplo ? ` (${d.tipo.exemplo})` : ""}`,
    `Presença marcada por ${d.tipo.presenca}`,
    `Gerado em ${d.geradoEm}`,
    `${d.preset ? `${d.preset}: uso` : "Uso"} comum calibrado em ${d.calibragem}% por igual, ${100 - d.calibragem}% pelos dias em casa.`,
    "",
    regua("AS CONTAS"),
    "",
  ];

  for (const f of d.faturas) {
    if (!f.ativa) {
      linhas.push(`${f.nome.toUpperCase()}: fora deste fechamento`, "");
      continue;
    }
    linhas.push(
      f.nome.toUpperCase(),
      `  ciclo: ${f.ciclo}   ${f.dias} dias`,
      ...(f.medido
        ? [
            `  consumo: ${numero(f.consumo)} ${f.unidade}`,
            `  total da fatura: ${simboloDe()} ${reais(f.total)}`,
            `  do total, acompanha o consumo: ${simboloDe()} ${reais(f.consumoEmReais)}`,
            `  preço efetivo: ${simboloDe()} ${numero(f.tarifa, 6)} por ${f.unidade}`,
          ]
        : [
            `  total da fatura: ${simboloDe()} ${reais(f.total)}`,
            `  do total, vai para o uso comum: ${simboloDe()} ${reais(f.consumoEmReais)}`,
          ]),
      "  linhas lançadas:",
    );
    for (const l of f.linhas) {
      linhas.push(
        `    ${l.nome.padEnd(34)} ${l.quantidade.padStart(12)}  ${simboloDe()} ${reais(l.valor).padStart(10)}  ${l.comportamento}`,
      );
    }
    linhas.push("");
  }

  linhas.push(regua("O QUE O CONJUNTO GASTA"), "");
  for (const i of d.itens) {
    linhas.push(
      `  ${i.nome.padEnd(30)} ${(i.consumo || " ").padStart(18)}  ` +
        `${simboloDe()} ${reais(i.custoTotal).padStart(10)}  divide por ${i.rateio}`,
    );
  }

  // O mês em ordem: serve para a casa conferir o que foi lançado e ver o que
  // ficou sem marcação. Tarefa aparece aqui e em nenhum cálculo.
  const historico = historicoEmTexto(estado);
  if (historico.length > 0) {
    linhas.push("", regua("O QUE ACONTECEU, EM ORDEM"), "", ...historico);
  }

  // Quem desembolsou cada despesa. Sem isto o relatório dizia quanto cada um
  // deve e nunca dizia quem já tinha posto dinheiro   e é a diferença entre as
  // duas coisas que gera o acerto.
  if (d.pagamentos.length > 0) {
    linhas.push("", regua("QUEM PAGOU"), "");
    for (const p of d.pagamentos) {
      linhas.push(
        `  ${p.nome.padEnd(30)} ${simboloDe()} ${reais(p.valor).padStart(10)}  ` +
          `${p.quemPagou ?? "cada um pagou a sua parte"}`,
      );
    }
  }

  // O acerto fecha o relatório: é a parte que vira dinheiro.
  const acerto = acertoDe(estado, resultado);
  linhas.push("", regua("QUANTO CADA UM PAGA"), "");

  if (d.acerto.emAberto) {
    linhas.push(
      "  EM ABERTO: falta o grupo decidir quem fica com o centavo que não fecha.",
      "  Enquanto isso o acerto não pode ser calculado.",
    );
  } else if (acerto.totalCentralizado === 0) {
    linhas.push("  Ninguém centralizou despesa: cada um pagou a própria parte direto.");
  } else {
    for (const s of acerto.saldos) {
      const situacao =
        s.saldo > 0
          ? `recebe ${simboloDe()} ${reais(s.saldo / 100)}`
          : s.saldo < 0
            ? `paga ${simboloDe()} ${reais(-s.saldo / 100)}`
            : "quite";
      linhas.push(
        `  ${s.nome.padEnd(20)} adiantou ${simboloDe()} ${reais(s.pagou / 100).padStart(10)}` +
          `  parte dele(a) ${simboloDe()} ${reais(s.deve / 100).padStart(10)}  →  ${situacao}`,
      );
    }

    linhas.push("");
    if (acerto.transferencias.length === 0) {
      linhas.push("  Nenhuma transferência necessária.");
    } else {
      for (const t of acerto.transferencias) {
        linhas.push(`  ${t.deNome} → ${t.paraNome}: ${simboloDe()} ${reais(t.centavos / 100)}`);
      }
    }
  }

  if (acerto.residuo !== 0 && !d.acerto.emAberto) {
    const quem = acerto.saldos.find((s) => s.moradorId === acerto.quemCede)?.nome;
    const n = Math.abs(acerto.residuo);
    linhas.push("", `  ${quem} cedeu ${n} ${n === 1 ? "centavo" : "centavos"} neste acerto.`);
  }

  if (acerto.diretas.length > 0) {
    linhas.push(
      "",
      "  Pagas direto, fora do acerto (cada um pagou a sua parte):",
      ...acerto.diretas.map(
        (d) => `    ${d.nome.padEnd(28)} ${simboloDe()} ${reais(d.centavos / 100).padStart(10)}`,
      ),
    );
  }

  linhas.push("", regua("CADA PESSOA"), "");

  for (const p of d.pessoas) {
    linhas.push(regua(`${p.nome}   ${simboloDe()} ${reais(p.total)}`), "", "  presença");
    for (const pr of p.presenca) {
      linhas.push(`    dias contados na ${pr.conta}: ${pr.contados} de ${pr.de}`);
    }
    linhas.push(
      `    ${rotuloDasDatas(estado)}: ${p.ausencias.length}` +
        (p.ausencias.length ? ` (${p.ausencias.map(diaCurto).join(", ")})` : ""),
      "",
      "  de onde veio o valor",
    );
    for (const l of p.linhas) {
      linhas.push(`    ${l.nome.padEnd(38)} ${simboloDe()} ${reais(l.valor).padStart(10)}`);
    }
    linhas.push(
      "",
      `    ${[...p.porCiclo.map((c) => `${c.nome.toUpperCase()} ${simboloDe()} ${reais(c.valor)}`), `REAIS ${simboloDe()} ${reais(p.reais)}`].join(" · ")}`,
      "",
      "  participação em cada item",
    );
    for (const t of p.participacoes) {
      linhas.push(
        `    ${t.item.padEnd(30)} ${(numero(t.proporcao * 100, 1) + "%").padStart(7)}` +
          `  ${simboloDe()} ${reais(t.total).padStart(10)}${t.detalhe ? `  · ${t.detalhe}` : ""}`,
      );
    }
    if (p.pendencias.length) {
      linhas.push("", "  !! LANÇAR NO PRÓXIMO FECHAMENTO");
      for (const o of p.pendencias) {
        linhas.push(
          `    ${o.item} em ${diaLongo(o.dia)}   a parte ${o.faltando === "luz" ? "de energia" : `de ${o.nomeDoCiclo}`} ` +
            (o.quando === "futuro"
              ? "virá na próxima fatura e NÃO está cobrada aqui."
              : "entrou na fatura anterior, já fechada, e não é cobrada de novo."),
        );
      }
    }
    linhas.push("");
  }

  linhas.push(
    regua("CONFERÊNCIA"),
    "",
    `  soma das faturas e despesas: ${simboloDe()} ${reais(d.conferencia.somaDevida)}`,
    `  soma cobrada das pessoas:    ${simboloDe()} ${reais(d.conferencia.somaCobrada)}`,
    `  diferença:                   ${simboloDe()} ${reais(d.conferencia.diferenca)}`,
  );
  if (d.conferencia.centavos) linhas.push("", `  ${d.conferencia.centavos}`);

  if (d.alertas.length) {
    linhas.push("", regua("AVISOS"), "");
    for (const a of d.alertas) linhas.push(`  [${a.nivel}] ${a.texto}`, "");
  }

  return linhas.join("\n");
}

export function nomeDoArquivo(estado) {
  const { mes, ano } = estado.periodo;
  return `ceder-${ano}-${String(mes).padStart(2, "0")}.txt`;
}
