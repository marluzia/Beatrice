import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { dinheiro, Sobrescrito, TituloDeSecao, TopoDaTela } from "../componentes/Interface.jsx";
import {
  curta,
  despesasAvulsas,
  despesasCiclicas,
  diasAte,
  hojeISO,
  medeHoras,
  nomeDaRegra,
  nomeDe,
  periodoDe,
  STATUS_DA_DESPESA,
} from "../nucleo/resumo.js";
import { num, reais } from "../nucleo/formato.js";
import { registrosDe } from "../nucleo/adaptador.js";
import { sobrescritoDaTela } from "./Hub.jsx";
import { temPeriodo } from "./Periodo.jsx";

const iconeDoCiclo = (c) => (c.id === "agua" ? "gota" : c.id === "luz" ? "raio" : c.recurso === "m3" ? "gota" : "documento");

/** "Bia pagou · 4× R$ 45,00 · igual" */
function detalheDaAvulsa(estado, d) {
  const i = d.item;
  const partes = [d.pagoPor ? `${nomeDe(estado, d.pagoPor)} pagou` : "ninguém pagou ainda"];
  if (i.especie === "porUso" && num(i.valorPorUso) > 0) {
    const registros = registrosDe(i);
    const usos =
      registros.length > 0
        ? registros.reduce((s, r) => s + (num(r.quantidade) || 1), 0)
        : num(i.usos) || Object.values(i.usosPorPessoa ?? {}).reduce((s, v) => s + num(v), 0);
    if (usos > 0) partes.push(`${reais(usos).replace(",00", "")}${medeHoras(i) ? " h ×" : "×"} R$ ${reais(num(i.valorPorUso))}`);
  }
  if (d.data) partes.push(curta(d.data));
  partes.push(nomeDaRegra(i.rateio));
  return partes.join(" · ");
}

const TIPO_EM_TEXTO = { avulsa: "avulsa", ciclica: "cíclica", registrada: "registrada" };

/** Uma linha de "Ver despesas": o tipo antes do detalhe; o valor e o status à direita. */
export function LinhaDaDespesa({ d, aoClicar }) {
  const s = d.status ? STATUS_DA_DESPESA[d.status] : null;
  return (
    <button type="button" className={`linha-despesa ${d.naConta === false ? "linha-despesa--fora" : ""}`} onClick={aoClicar}>
      <span>
        <strong>{d.nome}</strong>
        <span>
          <span className={`tipo-despesa tipo-despesa--${d.tipo}`}>{TIPO_EM_TEXTO[d.tipo]}</span> {d.detalhe}
          {d.naConta === false ? " · fora da conta" : ""}
        </span>
      </span>
      <span className="linha-despesa__fim">
        <strong className="linha-despesa__valor">{d.valor > 0 ? dinheiro(d.valor, { simbolo: false }) : "—"}</strong>
        {s && <span className={`status-despesa status-despesa--${s.tom}`}>{s.rotulo}</span>}
      </span>
    </button>
  );
}

/** Para onde leva tocar numa despesa da lista. */
export const destinoDaDespesa = (d) =>
  d.tipo === "ciclica"
    ? ["ciclo", { id: d.id }]
    : d.tipo === "registrada"
      ? ["registros", {}]
      : d.equipamento || d.item?.equipamento
        ? ["configurar", { parte: "itens" }]
        : ["editar", { qual: "avulsas", foco: d.id }];

