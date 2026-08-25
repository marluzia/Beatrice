import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import BarreiraDeErro from "./componentes/BarreiraDeErro.jsx";
import "./estilos/base.css";

createRoot(document.getElementById("raiz")).render(
  <React.StrictMode>
    <BarreiraDeErro>
      <App />
    </BarreiraDeErro>
  </React.StrictMode>,
);
