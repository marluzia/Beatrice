export default function Rotulo({ children, solto = false }) {
  return (
    <span className={solto ? "rotulo rotulo-solto" : "rotulo"}>{children}</span>
  );
}
