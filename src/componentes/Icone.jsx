/**
 * Os ícones de traço do app, desenhados num quadro de 24×24 com a cor do
 * texto. Um nome, um desenho: `<Icone nome="sino" />`.
 */
const DESENHOS = {
  casa: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  conjuntos: (
    <>
      <circle cx="9" cy="9.5" r="4.6" />
      <circle cx="15" cy="9.5" r="4.6" />
      <circle cx="12" cy="14.5" r="4.6" />
    </>
  ),
  atividade: (
    <>
      <path d="M11 4.2A8 8 0 1 0 19.8 13H11z" />
      <path d="M14 3.2V10h6.8A7 7 0 0 0 14 3.2z" />
    </>
  ),
  mais: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  atualizar: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </>
  ),
  busca: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  sino: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  voltar: <path d="M15 5l-7 7 7 7" />,
  seta: <path d="M9 5l7 7-7 7" />,
  baixo: <path d="M6 9l6 6 6-6" />,
  enviar: <path d="M20 4 3.5 10.6l6.8 2.9L13.2 20.4z M10.3 13.5 20 4" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.6v.4" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  lapis: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
    </>
  ),
  receber: (
    <>
      <path d="M12 4v10M8 10l4 4 4-4" />
      <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2v2h-2zM18 14h2M14 18v2M17.5 17.5h2.5v2.5" />
    </>
  ),
  escanear: (
    <>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M8 10h8M8 14h5" />
    </>
  ),
  raio: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  gota: <path d="M12 3.5c3.5 4.4 6 7.7 6 10.6a6 6 0 0 1-12 0c0-2.9 2.5-6.2 6-10.6z" />,
  sacola: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </>
  ),
  calendario: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  documento: (
    <>
      <path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z" />
      <path d="M14 3.5V8h4M9 12h6M9 15.5h6" />
    </>
  ),
  registro: (
    <>
      <rect x="4.5" y="4" width="15" height="16" rx="2.5" />
      <circle cx="12" cy="13" r="4" />
      <path d="M12 13l1.6-1.6M8 7h.01" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
  contato: (
    <>
      <circle cx="10" cy="8.5" r="3.5" />
      <path d="M3.5 19.5a6.5 6.5 0 0 1 13 0M18.5 7v6M15.5 10h6" />
    </>
  ),
  convidado: (
    <>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0M10 4.2c.6-.8 3.4-.8 4 0" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  pontos: (
    <>
      <circle cx="12" cy="5.5" r="1.1" />
      <circle cx="12" cy="12" r="1.1" />
      <circle cx="12" cy="18.5" r="1.1" />
    </>
  ),
  saldos: <path d="M5 12h14M12 5v7M8 19h8" />,
  trocar: <path d="M5 8.5h13l-3.5-3.5M19 15.5H6l3.5 3.5" />,
  copiar: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  lixo: <path d="M5 7h14M10 4h4M7 7l1 13h8l1-13M10.5 11v5M13.5 11v5" />,
  arquivo: (
    <>
      <path d="M4 7.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9.5a2 2 0 0 0-2-2h-6l-2-3H6a2 2 0 0 0-2 2z" />
    </>
  ),
  baixar: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />,
  subir: <path d="M12 20V9M7.5 13.5 12 9l4.5 4.5M5 4h14" />,
  lista: <path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" />,
  nota: (
    <>
      <path d="M5 4.5h14v10l-5 5H5z" />
      <path d="M14 19.5v-5h5" />
    </>
  ),
  pessoa: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  ciclo: (
    <>
      <path d="M19 12a7 7 0 0 1-12.2 4.7M5 12a7 7 0 0 1 12.2-4.7" />
      <path d="M17.5 3.5v4h-4M6.5 20.5v-4h4" />
    </>
  ),
};

export default function Icone({ nome, tamanho = 22, espessura = 1.8, className = "", titulo }) {
  const desenho = DESENHOS[nome];
  if (!desenho) return null;
  const cheio = nome === "pontos";
  return (
    <svg
      className={`icone ${className}`}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill={cheio ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={espessura}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={titulo ? undefined : "true"}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
    >
      {desenho}
    </svg>
  );
}
