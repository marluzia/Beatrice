import {
  consumoDaFatura,
  diasContadosNaFatura,
  janelaDaFatura,
  lavagensForaDoCiclo,
  tarifaDaFatura,
  totalDaFatura,
  valorDoConsumo,
} from "./adaptador.js";
import { diasDaJanela, faturaAtiva, janelaValida } from "./calendario.js";
import { MESES, nomeOu, reais } from "./formato.js";

const diaCurto = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");

const diaLongo = (iso) =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—";

const numero = (v, casas = 2) =>
  Number(v).toLocaleString("pt-BR", { maximumFractionDigits: casas });

const regua = (texto) => `${texto}\n${"=".repeat(texto.length)}`;

function blocoDasFaturas(estado) {
  const linhas = [];

  for (const [qual, nome, unidade] of [
    ["luz", "LUZ", "kWh"],
    ["agua", "ÁGUA", "m³"],
  ]) {
    const fatura = estado.faturas[qual];

    if (!faturaAtiva(fatura)) {
      linhas.push(`${nome}: fora deste fechamento`, "");
      continue;
    }

    const janela = janelaDaFatura(fatura, estado.periodo);
    const ciclo = janelaValida(fatura?.janela)
      ? `${diaLongo(fatura.janela.de)} a ${diaLongo(fatura.janela.ate)}`
      : "sem datas de leitura (vale o mês de referência)";

    linhas.push(
      `${nome}`,
      `  ciclo: ${ciclo} — ${diasDaJanela(janela, estado.periodo)} dias`,
      `  consumo: ${numero(consumoDaFatura(fatura))} ${unidade}`,
      `  total da fatura: R$ ${reais(totalDaFatura(fatura))}`,
      `  do total, acompanha o consumo: R$ ${reais(valorDoConsumo(fatura))}`,
      `  preço efetivo: R$ ${numero(tarifaDaFatura(fatura), 6)} por ${unidade}`,
      "  linhas lançadas:",
    );

    for (const linha of fatura.linhas ?? []) {
      const quanto = linha.quantidade ? `${numero(linha.quantidade)} ${unidade}` : "—";
      linhas.push(
        `    ${(linha.nome || "sem nome").padEnd(34)} ${quanto.padStart(12)}  ` +
          `R$ ${reais(Number(String(linha.valor).replace(",", ".")) || 0).padStart(10)}  ${linha.comportamento}`,
      );
    }

    linhas.push("");
  }

  return linhas;
}

