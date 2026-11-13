/**
 * O link de um conjunto: uma cópia do conjunto, compactada, dentro do próprio
 * endereço (depois do #, que não vai para servidor nenhum). Quem abre o link
 * recebe a cópia no aparelho dele. Não há sincronização: é um retrato do
 * conjunto no momento em que o link foi gerado.
 */

import { criarItem, modeloPorChave } from "../catalogo.js";

export const PREFIXO_DO_LINK = "#conjunto=";

// ── itens enxutos ─────────────────────────────────────────────────────────
// Um item carrega muito do que veio do catálogo (a dica, as tabelas em
// branco). No link, cada item leva só o que difere do item recém-criado do
// mesmo modelo; quem abre recria o resto do catálogo, que é o mesmo dos dois
// lados. Assim um conjunto cheio ainda cabe num QR Code.

const SEMPRE = new Set(["id", "modelo", "nome", "especie", "rateio", "participantes"]);
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function moldeDoItem(item) {
  const modelo = (item.modelo && modeloPorChave(item.modelo)) || {
    chave: item.modelo ?? null,
    nome: item.nome,
    especie: item.especie,
    rateio: item.rateio,
  };
  return criarItem(modelo, item.participantes ?? []);
}

function itemEnxuto(item) {
  const molde = moldeDoItem(item);
  return Object.fromEntries(Object.entries(item).filter(([k, v]) => SEMPRE.has(k) || !igual(v, molde[k])));
}

function itemCheio(item) {
  return { ...moldeDoItem(item), ...item };
}

const paraBase64Url = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const deBase64Url = (t) => {
  const s = atob(t.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((t.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function passarPor(bytes, transformacao) {
  const resposta = new Response(new Blob([bytes]).stream().pipeThrough(transformacao));
  return new Uint8Array(await resposta.arrayBuffer());
}

const comCompressao = () => typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

/** Texto → "z…" (deflate) ou "j…" (sem compressão, em navegador sem CompressionStream). */
export async function compactar(texto) {
  const bytes = new TextEncoder().encode(texto);
  if (!comCompressao()) return `j${paraBase64Url(bytes)}`;
  return `z${paraBase64Url(await passarPor(bytes, new CompressionStream("deflate-raw")))}`;
}

/** O contrário de compactar. Lança erro se o texto não for de um link da CEDER. */
export async function descompactar(dados) {
  const tipo = dados[0];
  const bytes = deBase64Url(dados.slice(1));
  if (tipo === "j") return new TextDecoder().decode(bytes);
  if (tipo === "z") return new TextDecoder().decode(await passarPor(bytes, new DecompressionStream("deflate-raw")));
  throw new Error("link desconhecido");
}

/**
 * O pacote exportado, mais enxuto para caber num link: sem espaços e sem o
 * "quem é você" de quem compartilhou   quem abre escolhe quem é.
 */
export function pacoteParaLink(textoExportado) {
  const pacote = JSON.parse(textoExportado);
  if (pacote?.estado) {
    pacote.estado = { ...pacote.estado, voce: null, itens: (pacote.estado.itens ?? []).map(itemEnxuto) };
    pacote.enxuto = true;
  }
  delete pacote.exportadoEm;
  return JSON.stringify(pacote);
}

/** O contrário de pacoteParaLink: o pacote pronto para importar. */
export function pacoteDoLink(texto) {
  const pacote = JSON.parse(texto);
  if (pacote?.enxuto && pacote.estado) {
    pacote.estado = { ...pacote.estado, itens: (pacote.estado.itens ?? []).map(itemCheio) };
    delete pacote.enxuto;
  }
  return JSON.stringify(pacote);
}

/** Os dados de um link → o texto que importarConjunto entende. */
export async function lerLink(dados) {
  return pacoteDoLink(await descompactar(dados));
}

/** O endereço completo do link de um conjunto exportado. */
export async function linkDoConjunto(textoExportado, base = enderecoBase()) {
  return `${base}${PREFIXO_DO_LINK}${await compactar(pacoteParaLink(textoExportado))}`;
}

/** Os dados do conjunto num endereço (ou só no #), ou null se não for um link de conjunto. */
export function dadosDoLink(endereco) {
  const i = String(endereco ?? "").indexOf(PREFIXO_DO_LINK);
  return i >= 0 ? String(endereco).slice(i + PREFIXO_DO_LINK.length) : null;
}

export function enderecoBase() {
  if (typeof location === "undefined") return "";
  return `${location.origin}${location.pathname}`;
}
