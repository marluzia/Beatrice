import { AjudaMoradores } from "./ajudas.jsx";
import { Botao, Campo, Ficha, Rotulo, Titulo } from "../componentes/index.js";
import {
  diasDaJanela,
  intervalosDe,
  janelaTotal,
  ultimoDiaDaJanela,
} from "../nucleo/calendario.js";
import { corDe } from "../nucleo/formato.js";
import {
  datasMarcadas,
  diasContadosNaFatura,
  janelaDaFatura,
} from "../nucleo/adaptador.js";

const diaCurto = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const escritoDoTrecho = ({ de, ate }) =>
  de === ate ? diaCurto(de) : `${diaCurto(de)} a ${diaCurto(ate)}`;

/**
 * As palavras mudam com a polaridade: numa república marca-se quem saiu, numa
 * casa de temporada marca-se quem foi. O calendário é o mesmo componente; o
 * que muda é qual campo ele preenche e o que a tela chama aquilo.
 */
const VOCABULARIO = {
  ausencia: {
    acao: "Marcar dias fora",
    contado: (n) => `Marcar dias fora (${n} ${n === 1 ? "dia" : "dias"})`,
    etiqueta: (quem) => `Dias fora de ${quem}`,
    tirar: (trecho, quem) => `Tirar ${trecho} de ${quem}`,
    janela: (de, ate) => (
      <>
        Os dias fora valem de <strong>{de}</strong> a <strong>{ate}</strong>, que é o
        que as duas faturas cobrem juntas.
      </>
    ),
  },
  presenca: {
    acao: "Marcar estadia",
    contado: (n) => `Marcar estadia (${n} ${n === 1 ? "dia" : "dias"})`,
    etiqueta: (quem) => `Dias de ${quem} na propriedade`,
    tirar: (trecho, quem) => `Tirar ${trecho} da estadia de ${quem}`,
    janela: (de, ate) => (
      <>
        As estadias valem de <strong>{de}</strong> a <strong>{ate}</strong>, que é o
        que as duas faturas cobrem juntas. Quem não tem dia marcado conta zero, e
        o que ninguém usou continua sendo de todos.
      </>
    ),
  },
};

export default function PassoMoradores({ estado, acoes, modo }) {
  const { moradores } = estado;

  const polaridade = modo.presenca;
  const contaDias = polaridade !== "nenhuma";
  const palavras = modo.palavras;
  const fala = VOCABULARIO[polaridade] ?? VOCABULARIO.ausencia;

  const limite = janelaTotal(estado.faturas, estado.periodo);

  const nomeDe = (m, i) => m.nome || `${palavras.Pessoas.slice(0, -2)} ${i + 1}`;

  return (
    <div className="coluna">
      <Ficha>
        <Titulo>
          {/* A ajuda fala de dias fora e dias de estadia. Num evento não há
              nem uma coisa nem outra, então ela só atrapalha. */}
          {polaridade !== "nenhuma" && <AjudaMoradores polaridade={polaridade} />}
          {palavras.quemMora}
        </Titulo>

        <div className="contador-moradores">
          <Campo
            rotulo={palavras.Pessoas}
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
            rotuloAcessivel={`Tirar um ${palavras.pessoa}`}
            aoClicar={() => acoes.ajustarQuantidadeDeMoradores(moradores.length - 1)}
          >
            −
          </Botao>
          <Botao
            tipo="fantasma"
            quadrado
            rotuloAcessivel={`Somar um ${palavras.pessoa}`}
            aoClicar={() => acoes.ajustarQuantidadeDeMoradores(moradores.length + 1)}
          >
            +
          </Botao>
        </div>

        {moradores.length >= modo.maximoDeMoradores && (
          <p className="nota">
            Este modo vai até {modo.maximoDeMoradores} {palavras.pessoas}.
          </p>
        )}

        {contaDias && (
          <>
            <p className="dica">
              {fala.janela(diaCurto(limite.de), diaCurto(ultimoDiaDaJanela(limite)))}
            </p>
            <p className="dica">
              Os dias de cada um são marcados no <strong>Calendário</strong>, o
              passo depois de Itens. Aqui ficam só os nomes e a contagem.
            </p>
          </>
        )}

        {moradores.length === 0 ? (
          <p className="vazio">{palavras.semPessoas}</p>
        ) : (
          <div className="lista-moradores">
            <div className="cabeca-tabela">
              <span />
              <Rotulo>Nome</Rotulo>
              {contaDias && <Rotulo>Dias luz</Rotulo>}
              {contaDias && <Rotulo>Dias água</Rotulo>}
            </div>

            {moradores.map((m, i) => {
              const marcados = datasMarcadas(m, polaridade);
              const quem = nomeDe(m, i);

              return (
                <div className="morador" key={m.id}>
                  <span className="ponto" style={{ background: corDe(i) }} />
                  <Campo
                    valor={m.nome}
                    aoMudar={(v) => acoes.editarMorador(m.id, "nome", v)}
                    placeholder={quem}
                    texto
                  />

                  {contaDias && (
                    <div className="morador-numeros">
                      <span className="dias-contados">
                        <span className="rotulo rotulo-solto">Dias luz</span>
                        {diasContadosNaFatura(m, estado.faturas.luz, estado.periodo, polaridade)}
                        <em>
                          de {diasDaJanela(janelaDaFatura(estado.faturas.luz, estado.periodo))}
                        </em>
                      </span>
                      <span className="dias-contados">
                        <span className="rotulo rotulo-solto">Dias água</span>
                        {diasContadosNaFatura(m, estado.faturas.agua, estado.periodo, polaridade)}
                        <em>
                          de {diasDaJanela(janelaDaFatura(estado.faturas.agua, estado.periodo))}
                        </em>
                      </span>
                    </div>
                  )}

                  {contaDias && marcados.length > 0 && (
                    <div className="periodos-fora">
                      {intervalosDe(marcados).map((trecho) => (
                        <span className="periodo-fora" key={trecho.de}>
                          {escritoDoTrecho(trecho)}
                        </span>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </Ficha>
    </div>
  );
}
