import { corDe, nomeOu, reais } from "../nucleo/formato.js";

/** Uma barra por item. A largura de cada cor é a fatia daquela pessoa. */
export default function Regua({ item, moradores, indicePorId }) {
  const nomeDe = (id) => {
    const m = moradores.find((x) => x.id === id);
    return nomeOu(m?.nome, indicePorId[id]);
  };
  const negativo = item.custoTotal < -0.005;

  return (
    <div className="regua">
      <div className="regua-topo">
        <span>
          {item.nome}
          {item.automatico && <span className="regua-marca"> · sobra</span>}
        </span>
        <span className="valor" style={negativo ? { color: "var(--alerta)" } : undefined}>
          R$ {reais(item.custoTotal)}
        </span>
      </div>
      <div className="regua-barra">
        {item.fatias.map((f) => (
          <div
            key={f.moradorId}
            className="regua-fatia"
            title={`${nomeDe(f.moradorId)} · R$ ${reais(f.total)}`}
            style={{
              width: `${Math.max(0, f.proporcao) * 100}%`,
              background: corDe(indicePorId[f.moradorId]),
            }}
          />
        ))}
      </div>
    </div>
  );
}
