import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { AbasDePasta, emBreve, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { sobrescritoDaTela } from "./Hub.jsx";

const SOBRE_O_TIPO = {
  avulsa: "Sai do bolso de alguém: mercado, faxina, gás de botijão, a conta do bar.",
  ciclica: "Chega a cada ciclo: luz, água, gás encanado, aluguel, condomínio.",
};

/**
 * Lançar despesas: a pasta Avulsa | Cíclica e os três jeitos de lançar.
 * Nunca mostra o que já foi lançado: isso fica em Ver despesas.
 */
export default function Despesas({ app, rota }) {
  const { modo, ir, voltar } = app;
  const semFaturas = modo.faturas === false;
  const [tipo, setTipo] = useState(!semFaturas && rota?.tipo === "ciclica" ? "ciclica" : "avulsa");

  const opcoes = [
    { valor: "avulsa", rotulo: "Avulsa" },
    ...(semFaturas ? [] : [{ valor: "ciclica", rotulo: "Cíclica" }]),
  ];

  return (
    <div className="tela">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito partes={sobrescritoDaTela(app)} />
      <h1 className="titulo-tela titulo-tela--grande">
        Lançar <em>despesas</em>
      </h1>
      <p className="texto-apoio">Escolha o tipo e como lançar. O que já foi lançado fica em Ver despesas.</p>

      <AbasDePasta opcoes={opcoes} valor={tipo} aoMudar={setTipo} rotulo="Tipo de despesa">
        <p className="texto-apoio texto-apoio--colado">{SOBRE_O_TIPO[tipo]}</p>
        <div className="jeitos-de-lancar">
          <button type="button" className="jeito-de-lancar" onClick={() => emBreve("Importar arquivo")}>
            <Icone nome="importar" tamanho={26} />
            <strong>Importar arquivo</strong>
            <span>PDF ou imagem da conta</span>
          </button>
          <button type="button" className="jeito-de-lancar" onClick={() => emBreve("Lançar por foto")}>
            <Icone nome="camera" tamanho={26} />
            <strong>Foto</strong>
            <span>Fotografar o recibo</span>
          </button>
          <button
            type="button"
            className="jeito-de-lancar jeito-de-lancar--escuro"
            onClick={() => ir("lancar", { tipo })}
          >
            <Icone nome="lapis" tamanho={26} />
            <strong>Lançar manualmente</strong>
            <span>Categoria e formulário</span>
          </button>
        </div>
      </AbasDePasta>
    </div>
  );
}
