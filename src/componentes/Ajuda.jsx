/**
 * Explicação que fica fora do caminho até alguém precisar dela.
 *
 * O CDR tem regras que não são óbvias — por dias contra por presença, teto das
 * faturas, o centavo que some no arredondamento. Escrever tudo isso na tela
 * assusta; esconder tudo faz a pessoa desconfiar da conta. Um painel fechado
 * por padrão, com título que já diz do que se trata, resolve os dois.
 *
 * Usa <details>, então funciona sem JavaScript, abre com teclado e o leitor de
 * tela anuncia se está aberto ou fechado sem precisar de ARIA.
 */
export default function Ajuda({ titulo, children, aberto = false }) {
  return (
    <details className="ajuda" open={aberto}>
      <summary className="ajuda__titulo">{titulo}</summary>
      <div className="ajuda__corpo">{children}</div>
    </details>
  );
}
