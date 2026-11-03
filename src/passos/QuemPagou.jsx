import { Rotulo, SeletorDePessoas } from "../componentes/index.js";

/**
 * "Quem pagou", igual em toda despesa e em toda fatura: os botões das pessoas,
 * um só marcado por vez. Vem sempre logo depois do nome da despesa, porque é a
 * pergunta que decide se existe acerto.
 *
 * Ninguém marcado tem sentido próprio, que a frase embaixo diz: numa despesa,
 * cada um pagou a sua parte direto; numa fatura, ainda não se sabe.
 */
export default function QuemPagou({ pessoas, indicePorId, valor, aoMudar, semNinguem, comAlguem }) {
  return (
    <div className="grupo quem-pagou">
      <Rotulo>Quem pagou</Rotulo>
      <SeletorDePessoas
        uma
        rotulo="Quem pagou"
        pessoas={pessoas}
        indicePorId={indicePorId}
        selecionados={valor ? [valor] : []}
        aoMudar={(ids) => aoMudar(ids[0] ?? null)}
      />
      <p className="dica">{valor ? comAlguem : semNinguem}</p>
    </div>
  );
}
