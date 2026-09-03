import { useState } from "react";
import { AjudaMoradores } from "./ajudas.jsx";
import { Botao, Calendario, Campo, Ficha, Rotulo, Titulo } from "../componentes/index.js";
import {
  diasDaJanela,
  diasEntre,
  intervalosDe,
  janelaTotal,
  ultimoDiaDaJanela,
} from "../nucleo/calendario.js";
import { corDe } from "../nucleo/formato.js";
import { diasContadosNaFatura, janelaDaFatura } from "../nucleo/adaptador.js";

const ausenciasDe = (m) => (Array.isArray(m.ausencias) ? m.ausencias : []);

const diaCurto = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function rotuloDoBotao(m) {
  const quantos = ausenciasDe(m).length;
  if (quantos === 0) return "Marcar dias fora";
  return `Marcar dias fora (${quantos} ${quantos === 1 ? "dia" : "dias"})`;
}

const escritoDoTrecho = ({ de, ate }) =>
  de === ate ? diaCurto(de) : `${diaCurto(de)} a ${diaCurto(ate)}`;

export default function PassoMoradores({ estado, resultado, acoes }) {
  const { moradores } = estado;

  const [aberto, setAberto] = useState(null);

  const limite = janelaTotal(estado.faturas, estado.periodo);

  const removerAusencia = (m, trecho) => {
    const fora = new Set(diasEntre(trecho.de, trecho.ate));
    acoes.editarMorador(m.id, "ausencias", ausenciasDe(m).filter((d) => !fora.has(d)));
  };

  return (
    <div className="coluna">
      <Ficha>
        <Titulo
        >
           <AjudaMoradores />
          Quem mora aqui

        </Titulo>

        <div className="contador-moradores">
          <Campo
            rotulo="Moradores"
            valor={String(moradores.length)}
            aoMudar={(v) => {
              if (v.trim() === "") return;
              const n = parseInt(v, 10);
              if (Number.isFinite(n)) acoes.ajustarQuantidadeDeMoradores(n);
            }}
            largura="campo--minimo"
            tipoDeTeclado="numeric"
          />
          <Botao
            tipo="fantasma"
            quadrado
            rotuloAcessivel="Tirar um morador"
            aoClicar={() => acoes.ajustarQuantidadeDeMoradores(moradores.length - 1)}
          >
            −
          </Botao>
          <Botao
            tipo="fantasma"
            quadrado
            rotuloAcessivel="Somar um morador"
            aoClicar={() => acoes.ajustarQuantidadeDeMoradores(moradores.length + 1)}
          >
            +
          </Botao>
        </div>

        <p className="dica">
          Os dias fora valem de <strong>{diaCurto(limite.de)}</strong> a{" "}
          <strong>{diaCurto(ultimoDiaDaJanela(limite))}</strong>, que é o que as duas
          faturas cobrem juntas.
        </p>

        {moradores.length === 0 ? (
          <p className="vazio">Diga quantas pessoas dividem a casa para montar a lista.</p>
        ) : (
          <div className="lista-moradores">
            <div className="cabeca-tabela">
              <span />
              <Rotulo>Nome</Rotulo>
              <Rotulo>Dias luz</Rotulo>
              <Rotulo>Dias água</Rotulo>
            </div>

            {moradores.map((m, i) => (
              <div className="morador" key={m.id}>
                <span className="ponto" style={{ background: corDe(i) }} />
                <Campo
                  valor={m.nome}
                  aoMudar={(v) => acoes.editarMorador(m.id, "nome", v)}
                  placeholder={`Pessoa ${i + 1}`}
                  texto
                />
                <div className="morador-numeros">
                  <span className="dias-contados">
                    <span className="rotulo rotulo-solto">Dias luz</span>
                    {diasContadosNaFatura(m, estado.faturas.luz, estado.periodo)}
                    <em>de {diasDaJanela(janelaDaFatura(estado.faturas.luz, estado.periodo))}</em>
                  </span>
                  <span className="dias-contados">
                    <span className="rotulo rotulo-solto">Dias água</span>
                    {diasContadosNaFatura(m, estado.faturas.agua, estado.periodo)}
                    <em>de {diasDaJanela(janelaDaFatura(estado.faturas.agua, estado.periodo))}</em>
                  </span>
                </div>

                <div className="morador-ausencia">
                  <Botao
                    tipo="fantasma"
                    aoClicar={() => setAberto(aberto === m.id ? null : m.id)}
                    aria-expanded={aberto === m.id}
                  >
                    {aberto === m.id ? "Ocultar calendário" : rotuloDoBotao(m)}
                  </Botao>

                  {aberto === m.id && (
                    <Calendario
                      periodo={estado.periodo}
                      limite={limite}
                      dias={ausenciasDe(m)}
                      aoMudar={(v) => acoes.editarMorador(m.id, "ausencias", v)}
                      etiqueta={`Dias fora de ${m.nome || `Pessoa ${i + 1}`}`}
                    />
                  )}
                </div>

                {intervalosDe(ausenciasDe(m)).length > 0 && (
                  <div className="periodos-fora">
                    {intervalosDe(ausenciasDe(m)).map((trecho) => (
                      <span className="periodo-fora" key={trecho.de}>
                        {escritoDoTrecho(trecho)}
                        <button
                          type="button"
                          className="linha-fatura__remover"
                          aria-label={`Tirar ${escritoDoTrecho(trecho)} de ${m.nome || `Pessoa ${i + 1}`}`}
                          onClick={() => removerAusencia(m, trecho)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Ficha>

    </div>
  );
}
