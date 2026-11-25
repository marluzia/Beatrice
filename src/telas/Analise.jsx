import { dinheiro, Sobrescrito, TituloDeSecao, TopoDaTela } from "../componentes/Interface.jsx";
import { balancoDasDespesas, despesasAvulsas, historicoDosCiclos, hojeISO, nomeDe } from "../nucleo/resumo.js";
import { CORES_DO_CICLO, GraficoDosCiclos, ParaOndeFoi } from "./graficos.jsx";

/** Uma barra horizontal com o nome, a fatia e o valor. */
function LinhaDeBarra({ nome, valor, maximo, cor }) {
  const largura = maximo > 0 ? Math.max(2, (valor / maximo) * 100) : 0;
  return (
    <div className="linha-barra">
      <span className="linha-barra__nome">{nome}</span>
      <span className="linha-barra__trilho" aria-hidden="true">
        <span style={{ width: `${largura}%`, background: cor }} />
      </span>
      <strong className="linha-barra__valor">{dinheiro(valor, { simbolo: false })}</strong>
    </div>
  );
}

/**
 * Análise: o que o conjunto gastou, olhado de três jeitos   em aberto e
 * pago, a parte de cada pessoa, e para onde foi (por conta e por despesa).
 */
export default function Analise({ app }) {
  const { estado, resultado, modo, voltar } = app;
  const semFaturas = modo.faturas === false;
  const balanco = balancoDasDespesas(estado, resultado, hojeISO());
  const partes = (resultado?.moradores ?? [])
    .map((m) => ({ id: m.moradorId, nome: nomeDe(estado, m.moradorId), valor: m.total ?? 0 }))
    .sort((a, b) => b.valor - a.valor);
  const maiorParte = Math.max(0, ...partes.map((p) => p.valor));
  const maiorBalanco = Math.max(balanco.aberto, balanco.pago);
  const nada = balanco.aberto + balanco.pago <= 0;

  return (
    <div className="tela">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito>{app.nomeDoConjunto}</Sobrescrito>
      <h1 className="titulo-tela titulo-tela--grande">Análise</h1>

      {nada ? (
        <p className="vazio-suave">Quando houver despesas lançadas, aqui aparece o que está em aberto, a parte de cada um e para onde foi.</p>
      ) : (
        <>
          <TituloDeSecao direita="das despesas na conta">
            Em aberto e <em>pago</em>
          </TituloDeSecao>
          <section className="cartao cartao-analise">
            <LinhaDeBarra nome="Pago" valor={balanco.pago} maximo={maiorBalanco} cor="var(--agua)" />
            <LinhaDeBarra nome="Em aberto" valor={balanco.aberto} maximo={maiorBalanco} cor="var(--ouro)" />
          </section>

          <TituloDeSecao direita="no que foi lançado">
            A parte de <em>cada um</em>
          </TituloDeSecao>
          <section className="cartao cartao-analise">
            {partes.map((p) => (
              <LinhaDeBarra key={p.id} nome={p.nome} valor={p.valor} maximo={maiorParte} cor="var(--tinta)" />
            ))}
          </section>
        </>
      )}

      {!semFaturas && <GraficoDosCiclos estado={estado} historico={historicoDosCiclos(estado)} cores={CORES_DO_CICLO} />}
      <ParaOndeFoi estado={estado} despesas={despesasAvulsas(estado, resultado)} />
    </div>
  );
}
