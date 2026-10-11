// CRC: Fechamento
//
// Responsabilidade: consolidar um período. Reúne as faturas, os ciclos e os
// itens, manda alocar cada custo, junta tudo por pessoa e verifica que nada
// se perdeu no caminho.
// Colabora com: todos os outros. É o único que conhece a ordem das coisas,
// e o único que não sabe fazer nenhuma delas sozinho.
//
// A ordem:
//   1. ler as faturas              → tarifas e taxas          (Fatura)
//   2. medir os ciclos             → dias de cada um          (Ciclo, Morador)
//   3. custear cada item           → reais por conta          (Consumo, Custo)
//   4. alocar cada item            → parcelas                 (RegraDeAlocação, Alocação)
//   5. alocar o que sobrou         → uso comum e taxas fixas  (Alocação)
//   6. conferir                    → conservação e centavos   (Explicação)

import type { Alerta, CustoBruto, Estado, Item, ItemCalculado, Rateio, Resultado, TaxaFixa } from "./tipos.ts";
import { emCentavos, entreZeroEUm, somar, TOLERANCIA } from "./numeros.ts";
import { diasDoCiclo, diasDoPeriodo } from "./ciclo.ts";
import { diasContadosEm, somaDosDias } from "./morador.ts";
import { medirFatura, somaDeTaxas } from "./fatura.ts";
import { custoDe } from "./custo.ts";
import { regraExata, somaDeclarada } from "./regras.ts";
import { alocar, medirJanelas } from "./alocacao.ts";
import {
  casaSemMorador,
  centavosDeDiferenca,
  consumoPassaDaFatura,
  itensSemNinguem,
  porcentagemNaoFecha,
  valorNaoFecha,
  lancarNosTotais,
  ninguemEmCasa,
  presencaSuposta,
  totaisEmBranco,
} from "./explicacao.ts";

