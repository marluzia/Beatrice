import { useEffect, useMemo, useState } from "react";
import Icone from "../componentes/Icone.jsx";
import { mostrarAviso } from "../componentes/Interface.jsx";
import { mensagemDoAcerto } from "../nucleo/acerto.js";
import { linkDoConjunto } from "../nucleo/compartilhar/link.js";
import { matrizDoQR } from "../nucleo/compartilhar/qr.js";

/** O QR Code como SVG desenhado aqui mesmo (cada módulo escuro é um quadradinho). */
function QRCode({ texto, rotulo }) {
  const matriz = useMemo(() => (texto ? matrizDoQR(new TextEncoder().encode(texto)) : null), [texto]);
  if (!matriz) return null;
  const n = matriz.length;
  const t = n + 8;
  let d = "";
  for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) if (matriz[l][c]) d += `M${c + 4} ${l + 4}h1v1h-1z`;
  return (
    <svg className="qr" viewBox={`0 0 ${t} ${t}`} shapeRendering="crispEdges" role="img" aria-label={rotulo}>
      <rect width={t} height={t} fill="#fff" />
      <path d={d} fill="#1b1a17" />
    </svg>
  );
}

async function copiar(texto, aviso) {
  try {
    await navigator.clipboard.writeText(texto);
    mostrarAviso(aviso);
  } catch {
    window.prompt("Copie:", texto);
  }
}

/**
 * Compartilhar o conjunto: um link (que leva uma cópia do conjunto) ou o QR
 * Code desse link, para abrir com a câmera de outro celular.
 */
export default function FolhaDeCompartilhar({ app, aoFechar, inicial = "link" }) {
  const { acoes, idDoConjunto, nomeDoConjunto, resumo, estado } = app;
  const [forma, setForma] = useState(inicial);
  const [link, setLink] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    const texto = acoes.exportar(idDoConjunto);
    if (!texto) {
      setErro(true);
      return undefined;
    }
    linkDoConjunto(texto)
      .then((l) => vivo && setLink(l))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [acoes, idDoConjunto]);

  const cabeNoQR = link ? matrizDoQR(new TextEncoder().encode(link)) !== null : true;
  const acerto = resumo?.acerto && !resumo.acerto.precisaCeder && resumo.transferencias?.length > 0 ? resumo.acerto : null;

  const enviar = async () => {
    try {
      if (navigator.share) await navigator.share({ title: nomeDoConjunto, url: link });
      else await copiar(link, "Link copiado.");
    } catch {
      /* quem cancela o compartilhamento não precisa de aviso */
    }
  };

  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <section
        className="folha folha--compartilhar"
        role="dialog"
        aria-modal="true"
        aria-label="Compartilhar conjunto"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="folha__alca" aria-hidden="true" />
        <h2 className="titulo-tela">
          Compartilhar <em>conjunto</em>
        </h2>

        <div className="alternador-ilustrado alternador-ilustrado--icones" role="tablist" aria-label="Como compartilhar">
          {[
            { valor: "link", nome: "Link", icone: "link" },
            { valor: "qr", nome: "QR Code", icone: "qr" },
          ].map((o) => (
            <button
              key={o.valor}
              type="button"
              role="tab"
              aria-selected={forma === o.valor}
              className={`opcao-pessoa ${forma === o.valor ? "opcao-pessoa--ativa" : ""}`}
              onClick={() => setForma(o.valor)}
            >
              <Icone nome={o.icone} tamanho={24} />
              <span>{o.nome}</span>
            </button>
          ))}
        </div>

        {erro ? (
          <p className="vazio-suave">Não consegui gerar o link deste conjunto.</p>
        ) : !link ? (
          <p className="vazio-suave">Gerando o link…</p>
        ) : forma === "link" ? (
          <>
            <div className="link-gerado">
              <Icone nome="link" tamanho={18} />
              <span className="link-gerado__texto">{link}</span>
            </div>
            <div className="dupla-botoes">
              <button type="button" className="botao botao--fantasma" onClick={() => copiar(link, "Link copiado.")}>
                Copiar link
              </button>
              <button type="button" className="botao" onClick={enviar}>
                Enviar
              </button>
            </div>
          </>
        ) : cabeNoQR ? (
          <div className="qr-moldura">
            <QRCode texto={link} rotulo={`QR Code de ${nomeDoConjunto}`} />
            <span className="qr-moldura__nome">{nomeDoConjunto}</span>
            <span className="ajuda-campo">Aponte a câmera de outro celular para abrir.</span>
          </div>
        ) : (
          <p className="vazio-suave">
            {nomeDoConjunto} tem dados demais para caber num QR Code. Envie pelo link: ele leva o conjunto inteiro.
          </p>
        )}

        <p className="nota-tipo">
          O link leva uma cópia de {nomeDoConjunto} como está agora, com {estado.moradores.length}{" "}
          {estado.moradores.length === 1 ? "pessoa" : "pessoas"}. Quem abrir recebe a cópia no aparelho dele e escolhe
          quem é; as mudanças de um lado ainda não aparecem do outro.
        </p>

        {acerto && (
          <button
            type="button"
            className="linha-solta"
            onClick={() => copiar(mensagemDoAcerto(acerto, estado.periodo, nomeDoConjunto), "Mensagem do acerto copiada.")}
          >
            <span>
              <strong>Copiar a mensagem do acerto</strong>
              <span>Quem transfere para quem, para colar no grupo</span>
            </span>
            <Icone nome="copiar" tamanho={18} />
          </button>
        )}
      </section>
    </div>
  );
}
