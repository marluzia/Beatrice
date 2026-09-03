
export default function MarcaCDR({ tamanho = 44, titulo = "República e calculadora" }) {
  return (
    <svg
      viewBox="0 0 78 64"
      height={tamanho}
      width={(tamanho * 78) / 64}
      role="img"
      aria-label={titulo}
      className="marca-cdr"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{titulo}</title>

      <g
        fill="none"
        stroke="#17201C"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {}
        <path d="M39.5 12.5c2.2-1.5.5-3.2 2.6-4.6" strokeWidth="1.5" />

        {}
        <path d="M36 14h6.5v10H36z" fill="#B24232" />

        {}
        <path d="M24 7.5V1" strokeWidth="1.5" />
        <path d="M24.4 1.4l7 2.1-7 2.6z" fill="#C08A1E" strokeWidth="1.4" />

        {}
        <path d="M1 30.2L24 7l23 22.2z" fill="#B24232" />

        {}
        <path d="M5.5 29.4h40.2V57H5.5z" fill="#FFFFFF" />

        {}
        <path d="M10 34h10.4v9.2H10z" fill="#EDEFE8" />
        <path d="M27 34h10.4v9.2H27z" fill="#EDEFE8" />

        {}
        <path d="M41 40.5c3.6.4 5.6 1.6 6.4 3.4" />
      </g>

      {}
      <circle cx="18.2" cy="39.2" r="2.1" fill="#17201C" />
      <circle cx="35.2" cy="39.2" r="2.1" fill="#17201C" />

      {}
      <path
        d="M19.5 57v-6.4a6.8 5.6 0 0 1 11.8 0V57z"
        fill="#17201C"
        stroke="#17201C"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M22.4 57v-2.8h6v2.8z" fill="#EDEFE8" />

      {}
      <g transform="rotate(-6 59 43)">
        <rect
          x="46"
          y="27"
          width="27"
          height="33"
          rx="3.5"
          fill="#2E7D53"
          stroke="#17201C"
          strokeWidth="2"
        />
        <rect
          x="49.5"
          y="30.5"
          width="20"
          height="9"
          rx="1.5"
          fill="#EDEFE8"
          stroke="#17201C"
          strokeWidth="1.4"
        />
        <text
          x="52"
          y="37.6"
          fontFamily="ui-monospace, Menlo, Consolas, monospace"
          fontSize="7"
          fontWeight="700"
          fill="#17201C"
        >
          R$
        </text>
        <g fill="#EDEFE8" stroke="#17201C" strokeWidth="1.2">
          <rect x="49.5" y="42" width="5.2" height="4.8" rx="1.2" />
          <rect x="56.4" y="42" width="5.2" height="4.8" rx="1.2" />
          <rect x="63.3" y="42" width="5.2" height="4.8" rx="1.2" />
          <rect x="49.5" y="48" width="5.2" height="4.8" rx="1.2" />
          <rect x="56.4" y="48" width="5.2" height="4.8" rx="1.2" />
          <rect x="63.3" y="48" width="5.2" height="4.8" rx="1.2" />
          <rect x="49.5" y="54" width="5.2" height="4.8" rx="1.2" />
          <rect x="56.4" y="54" width="5.2" height="4.8" rx="1.2" />
          <rect x="63.3" y="54" width="5.2" height="4.8" rx="1.2" fill="#C08A1E" />
        </g>
      </g>

      {}
      <circle cx="47" cy="44" r="3.1" fill="#FFFFFF" stroke="#17201C" strokeWidth="2" />
    </svg>
  );
}
