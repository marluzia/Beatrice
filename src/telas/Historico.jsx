import { useState } from "react";
import { Chips, dinheiro, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { atividadeDe, curta, hojeISO, STATUS_DA_DESPESA, todasAsDespesas } from "../nucleo/resumo.js";
import { destinoDaDespesa } from "./Despesas.jsx";
import { sobrescritoDaTela } from "./Hub.jsx";

const FILTROS = [
  { valor: "todos", rotulo: "Tudo" },
  { valor: "despesa", rotulo: "Despesas" },
  { valor: "lembrete", rotulo: "Lembretes" },
  { valor: "registro", rotulo: "Registros" },
];

const FILTROS_DE_STATUS = [
  { valor: "todos", rotulo: "Todas" },
  { valor: "aberta", rotulo: "Abertas" },
  { valor: "avencer", rotulo: "A vencer" },
  { valor: "atrasada", rotulo: "Atrasadas" },
  { valor: "paga", rotulo: "Pagas" },
];

/**
 * O histórico do conjunto: despesas (com o status de cada uma), lembretes,
 * registros e os Pix do acerto, do mais recente para o mais antigo.
 */
export function historicoDoConjunto(estado, resultado, hoje = hojeISO()) {
  const despesas = todasAsDespesas(estado, resultado, hoje);
  const lista = despesas.map((d) => ({
    ...d,
    grupo: d.tipo === "registrada" ? "registro" : "despesa",
    titulo: d.nome,
  }));

  for (const l of estado.lembretes ?? []) {
    const titulo = l.titulo || l.texto || (l.tipo === "lista" ? "Lista" : "Nota");
    const feitos = (l.itens ?? []).filter((x) => x.feito).length;
    lista.push({
      grupo: "lembrete",
      tipo: "lembrete",
      id: l.id,
      titulo,
      detalhe:
        l.tipo === "lista"
          ? `lista · ${feitos} de ${(l.itens ?? []).length} feitos`
          : l.data
            ? `nota para ${curta(l.data)}`
            : "nota",
      quando: l.criadoEm ?? l.data ?? "",
      valor: 0,
    });
  }

  // Os Pix do acerto e as contas marcadas como pagas aparecem em "Tudo".
  for (const a of atividadeDe(estado, { resultado })) {
    if (a.tipo !== "pix") continue;
    lista.push({ grupo: "pix", tipo: "pix", id: `pix-${a.quando}`, titulo: a.texto, detalhe: "acerto", quando: a.quando, valor: a.valor });
  }

  const ordem = { despesa: 0, registro: 1, lembrete: 2, pix: 3 };
  return lista.sort((a, b) => String(b.quando).localeCompare(String(a.quando)) || ordem[a.grupo] - ordem[b.grupo]);
}

/** Histórico do conjunto, com filtro por tipo e, nas despesas, por status. */
export default function Historico({ app, rota }) {
  const { estado, resultado, ir, voltar } = app;
  const [filtro, setFiltro] = useState(rota?.filtro ?? "todos");
  const [status, setStatus] = useState("todos");
  const hoje = hojeISO();

  const tudo = historicoDoConjunto(estado, resultado, hoje);
  const lista = tudo.filter(
    (h) =>
      (filtro === "todos" || h.grupo === filtro) &&
      (filtro !== "despesa" || status === "todos" || h.status === status),
  );

  const destino = (h) => {
    if (h.grupo === "lembrete") return ["lembretes", {}];
    if (h.grupo === "pix") return ["saldos", {}];
    return destinoDaDespesa(h);
  };

  return (
    <div className="tela">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito partes={sobrescritoDaTela(app)} />
      <h1 className="titulo-tela titulo-tela--grande">Histórico</h1>

      <Chips opcoes={FILTROS} valor={filtro} aoMudar={setFiltro} />
      {filtro === "despesa" && (
        <div className="chips-secundarios">
          <Chips opcoes={FILTROS_DE_STATUS} valor={status} aoMudar={setStatus} />
        </div>
      )}

      {lista.length === 0 ? (
        <p className="vazio-suave">
          {tudo.length === 0
            ? "Nada aconteceu ainda neste conjunto."
            : filtro === "despesa" && status !== "todos"
              ? `Nenhuma despesa ${FILTROS_DE_STATUS.find((f) => f.valor === status).rotulo.toLowerCase().replace(/s$/, "")}.`
              : "Nada deste tipo ainda."}
        </p>
      ) : (
        <div className="cartao-lista">
          {lista.map((h) => {
            const s = h.status ? STATUS_DA_DESPESA[h.status] : null;
            return (
              <button
                key={`${h.grupo}-${h.id}`}
                type="button"
                className={`linha-historia ${h.naConta === false ? "linha-historia--fora" : ""}`}
                onClick={() => ir(...destino(h))}
              >
                <span className="linha-historia__data">{h.quando ? curta(String(h.quando).slice(0, 10)) : "—"}</span>
                <span className="linha-historia__textos">
                  <strong>{h.titulo}</strong>
                  <span>
                    {h.grupo === "registro" && <span className="tipo-despesa tipo-despesa--registrada">registro</span>}
                    {h.grupo === "lembrete" && <span className="tipo-despesa tipo-despesa--lembrete">lembrete</span>}
                    {h.grupo === "despesa" && (
                      <span className={`tipo-despesa tipo-despesa--${h.tipo}`}>{h.tipo === "ciclica" ? "cíclica" : "avulsa"}</span>
                    )}{" "}
                    {h.detalhe}
                    {h.naConta === false ? " · fora da conta" : ""}
                  </span>
                </span>
                <span className="linha-historia__fim">
                  {h.valor > 0 && <strong>{dinheiro(h.valor, { simbolo: false })}</strong>}
                  {s && <span className={`status-despesa status-despesa--${s.tom}`}>{s.rotulo}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
