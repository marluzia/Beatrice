export default function Ficha({ children, className = "" }) {
  return <section className={`ficha ${className}`.trim()}>{children}</section>;
}
