// Tradução: Uso
//
// Na tela, os usos de um item vêm de dois jeitos: a contagem por pessoa
// (`usosPorPessoa`), ou cada uso com data e participantes (`registrosDeUso`).
// Um uso compartilhado por duas pessoas conta meio para cada.
//
// Com data, cada uso precisa cair dentro do ciclo da fatura de que ele sai.
// Uma lavagem de antes do ciclo da luz começar já foi paga na fatura
// anterior; uma de depois vem na próxima. As duas ficam fora desta conta, e é
// isso que impede a mesma lavagem de ser cobrada duas vezes.

import { nomeOu, num } from "../formato.js";
import { dentroDaJanela, partesDoDia } from "../calendario.js";
import { ciclosMedidos, nomeNaFrase } from "../ciclos.js";
import { janelaDaFatura } from "./fatura.js";

/** Os usos com data de um item. */
export const registrosDe = (item) => (Array.isArray(item.registrosDeUso) ? item.registrosDeUso : []);

export const temUsoDatado = (item) => registrosDe(item).length > 0;

/** A parte de uma pessoa num uso: a quantidade dividida entre quem participou. */
export function parteNoRegistro(registro, id) {
  const participantes = registro?.participantes ?? [];
  if (!participantes.includes(id)) return 0;

  const quantidade = num(registro.quantidade);
  return (quantidade > 0 ? quantidade : 1) / participantes.length;
}

/** Os usos de uma pessoa no item, com data ou sem. */
export const usosDe = (item, id) => {
  const registros = registrosDe(item);
  if (registros.length === 0) return num(item.usosPorPessoa?.[id]);
  return registros.reduce((soma, r) => soma + parteNoRegistro(r, id), 0);
};

/** Os usos de cada participante que caíram dentro de um ciclo. */
export const usosPorJanela = (item, janela) =>
  Object.fromEntries(
    (item.participantes ?? []).map((id) => {
      const registros = registrosDe(item);
      if (registros.length === 0) return [id, num(item.usosPorPessoa?.[id])];

      const dentro = registros
        .filter((r) => dentroDaJanela(r.data, janela))
        .reduce((soma, r) => soma + parteNoRegistro(r, id), 0);
      return [id, dentro];
    }),
  );

/**
 * Os ciclos ligados de onde um item "por uso" tira consumo: os medidos que o
 * item lista em `porUsoPorCiclo`. A máquina de lavar lista luz e água.
 */
export function ciclosDoUso(item, estado) {
  if (item.especie !== "porUso" || item.origemUso === "reais") return [];
  const declarados = Object.keys(item.porUsoPorCiclo ?? {});
  return ciclosMedidos(estado).filter((c) => declarados.includes(c.id));
}

/** Os usos com data que caíram fora do ciclo de alguma fatura de onde o item tira consumo. */
export function orfasDoItem(item, estado) {
  const ciclos = ciclosDoUso(item, estado).map((c) => [c, janelaDaFatura(c, estado.periodo)]);
  const achados = [];

  for (const registro of registrosDe(item)) {
    if (!partesDoDia(registro.data)) continue;

    for (const [ciclo, janela] of ciclos) {
      if (dentroDaJanela(registro.data, janela)) continue;

      achados.push({
        itemId: item.id,
        item: item.nome,
        registroId: registro.id,
        dia: registro.data,
        quantidade: num(registro.quantidade) || 1,
        participantes: registro.participantes ?? [],
        faltando: ciclo.id,
        nomeDoCiclo: nomeNaFrase(ciclo),
        quando: registro.data < janela.de ? "passado" : "futuro",
      });
    }
  }

  return achados.sort((a, b) => String(a.dia).localeCompare(String(b.dia)));
}

export const lavagensForaDoCiclo = (estado) =>
  (estado.itens ?? []).flatMap((item) => orfasDoItem(item, estado));

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
    const quais = futuras.map((f) => `${quem(f)} em ${curto(f.dia)} (${f.nomeDoCiclo})`).join("; ");
    alertas.push({
      nivel: "aviso",
      texto: `Estas lavagens caíram depois do fim de um dos ciclos: ${quais}. Essa parte vem na próxima fatura, então não está cobrada aqui. Marque os mesmos dias no fechamento do mês que vem.`,
    });
  }

  if (passadas.length > 0) {
    const quais = passadas.map((f) => `${quem(f)} em ${curto(f.dia)} (${f.nomeDoCiclo})`).join("; ");
    alertas.push({
      nivel: "aviso",
      texto: `Estas lavagens aconteceram antes de um dos ciclos começar: ${quais}. Essa parte entrou na fatura anterior, que já foi fechada. Ela não é cobrada no cálculo deste mês.`,
    });
  }

  return alertas;
}
