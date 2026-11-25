import Icone from "../componentes/Icone.jsx";
import { dinheiro } from "../componentes/Interface.jsx";
import { STATUS_DA_DESPESA } from "../nucleo/resumo.js";

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

/** Para onde leva abrir uma despesa: a tela dela, sozinha (o lançamento). */
export const destinoDaDespesa = (d) =>
  d.tipo === "ciclica"
    ? ["lancamento", { tipo: "ciclica", id: d.id }]
    : d.tipo === "registrada"
      ? ["lancamento", { tipo: "registro", item: d.item, id: d.registro?.id ?? String(d.id).split(":").pop() }]
      : ["lancamento", { tipo: "avulsa", id: d.id }];

/**
 * O que fazer com um lançamento tocado numa seção "Ver": abrir (a tela dele)
 * ou duplicar (uma cópia, de quem duplicou).
 */
export function OpcoesDoLancamento({ titulo, detalhe, podeDuplicar = true, porQueNao, textoDeDuplicar, aoAbrir, aoDuplicar, aoFechar }) {
  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <section
        className="folha folha--opcoes"
        role="dialog"
        aria-modal="true"
        aria-label={`Opções de ${titulo}`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="folha__alca" aria-hidden="true" />
        <h2 className="titulo-tela">{titulo}</h2>
        {detalhe && <p className="texto-apoio texto-apoio--colado">{detalhe}</p>}
        <div className="cartao-lista">
          <button type="button" className="linha-opcao" onClick={aoAbrir}>
            <Icone nome="documento" tamanho={20} />
            <span>
              <strong>Abrir</strong>
              <span>Ver o lançamento, quem lançou e quando</span>
            </span>
          </button>
          <button type="button" className="linha-opcao" onClick={aoDuplicar} disabled={!podeDuplicar}>
            <Icone nome="copiar" tamanho={20} />
            <span>
              <strong>Duplicar</strong>
              <span>{podeDuplicar ? textoDeDuplicar ?? "Uma cópia, lançada por você" : porQueNao}</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
