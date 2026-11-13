import { Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import PassoContas from "../passos/PassoContas.jsx";
import PassoItens from "../passos/PassoItens.jsx";
import { sobrescritoDaTela } from "./Hub.jsx";

const TITULOS = {
  ciclicas: { titulo: "Despesas", italico: "cíclicas", nota: "Ligue as contas que chegam todo mês e preencha cada uma: valor, consumo, datas e quem pagou." },
  avulsas: { titulo: "Despesas", italico: "avulsas", nota: "O que sai do bolso, sem passar por fatura. Toque numa categoria para lançar." },
  despesas: { titulo: "Lançar", italico: "despesas", nota: "Toque numa categoria para lançar. Cada despesa diz quem pagou e quem entra nela." },
  aparelhos: { titulo: "Aparelhos", italico: "e usos", nota: "O que sai de dentro das faturas: geladeira, máquina, ar. O que nenhum aparelho explicar vira uso comum." },
};

/** As telas de edição de sempre, dentro da moldura nova. */
export default function Editor({ app, rota }) {
  const { estado, resultado, indicePorId, modo, acoes, voltar } = app;
  const semFaturas = modo.faturas === false;
  const qual = rota.qual === "avulsas" && semFaturas ? "despesas" : rota.qual;
  const t = TITULOS[qual] ?? TITULOS.avulsas;
  const comuns = { estado, resultado, indicePorId, modo, acoes };

  return (
    <div className="tela tela--editor tela--com-rodape">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito partes={sobrescritoDaTela(app)} />
      <h1 className="titulo-tela titulo-tela--grande">
        {t.titulo} <em>{t.italico}</em>
      </h1>
      <p className="texto-apoio">{t.nota}</p>

      <div className="embutido">
        {qual === "ciclicas" && <PassoContas {...comuns} secao="faturas" abaInicial={rota.aba ?? null} />}
        {qual === "avulsas" && <PassoItens {...comuns} secao="independente" />}
        {qual === "despesas" && <PassoItens {...comuns} secao="despesas" />}
        {qual === "aparelhos" && <PassoItens {...comuns} secao="fatura" />}
      </div>

      <div className="rodape-fixo rodape-fixo--sobre-barra">
        <button type="button" className="botao botao--largo" onClick={voltar}>
          Pronto
        </button>
      </div>
    </div>
  );
}