function blocoDaPessoa(estado, resultado, calculado, indice) {
  const morador = estado.moradores.find((m) => m.id === calculado.moradorId) ?? {};
  const nome = nomeOu(morador.nome, indice);
  const ausencias = Array.isArray(morador.ausencias) ? morador.ausencias : [];

  const linhas = [
    regua(`${nome} — R$ ${reais(calculado.total)}`),
    "",
    "  presença",
  ];

  for (const [qual, rotulo] of [
    ["luz", "luz"],
    ["agua", "água"],
  ]) {
    const fatura = estado.faturas[qual];
    if (!faturaAtiva(fatura)) continue;
    const janela = janelaDaFatura(fatura, estado.periodo);
    linhas.push(
      `    dias contados na ${rotulo}: ${diasContadosNaFatura(morador, fatura, estado.periodo)}` +
        ` de ${diasDaJanela(janela, estado.periodo)}`,
    );
  }

  linhas.push(
    `    dias fora marcados: ${ausencias.length}` +
      (ausencias.length > 0 ? ` (${ausencias.map(diaCurto).join(", ")})` : ""),
    "",
    "  de onde veio o valor",
  );

  for (const parcela of calculado.linhas) {
    linhas.push(`    ${parcela.nome.padEnd(38)} R$ ${reais(parcela.valor).padStart(10)}`);
  }

  linhas.push(
    "",
    `    LUZ R$ ${reais(calculado.luz)} · ÁGUA R$ ${reais(calculado.agua)} · REAIS R$ ${reais(calculado.reais)}`,
    "",
    "  participação em cada item",
  );

  for (const item of resultado.itens) {
    const fatia = item.fatias.find((f) => f.moradorId === calculado.moradorId);
    if (!fatia) continue;

    const doEstado = estado.itens.find((i) => i.id === item.id);
    const detalhe = [];

    if (doEstado?.rateio === "uso") {
      const eventos = (doEstado.eventos ?? []).filter((ev) =>
        (ev.participantes ?? []).includes(calculado.moradorId),
      );
      const usos = eventos.length
        ? eventos
            .map(
              (ev) =>
                `${diaCurto(ev.data)}${(ev.participantes ?? []).length > 1 ? " (dividido)" : ""}`,
            )
            .join(", ")
        : `${numero(doEstado.usosPorPessoa?.[calculado.moradorId] ?? 0)} usos declarados`;
      detalhe.push(`usos: ${usos}`);
    }

    if (doEstado?.rateio === "presenca" || doEstado?.rateio === "dias") {
      detalhe.push(`divide por ${doEstado.rateio === "dias" ? "dias em casa" : "presença"}`);
    }
    if (doEstado?.rateio === "igual") detalhe.push("divide igual");

    linhas.push(
      `    ${item.nome.padEnd(30)} ${(numero(fatia.proporcao * 100, 1) + "%").padStart(7)}` +
        `  R$ ${reais(fatia.total).padStart(10)}${detalhe.length ? `  · ${detalhe.join(" · ")}` : ""}`,
    );
  }

  const minhas = lavagensForaDoCiclo(estado).filter((o) =>
    (o.participantes ?? []).includes(calculado.moradorId),
  );

  if (minhas.length > 0) {
    linhas.push("", "  !! LANÇAR NO PRÓXIMO FECHAMENTO");
    for (const o of minhas) {
      linhas.push(
        `    ${o.item} em ${diaLongo(o.dia)} — a ${o.faltando === "luz" ? "energia" : "água"} ` +
          (o.quando === "futuro"
            ? "virá na próxima fatura e NÃO está cobrada aqui."
            : "entrou na fatura anterior, já fechada, e não é cobrada de novo."),
      );
    }
  }

  linhas.push("");
  return linhas;
}

