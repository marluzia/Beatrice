import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { Campo, Segmentado } from "../componentes/index.js";
import { AbasDePasta, Avatar, mostrarAviso, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { ciclosDoRegistro, registravel } from "../nucleo/adaptador.js";
import { deConta } from "../nucleo/ciclos.js";
import TecladoDeDivisao from "../componentes/TecladoDeDivisao.jsx";
import QuemPagou from "../passos/QuemPagou.jsx";
import { ehEquipamento } from "../nucleo/catalogo.js";
import { num } from "../nucleo/formato.js";
import { hojeISO, nomeDe } from "../nucleo/resumo.js";
import { sobrescritoDaTela } from "./Hub.jsx";
import { porHora } from "./VerRegistros.jsx";
import { temPrecos, unidadeDePreco, unidadesDe } from "../nucleo/precos.js";

/**
 * Lançar registros: o uso de um item ou aparelho (qual, que dia, quantas
 * vezes ou horas, quem usou). Como em Lançar lembretes, depois de lançar só
 * aparece o aviso de sucesso; o que foi lançado se confere em Ver registros.
 */
const EXPLICACOES = {
  igual: "Quem paga divide este uso em partes iguais.",
  porcentagem: "Cada um paga a própria fatia deste uso. Deve somar 100%.",
  cotas: "Cada um tem um número de cotas: quem tem 2 paga o dobro de quem tem 1. Em branco vale 1.",
};

const SOBRE_O_TIPO = {
  ciclicos: "Aparelhos que saem das faturas de luz e água: cada uso puxa kWh ou m³ do ciclo em que caiu.",
  avulsos: "Equipamentos fora das faturas, como embarcação e gerador: cada hora ou uso vale em dinheiro.",
};

export default function LancarRegistro({ app, rota }) {
  const { estado, modo, acoes, ir, voltar, indicePorId } = app;
  const registraveis = estado.itens.filter((i) => registravel(i, estado));
  const doTipo = (t) => registraveis.filter((i) => (t === "avulsos" ? ehEquipamento(i) : !ehEquipamento(i)));
  const tipos = [
    { valor: "ciclicos", rotulo: "Cíclicos" },
    ...(modo.equipamentos ? [{ valor: "avulsos", rotulo: "Avulsos" }] : []),
  ];
  const [tipo, setTipoCru] = useState(() =>
    rota?.tipo === "avulsos" || (modo.equipamentos && doTipo("ciclicos").length === 0 && doTipo("avulsos").length > 0)
      ? "avulsos"
      : "ciclicos",
  );
  const itens = doTipo(tipo);
  const [item, setItem] = useState(itens[0]?.id ?? "");
  const [data, setData] = useState(hojeISO());
  const [quantidade, setQuantidade] = useState("1");
  const escolhido = itens.find((i) => i.id === item);
  const [quem, setQuem] = useState(() => (escolhido ? [...escolhido.participantes] : []));
  const [lancados, setLancados] = useState(0);
  const [divisao, setDivisao] = useState("igual");
  const [pesos, setPesos] = useState({});
  const [pagoPor, setPagoPor] = useState(null);
  const avulso = Boolean(escolhido && ehEquipamento(escolhido));
  // No cíclico, quem pagou é quem pagou cada fatura de onde o item puxa.
  const contasDoItem = escolhido && !avulso ? ciclosDoRegistro(escolhido, estado) : [];
  const somaDosPercentuais = quem.reduce((s, id) => s + num(pesos[id]), 0);
  // Num equipamento com vários preços (mês, dia, hora, uso), em qual unidade foi.
  const unidades = escolhido && temPrecos(escolhido) ? unidadesDe(escolhido) : [];
  const [unidadeEscolhida, setUnidade] = useState(null);
  const unidade = unidades.includes(unidadeEscolhida) ? unidadeEscolhida : unidades[0] ?? null;
  const rotuloDaQuantidade = unidade
    ? unidadeDePreco(unidade).quantos
    : escolhido && porHora(escolhido)
      ? "Quantas horas"
      : "Quantas vezes";

  const trocarItem = (id) => {
    setItem(id);
    setQuem([...(registraveis.find((i) => i.id === id)?.participantes ?? [])]);
  };

  // Trocar de aba escolhe o primeiro item dela.
  const setTipo = (t) => {
    setTipoCru(t);
    trocarItem(doTipo(t)[0]?.id ?? "");
  };

  const lancar = () => {
    if (!item) return mostrarAviso("Escolha o item ou aparelho.");
    if (!data) return mostrarAviso("Escolha o dia do uso.");
    if (!(num(quantidade) > 0)) return mostrarAviso(`${rotuloDaQuantidade}? Escreva um número.`);
    if (quem.length === 0) return mostrarAviso("Escolha quem paga.");
    if (divisao === "porcentagem" && Math.abs(somaDosPercentuais - 100) > 0.005)
      return mostrarAviso("Os percentuais precisam somar 100%.");
    acoes.lancarRegistro(item, {
      data,
      quantidade,
      participantes: quem,
      ...(unidade ? { unidade } : {}),
      ...(divisao !== "igual"
        ? { divisao: { tipo: divisao, pesos: Object.fromEntries(quem.map((id) => [id, pesos[id] ?? ""])) } }
        : {}),
      ...(avulso ? { pagoPor } : {}),
    });
    setQuantidade("1");
    setLancados((n) => n + 1);
    window.scrollTo?.(0, 0);
  };

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito partes={sobrescritoDaTela(app)} />
      <h1 className="titulo-tela titulo-tela--grande">
        Lançar <em>registros</em>
      </h1>
      <p className="texto-apoio">Cada lavagem, cada vez que o ar ligar. O que já foi lançado fica em Ver registros.</p>

      {lancados > 0 && (
        <div className="sucesso" role="status">
          <Icone nome="check" tamanho={20} espessura={2.4} />
          <span>
            Sucesso. Confira em{" "}
            <button type="button" className="link-sublinhado" onClick={() => ir("verRegistros")}>
              Ver registros
            </button>
            .
          </span>
        </div>
      )}

      <AbasDePasta opcoes={tipos} valor={tipo} aoMudar={setTipo} rotulo="Tipo de registro">
        <p className="texto-apoio texto-apoio--colado">{SOBRE_O_TIPO[tipo]}</p>
        {itens.length === 0 ? (
          <>
            <p className="vazio-suave vazio-suave--na-pasta">
              {tipo === "avulsos"
                ? "Nenhum equipamento cadastrado. Cadastre uma embarcação ou um equipamento em Itens, com o preço da hora ou do uso."
                : "Registros são de itens e aparelhos que consomem kWh ou m³, medidos por uso (máquina de lavar) ou por hora (ar-condicionado, chuveiro). Cadastre um em Itens (aba Registros do painel), com o gasto de cada uso ou hora."}
            </p>
            <button type="button" className="botao botao--fantasma botao--largo" onClick={() => ir("itens")}>
              Cadastrar itens
            </button>
          </>
        ) : (
          <div className="formulario-registro formulario-registro--na-pasta">
            <label className="campo-novo">
              <span className="rotulo">Item ou aparelho</span>
              <select className="caixa caixa--texto" value={item} onChange={(e) => trocarItem(e.target.value)}>
                {itens.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome}
                  </option>
                ))}
              </select>
            </label>
            {unidades.length > 1 && (
              <div className="grupo">
                <span className="rotulo">Cobrado</span>
                <Segmentado
                  rotuloDoGrupo="Cobrado por"
                  opcoes={unidades.map((u) => ({ valor: u, texto: unidadeDePreco(u).nome }))}
                  valor={unidade}
                  aoMudar={setUnidade}
                />
              </div>
            )}
            <div className="linha-campos linha-campos--duas">
              <label className="campo-novo">
                <span className="rotulo">Dia</span>
                <input className="caixa caixa--texto" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </label>
              <label className="campo-novo">
                <span className="rotulo">{rotuloDaQuantidade}</span>
                <input className="caixa" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
              </label>
            </div>
            {/* Quem pagou, como divide e quem paga são deste registro: o item é só
                a caracterização (preço, consumo), em Itens. */}
            {avulso ? (
              <QuemPagou
                pessoas={estado.moradores}
                indicePorId={indicePorId}
                valor={pagoPor}
                aoMudar={setPagoPor}
                semNinguem="Ninguém marcado: o uso fica em aberto. Se cada um pagou a própria parte direto, não gera dívida entre vocês."
                comAlguem="Essa pessoa adiantou pelo grupo: quem usou deve a ela no acerto."
              />
            ) : (
              <div className="grupo">
                <span className="rotulo">Quem pagou</span>
                <p className="item-pagador-herdado">
                  {contasDoItem.length === 0
                    ? "Sai da fatura de quem pagou a conta."
                    : contasDoItem
                        .map((c) => `conta ${deConta(c)}: ${c.pagoPor ? nomeDe(estado, c.pagoPor) : "ninguém marcado ainda"}`)
                        .join(" · ")}
                </p>
              </div>
            )}

            <div className="grupo">
              <span className="rotulo">Como divide</span>
              <TecladoDeDivisao opcoes={["igual", "porcentagem", "cotas"]} valor={divisao} aoMudar={setDivisao} />
              <p className="ajuda-campo">{EXPLICACOES[divisao]}</p>
            </div>

            <span className="rotulo">Quem paga</span>
            <div className="fichas-de-pessoa">
              {estado.moradores.map((m, i) => {
                const ativo = quem.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`ficha-pessoa ficha-pessoa--escolha ${ativo ? "ficha-pessoa--ativa" : ""}`}
                    aria-pressed={ativo}
                    onClick={() => setQuem((q) => (ativo ? q.filter((x) => x !== m.id) : [...q, m.id]))}
                  >
                    <Avatar nome={nomeDe(estado, m.id)} indice={i} tamanho={28} />
                    {nomeDe(estado, m.id)}
                  </button>
                );
              })}
            </div>

            {divisao !== "igual" && quem.length > 0 && (
              <div className="grupo">
                <div className="linha-campos">
                  {quem.map((id) => (
                    <Campo
                      key={id}
                      rotulo={nomeDe(estado, id)}
                      sufixo={divisao === "porcentagem" ? "%" : "cotas"}
                      valor={pesos[id] ?? ""}
                      aoMudar={(v) => setPesos((p) => ({ ...p, [id]: v }))}
                      largura="campo--minimo"
                      placeholder={divisao === "porcentagem" ? "0" : "1"}
                    />
                  ))}
                </div>
                {divisao === "porcentagem" && (
                  <p className={Math.abs(somaDosPercentuais - 100) > 0.005 ? "dica dica--alerta" : "dica"}>
                    Somam {somaDosPercentuais.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                    {Math.abs(somaDosPercentuais - 100) > 0.005 ? ": deveria ser 100%." : "."}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </AbasDePasta>

      {itens.length > 0 && (
        <div className="rodape-fixo">
          <button type="button" className="botao botao--largo" onClick={lancar}>
            Lançar registro
          </button>
        </div>
      )}
    </div>
  );
}
