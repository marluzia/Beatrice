/**
 * Um gerador de QR Code pequeno, sem dependências: modo byte, correção de
 * erro nível L (ou M, se couber), versões 1 a 40, máscara escolhida pela
 * menor penalidade. Devolve a matriz de módulos (true = escuro).
 *
 * Segue a ISO/IEC 18004; os números das tabelas são os do padrão.
 */

// Por versão (1..40): [blocos do grupo 1, dados por bloco no grupo 1, blocos do grupo 2, dados por bloco no grupo 2, códigos de correção por bloco]
const TABELA = {
  L: [
    [1, 19, 0, 0, 7], [1, 34, 0, 0, 10], [1, 55, 0, 0, 15], [1, 80, 0, 0, 20], [1, 108, 0, 0, 26],
    [2, 68, 0, 0, 18], [2, 78, 0, 0, 20], [2, 97, 0, 0, 24], [2, 116, 0, 0, 30], [2, 68, 2, 69, 18],
    [4, 81, 0, 0, 20], [2, 92, 2, 93, 24], [4, 107, 0, 0, 26], [3, 115, 1, 116, 30], [5, 87, 1, 88, 22],
    [5, 98, 1, 99, 24], [1, 107, 5, 108, 28], [5, 120, 1, 121, 30], [3, 113, 4, 114, 28], [3, 107, 5, 108, 28],
    [4, 116, 4, 117, 28], [2, 111, 7, 112, 28], [4, 121, 5, 122, 30], [6, 117, 4, 118, 30], [8, 106, 4, 107, 26],
    [10, 114, 2, 115, 28], [8, 122, 4, 123, 30], [3, 117, 10, 118, 30], [7, 116, 7, 117, 30], [5, 115, 10, 116, 30],
    [13, 115, 3, 116, 30], [17, 115, 0, 0, 30], [17, 115, 1, 116, 30], [13, 115, 6, 116, 30], [12, 121, 7, 122, 30],
    [6, 121, 14, 122, 30], [17, 122, 4, 123, 30], [4, 122, 18, 123, 30], [20, 117, 4, 118, 30], [19, 118, 6, 119, 30],
  ],
  M: [
    [1, 16, 0, 0, 10], [1, 28, 0, 0, 16], [1, 44, 0, 0, 26], [2, 32, 0, 0, 18], [2, 43, 0, 0, 24],
    [4, 27, 0, 0, 16], [4, 31, 0, 0, 18], [2, 38, 2, 39, 22], [3, 36, 2, 37, 22], [4, 43, 1, 44, 26],
    [1, 50, 4, 51, 30], [6, 36, 2, 37, 22], [8, 37, 1, 38, 22], [4, 40, 5, 41, 24], [5, 41, 5, 42, 24],
    [7, 45, 3, 46, 28], [10, 46, 1, 47, 28], [9, 43, 4, 44, 26], [3, 44, 11, 45, 26], [3, 41, 13, 42, 26],
    [17, 42, 0, 0, 26], [17, 46, 0, 0, 28], [4, 47, 14, 48, 28], [6, 45, 14, 46, 28], [8, 47, 13, 48, 28],
    [19, 46, 4, 47, 28], [22, 45, 3, 46, 28], [3, 45, 23, 46, 28], [21, 45, 7, 46, 28], [19, 47, 10, 48, 28],
    [2, 46, 29, 47, 28], [10, 46, 23, 47, 28], [14, 46, 21, 47, 28], [14, 46, 23, 47, 28], [12, 47, 26, 48, 28],
    [6, 47, 34, 48, 28], [29, 46, 14, 47, 28], [13, 46, 32, 47, 28], [40, 47, 7, 48, 28], [18, 47, 31, 48, 28],
  ],
};

const BITS_DO_NIVEL = { L: 1, M: 0 };

// ── campo de Galois GF(256), polinômio 0x11d ──
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const mult = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function geradorRS(grau) {
  let g = [1];
  for (let i = 0; i < grau; i++) {
    const novo = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      novo[j] ^= g[j];
      novo[j + 1] ^= mult(g[j], EXP[i]);
    }
    g = novo;
  }
  return g;
}

function correcaoRS(dados, grau) {
  const g = geradorRS(grau);
  const resto = new Array(grau).fill(0);
  for (const b of dados) {
    const fator = b ^ resto.shift();
    resto.push(0);
    for (let i = 0; i < grau; i++) resto[i] ^= mult(g[i + 1], fator);
  }
  return resto;
}

const capacidade = (nivel, v) => {
  const [b1, d1, b2, d2] = TABELA[nivel][v - 1];
  return b1 * d1 + b2 * d2;
};

/** Os alinhamentos de cada versão. */
function centrosDeAlinhamento(v) {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2;
  const tamanho = v * 4 + 17;
  const passo = v === 32 ? 26 : Math.ceil((tamanho - 13) / (n * 2 - 2)) * 2;
  const lista = [6];
  for (let p = tamanho - 7; lista.length < n; p -= passo) lista.splice(1, 0, p);
  return lista;
}

