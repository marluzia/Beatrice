import { AjudaMoradores } from "./ajudas.jsx";
import { Botao, Campo, Ficha, Rotulo, Titulo } from "../componentes/index.js";
import { corDe } from "../nucleo/formato.js";
import { diasContadosDe } from "../nucleo/adaptador.js";

export default function PassoMoradores({ estado, resultado, acoes }) {
  const { moradores } = estado;

  return (
    <div className="coluna">
      <Ficha>
        <Titulo
          nota={`Dias fora é quanto tempo a pessoa passou longe da casa. Dias contados é o que sobra dos ${resultado.diasNoPeriodo} dias do mês, e é o peso usado no rateio por dias.`}
        >
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

        {moradores.length === 0 ? (
          <p className="vazio">Diga quantas pessoas dividem a casa para montar a lista.</p>
        ) : (
          <div className="lista-moradores">
            <div className="cabeca-tabela">
              <span />
              <Rotulo>Nome</Rotulo>
              <Rotulo>Dias fora</Rotulo>
              <Rotulo>Dias contados</Rotulo>
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
                  <Campo
                    rotulo="Dias fora"
                    rotuloSolto
                    valor={m.diasFora}
                    aoMudar={(v) => acoes.editarMorador(m.id, "diasFora", v)}
                    placeholder="0"
                    largura="campo--minimo"
                    tipoDeTeclado="numeric"
                  />
                  <span className="dias-contados">
                    <span className="rotulo rotulo-solto">Dias contados</span>
                    {diasContadosDe(m, estado.periodo)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Ficha>

      <AjudaMoradores />
    </div>
  );
}
