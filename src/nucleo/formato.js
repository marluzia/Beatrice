
/** Texto do campo -> número. "12,50" e "12.50" valem o mesmo; lixo vira 0. */
export const num = (s) => {
  if (typeof s === "number") return Number.isFinite(s) ? s : 0;
  const v = parseFloat(String(s ?? "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

/** Número -> "1.234,56". Centavos residuais de arredondamento viram zero. */
export const reais = (v) =>
  (Math.abs(v) < 0.005 ? 0 : v).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Tarifa com 4 casas, que é a precisão impressa nas faturas. */
export const tarifa = (v) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

let contador = 0;
export const novoId = (prefixo) =>
  `${prefixo}${++contador}${Math.random().toString(36).slice(2, 6)}`;

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Cor de cada morador. A ordem na lista define a cor, e ela não muda depois. */
export const PALETA = [
  "#2E7D53", "#3D6E8C", "#B24232", "#C08A1E", "#6B5B95",
  "#1F7A7A", "#8C6A3D", "#A34F76", "#4A7C2F", "#8A4B7D",
];

export const corDe = (indice) => PALETA[(indice ?? 0) % PALETA.length];

export const nomeOu = (nome, indice) => nome?.trim() || `Pessoa ${(indice ?? 0) + 1}`;
