import { simboloDe } from "../nucleo/moedas.js";
import { Ficha, MarcaR, Titulo } from "../componentes/index.js";
import { corDe, nomeOu, reais } from "../nucleo/formato.js";
import { fechouRedondo } from "../nucleo/cessao.js";

/**
 * Quem fica com o centavo que a divisão não fecha.
 *
 * Vem ANTES de "quanto cada um deve", porque a escolha muda o número que
 * aquele painel mostra, e antes de "quanto cada um paga", que fica travado até
 * alguém assumir o centavo.
 *
 * **Não existe padrão.** Enquanto ninguém escolhe, o centavo não tem dono e a
 * conta fica declaradamente em aberto. Um padrão   "fica com quem mais deve"  
 * seria a calculadora tomando a única decisão que o produto inteiro existe
 * para devolver à casa.
 *
 * Cada pessoa é uma caixa com o nome e o R simples. Só a caixa de quem cede
 * troca para o R. (o R com o ponto, que é a moeda): o desenho diz com quem a
 * moeda ficou, sem transformar todos os R em R. sem ponto.
 */
export default function QuemCede({ estado, resultado, indicePorId, acoes }) {
  const moradores = estado.moradores ?? [];
  if (moradores.length === 0) return null;

  const residuo = resultado.residuoDeCentavos;
  const escolhido = estado.quemCede ?? null;
  const redondo = fechouRedondo(resultado);

  /** As caixas de cada pessoa. Clicáveis só quando há moeda para assumir. */
  const caixas = (
    <div className="cedentes" role="group" aria-label={rotuloDaFileira(moradores, escolhido, redondo, indicePorId)}>
      {moradores.map((m, i) => {
        const indice = indicePorId[m.id] ?? i;
        const cede = !redondo && escolhido === m.id;
        const nome = nomeOu(m.nome, indice);
        return (
          <button
            type="button"
            key={m.id}
            className={`cedente ${cede ? "cedente--escolhido" : ""}`}
            aria-pressed={cede}
            disabled={redondo}
            style={{ "--cor-da-pessoa": corDe(indice) }}
            onClick={() => acoes.definirQuemCede(cede ? null : m.id)}
          >
            <MarcaR tamanho={34} simples={!cede} comPonto={cede} titulo={cede ? `${nome} cede` : nome} className="cedente__marca" />
            <span className="cedente__nome">{nome}</span>
          </button>
        );
      })}
    </div>
  );

  // O sistema monetário cedeu: a divisão fechou redonda e não há moeda
  // sobrando para ninguém assumir.
  if (redondo) {
    return (
      <Ficha>
        <Titulo>Quem cede</Titulo>
        <p className="cessao-vitoria">Fizemos o sistema ceder ;)</p>
        <p className="dica">
          Juntos dividimos justo.
        </p>
        {caixas}
      </Ficha>
    );
  }

  const quantos = Math.abs(residuo);
  const moeda = quantos === 1 ? "centavo" : "centavos";
  const falta = residuo > 0;

  return (
    <Ficha>
      <Titulo nota="">
        Quem cede
      </Titulo>
    <p className="cessao-vitoria">Alguém vai ter que ceder :(</p>
      {/* O recado do arredondamento, junto da decisão que ele pede. */}
      <p className="dica">
       
      </p>

      {/* As caixas vêm logo depois do recado: é onde a decisão acontece. */}
      {caixas}

      {escolhido ? (
        <p className="dica">
          {nomeOu(
            moradores.find((m) => m.id === escolhido)?.nome,
            indicePorId[escolhido] ?? 0,
          )}{" "}
          {falta ? "paga" : "deixa de pagar"} {quantos} {moeda} a{" "}
          {falta ? "mais" : "menos"}.
        </p>
      ) : (
        <p className="dica dica--alerta">
           Arredondando, a soma dá {simboloDe()} {reais(resultado.somaCobradaArredondada)} contra os
        {simboloDe()} {reais(resultado.somaDevida)} devidos: {quantos} {moeda} de{" "}
        {falta ? "menos" : "sobra"}. Fiz meu melhor, mas esse sistema monetário não
        cedeu para mim. Passo a moeda para vocês...Enquanto ninguém assumir a moeda, a conta não ajusta. Não há escolha automática, ela deve ser humana.
        </p>
      )}
    </Ficha>
  );
}

/** O que a fileira de R está dizendo, para quem não vê a tela. */
function rotuloDaFileira(moradores, escolhido, redondo, indicePorId) {
  if (redondo) return "A divisão fechou redonda: nenhuma moeda em jogo.";
  if (!escolhido) return "Nenhuma moeda assumida ainda.";

  const i = moradores.findIndex((m) => m.id === escolhido);
  return `A moeda está com ${nomeOu(moradores[i]?.nome, indicePorId[escolhido] ?? i)}.`;
}
