import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { AbasDePasta, dinheiro, mostrarAviso, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { hojeISO, todasAsDespesas } from "../nucleo/resumo.js";
import { destinoDaDespesa, LinhaDaDespesa, OpcoesDoLancamento } from "./linhasDeDespesa.jsx";
import { sobrescritoDaTela } from "./Hub.jsx";

const normal = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Ver despesas: todas, com busca e filtro por tipo, da mais recente para a mais antiga. */
export default function VerDespesas({ app, rota }) {
  const { estado, resultado, modo, acoes, ir, voltar } = app;
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState(rota?.tipo ?? "todas");
  const [escolhida, setEscolhida] = useState(null);
  const semFaturas = modo.faturas === false;

  const todas = todasAsDespesas(estado, resultado);
  const filtros = [
    { valor: "todas", rotulo: "Todas" },
    ...[
      { valor: "avulsa", rotulo: "Avulsas" },
      { valor: "ciclica", rotulo: "Cíclicas" },
      { valor: "registrada", rotulo: "Registradas" },
    ].filter((f) => !semFaturas || f.valor === "avulsa"),
    { valor: "aberta", rotulo: "Abertas" },
    { valor: "paga", rotulo: "Pagas" },
    ...(semFaturas ? [] : [{ valor: "atrasada", rotulo: "Atrasadas" }]),
  ];

  /**
   * Pelo tipo (avulsa, cíclica, registrada) ou pela situação do pagamento.
   * Aberta é o que ninguém pagou e ainda não venceu (a vencer entra aqui);
   * registro de uso não tem pagamento próprio, então não entra nessas três.
   */
  const SITUACOES = { aberta: ["aberta", "avencer"], paga: ["paga"], atrasada: ["atrasada"] };
  const passa = (d) =>
    tipo === "todas" ||
    d.tipo === tipo ||
    (SITUACOES[tipo] && d.tipo !== "registrada" && SITUACOES[tipo].includes(d.status));

  const termo = normal(busca.trim());
  const lista = todas.filter(
    (d) => passa(d) && (!termo || normal(d.nome).includes(termo) || normal(d.detalhe).includes(termo)),
  );
  const total = lista.reduce((s, d) => s + (d.tipo === "registrada" || d.naConta === false ? 0 : d.valor), 0);

  const duplicar = (d) => {
    if (d.tipo === "avulsa") acoes.duplicarItem(d.id);
    if (d.tipo === "registrada") acoes.duplicarRegistro(d.item, d.registro?.id ?? String(d.id).split(":").pop(), hojeISO());
    setEscolhida(null);
    mostrarAviso(
      d.tipo === "registrada" ? "Registro duplicado com a data de hoje. A cópia é sua." : "Despesa duplicada. A cópia é sua.",
    );
  };

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito partes={sobrescritoDaTela(app)} />
      <h1 className="titulo-tela titulo-tela--grande">
        Ver <em>despesas</em>
      </h1>

      <label className="busca">
        <Icone nome="busca" tamanho={22} />
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar despesa" aria-label="Buscar despesa" />
      </label>

      <AbasDePasta opcoes={filtros} valor={tipo} aoMudar={setTipo} rotulo="Filtrar despesas">
        {lista.length === 0 ? (
          <p className="vazio-suave vazio-suave--na-pasta">
            {todas.length === 0
              ? "Nada lançado ainda."
              : termo
                ? "Nenhuma despesa com essa busca."
                : { aberta: "Nenhuma despesa em aberto.", paga: "Nenhuma despesa paga ainda.", atrasada: "Nenhuma despesa atrasada." }[tipo] ??
                  "Nenhuma despesa aqui."}
          </p>
        ) : (
          <>
            <p className="rotulo-secao rotulo-secao--na-pasta">
              {lista.length} {lista.length === 1 ? "lançamento" : "lançamentos"}
              {tipo !== "registrada" ? ` · ${dinheiro(total)}` : ""}
            </p>
            <div className="cartao-lista">
              {lista.map((d) => (
                <LinhaDaDespesa key={`${d.tipo}-${d.id}`} d={d} aoClicar={() => setEscolhida(d)} />
              ))}
            </div>
          </>
        )}
      </AbasDePasta>

      {lista.some((d) => d.tipo === "registrada") && (
        <p className="ajuda-campo">
          Registradas de aparelho valem o uso pelo preço do kWh ou do m³ do ciclo; já estão dentro das cíclicas, então não
          somam no total.
        </p>
      )}

      {escolhida && (
        <OpcoesDoLancamento
          titulo={escolhida.nome}
          detalhe={escolhida.detalhe}
          podeDuplicar={escolhida.tipo !== "ciclica"}
          porQueNao="Fatura não se duplica: cada conta tem uma por ciclo"
          textoDeDuplicar={escolhida.tipo === "registrada" ? "O mesmo uso, com a data de hoje, lançado por você" : undefined}
          aoFechar={() => setEscolhida(null)}
          aoAbrir={() => {
            const destino = destinoDaDespesa(escolhida);
            setEscolhida(null);
            ir(...destino);
          }}
          aoDuplicar={() => duplicar(escolhida)}
        />
      )}

      <div className="rodape-fixo">
        <button type="button" className="botao botao--largo" onClick={() => ir("despesas")}>
          + Lançar despesa
        </button>
      </div>
    </div>
  );
}
