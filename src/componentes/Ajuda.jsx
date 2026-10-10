export default function Ajuda({ titulo, children, aberto = false }) {
  return (
    <details className="ajuda" open={aberto}>
      <summary className="ajuda__titulo">{titulo}</summary>
      <div className="ajuda__corpo">{children}</div>
    </details>
  );
}
