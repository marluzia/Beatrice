/**
 * As marcas da CEDER, vetorizadas a partir dos arquivos de identidade.
 *
 * São duas, e a diferença entre elas carrega sentido:
 *
 *   R.  (`logo_R_vetor`)        o R com o ponto. O ponto é a moeda.
 *   R   (`logo_R_simples_vetor`) o R sozinho, sem moeda nenhuma em jogo.
 *
 * No `QuemCede` isso vira interface: quando a divisão fecha redonda, a fileira
 * é de R simples   não há moeda para ninguém assumir. Quando sobra ou falta
 * centavo, a fileira passa para o R. sem o ponto, e o ponto acende só no R de
 * quem a casa escolheu. A caixa do desenho não muda quando o ponto some, para
 * os R ficarem alinhados e o ponto aparecer no lugar dele, e não empurrando
 * tudo de lado.
 */

const R_PONTO = {
  largura: 191,
  altura: 187,
  ponto: "M 155 136 L 150 138 L 147 142 L 146 149 L 147 152 L 152 157 L 159 158 L 162 157 L 167 153 L 168 151 L 168 142 L 163 137 Z",
  corpo: "M 49 36 L 48 38 L 48 55 L 52 61 L 52 63 L 55 66 L 56 69 L 59 72 L 64 81 L 64 83 L 60 86 L 49 86 L 48 88 L 48 154 L 49 156 L 54 157 L 55 156 L 68 156 L 69 155 L 69 147 L 70 146 L 69 112 L 70 111 L 70 108 L 73 106 L 78 106 L 83 111 L 94 130 L 100 138 L 102 143 L 105 146 L 109 154 L 113 156 L 133 156 L 134 155 L 133 151 L 126 142 L 125 138 L 122 135 L 118 127 L 112 119 L 110 114 L 105 108 L 106 104 L 108 102 L 114 100 L 122 93 L 125 89 L 129 79 L 129 63 L 123 50 L 117 44 L 114 42 L 110 41 L 108 39 L 101 38 L 92 35 L 51 35 Z M 75 58 L 78 56 L 93 56 L 102 59 L 108 67 L 108 75 L 105 80 L 100 84 L 97 85 L 92 85 L 90 84 L 84 76 L 84 74 L 81 71 L 79 66 L 76 63 Z",
};

const R_SIMPLES = {
  largura: 211,
  altura: 227,
  corpo: "M 13 18 L 12 20 L 12 174 L 13 176 L 34 176 L 36 175 L 37 173 L 37 111 L 40 109 L 58 109 L 61 112 L 67 124 L 67 126 L 70 130 L 70 132 L 73 137 L 73 139 L 77 146 L 77 148 L 80 152 L 80 154 L 83 159 L 83 161 L 86 165 L 86 167 L 90 175 L 92 176 L 116 176 L 117 172 L 114 169 L 113 164 L 111 162 L 111 160 L 105 149 L 105 147 L 103 143 L 101 141 L 101 138 L 98 133 L 98 131 L 96 129 L 94 125 L 94 123 L 87 109 L 87 106 L 90 103 L 92 103 L 96 100 L 99 99 L 102 96 L 103 96 L 105 93 L 107 92 L 107 91 L 110 88 L 111 84 L 114 80 L 114 77 L 115 76 L 115 73 L 116 72 L 116 55 L 114 51 L 114 47 L 111 43 L 111 41 L 108 38 L 106 34 L 105 34 L 103 32 L 103 31 L 102 31 L 97 27 L 94 26 L 92 24 L 87 23 L 81 20 L 76 20 L 75 19 L 71 19 L 70 18 Z M 37 45 L 39 43 L 41 43 L 42 42 L 65 42 L 66 43 L 71 43 L 72 44 L 80 46 L 82 48 L 83 48 L 89 54 L 92 64 L 91 65 L 91 68 L 90 69 L 89 73 L 80 81 L 78 82 L 75 82 L 71 84 L 57 84 L 56 85 L 51 85 L 50 84 L 48 85 L 47 84 L 38 84 L 37 83 Z",
};

export default function MarcaR({
  tamanho = 44,
  titulo = "CEDER",
  comPonto = true,
  simples = false,
  cor = "currentColor",
  className = "marca-r",
}) {
  // O R simples não tem ponto para acender: ele é a marca sem moeda.
  const marca = simples ? R_SIMPLES : R_PONTO;
  const mostraPonto = !simples && comPonto;

  return (
    <svg
      viewBox={`0 0 ${marca.largura} ${marca.altura}`}
      height={tamanho}
      width={(tamanho * marca.largura) / marca.altura}
      role="img"
      aria-label={titulo}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{titulo}</title>
      <path d={marca.corpo} fill={cor} fillRule="evenodd" />
      {mostraPonto && <path d={R_PONTO.ponto} fill={cor} />}
    </svg>
  );
}
