export default function Titulo({ children, nota }) {
  return (
    <>
      <h2 className="titulo">{children}</h2>
      {nota && <p className="nota">{nota}</p>}
    </>
  );
}
