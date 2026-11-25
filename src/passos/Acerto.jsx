import { simboloDe } from "../nucleo/moedas.js";
import { Alerta, Ficha, Rotulo, Titulo } from "../componentes/index.js";
import { mostrarAviso } from "../componentes/Interface.jsx";
import { MESES, reais } from "../nucleo/formato.js";
import { acertoDe, mensagemDoAcerto } from "../nucleo/acerto.js";
import { chaveDaTransferencia, curta, listaEmFrase } from "../nucleo/resumo.js";

const emReais = (centavos) => reais(centavos / 100);

const POR_EXTENSO = ["Nenhum", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove", "Dez"];

async function copiarTexto(texto, aviso) {
  try {
    await navigator.clipboard.writeText(texto);
    if (aviso) mostrarAviso(aviso);
  } catch {
    window.prompt("Copie:", texto);
  }
}

/**
 * Quem transfere para quem.
 *
 * A seção anterior diz quanto cada pessoa DEVE do fechamento. Esta diz quanto
 * ela precisa transferir, que é outra coisa e a diferença entre as duas é
 * justamente quem adiantou dinheiro por quem.
 *
 * Só entram aqui as despesas que alguém centralizou. Quando cada um pagou a
 * própria parte direto   todo mundo passando o próprio cartão  , aquela
 * despesa não gera dívida nenhuma entre o grupo, e ela aparece à parte para a
 * casa saber que não foi esquecida.
 *
 * Cada transferência pode ser marcada como feita ("Já paguei"). A marca fica
 * presa ao valor: se o fechamento mudar e o Pix passar a ser outro, ela some.
 */
export default function Acerto({ estado, resultado, modo, nomeDoConjunto, travado, acoes, eu = null, ir }) {
  const acerto = acertoDe(estado, resultado);
  const pagamentos = estado.pagamentos ?? {};
  const mes = MESES[(estado.periodo?.mes ?? 1) - 1];

  // Travado enquanto houver centavo a ceder e ninguém tiver assumido. Mostrar
  // transferências por cima de uma conta que não fecha seria pedir um Pix de
  // um valor que ainda vai mudar.
  if (travado || acerto.precisaCeder) {
    return (
      <Ficha>
        <Titulo>Quem transfere para quem</Titulo>
        <div className="acerto-travado">
          <p className="acerto-travado__texto">
            Falta decidir quem fica com o centavo que não fecha. Escolha em <strong>Quem cede</strong>, na seção
            "Quanto cada um deve", e o acerto aparece aqui.
          </p>
          <p className="dica">
            Enquanto a moeda não tem dono, a soma do que cada um deve não bate com o valor devido   e um acerto sobre
            uma conta que não fecha manda alguém transferir um número errado.
          </p>
        </div>
      </Ficha>
    );
  }

  if (acerto.saldos.length === 0) {
    return (
      <Ficha>
        <Titulo>Quem transfere para quem</Titulo>
        <p className="vazio">Cadastre quem divide {modo.palavras.oConjunto} para o acerto existir.</p>
      </Ficha>
    );
  }

  const ninguemCentralizou = acerto.totalCentralizado === 0;
  const n = acerto.transferencias.length;
  const nomeComVoce = (id, nome) => (id === eu ? `${nome} (você)` : nome);

  // O que cada credor adiantou, para a frase "Bia pagou a luz e a faxina".
  const adiantou = (id) =>
    listaEmFrase(
      acerto.centralizadas
        .filter((d) => d.pagoPor === id)
        .map((d) => (d.tipo === "fatura" ? `a ${d.nome.replace(/^Conta d[aoe]s?\s*/i, "").toLowerCase()}` : d.nome.toLowerCase())),
    );

  const minhaParte = acerto.saldos.find((s) => s.moradorId === eu);

  return (
    <section className="acerto">
      <h2 className="titulo-tela titulo-tela--acerto">
        Quem transfere <em>para quem</em>
      </h2>
      <p className="texto-apoio">
        {ninguemCentralizou
          ? "Nenhuma despesa foi centralizada: cada um pagou a própria parte direto. Não há transferência a fazer."
          : n === 0
            ? `Ninguém deve ninguém em ${mes}.`
            : `${POR_EXTENSO[n] ?? n} Pix ${n === 1 ? "zera" : "zeram"} os saldos ${modo.faturas === false ? "" : `de ${mes}`}. Ninguém paga duas vezes.`}
      </p>

      {n > 0 && (
        <div className="pilha">
          {[...acerto.transferencias]
            .sort((a, b) => Number(Boolean(pagamentos[chaveDaTransferencia(a)])) - Number(Boolean(pagamentos[chaveDaTransferencia(b)])))
            .map((t) => {
            const chave = chaveDaTransferencia(t);
            const feito = pagamentos[chave];
            const texto = `${t.deNome} → ${t.paraNome}: ${simboloDe()} ${emReais(t.centavos)}`;
            if (feito) {
              return (
                <div className="pix pix--feito" key={chave}>
                  <div>
                    <strong className="pix__quem">
                      {nomeComVoce(t.de, t.deNome)} → {nomeComVoce(t.para, t.paraNome)}
                    </strong>
                    <span className="pix__confirmado">
                      ✓ confirmado {feito.em ? `em ${curta(feito.em.slice(0, 10))}` : ""}
                    </span>
                  </div>
                  <div className="pix__lado">
                    <strong className="pix__valor pix__valor--menor">{simboloDe()} {emReais(t.centavos)}</strong>
                    <button type="button" className="link-sublinhado" onClick={() => acoes?.confirmarPagamento(chave, false)}>
                      desfazer
                    </button>
                  </div>
                </div>
              );
            }
            const quais = adiantou(t.para);
            return (
              <article className="pix" key={chave}>
                <div className="pix__topo">
                  <strong className="pix__quem">
                    {nomeComVoce(t.de, t.deNome)} → {nomeComVoce(t.para, t.paraNome)}
                  </strong>
                  <strong className="pix__valor">{simboloDe()} {emReais(t.centavos)}</strong>
                </div>
                <p className="pix__nota">
                  pendente{quais ? ` · ${t.paraNome} pagou ${quais}` : ""}
                </p>
                <div className="pix__botoes">
                  <button
                    type="button"
                    className="botao"
                    onClick={() =>
                      copiarTexto(
                        `${simboloDe()} ${emReais(t.centavos)}`,
                        `Valor copiado. A chave Pix de ${t.paraNome} ainda não fica salva no app: em breve.`,
                      )
                    }
                  >
                    Copiar chave Pix
                  </button>
                  <button type="button" className="botao botao--fantasma" onClick={() => acoes?.confirmarPagamento(chave, true)}>
                    Já paguei
                  </button>
                </div>
                <span className="sr-only">{texto}</span>
              </article>
            );
          })}
        </div>
      )}

      {minhaParte && ir && (
        <button type="button" className="linha-solta linha-solta--cartao" onClick={() => ir("saldos")}>
          <strong>
            Por que {simboloDe()} {emReais(Math.abs(minhaParte.saldo))}? Ver como sua parte foi formada
          </strong>
          <span aria-hidden="true">›</span>
        </button>
      )}

      <div className="linha-dupla">
        <button
          type="button"
          className="botao botao--fantasma"
          onClick={() => copiarTexto(mensagemDoAcerto(acerto, estado.periodo, nomeDoConjunto), "Mensagem do acerto copiada.")}
        >
          Copiar mensagem
        </button>
        <button type="button" className="botao botao--fantasma" onClick={() => window.print()}>
          Exportar PDF
        </button>
      </div>

      {/* O que cada um pagou direto não vira dívida, mas precisa aparecer
          senão a casa acha que a despesa foi esquecida. */}
      {acerto.diretas.length > 0 && (
        <div className="grupo grupo--diretas">
          <Rotulo>Pagas direto, fora do acerto</Rotulo>
          <ul className="diretas">
            {acerto.diretas.map((d) => (
              <li key={d.id}>
                <span>{d.nome}</span>
                <strong>{simboloDe()} {emReais(d.centavos)}</strong>
              </li>
            ))}
          </ul>
          <p className="dica">
            Estas não têm um pagador marcado, então valem como "cada um pagou a sua parte direto". Elas continuam no
            rateio do fechamento e não geram dívida entre vocês. Se na verdade alguém adiantou alguma, marque quem em
            Contas ou no cartão do item.
          </p>
        </div>
      )}

      {(acerto.sobraDevendo !== 0 || acerto.sobraRecebendo !== 0) && (
        <Alerta nivel="erro">
          O acerto não fechou: sobraram {simboloDe()} {emReais(acerto.sobraDevendo)} devendo e {simboloDe()} {emReais(acerto.sobraRecebendo)} a
          receber. Isso é erro do programa, não seu   mande este caso para a gente.
        </Alerta>
      )}

      <p className="nota">A CEDER não fala com banco nenhum e não move dinheiro. Ela diz quanto e para quem; o Pix é de vocês.</p>
    </section>
  );
}
