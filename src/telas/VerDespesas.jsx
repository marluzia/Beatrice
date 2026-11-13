import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { Chips, dinheiro, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { todasAsDespesas } from "../nucleo/resumo.js";
import { destinoDaDespesa, LinhaDaDespesa } from "./Despesas.jsx";
import { sobrescritoDaTela } from "./Hub.jsx";

const normal = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Ver despesas: todas, com busca e filtro por tipo, da mais recente para a mais antiga. */
export default function VerDespesas({ app, rota }) {
  const { estado, resultado, modo, ir, voltar } = app;
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState(rota?.tipo ?? "todas");
  const semFaturas = modo.faturas === false;

  const todas = todasAsDespesas(estado, resultado);
  const tipos = ["avulsa", "ciclica", "registrada"].filter((t) => todas.some((d) => d.tipo === t));
  const filtros = [
    { valor: "todas", rotulo: "Todas" },
    ...[
      { valor: "avulsa", rotulo: "Avulsas" },
      { valor: "ciclica", rotulo: "Cíclicas" },
      { valor: "registrada", rotulo: "Registradas" },
    ].filter((f) => !semFaturas || f.valor === "avulsa"),
  ];

  const termo = normal(busca.trim());
  const lista = todas.filter(
    (d) => (tipo === "todas" || d.tipo === tipo) && (!termo || normal(d.nome).includes(termo) || normal(d.detalhe).includes(termo)),
  );
  const total = lista.reduce((s, d) => s + (d.tipo === "registrada" || d.naConta === false ? 0 : d.valor), 0);

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
      {(tipos.length > 1 || !semFaturas) && <Chips opcoes={filtros} valor={tipo} aoMudar={setTipo} />}

      {lista.length === 0 ? (
        <p className="vazio-suave">{todas.length === 0 ? "Nada lançado ainda." : "Nenhuma despesa com essa busca."}</p>
      ) : (
        <>
          <p className="rotulo-secao">
            {lista.length} {lista.length === 1 ? "lançamento" : "lançamentos"}
            {tipo !== "registrada" ? ` · ${dinheiro(total)}` : ""}
          </p>
          <div className="cartao-lista">
            {lista.map((d) => (
              <LinhaDaDespesa key={`${d.tipo}-${d.id}`} d={d} aoClicar={() => ir(...destinoDaDespesa(d))} />
            ))}
          </div>
          {tipo !== "avulsa" && lista.some((d) => d.tipo === "registrada") && (
            <p className="ajuda-campo">
              Registradas valem o uso pelo preço do kWh ou do m³ do ciclo; já estão dentro das cíclicas, então não somam no
              total.
            </p>
          )}
        </>
      )}

      <div className="rodape-fixo rodape-fixo--dois">
        <button type="button" className={`botao ${semFaturas ? "" : "botao--fantasma"}`} onClick={() => ir("editar", { qual: "avulsas" })}>
          {semFaturas ? "+ Despesa" : "+ Avulsa"}
        </button>
        {!semFaturas && (
          <button type="button" className="botao" onClick={() => ir("editar", { qual: "ciclicas" })}>
            + Cíclica
          </button>
        )}
      </div>
    </div>
  );
}