function bitsDeFormato(nivel, mascara) {
  const dados = (BITS_DO_NIVEL[nivel] << 3) | mascara;
  let resto = dados << 10;
  for (let i = 14; i >= 10; i--) if ((resto >> i) & 1) resto ^= 0x537 << (i - 10);
  return ((dados << 10) | resto) ^ 0x5412;
}

function bitsDeVersao(v) {
  let resto = v << 12;
  for (let i = 17; i >= 12; i--) if ((resto >> i) & 1) resto ^= 0x1f25 << (i - 12);
  return (v << 12) | resto;
}

const MASCARAS = [
  (l, c) => (l + c) % 2 === 0,
  (l) => l % 2 === 0,
  (l, c) => c % 3 === 0,
  (l, c) => (l + c) % 3 === 0,
  (l, c) => (Math.floor(l / 2) + Math.floor(c / 3)) % 2 === 0,
  (l, c) => ((l * c) % 2) + ((l * c) % 3) === 0,
  (l, c) => (((l * c) % 2) + ((l * c) % 3)) % 2 === 0,
  (l, c) => (((l + c) % 2) + ((l * c) % 3)) % 2 === 0,
];

function penalidade(m) {
  const n = m.length;
  let p = 0;
  // Regra 1: cinco ou mais iguais em sequência.
  for (let eixo = 0; eixo < 2; eixo++) {
    for (let i = 0; i < n; i++) {
      let corrida = 1;
      for (let j = 1; j < n; j++) {
        const a = eixo ? m[j][i] : m[i][j];
        const b = eixo ? m[j - 1][i] : m[i][j - 1];
        if (a === b) corrida++;
        else {
          if (corrida >= 5) p += corrida - 2;
          corrida = 1;
        }
      }
      if (corrida >= 5) p += corrida - 2;
    }
  }
  // Regra 2: blocos 2×2.
  for (let l = 0; l < n - 1; l++)
    for (let c = 0; c < n - 1; c++) if (m[l][c] === m[l][c + 1] && m[l][c] === m[l + 1][c] && m[l][c] === m[l + 1][c + 1]) p += 3;
  // Regra 3: padrões parecidos com o localizador.
  const padrao1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const padrao2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= n - 11; j++) {
      let h1 = true, h2 = true, v1 = true, v2 = true;
      for (let k = 0; k < 11; k++) {
        const h = m[i][j + k] ? 1 : 0;
        const v = m[j + k][i] ? 1 : 0;
        if (h !== padrao1[k]) h1 = false;
        if (h !== padrao2[k]) h2 = false;
        if (v !== padrao1[k]) v1 = false;
        if (v !== padrao2[k]) v2 = false;
      }
      p += 40 * (h1 + h2 + v1 + v2);
    }
  }
  // Regra 4: proporção de escuros.
  let escuros = 0;
  for (const linha of m) for (const x of linha) if (x) escuros++;
  p += Math.floor(Math.abs((escuros * 20) / (n * n) - 10)) * 10;
  return p;
}

/**
 * A matriz do QR Code para estes bytes, ou null se não couber (mais de ~2900 bytes).
 * @param {Uint8Array} bytes
 */
