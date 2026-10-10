import { useState } from "react";
import {
  NOMES_CURTOS_DOS_DIAS,
  chaveDoMes,
  dentroDaJanela,
  mesAnterior,
  mesDoDia,
  mesSeguinte,
  partesDoDia,
  semanasDoMes,
  ultimoDiaDaJanela,
} from "../nucleo/calendario.js";
import { MESES } from "../nucleo/formato.js";

export default function Calendario({ periodo, limite, dias = [], aoMudar, etiqueta }) {
  const inicio = limite?.de ? partesDoDia(limite.de) : null;
  const [visivel, setVisivel] = useState(
    inicio ? { mes: inicio.mes, ano: inicio.ano } : { mes: periodo.mes, ano: periodo.ano },
  );

  const marcados = new Set(dias);
  const semanas = semanasDoMes(visivel.mes, visivel.ano);

  const mesAtual = chaveDoMes(visivel);
  const podeVoltar = !limite || mesAtual > mesDoDia(limite.de);
  const podeAvancar = !limite || mesAtual < mesDoDia(ultimoDiaDaJanela(limite));

  const alternar = (dia) =>
    aoMudar(marcados.has(dia) ? dias.filter((d) => d !== dia) : [...dias, dia].sort());

  return (
    <div className="calendario" role="group" aria-label={etiqueta}>
      <div className="calendario-topo">
        <button
          type="button"
          className="calendario-seta"
          aria-label="Mês anterior"
          disabled={!podeVoltar}
          onClick={() => setVisivel(mesAnterior(visivel))}
        >
          ‹
        </button>
        <span className="calendario-titulo">
          {MESES[visivel.mes - 1]} {visivel.ano}
        </span>
        <button
          type="button"
          className="calendario-seta"
          aria-label="Próximo mês"
          disabled={!podeAvancar}
          onClick={() => setVisivel(mesSeguinte(visivel))}
        >
          ›
        </button>
      </div>

      <div className="calendario-grade">
        {NOMES_CURTOS_DOS_DIAS.map((letra, i) => (
          <span key={`c${i}`} className="calendario-cabeca" aria-hidden="true">
            {letra}
          </span>
        ))}

        {semanas.flat().map((dia, i) => {
          if (!dia) return <span key={`v${i}`} className="calendario-vazio" />;

          const marcado = marcados.has(dia);
          const cobre = !limite || dentroDaJanela(dia, limite);
          const numero = partesDoDia(dia).dia;

          const classes = [
            "calendario-dia",
            marcado ? "calendario-dia--marcado" : "",
            cobre ? "" : "calendario-dia--fora",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={dia}
              type="button"
              className={classes}
              aria-pressed={marcado}
              aria-label={`${numero} de ${MESES[visivel.mes - 1]}${
                cobre ? "" : ", fora dos ciclos das faturas"
              }`}
              disabled={!cobre && !marcado}
              onClick={() => alternar(dia)}
            >
              {numero}
            </button>
          );
        })}
      </div>
    </div>
  );
}
