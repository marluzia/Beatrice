import { Ficha, MarcaR, Pastilha, Titulo } from "../componentes/index.js";
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
 * A fileira de R embaixo é o estado da moeda, em desenho: quando a divisão
 * fecha redonda, são R simples, sem moeda nenhuma em jogo. Quando sobra ou
 * falta centavo, viram o R. sem o ponto   e o ponto acende no R da posição de
 * quem foi marcado.
 */
export default function QuemCede({ estado, resultado, indicePorId, acoes }) {
  const moradores = estado.moradores ?? [];
  if (moradores.length === 0) return null;

  const residuo = resultado.residuoDeCentavos;
  const escolhido = estado.quemCede ?? null;
  const redondo = fechouRedondo(resultado);

  const fileira = (
    <div className="cessao-fileira" role="img" aria-label={rotuloDaFileira(moradores, escolhido, redondo, indicePorId)}>
      {moradores.map((m, i) => (
        <MarcaR
          key={m.id}
          tamanho={52}
          simples={redondo}
          comPonto={!redondo && escolhido === m.id}
          titulo={nomeOu(m.nome, indicePorId[m.id] ?? i)}
          className="cessao-fileira__marca"
        />
      ))}
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
        {fileira}
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

      {/* Os nomes vêm logo depois do recado: é onde a decisão acontece. */}
      <div className="pastilhas">
        {moradores.map((m, i) => {
          const indice = indicePorId[m.id] ?? i;
          return (
            <Pastilha
              key={m.id}
              cor={corDe(indice)}
              nome={nomeOu(m.nome, indice)}
              ativo={escolhido === m.id}
              aoClicar={() => acoes.definirQuemCede(escolhido === m.id ? null : m.id)}
            />
          );
        })}
      </div>

      {fileira}

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
           Arredondando, a soma dá R$ {reais(resultado.somaCobradaArredondada)} contra os
        R$ {reais(resultado.somaDevida)} devidos: {quantos} {moeda} de{" "}
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
