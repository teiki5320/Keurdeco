/**
 * Icônes (traits simples, 24 × 24, couleur du texte) et logo Keur Déco.
 * Les icônes par type d'objet remplacent la photo d'un produit tant que la
 * synchronisation Amazon n'a pas fourni d'image officielle.
 */

const TRACES = {
  // Types d'objets
  coussin: '<path d="M4 6c3 1 13 1 16 0-1 4-1 8 0 12-3-1-13-1-16 0 1-4 1-8 0-12Z"/><path d="M8 10l2 2-2 2m8-4-2 2 2 2"/>',
  panier: '<path d="M4 10h16l-2 10H6L4 10Z"/><path d="M8 10a4 5 0 0 1 8 0"/><path d="M6 14h12M7 17h10"/>',
  tapis: '<rect x="5" y="4" width="14" height="16" rx="1"/><path d="M5 2v2m4-2v2m4-2v2m4-2v2M5 20v2m4-2v2m4-2v2m4-2v2"/><path d="m9 12 3-4 3 4-3 4-3-4Z"/>',
  vase: '<path d="M9 3h6M10 3v3c-3 2-4 5-4 8 0 4 3 7 6 7s6-3 6-7c0-3-1-6-4-8V3"/><path d="M7 13h10"/>',
  luminaire: '<path d="M12 2v5M7 15l2-8h6l2 8H7Z"/><path d="M10 15v2a2 2 0 0 0 4 0v-2"/>',
  tabouret: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M6 7l1 13m11-13-1 13M9 8l1 8h4l1-8M7 20h10"/>',
  miroir: '<circle cx="12" cy="11" r="6"/><path d="M12 2v1m0 16v1m-9-9h1m16 0h1M5.6 4.6l.7.7m11.4 11.4.7.7m0-12.8-.7.7M6.3 16.3l-.7.7"/><path d="M10 9l3-1"/>',
  plaid: '<path d="M4 5h16v10H4z"/><path d="M4 15l2 4 2-4 2 4 2-4 2 4 2-4 2 4 2-4"/><path d="M4 9h16"/>',
  nappe: '<path d="M3 8h18l-2 9H5L3 8Z"/><path d="M7 8v9m5-9v9m5-9v9M4 12h16"/>',
  vaisselle: '<ellipse cx="12" cy="13" rx="9" ry="4"/><ellipse cx="12" cy="13" rx="5" ry="2"/><path d="M3 13c0 3 4 6 9 6s9-3 9-6"/>',
  rideau: '<path d="M3 3h18"/><path d="M5 3c0 6 2 12 4 18H5M19 3c0 6-2 12-4 18h4"/><path d="M12 3v18"/>',
  cadre: '<rect x="4" y="3" width="16" height="18" rx="1"/><rect x="7" y="6" width="10" height="12"/><path d="m7 16 3-4 2 3 2-2 3 3"/>',
  'assiette-murale': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.9 2.9m7 7 2.9 2.9m0-12.8-2.9 2.9m-7 7-2.9 2.9"/>',
  pouf: '<path d="M4 10c0-2 4-3 8-3s8 1 8 3v6c0 2-4 3-8 3s-8-1-8-3v-6Z"/><path d="M4 10c0 2 4 3 8 3s8-1 8-3M8 12v6m8-6v6"/>',
  'linge-de-lit': '<path d="M3 18V8m18 10v-6H3"/><rect x="5" y="9" width="5" height="3" rx="1"/><path d="M3 18h18"/>',
  statuette: '<circle cx="12" cy="5" r="2.5"/><path d="M10 8h4l1 7h-2l-1 5-1-5H9l1-7ZM8 21h8"/>',
  bougie: '<path d="M9 10h6v11H9z"/><path d="M12 10V8m0-5c-1.5 2-1.5 3 0 4 1.5-1 1.5-2 0-4Z"/>',
  rangement: '<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M3 12h18M10 15h4M7 7V4h10v3"/>',
  bijou: '<path d="M5 4c0 7 3 11 7 11s7-4 7-11"/><circle cx="12" cy="18" r="3"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/>',
  textile: '<path d="M5 4h14v16H5z"/><path d="m5 8 4 4-4 4m14-8-4 4 4 4M9 4l3 3 3-3M9 20l3-3 3 3"/>',
  objet: '<path d="M12 3 3 8v8l9 5 9-5V8l-9-5Z"/><path d="m3 8 9 5 9-5m-9 5v8"/>',
  // Interface
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  fleche: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  epingle: '<path d="M12 2a7 7 0 0 0-2.6 13.5c-.1-.8-.2-2 0-2.9l1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.7-.3 1.1.5 2 1.6 2 1.9 0 3.4-2 3.4-5 0-2.6-1.9-4.4-4.5-4.4-3.1 0-4.9 2.3-4.9 4.7 0 .9.4 1.9.8 2.5a.3.3 0 0 1 .1.3l-.3 1.2c0 .2-.2.3-.4.2-1.4-.7-2.2-2.7-2.2-4.3 0-3.5 2.5-6.7 7.3-6.7 3.8 0 6.8 2.7 6.8 6.4 0 3.8-2.4 6.9-5.8 6.9-1.1 0-2.2-.6-2.6-1.3l-.7 2.7c-.3 1-1 2.2-1.4 2.9A7 7 0 1 0 12 2Z" fill="currentColor" stroke="none"/>',
  ia: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2m0-12-2 2m-8 8-2 2"/><circle cx="12" cy="12" r="3"/>',
  externe: '<path d="M14 4h6v6m0-6-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  livre: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
  classement: '<path d="M8 21V11H4v10m8 0V4H8v17m8 0v-7h-4v7h8"/>',
  maison: '<path d="M3 11 12 3l9 8"/><path d="M5 9v12h14V9"/><path d="M10 21v-6h4v6"/>',
} as const;

