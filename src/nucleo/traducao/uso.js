// Tradução: Uso
//
// Na tela, os usos de um item vêm de dois jeitos: a contagem por pessoa
// (`usosPorPessoa`), ou cada uso com data e participantes (`eventos`). Um uso
// compartilhado por duas pessoas conta meio para cada.
//
// Com data, cada uso precisa cair dentro do ciclo da fatura de que ele sai.
// Uma lavagem de antes do ciclo da luz começar já foi paga na fatura
// anterior; uma de depois vem na próxima. As duas ficam fora desta conta, e é
// isso que impede a mesma lavagem de ser cobrada duas vezes.

import { nomeOu, num } from "../formato.js";
import { dentroDaJanela, faturaAtiva, partesDoDia } from "../calendario.js";
import { janelaDaFatura } from "./fatura.js";

export const eventosDe = (item) => (Array.isArray(item.eventos) ? item.eventos : []);

export const temUsoDatado = (item) => eventosDe(item).length > 0;

/** A parte de uma pessoa num uso: a quantidade dividida entre quem participou. */
export function parteNoEvento(evento, id) {
  const participantes = evento?.participantes ?? [];
  if (!participantes.includes(id)) return 0;

  const quantidade = num(evento.quantidade);
  return (quantidade > 0 ? quantidade : 1) / participantes.length;
}

/** Os usos de uma pessoa no item, com data ou sem. */
export const usosDe = (item, id) => {
  const eventos = eventosDe(item);
  if (eventos.length === 0) return num(item.usosPorPessoa?.[id]);
  return eventos.reduce((soma, e) => soma + parteNoEvento(e, id), 0);
};

/** Os usos de cada participante que caíram dentro de um ciclo. */
export const usosPorJanela = (item, janela) =>
  Object.fromEntries(
    (item.participantes ?? []).map((id) => {
      const eventos = eventosDe(item);
      if (eventos.length === 0) return [id, num(item.usosPorPessoa?.[id])];

      const dentro = eventos
        .filter((e) => dentroDaJanela(e.data, janela))
        .reduce((soma, e) => soma + parteNoEvento(e, id), 0);
      return [id, dentro];
    }),
  );

/** Os usos com data que caíram fora do ciclo de alguma fatura. */
export function orfasDoItem(item, faturas, periodo) {
  if (item.especie !== "porUso" || item.origemUso !== "fatura") return [];

  const ciclos = [
    ["luz", faturas.luz],
    ["agua", faturas.agua],
  ]
    .filter(([, fatura]) => faturaAtiva(fatura))
    .map(([qual, fatura]) => [qual, janelaDaFatura(fatura, periodo)]);

  const achados = [];

  for (const evento of eventosDe(item)) {
    if (!partesDoDia(evento.data)) continue;

    for (const [qual, janela] of ciclos) {
      if (dentroDaJanela(evento.data, janela)) continue;

      achados.push({
        itemId: item.id,
        item: item.nome,
        eventoId: evento.id,
        dia: evento.data,
        quantidade: num(evento.quantidade) || 1,
        participantes: evento.participantes ?? [],
        faltando: qual,
        quando: evento.data < janela.de ? "passado" : "futuro",
      });
    }
  }

  return achados.sort((a, b) => String(a.dia).localeCompare(String(b.dia)));
}

export const lavagensForaDoCiclo = (estado) =>
  estado.itens.flatMap((item) => orfasDoItem(item, estado.faturas, estado.periodo));

/** Os avisos sobre usos fora do ciclo. O domínio não sabe de datas, então quem avisa é a tradução. */
export function alertaDeLavagens(estado) {
  const foras = lavagensForaDoCiclo(estado);
  if (foras.length === 0) return [];

  const nome = (id) => {
    const i = estado.moradores.findIndex((m) => m.id === id);
    return i < 0 ? "alguém" : nomeOu(estado.moradores[i].nome, i);
  };

  const quem = (fora) => {
    const nomes = (fora.participantes ?? []).map(nome);
    if (nomes.length === 0) return "alguém";
    if (nomes.length === 1) return nomes[0];
    return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
  };
  const curto = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  const futuras = foras.filter((f) => f.quando === "futuro");
  const passadas = foras.filter((f) => f.quando === "passado");
  const alertas = [];

  if (futuras.length > 0) {
    const quais = futuras
      .map((f) => `${quem(f)} em ${curto(f.dia)} (${f.faltando === "luz" ? "luz" : "água"})`)
      .join("; ");
    alertas.push({
      nivel: "aviso",
      texto: `Estas lavagens caíram depois do fim de um dos ciclos: ${quais}. Essa parte vem na próxima fatura, então não está cobrada aqui. Marque os mesmos dias no fechamento do mês que vem.`,
    });
  }

  if (passadas.length > 0) {
    const quais = passadas
      .map((f) => `${quem(f)} em ${curto(f.dia)} (${f.faltando === "luz" ? "luz" : "água"})`)
      .join("; ");
    alertas.push({
      nivel: "aviso",
      texto: `Estas lavagens aconteceram antes de um dos ciclos começar: ${quais}. Essa parte entrou na fatura anterior, que já foi fechada. Ela não é cobrada no cálculo deste mês.`,
    });
  }

  return alertas;
}
