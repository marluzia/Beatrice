import { Alerta, Botao, Ficha, Rotulo, Titulo } from "../componentes/index.js";
import { corDe, reais } from "../nucleo/formato.js";
import { acertoDe, mensagemDoAcerto } from "../nucleo/acerto.js";

const emReais = (centavos) => reais(centavos / 100);

/**
 * Quanto cada um paga, e para quem.
 *
 * A seção anterior diz quanto cada pessoa DEVE do fechamento. Esta diz quanto
 * ela precisa transferir, que é outra coisa e a diferença entre as duas é
 * justamente quem adiantou dinheiro por quem.
 *
 * Só entram aqui as despesas que alguém centralizou. Quando cada um pagou a
 * própria parte direto   todo mundo passando o próprio cartão  , aquela
 * despesa não gera dívida nenhuma entre o grupo, e ela aparece à parte para a
 * casa saber que não foi esquecida.
 */
export default function Acerto({ estado, resultado, indicePorId, modo, nomeDoConjunto, travado }) {
  const acerto = acertoDe(estado, resultado);

  // Travado enquanto houver centavo a ceder e ninguém tiver assumido. Mostrar
  // transferências por cima de uma conta que não fecha seria pedir um Pix de
  // um valor que ainda vai mudar.
  if (travado || acerto.precisaCeder) {
    return (
      <Ficha>
        <Titulo>Quanto cada um paga</Titulo>
        <div className="acerto-travado">
          <p className="acerto-travado__texto">
            Falta decidir quem fica com o centavo que não fecha. Escolha em{" "}
            <strong>Quem cede</strong>, na seção "Quanto cada um deve", e o acerto aparece aqui.
          </p>
          <p className="dica">
            Enquanto a moeda não tem dono, a soma do que cada um deve não bate com
            o valor devido   e um acerto sobre uma conta que não fecha manda
            alguém transferir um número errado.
          </p>
        </div>
      </Ficha>
    );
  }

  const copiar = async () => {
    const texto = mensagemDoAcerto(acerto, estado.periodo, nomeDoConjunto);
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      window.prompt("Copie a mensagem:", texto);
    }
  };

  if (acerto.saldos.length === 0) {
    return (
      <Ficha>
        <Titulo>Quanto cada um paga</Titulo>
        <p className="vazio">
          Cadastre quem divide {modo.palavras.oConjunto} para o acerto existir.
        </p>
      </Ficha>
    );
  }

  const ninguemCentralizou = acerto.totalCentralizado === 0;

  return (
    <Ficha>
      <Titulo nota="Quem adiantou dinheiro pelos outros recebe de volta. O app procura o menor número de transferências possível.">
        Quanto cada um paga
      </Titulo>

      {ninguemCentralizou ? (
        <p className="dica">
          Nenhuma despesa foi centralizada: cada um pagou a própria parte direto.
          Não há transferência a fazer entre vocês.
        </p>
      ) : (
        <>
          <div className="grupo">
            <Rotulo>Quem adiantou e quem deve</Rotulo>
            <ul className="saldos">
              {acerto.saldos.map((s) => (
                <li className="saldo" key={s.moradorId}>
                  <span
                    className="ponto"
                    style={{ background: corDe(indicePorId[s.moradorId]) }}
                  />
                  <span className="saldo__nome">{s.nome}</span>
                  <span className="saldo__conta">
                    adiantou R$ {emReais(s.pagou)} · parte dele(a) R$ {emReais(s.deve)}
                    {s.cedeu !== 0 && (
                      <>
                        {" "}
                        · cedeu {Math.abs(s.cedeu)}{" "}
                        {Math.abs(s.cedeu) === 1 ? "centavo" : "centavos"}
                      </>
                    )}
                  </span>
                  <strong
                    className={
                      s.saldo > 0
                        ? "saldo__valor saldo__valor--receber"
                        : s.saldo < 0
                          ? "saldo__valor saldo__valor--pagar"
                          : "saldo__valor"
                    }
                  >
                    {s.saldo > 0
                      ? `recebe R$ ${emReais(s.saldo)}`
                      : s.saldo < 0
                        ? `paga R$ ${emReais(-s.saldo)}`
                        : "quite"}
                  </strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="grupo">
            <Rotulo>
              {acerto.transferencias.length === 1
                ? "1 transferência"
                : `${acerto.transferencias.length} transferências`}
            </Rotulo>

            {acerto.transferencias.length === 0 ? (
              <p className="vazio">Ninguém deve ninguém neste fechamento.</p>
            ) : (
              <ul className="transferencias">
                {acerto.transferencias.map((t, i) => (
                  <li className="transferencia" key={`${t.de}-${t.para}-${i}`}>
                    <span className="transferencia__quem">{t.deNome}</span>
                    <span className="transferencia__seta" aria-hidden="true">
                      →
                    </span>
                    <span className="transferencia__quem">{t.paraNome}</span>
                    <strong className="transferencia__valor">
                      R$ {emReais(t.centavos)}
                    </strong>
                  </li>
                ))}
              </ul>
            )}

            {acerto.transferencias.length > 1 && (
              <p className="dica">
                Com {acerto.saldos.length} pessoas, o máximo necessário seriam{" "}
                {acerto.saldos.length - 1} transferências. Quem deve para um e recebe
                de outro é descontado antes.
              </p>
            )}
          </div>
        </>
      )}

      {/* O que cada um pagou direto não vira dívida, mas precisa aparecer  
          senão a casa acha que a despesa foi esquecida. */}
      {acerto.diretas.length > 0 && (
        <div className="grupo">
          <Rotulo>Pagas direto, fora do acerto</Rotulo>
          <ul className="diretas">
            {acerto.diretas.map((d) => (
              <li key={d.id}>
                <span>{d.nome}</span>
                <strong>R$ {emReais(d.centavos)}</strong>
              </li>
            ))}
          </ul>
          <p className="dica">
            Estas não têm um pagador marcado, então valem como "cada um pagou a sua
            parte direto". Elas continuam no rateio do fechamento e não geram dívida
            entre vocês. Se na verdade alguém adiantou alguma, marque quem em Contas
            ou no cartão do item.
          </p>
        </div>
      )}

      {(acerto.sobraDevendo !== 0 || acerto.sobraRecebendo !== 0) && (
        <Alerta nivel="erro">
          O acerto não fechou: sobraram R$ {emReais(acerto.sobraDevendo)} devendo e
          R$ {emReais(acerto.sobraRecebendo)} a receber. Isso é erro do programa, não
          seu   mande este caso para a gente.
        </Alerta>
      )}

      <div className="linha-acoes">
        <Botao tipo="fantasma" aoClicar={copiar}>
          Copiar mensagem do acerto
        </Botao>
      </div>

      <p className="nota">
        A CEDER não fala com banco nenhum e não move dinheiro. Ela diz quanto e para
        quem; o Pix é de vocês.
      </p>
    </Ficha>
  );
}