export function matrizDoQR(bytes, { nivelMinimo = "L", mascara: forcada = null } = {}) {
  // A menor versão em que cabe; nela, M (corrige mais) se couber, senão L.
  let versao = 0;
  let nivel = nivelMinimo;
  for (let v = 1; v <= 40 && !versao; v++) {
    const precisa = Math.ceil((4 + (v < 10 ? 8 : 16) + bytes.length * 8) / 8);
    if (precisa <= capacidade(nivelMinimo, v)) {
      versao = v;
      nivel = precisa <= capacidade("M", v) ? "M" : nivelMinimo;
    }
  }
  if (!versao) return null;

  // Os bits de dados.
  const bitsDeContagem = versao < 10 ? 8 : 16;
  const bits = [];
  const por = (valor, quantos) => {
    for (let i = quantos - 1; i >= 0; i--) bits.push((valor >> i) & 1);
  };
  por(0b0100, 4);
  por(bytes.length, bitsDeContagem);
  for (const b of bytes) por(b, 8);
  const total = capacidade(nivel, versao) * 8;
  por(0, Math.min(4, total - bits.length));
  while (bits.length % 8) bits.push(0);
  const dados = [];
  for (let i = 0; i < bits.length; i += 8) dados.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let enchimento = 0; dados.length < total / 8; enchimento ^= 1) dados.push(enchimento ? 0x11 : 0xec);

  // Blocos e correção, intercalados.
  const [b1, d1, b2, d2, ec] = TABELA[nivel][versao - 1];
  const blocos = [];
  let k = 0;
  for (let i = 0; i < b1 + b2; i++) {
    const tam = i < b1 ? d1 : d2;
    const bloco = dados.slice(k, k + tam);
    k += tam;
    blocos.push({ dados: bloco, ec: correcaoRS(bloco, ec) });
  }
  const finais = [];
  const maior = Math.max(d1, d2);
  for (let i = 0; i < maior; i++) for (const b of blocos) if (i < b.dados.length) finais.push(b.dados[i]);
  for (let i = 0; i < ec; i++) for (const b of blocos) finais.push(b.ec[i]);

  // A matriz e as partes fixas.
  const n = versao * 4 + 17;
  const m = Array.from({ length: n }, () => new Array(n).fill(false));
  const fixo = Array.from({ length: n }, () => new Array(n).fill(false));
  const pinta = (l, c, escuro) => {
    m[l][c] = escuro;
    fixo[l][c] = true;
  };

  const localizador = (l0, c0) => {
    for (let l = -1; l <= 7; l++)
      for (let c = -1; c <= 7; c++) {
        const L = l0 + l, C = c0 + c;
        if (L < 0 || C < 0 || L >= n || C >= n) continue;
        const borda = l >= 0 && l <= 6 && c >= 0 && c <= 6 && (l === 0 || l === 6 || c === 0 || c === 6);
        const miolo = l >= 2 && l <= 4 && c >= 2 && c <= 4;
        pinta(L, C, borda || miolo);
      }
  };
  localizador(0, 0);
  localizador(0, n - 7);
  localizador(n - 7, 0);

  for (let i = 8; i < n - 8; i++) {
    pinta(6, i, i % 2 === 0);
    pinta(i, 6, i % 2 === 0);
  }

  const centros = centrosDeAlinhamento(versao);
  const ultimo = centros.length - 1;
  centros.forEach((l, i) =>
    centros.forEach((c, j) => {
      // Os três cantos são dos localizadores.
      if ((i === 0 && j === 0) || (i === 0 && j === ultimo) || (i === ultimo && j === 0)) return;
      for (let dl = -2; dl <= 2; dl++)
        for (let dc = -2; dc <= 2; dc++) pinta(l + dl, c + dc, Math.max(Math.abs(dl), Math.abs(dc)) !== 1);
    }),
  );

  // Reserva as áreas de formato e versão.
  for (let i = 0; i < 9; i++) {
    if (!fixo[8][i]) pinta(8, i, false);
    if (!fixo[i][8]) pinta(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    pinta(8, n - 1 - i, false);
    pinta(n - 1 - i, 8, false);
  }
  pinta(n - 8, 8, true); // o módulo escuro
  if (versao >= 7) {
    const vb = bitsDeVersao(versao);
    for (let i = 0; i < 18; i++) {
      const bit = ((vb >> i) & 1) === 1;
      const a = Math.floor(i / 3), b = (i % 3) + n - 11;
      pinta(a, b, bit);
      pinta(b, a, bit);
    }
  }

  // Os dados, em zigue-zague de baixo para cima.
  const fluxo = [];
  for (const byte of finais) for (let i = 7; i >= 0; i--) fluxo.push((byte >> i) & 1);
  let idx = 0;
  let subindo = true;
  for (let c = n - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    for (let i = 0; i < n; i++) {
      const l = subindo ? n - 1 - i : i;
      for (let d = 0; d < 2; d++) {
        const cc = c - d;
        if (fixo[l][cc]) continue;
        m[l][cc] = idx < fluxo.length ? fluxo[idx] === 1 : false;
        idx++;
      }
    }
    subindo = !subindo;
  }

  // A máscara de menor penalidade.
  const comFormato = (base, mascara) => {
    const r = base.map((linha) => linha.slice());
    for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) if (!fixo[l][c] && MASCARAS[mascara](l, c)) r[l][c] = !r[l][c];
    const f = bitsDeFormato(nivel, mascara);
    // Cópia 1: coluna 8 (de cima) e linha 8 (da esquerda).
    for (let i = 0; i < 15; i++) {
      const bit = ((f >> i) & 1) === 1;
      if (i < 6) r[i][8] = bit;
      else if (i === 6) r[7][8] = bit;
      else if (i === 7) r[8][8] = bit;
      else if (i === 8) r[8][7] = bit;
      else r[8][14 - i] = bit;
    }
    // Cópia 2: linha 8 (da direita) e coluna 8 (de baixo).
    for (let i = 0; i < 15; i++) {
      const bit = ((f >> i) & 1) === 1;
      if (i < 8) r[8][n - 1 - i] = bit;
      else r[n - 15 + i][8] = bit;
    }
    r[n - 8][8] = true;
    return r;
  };

  let melhor = null;
  let menor = Infinity;
  for (let k2 = 0; k2 < 8; k2++) {
    if (forcada !== null && k2 !== forcada) continue;
    const r = comFormato(m, k2);
    const p = penalidade(r);
    if (p < menor) {
      menor = p;
      melhor = r;
    }
  }
  return melhor;
}

/** O QR Code de um texto como SVG (string), com margem de 4 módulos. Null se não couber. */
export function svgDoQR(texto, { escuro = "#1b1a17", claro = "#ffffff" } = {}) {
  const m = matrizDoQR(new TextEncoder().encode(texto));
  if (!m) return null;
  const n = m.length;
  const t = n + 8;
  let caminho = "";
  for (let l = 0; l < n; l++)
    for (let c = 0; c < n; c++) if (m[l][c]) caminho += `M${c + 4} ${l + 4}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="${claro}"/><path d="${caminho}" fill="${escuro}"/></svg>`;
}
