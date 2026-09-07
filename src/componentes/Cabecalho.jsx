import MarcaCeder from "./MarcaCeder.jsx";

export default function Cabecalho() {
  return (
    <header className="cabecalho">
      <MarcaCeder tamanho={46} />
      <div>
        <h1 className="marca-nome">CEDER</h1>
        <p className="subtitulo">Juntos dividimos justo</p>
      </div>
      <p className="lema">
        Quem viajou não paga pelo ar que não usou. Quem não lavou não paga a
        máquina. O resto divide por dias em casa.
      </p>
    </header>
  );
}
