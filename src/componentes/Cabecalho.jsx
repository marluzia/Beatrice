import MarcaCeder from "./MarcaCeder.jsx";
import Botao from "./Botao.jsx";

const LEMA_PADRAO =
  "Quem viajou não paga pelo ar que não usou. Quem não lavou não paga a máquina. O resto divide por dias em casa.";

/**
 * Sem conjunto aberto, o cabeçalho é só a marca. Com um conjunto aberto, ele
 * também diz qual é e oferece a volta para o painel.
 */
export default function Cabecalho({ casa, modo, aoSair }) {
  return (
    <header className="cabecalho">
      <MarcaCeder tamanho={46} />

      <div>
        <h1 className="marca-nome">CEDER</h1>
        <p className="subtitulo">Juntos dividimos justo</p>
      </div>

      {casa ? (
        <div className="cabecalho__casa">
          <div>
            <p className="cabecalho__casa-nome">{casa}</p>
            {modo && <p className="cabecalho__casa-modo">{modo.nome}</p>}
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
