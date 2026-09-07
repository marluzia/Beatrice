export default function MarcaCeder({ tamanho = 44, titulo = "Ceder" }) {
  return (
    <svg
      viewBox="0 0 68 72"
      height={tamanho}
      width={(tamanho * 68) / 72}
      role="img"
      aria-label={titulo}
      className="marca-ceder"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{titulo}</title>

      <g stroke="#17201C" strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M50 12h7v14h-7z" fill="#E1502A" />
        <path d="M4 30 34 5l30 25z" fill="#E1502A" />
        <path d="M11 30h46v34a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4z" fill="#F6F3E9" />
      </g>

      <g fill="#17201C">
        <rect x="22" y="36" width="5" height="8" rx="2.5" />
        <rect x="41" y="36" width="5" height="8" rx="2.5" />
      </g>
      <path
        d="M27 48c2.6 3 9.4 3 12 0"
        fill="none"
        stroke="#17201C"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <g fill="#2E5540">
        <rect x="17" y="54" width="10" height="6" rx="2" />
        <rect x="30" y="54" width="10" height="6" rx="2" />
        <rect x="17" y="62" width="10" height="6" rx="2" />
        <rect x="30" y="62" width="10" height="6" rx="2" />
      </g>
      <rect x="43" y="54" width="10" height="14" rx="2" fill="#F5A300" />
    </svg>
  );
}