export type NomIcone = keyof typeof TRACES;

export function estIcone(nom: string): nom is NomIcone {
  return Object.hasOwn(TRACES, nom);
}

export function icone(nom: NomIcone, classe = 'icone'): string {
  return `<svg class="${classe}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${TRACES[nom]}</svg>`;
}

/** Icône d'un type d'objet (coussin, panier…) ; icône générique si le type n'a pas la sienne. */
export function iconeObjet(typeObjet: string): string {
  const cle = typeObjet.toLowerCase().replace(/\s+/g, '-');
  return icone(estIcone(cle) ? cle : 'objet', 'icone icone--objet');
}

/**
 * Marque Keur Déco : une maison (« keur » en wolof) au toit orné de motifs, indigo et safran.
 * `surFonce` éclaircit le corps de la maison pour les fonds indigo (en-tête, pied de page).
 */
export function marque(classe = 'logo-marque', surFonce = false): string {
  return `<svg class="${classe}" viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" focusable="false"><path d="M24 4 5 20v24h38V20L24 4Z" fill="${surFonce ? '#33436B' : '#1E2A47'}"${surFonce ? ' stroke="#EFE3D0" stroke-width="1.5"' : ''}/><path d="M24 4 5 20h38L24 4Z" fill="#B4532F"/><path d="m14 20 3-4 3 4m4 0 3-4 3 4" fill="none" stroke="#D49A2A" stroke-width="2"/><path d="M19 44V31a5 5 0 0 1 10 0v13" fill="#D49A2A"/><circle cx="12" cy="27" r="1.6" fill="#D49A2A"/><circle cx="36" cy="27" r="1.6" fill="#D49A2A"/><circle cx="12" cy="35" r="1.6" fill="#EFE3D0"/><circle cx="36" cy="35" r="1.6" fill="#EFE3D0"/></svg>`;
}

/** Logo texte complet (marque + « Keur Déco »), en SVG autonome : public/logo.svg. */
export function logoSvgAutonome(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 56" width="260" height="56" role="img" aria-label="Keur Déco">
  <g transform="translate(0 4)">${marque().replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
  <text x="58" y="38" font-family="'Fraunces Variable', Fraunces, Georgia, serif" font-size="30" font-weight="600" fill="#1E2A47">Keur <tspan fill="#B4532F" font-style="italic">Déco</tspan></text>
</svg>
`;
}