export function calcular(estado: Estado): Resultado {
  const { moradores, faturas, itens, periodo } = estado;
  const alertas: Alerta[] = [];

  // 1. Faturas
  const luz = medirFatura(faturas, "luz");
  const agua = medirFatura(faturas, "agua");

  // 2. Ciclos
  const diasNoPeriodo = diasDoPeriodo(periodo);
  const diasNoPeriodoLuz = diasDoCiclo(periodo.diasLuz, diasNoPeriodo);
  const diasNoPeriodoAgua = diasDoCiclo(periodo.diasAgua, diasNoPeriodo);

  const diasContados = diasContadosEm(moradores, diasNoPeriodo, (m) => m.diasFora);
  const diasContadosLuz = diasContadosEm(moradores, diasNoPeriodoLuz, (m) => m.diasForaLuz ?? m.diasFora);
  const diasContadosAgua = diasContadosEm(moradores, diasNoPeriodoAgua, (m) => m.diasForaAgua ?? m.diasFora);

  const janelas = medirJanelas(
    moradores,
    { dias: diasNoPeriodo, contados: diasContados },
    { dias: diasNoPeriodoLuz, contados: diasContadosLuz },
    { dias: diasNoPeriodoAgua, contados: diasContadosAgua },
  );

  const somaDiasContados = somaDosDias(moradores, diasContados);

  // 3. Custos
  const validos = itens.filter((i) => i.participantes.length > 0);
  const semNinguem = itens.length - validos.length;
  if (semNinguem > 0) alertas.push(itensSemNinguem(semNinguem));

  const tarifas = { luz: luz.tarifa, agua: agua.tarifa };
  const custos = validos.map((i) => custoDe(i, tarifas));

  // O que a fatura cobrou e nenhum item explicou vira uso comum.
  const sobraLuz = luz.consumoEmReais - somar(custos.map((c) => c.luz));
  const sobraAgua = agua.consumoEmReais - somar(custos.map((c) => c.agua));
  const totalEmReais = somar(custos.map((c) => c.reais));

  if (sobraLuz < -TOLERANCIA) alertas.push(consumoPassaDaFatura("luz", Math.abs(sobraLuz)));
  if (sobraAgua < -TOLERANCIA) alertas.push(consumoPassaDaFatura("agua", Math.abs(sobraAgua)));
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
      const exata = regraExata({ item, diasContados, diasNoCiclo: diasNoPeriodo, mundo: null });
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
      const custo = custos[i].luz + custos[i].agua + custos[i].reais;
      if (Math.abs(soma - custo) > TOLERANCIA) alertas.push(valorNaoFecha(item, soma, custo));
    }
  });

  // 5. O que sobrou: uso comum e taxas fixas, entre todos os moradores
  const todos = moradores.map((m) => m.id);

  if (todos.length > 0) {
    const calibragem = entreZeroEUm(estado.calibragem ?? 0);
    const comum = { participantes: todos, rateio: { tipo: "misto", igual: calibragem } as Rateio };

    processar(
      { ...comum, id: "__luz", nome: "Uso comum de luz", custo: { tipo: "reais", valor: sobraLuz } },
      { luz: sobraLuz, agua: 0, reais: 0 },
      true,
    );
    processar(
      { ...comum, id: "__agua", nome: "Uso comum de água", custo: { tipo: "reais", valor: sobraAgua } },
      { luz: 0, agua: sobraAgua, reais: 0 },
      true,
    );

    // Cada taxa vira um item dividido por igual. No total antigo, o valor que
    // entra pode ter sido recortado; o ajuste distribui o corte entre as taxas.
    const publicarTaxas = (lista: TaxaFixa[], cobrado: number, prefixo: string, qual: "luz" | "agua") => {
      const soma = somaDeTaxas(lista);
      if (soma === 0 || cobrado === 0) return;
      const ajuste = cobrado / soma;

      lista.forEach((taxa, i) => {
        const valor = taxa.valor * ajuste;
        processar(
          {
            participantes: todos,
            rateio: { tipo: "igual" },
            id: `${prefixo}${i}`,
            nome: taxa.nome,
            custo: { tipo: "reais", valor },
          },
          qual === "luz" ? { luz: valor, agua: 0, reais: 0 } : { luz: 0, agua: valor, reais: 0 },
          true,
        );
      });
    };

    publicarTaxas(luz.taxas, luz.taxasCobradas, "__taxa_luz_", "luz");
    publicarTaxas(agua.taxas, agua.taxasCobradas, "__taxa_agua_", "agua");
  }

  // 6. Conferência
  const lista = moradores.map((m) => totais[m.id]);
  const somaCobrada = somar(lista.map((t) => t.total));
  const somaDevida = luz.valor + agua.valor + totalEmReais;

  const centavosCobrados = lista.reduce((s, t) => s + emCentavos(t.total), 0);
  const residuoDeCentavos = emCentavos(somaDevida) - centavosCobrados;
  const somaCobradaArredondada = centavosCobrados / 100;

  const casaVazia = moradores.length === 0 && Math.abs(somaDevida) > TOLERANCIA;
  if (casaVazia) alertas.push(casaSemMorador(somaDevida));

  if (!casaVazia && residuoDeCentavos !== 0) {
    alertas.push(centavosDeDiferenca(residuoDeCentavos, somaCobradaArredondada, somaDevida));
  }

  return {
    diasNoPeriodo,
    diasNoPeriodoLuz,
    diasNoPeriodoAgua,
    tarifaLuz: luz.tarifa,
    tarifaAgua: agua.tarifa,
    diasContados,
    diasContadosLuz,
    diasContadosAgua,
    somaDiasContados,
    itens: calculados,
    moradores: lista,
    sobraLuz,
    sobraAgua,
    totalEmReais,
    somaCobrada,
    somaDevida,
    diferenca: somaCobrada - somaDevida,
    somaCobradaArredondada,
    residuoDeCentavos,
    alertas,
  };
}

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
