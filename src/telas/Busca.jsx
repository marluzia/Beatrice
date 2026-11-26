import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import IconeDoTipo from "../componentes/IconeDoTipo.jsx";
import { AbasDePasta, dinheiro } from "../componentes/Interface.jsx";
import { CabecalhoDaAba } from "../componentes/CabecalhoDoConjunto.jsx";
import { ehEmReais } from "../nucleo/catalogo.js";
import { modoDe } from "../nucleo/modos.js";
import { nomeDe, todasAsDespesas } from "../nucleo/resumo.js";
import { destinoDaDespesa } from "./linhasDeDespesa.jsx";
import { porAtividade } from "./comum.js";

const ABAS = [
  { valor: "conjuntos", rotulo: "Conjuntos" },
  { valor: "despesas", rotulo: "Despesas" },
  { valor: "itens", rotulo: "Itens" },
  { valor: "lembretes", rotulo: "Lembretes" },
  { valor: "pessoas", rotulo: "Pessoas" },
];

const normal = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Um item da seção Itens: aparelho que sai da fatura ou equipamento da Multi. */
const ehItemConfigurado = (item) => !ehEmReais(item) || Boolean(item.equipamento);

const achadoDoConjunto = (p) => ({
  chave: p.ficha.id,
  conjunto: p.ficha.id,
  titulo: p.ficha.nome,
  detalhe: modoDe(p.estado.modo).nome,
  modo: p.estado.modo,
});

/** Com o campo vazio, a aba Conjuntos mostra todos, o de atividade mais recente primeiro. */
export const todosOsConjuntos = (panorama) => porAtividade(panorama).map(achadoDoConjunto);

/**
 * Tudo o que a busca encontra, por aba. Conjunto bate pelo título. Cada achado sabe de qual conjunto
 * veio e para onde leva.
 */
export function achados(panorama, termo) {
  const t = normal(termo.trim());
  const bate = (...textos) => textos.some((x) => normal(x).includes(t));
  const r = { conjuntos: [], despesas: [], itens: [], lembretes: [], pessoas: [] };
  if (!t) return r;

  for (const p of panorama) {
    const e = p.estado;
    const id = p.ficha.id;
    const nomeDoConjunto = p.ficha.nome;

    if (bate(p.ficha.nome)) r.conjuntos.push(achadoDoConjunto(p));

    for (const d of todasAsDespesas(e, p.resumo?.resultado)) {
      if (d.tipo === "registrada" || !bate(d.nome, d.detalhe)) continue;
      const [tela, params] = destinoDaDespesa(d);
      r.despesas.push({
        chave: `${id}-${d.tipo}-${d.id}`,
        conjunto: id,
        titulo: d.nome,
        detalhe: `${d.tipo === "ciclica" ? "cíclica" : "avulsa"} · ${nomeDoConjunto}`,
        valor: d.valor,
        moeda: e.moeda,
        destino: { tela, ...params },
      });
    }

    for (const item of e.itens ?? []) {
      if (!ehItemConfigurado(item) || !bate(item.nome)) continue;
      r.itens.push({
        chave: `${id}-${item.id}`,
        conjunto: id,
        titulo: item.nome || "Item",
        detalhe: `${item.equipamento ? "equipamento" : "aparelho"} · ${nomeDoConjunto}`,
        destino: { tela: "itens" },
      });
    }

    for (const l of e.lembretes ?? []) {
      if (!bate(l.titulo, l.texto, ...(l.itens ?? []).map((x) => x.texto))) continue;
      r.lembretes.push({
        chave: `${id}-${l.id}`,
        conjunto: id,
        titulo: l.titulo || l.texto || "Lembrete",
        detalhe: `${l.tipo === "lista" ? "lista" : "nota"} · ${nomeDoConjunto}`,
        destino: { tela: "lancamento", tipo: "lembrete", id: l.id },
      });
    }

    for (const m of e.moradores ?? []) {
      const nome = nomeDe(e, m.id);
      if (!bate(nome)) continue;
      r.pessoas.push({
        chave: `${id}-${m.id}`,
        conjunto: id,
        titulo: nome,
        detalhe: nomeDoConjunto,
        destino: { tela: "saldos" },
      });
    }
  }
  return r;
}

/** A busca geral do Início: um campo e as abas de pasta. */
export default function Busca({ app, aoVoltar, abaInicial = "conjuntos", animar = false }) {
  const { panorama, abrir } = app;
  const [termo, setTermo] = useState("");
  const [aba, setAba] = useState(abaInicial);

  const vazio = !termo.trim();
  const tudo = achados(panorama, termo);
  const lista = vazio && aba === "conjuntos" ? todosOsConjuntos(panorama) : tudo[aba];

  return (
    <div className={`tela tela--busca ${animar ? "tela--busca-entrando" : ""}`}>
      <CabecalhoDaAba titulo="Buscar" aoVoltar={aoVoltar} comSino />

      <label className="busca">
        <Icone nome="busca" tamanho={22} />
        <input
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar em todos os conjuntos"
          aria-label="Buscar em todos os conjuntos"
          autoFocus
        />
      </label>

      <div className="pasta--compacta">
        <AbasDePasta opcoes={ABAS} valor={aba} aoMudar={setAba} rotulo="Onde buscar">
          {vazio && aba !== "conjuntos" ? (
            <p className="vazio-suave vazio-suave--na-pasta">
              Escreva um nome: de um conjunto, de uma despesa, de um aparelho, de um lembrete ou de uma pessoa.
            </p>
          ) : lista.length === 0 ? (
            <p className="vazio-suave vazio-suave--na-pasta">{vazio ? "Nenhum conjunto ainda." : "Nada encontrado aqui."}</p>
          ) : (
            <>
            <p className="rotulo-secao rotulo-secao--na-pasta">
              {vazio
                ? `${lista.length} ${lista.length === 1 ? "conjunto" : "conjuntos"}`
                : `${lista.length} ${lista.length === 1 ? "achado" : "achados"}`}
            </p>
            <div className="cartao-lista">
              {lista.map((a) => (
                <button key={a.chave} type="button" className="linha-achado" onClick={() => abrir(a.conjunto, a.destino ?? null)}>
                  {a.modo ? <IconeDoTipo tipo={a.modo} tamanho={36} /> : null}
                  <span className="linha-achado__textos">
                    <strong>{a.titulo}</strong>
                    <span>{a.detalhe}</span>
                  </span>
                  {a.valor > 0 && <strong className="mono">{dinheiro(a.valor, { moeda: a.moeda })}</strong>}
                </button>
              ))}
            </div>
            </>
          )}
        </AbasDePasta>
      </div>
    </div>
  );
}
