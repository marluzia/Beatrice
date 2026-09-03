import { useState } from "react";
import Botao from "./Botao.jsx";
import Calendario from "./Calendario.jsx";

const diaCurto = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default function SeletorDeDia({ valor, aoMudar, periodo, limite, etiqueta }) {
  const [aberto, setAberto] = useState(false);

  const escolher = (dias) => {
    const novo = dias.find((d) => d !== valor) ?? null;
    aoMudar(novo);
    if (novo) setAberto(false);
  };

  return (
    <div className="dia-do-uso">
      <Botao
        tipo="fantasma"
        aoClicar={() => setAberto(!aberto)}
        aria-expanded={aberto}
      >
        {aberto ? "Ocultar calendário" : valor ? "Trocar dia" : "Marcar dia"}
      </Botao>

      {valor && !aberto && <span className="dia-do-uso__marca">{diaCurto(valor)}</span>}

      {aberto && (
        <Calendario
          periodo={periodo}
          limite={limite}
          dias={valor ? [valor] : []}
          aoMudar={escolher}
          etiqueta={etiqueta}
        />
      )}
    </div>
  );
}
