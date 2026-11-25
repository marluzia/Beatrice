import IconeDoTipo from "../componentes/IconeDoTipo.jsx";
import { centavosEmDinheiro, dinheiro, TituloDeSecao, tomDoSaldo, TopoDaTela } from "../componentes/Interface.jsx";
import { curta, hojeISO, quandoFoi } from "../nucleo/resumo.js";
import { codigoSeNaoForReal, porLancamento, TEXTO_DA_SITUACAO } from "./comum.js";

/** Atividade: o saldo de você em cada conjunto e tudo o que foi lançado, do mais novo ao mais antigo. */
export default function Atividade({ app }) {
  const { panorama, abrir } = app;
  const hoje = hojeISO();

  const comVoce = porLancamento(panorama).filter((p) => p.resumo?.eu);
  const maior = Math.max(1, ...comVoce.map((p) => Math.abs(p.resumo.aberto)));

  const feed = panorama
    .flatMap((p) => (p.atividade ?? []).map((a) => ({ ...a, conjunto: p.ficha.id, nomeDoConjunto: p.ficha.nome, modo: p.estado.modo, estado: p.estado })))
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)))
    .slice(0, 30);

  const dias = [];
  for (const a of feed) {
    const dia = String(a.quando).slice(0, 10);
    const ultimo = dias[dias.length - 1];
    if (ultimo?.dia === dia) ultimo.itens.push(a);
    else dias.push({ dia, itens: [a] });
  }

  return (
    <div className="tela">
      <TopoDaTela />
      <h1 className="titulo-tela titulo-tela--grande">Atividade</h1>
      <p className="texto-apoio">O que está em aberto para você em cada conjunto, e o que foi lançado por último.</p>

      <TituloDeSecao>
        Por <em>conjunto</em>
      </TituloDeSecao>
      {comVoce.length === 0 ? (
        <p className="vazio-suave">Quando você estiver num conjunto, o saldo dele aparece aqui.</p>
      ) : (
        <div className="cartao-lista">
          {comVoce.map((p) => {
            const v = p.resumo.aberto;
            return (
              <button key={p.ficha.id} type="button" className="linha-atividade" onClick={() => abrir(p.ficha.id)}>
                <IconeDoTipo tipo={p.estado.modo} tamanho={40} />
                <span className="linha-atividade__textos">
                  <strong>{p.ficha.nome}</strong>
                  <span className="barrinha" aria-hidden="true">
                    <i className={`barrinha__valor barrinha__valor--${tomDoSaldo(v)}`} style={{ width: `${(Math.abs(v) / maior) * 100}%` }} />
                  </span>
                </span>
                <span className="linha-conjunto__valor">
                  <strong className={`valor--${tomDoSaldo(v)}`}>{centavosEmDinheiro(v, { sinal: true, simbolo: Boolean(codigoSeNaoForReal(p.estado)), moeda: p.estado.moeda })}</strong>
                  <span>{TEXTO_DA_SITUACAO[p.resumo.situacao]}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <TituloDeSecao>
        O que <em>aconteceu</em>
      </TituloDeSecao>
      {dias.length === 0 ? (
        <p className="vazio-suave">Nada lançado ainda.</p>
      ) : (
        dias.map((d) => (
          <div key={d.dia}>
            <p className="rotulo-secao">{d.dia === hoje ? "Hoje" : quandoFoi(d.dia, hoje) === "ontem" ? "Ontem" : curta(d.dia)}</p>
            <div className="cartao-lista">
              {d.itens.map((a, i) => (
                <button key={`${a.conjunto}-${i}`} type="button" className="linha-historico linha-historico--botao" onClick={() => abrir(a.conjunto, a.ref ? { tela: "lancamento", ...a.ref } : null)}>
                  <IconeDoTipo tipo={a.modo} tamanho={32} />
                  <span>
                    {a.texto}
                    <small> · {a.nomeDoConjunto}</small>
                  </span>
                  {a.valor ? <strong className="mono">{dinheiro(a.valor, { simbolo: Boolean(codigoSeNaoForReal(a.estado)), moeda: a.estado.moeda })}</strong> : <span />}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
