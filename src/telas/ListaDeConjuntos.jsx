import Icone from "../componentes/Icone.jsx";
import IconeDoTipo from "../componentes/IconeDoTipo.jsx";
import { dinheiro, tomDoSaldo } from "../componentes/Interface.jsx";
import { hojeISO } from "../nucleo/resumo.js";
import { fraseDoConjunto, novidadesDe, porAtividade } from "./comum.js";

/**
 * A aba Conjuntos: a barra de busca (que leva à Busca, já na aba Conjuntos) e
 * todos os conjuntos, o de atividade mais recente primeiro. Embaixo do saldo,
 * um quadrado preto com quantas movimentações houve desde a última vez que a
 * pessoa abriu o conjunto.
 */
export default function ListaDeConjuntos({ app }) {
  const { panorama, abrir, abrirBusca } = app;
  const hoje = hojeISO();
  const lista = porAtividade(panorama);

  return (
    <div className="tela">
      <h1 className="titulo-tela titulo-tela--grande titulo-tela--sem-topo">Conjuntos</h1>

      <button type="button" className="busca busca--botao" onClick={() => abrirBusca({ aba: "conjuntos", animar: true })}>
        <Icone nome="busca" tamanho={22} />
        <span>Buscar conjunto</span>
      </button>

      {lista.length === 0 ? (
        <p className="vazio-suave">Nenhum conjunto ainda. Crie o primeiro: um evento, uma temporada, a casa ou a república.</p>
      ) : (
        <div className="cartao-lista">
          {lista.map((p) => {
            const r = p.resumo;
            const valor = r?.eu ? r.aberto / 100 : null;
            const tom = valor === null ? "zero" : tomDoSaldo(valor);
            const novidades = novidadesDe(p);
            return (
              <button key={p.ficha.id} type="button" className="linha-conjunto" onClick={() => abrir(p.ficha.id)}>
                <IconeDoTipo tipo={p.estado.modo} tamanho={52} />
                <span className="linha-conjunto__textos">
                  <strong>{p.ficha.nome}</strong>
                  <span>{fraseDoConjunto(p, hoje)}</span>
                </span>
                <span className="linha-conjunto__valor">
                  <strong className={`valor--${tom}`}>
                    {tom === "zero" ? "—" : dinheiro(valor, { sinal: true, simbolo: true, moeda: p.estado.moeda })}
                  </strong>
                  {novidades > 0 && (
                    <span
                      className="contador-novidades"
                      aria-label={`${novidades} ${novidades === 1 ? "movimentação nova" : "movimentações novas"}`}
                    >
                      {novidades > 99 ? "99+" : novidades}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