export function dadosDoRelatorio(estado, resultado) {
  const { mes, ano } = estado.periodo;
  const calibragem = Math.round((Number(estado.calibragem) || 0) * 100);

  const faturas = [
    ["luz", "Luz", "kWh"],
    ["agua", "Água", "m³"],
  ].map(([qual, nome, unidade]) => {
    const fatura = estado.faturas[qual];
    if (!faturaAtiva(fatura)) return { nome, unidade, ativa: false };

    const janela = janelaDaFatura(fatura, estado.periodo);
    return {
      nome,
      unidade,
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
        quantidade: l.quantidade ? `${numero(l.quantidade)} ${unidade}` : "—",
        valor: Number(String(l.valor).replace(",", ".")) || 0,
        comportamento: l.comportamento,
      })),
    };
  });

  const itens = resultado.itens
    .map((item) => {
      const doEstado = estado.itens.find((i) => i.id === item.id);
      if (!doEstado) return null;
      return { nome: item.nome, custoTotal: item.custoTotal, rateio: doEstado.rateio };
    })
    .filter(Boolean);

  const orfas = lavagensForaDoCiclo(estado);

  const pessoas = resultado.moradores.map((calculado, indice) => {
    const morador = estado.moradores.find((m) => m.id === calculado.moradorId) ?? {};
    const ausencias = Array.isArray(morador.ausencias) ? morador.ausencias : [];

    const presenca = [
      ["luz", "luz"],
      ["agua", "água"],
    ]
      .filter(([qual]) => faturaAtiva(estado.faturas[qual]))
      .map(([qual, rotulo]) => {
        const fatura = estado.faturas[qual];
        return {
          conta: rotulo,
          contados: diasContadosNaFatura(morador, fatura, estado.periodo),
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
          const eventos = (doEstado.eventos ?? []).filter((ev) =>
            (ev.participantes ?? []).includes(calculado.moradorId),
          );
          detalhe = eventos.length
            ? `usos: ${eventos
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
      luz: calculado.luz,
      agua: calculado.agua,
      reais: calculado.reais,
      participacoes,
      pendencias: orfas.filter((o) =>
        (o.participantes ?? []).includes(calculado.moradorId),
      ),
    };
  });

  const residuo = resultado.residuoDeCentavos;
  const quantos = Math.abs(residuo);

  return {
    titulo: `Fechamento de ${MESES[mes - 1]} de ${ano}`,
    geradoEm: new Date().toLocaleString("pt-BR"),
    calibragem,
    faturas,
    itens,
    pessoas,
    conferencia: {
      somaDevida: resultado.somaDevida,
      somaCobrada: resultado.somaCobrada,
      diferenca: resultado.diferenca,
      centavos:
        residuo === 0
          ? null
          : `Arredondado, ${residuo > 0 ? "falta" : "sobra"} ${quantos} ` +
            `${quantos === 1 ? "centavo" : "centavos"}. Fiz meu melhor, mas o sistema ` +
            "monetário não cedeu. Alguém vai ter que ceder.",
    },
    alertas: resultado.alertas,
  };
}

export function montarRelatorio(estado, resultado) {
  const d = dadosDoRelatorio(estado, resultado);
  const linhas = [
    regua(`CEDER — ${d.titulo}`),
    "",
    `Gerado em ${d.geradoEm}`,
    `Uso comum calibrado em ${d.calibragem}% por igual, ${100 - d.calibragem}% pelos dias em casa.`,
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
      `  ciclo: ${f.ciclo} — ${f.dias} dias`,
      `  consumo: ${numero(f.consumo)} ${f.unidade}`,
      `  total da fatura: R$ ${reais(f.total)}`,
      `  do total, acompanha o consumo: R$ ${reais(f.consumoEmReais)}`,
      `  preço efetivo: R$ ${numero(f.tarifa, 6)} por ${f.unidade}`,
      "  linhas lançadas:",
    );
    for (const l of f.linhas) {
      linhas.push(
        `    ${l.nome.padEnd(34)} ${l.quantidade.padStart(12)}  R$ ${reais(l.valor).padStart(10)}  ${l.comportamento}`,
      );
    }
    linhas.push("");
  }

  linhas.push(regua("O QUE A CASA TEM"), "");
  for (const i of d.itens) {
    linhas.push(`  ${i.nome.padEnd(30)} R$ ${reais(i.custoTotal).padStart(10)}  divide por ${i.rateio}`);
  }

  linhas.push("", regua("CADA PESSOA"), "");

  for (const p of d.pessoas) {
    linhas.push(regua(`${p.nome} — R$ ${reais(p.total)}`), "", "  presença");
    for (const pr of p.presenca) {
      linhas.push(`    dias contados na ${pr.conta}: ${pr.contados} de ${pr.de}`);
    }
    linhas.push(
      `    dias fora marcados: ${p.ausencias.length}` +
        (p.ausencias.length ? ` (${p.ausencias.map(diaCurto).join(", ")})` : ""),
      "",
      "  de onde veio o valor",
    );
    for (const l of p.linhas) {
      linhas.push(`    ${l.nome.padEnd(38)} R$ ${reais(l.valor).padStart(10)}`);
    }
    linhas.push(
      "",
      `    LUZ R$ ${reais(p.luz)} · ÁGUA R$ ${reais(p.agua)} · REAIS R$ ${reais(p.reais)}`,
      "",
      "  participação em cada item",
    );
    for (const t of p.participacoes) {
      linhas.push(
        `    ${t.item.padEnd(30)} ${(numero(t.proporcao * 100, 1) + "%").padStart(7)}` +
          `  R$ ${reais(t.total).padStart(10)}${t.detalhe ? `  · ${t.detalhe}` : ""}`,
      );
    }
    if (p.pendencias.length) {
      linhas.push("", "  !! LANÇAR NO PRÓXIMO FECHAMENTO");
      for (const o of p.pendencias) {
        linhas.push(
          `    ${o.item} em ${diaLongo(o.dia)} — a ${o.faltando === "luz" ? "energia" : "água"} ` +
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
    `  soma das faturas e despesas: R$ ${reais(d.conferencia.somaDevida)}`,
    `  soma cobrada das pessoas:    R$ ${reais(d.conferencia.somaCobrada)}`,
    `  diferença:                   R$ ${reais(d.conferencia.diferenca)}`,
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
