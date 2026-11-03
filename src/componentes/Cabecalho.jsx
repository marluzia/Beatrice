import Botao from "./Botao.jsx";

const LEMA_PADRAO =
  "Quem viajou não paga pelo ar que não usou. Quem não lavou não paga a máquina. O resto divide por dias em casa.";

/**
 * A identificação institucional, no alto à esquerda: o nome sob a régua e o
 * lema. Sem símbolo.
 *
 * O R. é a assinatura da marca, e assinatura se usa onde o documento sai da
 * casa: no relatório, e no `QuemCede`, onde o ponto é a moeda. Dentro do app,
 * em toda tela, ele vira só mais um enfeite no topo e perde esse peso.
 *
 * A régua embaixo do nome não é enfeite   é a linha que a casa assina. E
 * "dividimos" vem com as sílabas abertas porque a palavra é literalmente o que
 * o produto faz com uma conta: separa em partes.
 *
 * Sem conjunto aberto, o cabeçalho é só a marca. Com um conjunto aberto, ele
 * também diz qual é e oferece a volta para o painel.
 */
export default function Cabecalho({ conjunto, modo, aoSair }) {
  return (
    <header className="cabecalho">
      <div className="marca-bloco">
        <h1 className="marca-nome">CEDER</h1>
        <p className="subtitulo">
          juntos <span className="subtitulo__silabas">dividimos</span> justo
        </p>
      </div>

      {conjunto ? (
        <div className="cabecalho__conjunto">
          <div>
            <p className="cabecalho__conjunto-nome">{conjunto}</p>
            {modo && <p className="cabecalho__conjunto-modo">{modo.nome}</p>}
          </div>
          <Botao tipo="fantasma" aoClicar={aoSair}>
            Meus conjuntos
          </Botao>
        </div>
      ) : (
        <p className="lema">{LEMA_PADRAO}</p>
      )}
    </header>
  );
}