/** Lançar despesas: as avulsas e as cíclicas. Criar fica embaixo. */
export default function Despesas({ app }) {
  const { estado, resultado, modo, ir, voltar, abrirNotificacoes } = app;
  const [todas, setTodas] = useState(false);
  const hoje = hojeISO();
  const semFaturas = modo.faturas === false;

  const ciclicas = semFaturas ? [] : despesasCiclicas(estado, resultado);
  const avulsas = despesasAvulsas(estado, resultado);
  const totalAvulsas = avulsas.reduce((s, d) => s + d.valor, 0);
  const visiveis = todas ? avulsas : avulsas.slice(0, 3);

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} acoes={[{ icone: "sino", rotulo: "Notificações", aoClicar: abrirNotificacoes }]} />
      <Sobrescrito partes={sobrescritoDaTela(app)} />
      <h1 className="titulo-tela titulo-tela--grande">
        Lançar <em>despesas</em>
      </h1>

      <TituloDeSecao direita={<strong className="periodo-resumo">{dinheiro(totalAvulsas)}</strong>}>
        Despesas <em>avulsas</em>
      </TituloDeSecao>

      {avulsas.length === 0 ? (
        <p className="vazio-suave">
          {semFaturas ? "Nenhuma despesa lançada ainda." : "Nenhuma despesa por fora das faturas: faxina, gás de botijão, internet, mercado."}
        </p>
      ) : (
        <div className="cartao-lista">
          {visiveis.map((d) => (
            <button key={d.id} type="button" className="linha-despesa" onClick={() => ir(...destinoDaDespesa({ ...d, tipo: "avulsa" }))}>
              <span>
                <strong>{d.nome}</strong>
                <span>{detalheDaAvulsa(estado, d)}</span>
              </span>
              <strong className="linha-despesa__valor">{dinheiro(d.valor, { simbolo: false })}</strong>
            </button>
          ))}
          {avulsas.length > 3 && (
            <button type="button" className="linha-despesa linha-despesa--mais" onClick={() => setTodas((v) => !v)}>
              <strong>{todas ? "Mostrar menos" : `Ver todas as ${avulsas.length} despesas avulsas`}</strong>
              <Icone nome={todas ? "baixo" : "seta"} tamanho={18} />
            </button>
          )}
        </div>
      )}

      {!semFaturas && (
        <>
          <h2 className="titulo-secao__texto titulo-secao__texto--solto">
            Despesas <em>cíclicas</em>
          </h2>
          {ciclicas.length === 0 ? (
            <button type="button" className="cartao-vazio cartao-vazio--botao" onClick={() => ir("editar", { qual: "ciclicas" })}>
              <Icone nome="raio" tamanho={26} />
              <span>Nenhuma conta ligada. Toque para ligar luz, água ou criar outra (gás, aluguel, condomínio).</span>
            </button>
          ) : (
            <div className="pilha">
              {ciclicas.map((d) => {
                const dias = d.vencimento ? diasAte(hoje, d.vencimento) : null;
                const destaque = dias !== null && dias >= 0 && dias <= 3 && !d.pagoPor;
                const atrasada = dias !== null && dias < 0 && !d.pagoPor;
                return (
                  <article
                    key={d.id}
                    className={`cartao-ciclo ${destaque || dias === 0 ? "cartao-ciclo--destaque" : ""} ${atrasada ? "cartao-ciclo--atrasada" : ""}`}
                  >
                    <button type="button" className="cartao-ciclo__topo" onClick={() => ir("editar", { qual: "ciclicas", aba: d.id })}>
                      <span className={`cartao-ciclo__nome cartao-ciclo__nome--${d.id === "agua" ? "azul" : "ouro"}`}>
                        <Icone nome={iconeDoCiclo(d.ciclo)} tamanho={20} /> {d.nome}
                      </span>
                      <strong className="cartao-ciclo__valor">{dinheiro(d.valor)}</strong>
                    </button>
                    <div className="cartao-ciclo__datas">
                      <div>
                        <span className="rotulo">Consumo</span>
                        <strong>
                          {curta(d.consumo.de)}–{curta(d.consumo.ate)}
                        </strong>
                      </div>
                      <div>
                        <span className="rotulo">{dias !== null && dias < 0 ? "Venceu" : "Vence"}</span>
                        <strong className={atrasada ? "valor--pagar" : ""}>
                          {d.vencimento ? curta(d.vencimento) : "—"}
                          {dias === 0 ? " · hoje" : atrasada ? " · atrasada" : ""}
                        </strong>
                      </div>
                      <div>
                        <span className="rotulo">Paga</span>
                        <strong className={d.pagoPor ? "valor--receber" : ""}>
                          {d.pagoPor
                            ? `${d.pagoEm ? `${curta(d.pagoEm.slice(0, 10))} · ` : ""}${nomeDe(estado, d.pagoPor)}`
                            : "—"}
                        </strong>
                      </div>
                    </div>
                    <div className="cartao-ciclo__base">
                      <span>
                        {d.quantidade > 0 ? `${reais(d.quantidade).replace(",00", "")} ${d.unidade} · ` : ""}
                        {d.componentes} {d.componentes === 1 ? "componente" : "componentes"}
                      </span>
                      <button type="button" className="link-forte" onClick={() => ir("ciclo", { id: d.id })}>
                        Composição ›
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {temPeriodo(modo) && (
        <p className="nota-tipo">
          O período ({periodoDe(estado).texto}) fica no painel do conjunto, na aba Período.
        </p>
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
