import { registravel, registrosDe } from "../nucleo/adaptador.js";
import { LinhaDeMenu } from "../componentes/Interface.jsx";

/**
 * A aba Registros do painel do conjunto, na mesma lógica de Lembretes:
 * Lançar registros e Ver registros. Sem item que se registre, o caminho é
 * cadastrar um em Itens.
 */
export default function Registros({ app }) {
  const { estado, ir } = app;
  const comUso = estado.itens.filter((i) => registravel(i, estado));
  const total = comUso.flatMap((i) => registrosDe(i)).filter((r) => r.data).length;
  const itensCadastrados = comUso.length;

  return (
    <div className="aba-do-painel">
      {comUso.length === 0 ? (
        <>
          <p className="vazio-suave">
            Registros são de itens e aparelhos que consomem kWh ou m³, medidos por uso (máquina de lavar) ou por hora
            (ar-condicionado, chuveiro). Cadastre um em Itens, aqui na aba Registros, com o gasto de cada uso ou hora.
          </p>
          <button type="button" className="botao botao--fantasma botao--largo" onClick={() => ir("itens")}>
            Cadastrar itens
          </button>
        </>
      ) : (
        <div className="cartao-lista">
          <LinhaDeMenu
            icone="mais"
            iconeEscuro
            titulo="Lançar registros"
            subtitulo="usos de itens e aparelhos"
            aoClicar={() => ir("lancarRegistro")}
          />
          <LinhaDeMenu
            icone="busca"
            titulo="Ver registros"
            subtitulo={`${total} ${total === 1 ? "registro" : "registros"} · buscar e filtrar`}
            aoClicar={() => ir("verRegistros")}
          />
          <LinhaDeMenu
            icone="itens"
            titulo="Itens"
            subtitulo={`${itensCadastrados} ${itensCadastrados === 1 ? "item" : "itens"} · o que cada um gasta ou custa`}
            aoClicar={() => ir("itens")}
          />
        </div>
      )}
    </div>
  );
}
