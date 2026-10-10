import { useEffect, useState } from "react";
import { diaISO, partesDoDia } from "../nucleo/calendario.js";

const soDigitos = (texto) => texto.replace(/\D/g, "");

const limpar = (texto) =>
  String(texto ?? "")
    .replace(/[^\d/\s.-]/g, "")
    .replace(/[\s.-]+/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");

const doisDigitos = (v) => (v.length === 1 ? `0${v}` : v);

function normalizarGrupo(valor, maximo) {
  const maiorPrimeiro = Math.floor(maximo / 10);

  if (valor.length === 1) {
    return Number(valor) > maiorPrimeiro
      ? { valor: `0${valor}`, completo: true }
      : { valor, completo: false };
  }

  const n = Number(valor);
  if (n < 1 || n > maximo) return { valor: valor.slice(0, -1), recusado: true };
  return { valor, completo: true };
}

function separar(limpo) {
  const grupos = ["", "", ""];
  let atual = 0;

  const empurrar = (indice, digito, maximo) => {
    const g = normalizarGrupo(grupos[indice] + digito, maximo);
    if (g.recusado) return;
    grupos[indice] = g.valor;
    if (g.completo) atual = indice + 1;
  };

  for (const c of limpo) {
    if (c === "/") {
      if (atual < 2 && grupos[atual] !== "") atual += 1;
      continue;
    }
    if (atual === 0) empurrar(0, c, 31);
    else if (atual === 1) empurrar(1, c, 12);
    else {
      if (grupos[2] === "" && !"12".includes(c)) continue;
      if (grupos[2].length < 4) grupos[2] += c;
    }
  }

  return grupos;
}

export function comMascara(bruto) {
  const limpo = limpar(bruto);
  const [dia, mes, ano] = separar(limpo);
  const terminaEmBarra = limpo.endsWith("/");

  if (dia === "") return "";
  if (mes === "") return terminaEmBarra ? `${doisDigitos(dia)}/` : dia;
  if (ano === "") {
    return terminaEmBarra
      ? `${doisDigitos(dia)}/${doisDigitos(mes)}/`
      : `${doisDigitos(dia)}/${mes}`;
  }
  return `${doisDigitos(dia)}/${doisDigitos(mes)}/${ano}`;
}

export function paraISO(texto) {
  const limpo = limpar(texto);
  let dia;
  let mes;
  let ano;

  if (limpo.includes("/")) {
    const partes = limpo.split("/");
    if (partes.length !== 3 || partes.some((p) => p === "")) return null;
    [dia, mes, ano] = partes;
  } else {
    if (limpo.length !== 8) return null;
    [dia, mes, ano] = [limpo.slice(0, 2), limpo.slice(2, 4), limpo.slice(4)];
  }

  if (dia.length > 2 || mes.length > 2 || ano.length !== 4) return null;

  const iso = diaISO(Number(ano), Number(mes), Number(dia));
  return partesDoDia(iso) ? iso : null;
}

const paraBR = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

export default function CampoData({ valor, aoMudar, aoInvalidar, rotulo, etiqueta }) {
  const [texto, setTexto] = useState(() => paraBR(valor));

  useEffect(() => {
    const atual = paraISO(texto);
    if (atual === valor) return;
    if (!valor && atual === null) return;
    setTexto(paraBR(valor));
  }, [valor]);

  const invalido = soDigitos(texto).length >= 8 && paraISO(texto) === null;

  const digitar = (bruto) => {
    const visto = comMascara(bruto);
    setTexto(visto);
    aoMudar(paraISO(visto));
    aoInvalidar?.(soDigitos(visto).length >= 8 && paraISO(visto) === null);
  };

  return (
    <label className="campo-data">
      {rotulo && <span className="rotulo rotulo-solto">{rotulo}</span>}
      <input
        type="text"
        className={`caixa caixa--data ${invalido ? "caixa--erro" : ""}`}
        value={texto}
        onChange={(e) => digitar(e.target.value)}
        placeholder="dd/mm/aaaa"
        inputMode="numeric"
        autoComplete="off"
        aria-label={etiqueta}
        aria-invalid={invalido || undefined}
      />
    </label>
  );
}
