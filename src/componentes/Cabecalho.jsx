import MarcaCDR from "./MarcaCDR.jsx";

export default function Cabecalho() {
  return (
    <header className="cabecalho">
      <MarcaCDR tamanho={46} />
      <div>
        <h1 className="sigla">CDR</h1>
        <p className="subtitulo">Calculadora de Despesas Republicanas</p>
      </div>
      <p className="lema">
        Quem viajou não paga pelo ar que não usou. Quem não lavou não paga a
        máquina. O resto divide por dias em casa.
      </p>
    </header>
  );
}
