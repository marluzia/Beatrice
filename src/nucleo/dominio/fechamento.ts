// CRC: Fechamento
//
// Responsabilidade: consolidar um período. Reúne as faturas, os ciclos e os
// itens, manda alocar cada custo, junta tudo por pessoa e verifica que nada
// se perdeu no caminho.
// Colabora com: todos os outros. É o único que conhece a ordem das coisas,
// e o único que não sabe fazer nenhuma delas sozinho.
//
// A ordem:
//   1. ler a fatura de cada ciclo  → tarifas e taxas          (Fatura)
//   2. medir os ciclos             → dias de cada um          (Ciclo, Morador)
//   3. custear cada item           → reais por conta          (Consumo, Custo)
//   4. alocar cada item            → parcelas                 (RegraDeAlocação, Alocação)
//   5. alocar o que sobrou         → uso comum e taxas fixas  (Alocação)
//   6. conferir                    → conservação e centavos   (Explicação)

import type {
  Alerta,
  CicloCalculado,
  CicloId,
  CustoBruto,
  Estado,
  Item,
  ItemCalculado,
  Rateio,
  Resultado,
  TaxaFixa,
} from "./tipos.ts";
import { emCentavos, entreZeroEUm, somar, TOLERANCIA } from "./numeros.ts";
import { diasDoCiclo, diasDoPeriodo } from "./ciclo.ts";
import { diasContadosEm, somaDosDias } from "./morador.ts";
import { medirFatura } from "./fatura.ts";
import { custoDe } from "./custo.ts";
import { partesDoAjuste, regraExata, somaDeclarada } from "./regras.ts";
import { alocar, medirJanelas } from "./alocacao.ts";
import type { Janela } from "./alocacao.ts";
import {
  conjuntoSemPessoa,
  centavosDeDiferenca,
  consumoPassaDaFatura,
  itensSemNinguem,
  porcentagemNaoFecha,
  ajusteNaoFecha,
  valorNaoFecha,
  lancarNosTotais,
  ninguemEmCasa,
  presencaSuposta,
  totaisEmBranco,
} from "./explicacao.ts";

/** O nome do uso comum de um ciclo: "Uso comum de luz", ou só o nome num ciclo sem recurso. */
function nomeDoUsoComum(ciclo: { id: CicloId; nome: string; recurso: unknown }): string {
  if (ciclo.id === "luz") return "Uso comum de luz";
  if (ciclo.id === "agua") return "Uso comum de água";
  return ciclo.recurso === null ? ciclo.nome : `Uso comum de ${ciclo.nome}`;
}

