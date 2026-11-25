// Icônes décoratives (le texte du bouton porte le sens) : traits simples, couleur du texte.
const base = { width: 36, height: 36, viewBox: '0 0 36 36', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, className: 'icone' };

export const IconePdf = () => (
  <svg {...base}>
    <path d="M9 4h12l7 7v21H9z" />
    <path d="M21 4v7h7" />
    <path d="M13 19h10M13 24h10M13 29h6" />
  </svg>
);

export const IconeCamera = () => (
  <svg {...base}>
    <path d="M5 12h5l2.5-3.5h11L26 12h5v17H5z" />
    <circle cx="18" cy="20.5" r="5" />
  </svg>
);

export const IconePhotos = () => (
  <svg {...base}>
    <rect x="9" y="5" width="22" height="22" rx="2.5" />
    <path d="M5 11v20h20" />
    <circle cx="16" cy="13" r="2.2" />
    <path d="M9 24l6-6 5 5 4-4 7 6" />
  </svg>
);

export const IconePage = () => (
  <svg {...base}>
    <path d="M8 4h20v28H8z" />
    <path d="M13 12h10M13 17h10M13 22h6" />
  </svg>
);

export const IconeDossier = () => (
  <svg {...base}>
    <path d="M4 10a2 2 0 0 1 2-2h8l3 4h13a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    <path d="M18 17v8M14 21l4 4 4-4" />
  </svg>
);
