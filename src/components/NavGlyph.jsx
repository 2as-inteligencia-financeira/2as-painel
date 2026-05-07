/** Ícones de navegação (24×24, traço) — `currentColor` herda do botão ativo/inativo. */
export default function NavGlyph({ routeId, size = 17 }) {
  const s = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (routeId) {
    case "home":
      return (
        <svg {...s}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
        </svg>
      );
    case "sistema-luniq":
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="2" />
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
        </svg>
      );
    case "conexoes-financeiras":
      return (
        <svg {...s}>
          <path d="M8.5 7.5 6 5a3 3 0 0 0-4.2 4.2l3 3a3 3 0 0 0 4.2 0" />
          <path d="m15.5 16.5 2.5 2.5a3 3 0 0 0 4.2-4.2l-3-3a3 3 0 0 0-4.2 0" />
          <path d="M8 16 16 8" />
        </svg>
      );
    case "fluxo-projetado":
      return (
        <svg {...s}>
          <path d="M4 19h16" />
          <path d="m4 15 4-4 4 3 5-6 3 3" />
          <circle cx="4" cy="15" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="8" cy="11" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="14" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="17" cy="8" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="20" cy="11" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "fluxo-projetado-labs":
      return (
        <svg {...s}>
          <path d="M4 17h11" />
          <path d="m4 14 3-2 3 2 4-5 3 2" />
          <path d="M17 8v9l2 2 2-2V8" />
          <path d="M17 11h4" />
        </svg>
      );
    case "fluxo-historico":
      return (
        <svg {...s}>
          <path d="M5 12h14" />
          <path d="M5 8h10M5 16h14" />
          <path d="M7 6v4M11 14v4M15 10v4M19 6v4" />
        </svg>
      );
    case "orcamento":
      return (
        <svg {...s}>
          <rect x="4" y="4" width="7" height="7" rx="1" />
          <rect x="13" y="4" width="7" height="7" rx="1" />
          <rect x="4" y="13" width="7" height="7" rx="1" />
          <rect x="13" y="13" width="7" height="7" rx="1" />
        </svg>
      );
    case "dre":
      return (
        <svg {...s}>
          <path d="M6 4v16M6 18h14" />
          <path d="M9 14l3-4 3 2 4-6" />
        </svg>
      );
    case "ciclo-financeiro":
      return (
        <svg {...s}>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      );
    case "contas-pagar":
      return (
        <svg {...s}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case "contas-pagar-labs":
      return (
        <svg {...s}>
          <ellipse cx="12" cy="9" rx="7" ry="3" />
          <path d="M5 9v6c0 1.7 3 3 7 3s7-1.3 7-3V9" />
          <path d="M12 12v5" />
        </svg>
      );
    case "contas-pagas":
      return (
        <svg {...s}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "contas-pagas-labs":
      return (
        <svg {...s}>
          <rect x="4" y="6" width="10" height="12" rx="1" />
          <rect x="11" y="4" width="9" height="9" rx="1" />
          <path d="M14 14h4M14 17h3" />
        </svg>
      );
    case "op-cancelamentos":
      return (
        <svg {...s}>
          <path d="M8 5h11l-1 12H6L5 5h3" />
          <path d="M10 9v6M14 9v6" />
          <path d="M4 5h6" />
        </svg>
      );
    case "op-chargebacks":
      return (
        <svg {...s}>
          <path d="M13 2 4 14h6l-1 8 11-12h-6l1-8z" />
        </svg>
      );
    case "relatorio":
      return (
        <svg {...s}>
          <path d="M7 3h8l3 3v15H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M14 3v4h4M8 12h8M8 16h6" />
        </svg>
      );
    default:
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );
  }
}