export function calcular(estado: Estado): Resultado {
  const { moradores, itens, periodo } = estado;
  const alertas: Alerta[] = [];

  // 1. Faturas. Dois ciclos com o mesmo id seriam o mesmo dinheiro contado
  //    duas vezes; fica o primeiro.
  const vistos = new Set<CicloId>();
  const faturas = (estado.faturas ?? []).filter((f) => !vistos.has(f.id) && vistos.add(f.id));
  const medidas = faturas.map((f) => medirFatura(f));

  // 2. Ciclos
  const diasNoPeriodo = diasDoPeriodo(periodo);
  const diasContados = diasContadosEm(moradores, diasNoPeriodo, (m) => m.diasFora);

  const porCiclo: Record<CicloId, Janela> = {};
  for (const f of faturas) {
    const dias = diasDoCiclo(f.dias, diasNoPeriodo);
    porCiclo[f.id] = {
      dias,
      contados: diasContadosEm(moradores, dias, (m) => m.diasForaPorCiclo?.[f.id] ?? m.diasFora),
      presentes: estado.presencas?.porCiclo?.[f.id],
    };
  }

  const janelas = medirJanelas(
    moradores,
    { dias: diasNoPeriodo, contados: diasContados, presentes: estado.presencas?.mes },
    porCiclo,
  );

  const somaDiasContados = somaDosDias(moradores, diasContados);

  // 3. Custos
  const validos = itens.filter((i) => i.participantes.length > 0);
  const semNinguem = itens.length - validos.length;
  if (semNinguem > 0) alertas.push(itensSemNinguem(semNinguem));

  const tarifas = Object.fromEntries(medidas.map((m) => [m.id, m.tarifa]));
  const custos = validos.map((i) => custoDe(i, tarifas));

  // O que a fatura cobrou e nenhum item explicou vira uso comum.
  const sobras: Record<CicloId, number> = {};
  for (const m of medidas) {
    sobras[m.id] = m.consumoEmReais - somar(custos.map((c) => c.porCiclo[m.id] ?? 0));
    if (sobras[m.id] < -TOLERANCIA) alertas.push(consumoPassaDaFatura(m, Math.abs(sobras[m.id])));
  }
  const totalEmReais = somar(custos.map((c) => c.reais));

  if (somaDiasContados === 0 && moradores.length > 0) alertas.push(ninguemEmCasa());

  // 4. Alocação dos itens
  const totais = totaisEmBranco(moradores, diasContados);
  const calculados: ItemCalculado[] = [];

  const processar = (item: Item, bruto: CustoBruto, automatico: boolean) => {
    const alocado = alocar(item, bruto, janelas, automatico);
    lancarNosTotais(totais, item.nome, alocado);
    calculados.push(alocado.calculado);
  };

  validos.forEach((item, i) => processar(item, custos[i], false));

  // Cada regra tem o seu jeito de não fechar, e cada um merece a sua mensagem.
  validos.forEach((item, i) => {
    if (item.rateio.tipo === "presenca") {
      const exata = regraExata({
        item,
        diasContados,
        diasNoCiclo: diasNoPeriodo,
        mundo: null,
        presentes: janelas.mes.presentes,
      });
      if (!exata) alertas.push(presencaSuposta(item));
      return;
    }

    if (item.rateio.tipo === "porcentagem") {
      const soma = somaDeclarada(item);
      if (Math.abs(soma - 100) > 0.005) alertas.push(porcentagemNaoFecha(item, soma));
      return;
    }

    if (item.rateio.tipo === "valor") {
      const soma = somaDeclarada(item);
      const custo = somar(Object.values(custos[i].porCiclo)) + custos[i].reais;
      if (Math.abs(soma - custo) > TOLERANCIA) alertas.push(valorNaoFecha(item, soma, custo));
      return;
    }

    if (item.rateio.tipo === "ajuste") {
      const custo = somar(Object.values(custos[i].porCiclo)) + custos[i].reais;
      const partes = partesDoAjuste(item, custo);
      if (Object.values(partes).some((v) => v < -TOLERANCIA)) alertas.push(ajusteNaoFecha(item, custo));
    }
  });

  // Um ciclo dividido por porcentagem avisa como um item, se não somar 100.
  for (const f of faturas) {
    if (f.rateio?.tipo !== "porcentagem") continue;
    const soma = somar(moradores.map((m) => (f.rateio as { porcentagens: Record<string, number> }).porcentagens[m.id] ?? 0));
    if (Math.abs(soma - 100) > 0.005) {
      alertas.push(porcentagemNaoFecha({ nome: f.nome }, soma));
    }
  }

  // 5. O que sobrou: uso comum e taxas fixas de cada ciclo, entre todos os moradores
  const todos = moradores.map((m) => m.id);

  if (todos.length > 0) {
    const calibragem = entreZeroEUm(estado.calibragem ?? 0);
    const comum = { participantes: todos, rateio: { tipo: "misto", igual: calibragem } as Rateio };

    for (const m of medidas) {
      // Um ciclo pode trazer a própria regra (o aluguel por porcentagem);
      // sem regra, a sobra vai pela régua do uso comum.
      const proprio = faturas.find((f) => f.id === m.id)?.rateio;
      processar(
        {
          ...comum,
          ...(proprio ? { rateio: proprio } : {}),
          id: `__${m.id}`,
          nome: nomeDoUsoComum(m),
          custo: { tipo: "reais", valor: sobras[m.id] },
        },
        { porCiclo: { [m.id]: sobras[m.id] }, reais: 0 },
        true,
      );
    }

    // Cada taxa vira um item dividido por igual. No total antigo, o valor que
    // entra pode ter sido recortado; o ajuste distribui o corte entre as taxas.
    const publicarTaxas = (lista: TaxaFixa[], cobrado: number, ciclo: CicloId) => {
      const soma = somar(lista.map((t) => t.valor));
      if (soma === 0 || cobrado === 0) return;
      const ajuste = cobrado / soma;

      lista.forEach((taxa, i) => {
        const valor = taxa.valor * ajuste;
        processar(
          {
            participantes: todos,
            rateio: { tipo: "igual" },
            id: `__taxa_${ciclo}_${i}`,
            nome: taxa.nome,
            custo: { tipo: "reais", valor },
          },
          { porCiclo: { [ciclo]: valor }, reais: 0 },
          true,
        );
      });
    };

    for (const m of medidas) publicarTaxas(m.taxas, m.taxasCobradas, m.id);
  }

  // 6. Conferência
  const lista = moradores.map((m) => totais[m.id]);
  const somaCobrada = somar(lista.map((t) => t.total));
  const somaDevida = somar(medidas.map((m) => m.valor)) + totalEmReais;

  const centavosCobrados = lista.reduce((s, t) => s + emCentavos(t.total), 0);
  const residuoDeCentavos = emCentavos(somaDevida) - centavosCobrados;
  const somaCobradaArredondada = centavosCobrados / 100;

  const conjuntoVazio = moradores.length === 0 && Math.abs(somaDevida) > TOLERANCIA;
  if (conjuntoVazio) alertas.push(conjuntoSemPessoa(somaDevida));

  if (!conjuntoVazio && residuoDeCentavos !== 0) {
    alertas.push(centavosDeDiferenca(residuoDeCentavos, somaCobradaArredondada, somaDevida));
  }

  const ciclos: CicloCalculado[] = medidas.map((m) => ({
    id: m.id,
    nome: m.nome,
    recurso: m.recurso,
    dias: porCiclo[m.id].dias,
    diasContados: porCiclo[m.id].contados,
    tarifa: m.tarifa,
    valor: m.valor,
    sobra: sobras[m.id],
  }));

  return {
    diasNoPeriodo,
    diasContados,
    somaDiasContados,
    ciclos,
    itens: calculados,
    moradores: lista,
    totalEmReais,
    somaCobrada,
    somaDevida,
    diferenca: somaCobrada - somaDevida,
    somaCobradaArredondada,
    residuoDeCentavos,
    alertas,
  };
}

/** O que o fechamento mediu de um ciclo, ou `undefined` se ele não estava ativo. */
export const cicloDe = (resultado: Resultado, id: CicloId): CicloCalculado | undefined =>
  resultado.ciclos.find((c) => c.id === id);

/** A soma cobrada fecha com a soma devida? É a conservação do custo. */
export function conferir(resultado: Resultado): boolean {
  // Casa sem morador não tem de quem cobrar: fecha só se não havia nada a dividir.
  if (resultado.moradores.length === 0) {
    return Math.abs(resultado.somaDevida) < TOLERANCIA;
  }
  return Math.abs(resultado.diferenca) < TOLERANCIA;
}

/** E fecha também em centavos inteiros, que é a moeda em que a conta é paga? */
export function conferirEmCentavos(resultado: Resultado): boolean {
  return resultado.residuoDeCentavos === 0;
}
