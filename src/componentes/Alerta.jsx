export default function Alerta({ nivel = "aviso", children }) {
  return (
    <div
      className={nivel === "erro" ? "alerta alerta--erro" : "alerta"}
      role={nivel === "erro" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
