/**
 * Motifs graphiques (SVG) inspirés de chaque matière : ils habillent les tuiles de rubriques
 * et défilent lentement (animation CSS .motif). Dessins maison, sans aucune image externe.
 */

const C = { indigo: '#1B2442', nuit: '#0E1430', ivoire: '#FBF8F2', sable: '#ECE1CF', terracotta: '#C4553A', safran: '#E2A62A', baobab: '#4F7A5A', brun: '#5A3A22', bleu: '#3B55A8' };

/** Motif en cours de construction : on garde la définition du <pattern> pour la réutiliser ailleurs. */
let dernierPattern = '';

/** Compteur d'identifiants : chaque motif affiché a un id unique, même s'il apparaît plusieurs fois dans une page. */
let numero = 0;

function svg(id: string, taille: number, fond: string, contenu: string): string {
  dernierPattern = `<pattern id="__ID__" width="${taille}" height="${taille}" patternUnits="userSpaceOnUse"><rect width="${taille}" height="${taille}" fill="${fond}"/>${contenu}</pattern>`;
  const unique = `m-${id}-${++numero}`;
  return `<svg class="motif" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>${dernierPattern.replace('__ID__', unique)}</defs><rect class="motif__fond" x="-200" y="-200" width="800" height="700" fill="url(#${unique})"/></svg>`;
}

const MOTIFS: Record<string, () => string> = {
  wax: () =>
    svg('wax', 80, C.safran, `<circle cx="40" cy="40" r="26" fill="none" stroke="${C.terracotta}" stroke-width="9"/><circle cx="40" cy="40" r="10" fill="${C.indigo}"/><circle cx="0" cy="0" r="9" fill="${C.indigo}"/><circle cx="80" cy="0" r="9" fill="${C.indigo}"/><circle cx="0" cy="80" r="9" fill="${C.indigo}"/><circle cx="80" cy="80" r="9" fill="${C.indigo}"/>`),
  bogolan: () =>
    svg('bogolan', 100, C.brun, `<rect width="50" height="50" fill="#3B2616"/><rect x="50" y="50" width="50" height="50" fill="#3B2616"/><path d="M8 18l9-9 9 9 9-9 9 9M8 34l9-9 9 9 9-9 9 9" fill="none" stroke="${C.sable}" stroke-width="3.5"/><circle cx="75" cy="15" r="3" fill="${C.sable}"/><circle cx="65" cy="30" r="3" fill="${C.sable}"/><circle cx="85" cy="30" r="3" fill="${C.sable}"/><path d="M75 55v40M55 75h40" stroke="${C.sable}" stroke-width="4"/><circle cx="25" cy="75" r="14" fill="none" stroke="${C.sable}" stroke-width="3.5"/>`),
  kente: () =>
    svg('kente', 120, C.safran, `<rect width="120" height="18" y="0" fill="${C.baobab}"/><rect width="120" height="8" y="26" fill="${C.terracotta}"/><rect width="120" height="18" y="60" fill="${C.indigo}"/><rect width="120" height="8" y="86" fill="${C.baobab}"/><rect x="0" y="36" width="20" height="20" fill="${C.indigo}"/><rect x="60" y="36" width="20" height="20" fill="${C.terracotta}"/><rect x="30" y="98" width="20" height="18" fill="${C.terracotta}"/><rect x="90" y="98" width="20" height="18" fill="${C.indigo}"/>`),
  indigo: () =>
    svg('indigo', 70, C.indigo, `<circle cx="35" cy="35" r="22" fill="none" stroke="${C.bleu}" stroke-width="5"/><circle cx="35" cy="35" r="11" fill="none" stroke="#7F95D6" stroke-width="4"/><circle cx="35" cy="35" r="3" fill="${C.ivoire}"/><circle cx="0" cy="0" r="4" fill="#7F95D6"/><circle cx="70" cy="0" r="4" fill="#7F95D6"/><circle cx="0" cy="70" r="4" fill="#7F95D6"/><circle cx="70" cy="70" r="4" fill="#7F95D6"/>`),
  'raphia-paniers': () =>
    svg('raphia', 40, '#C9A56B', `<rect width="20" height="20" fill="#B48A4E"/><rect x="20" y="20" width="20" height="20" fill="#B48A4E"/><path d="M0 5h20M0 10h20M0 15h20M25 0v20M30 0v20M35 0v20M20 25h20M20 30h20M20 35h20M5 20v20M10 20v20M15 20v20" stroke="#8E6A38" stroke-width="1.4"/>`),
  'terre-cuite': () =>
    svg('terre', 90, C.terracotta, `<path d="M0 45a45 45 0 0 1 90 0" fill="none" stroke="#E07A5A" stroke-width="7"/><path d="M15 45a30 30 0 0 1 60 0" fill="none" stroke="${C.safran}" stroke-width="5"/><path d="M30 45a15 15 0 0 1 30 0" fill="none" stroke="#E07A5A" stroke-width="4"/><path d="M-45 90a45 45 0 0 1 90 0M45 90a45 45 0 0 1 90 0" fill="none" stroke="#E07A5A" stroke-width="7"/>`),
  'bois-sculpte': () =>
    svg('bois', 60, '#7A4E2C', `<path d="M0 15l15-12 15 12 15-12 15 12M0 45l15-12 15 12 15-12 15 12" fill="none" stroke="#A8744A" stroke-width="6"/><path d="M0 30h60" stroke="#5E3A1F" stroke-width="3"/>`),
  perles: () =>
    svg('perles', 48, C.nuit, `<circle cx="12" cy="12" r="7" fill="${C.safran}"/><circle cx="36" cy="12" r="7" fill="${C.terracotta}"/><circle cx="12" cy="36" r="7" fill="${C.bleu}"/><circle cx="36" cy="36" r="7" fill="${C.ivoire}"/><circle cx="10" cy="10" r="2" fill="#fff" opacity=".6"/><circle cx="34" cy="10" r="2" fill="#fff" opacity=".6"/><circle cx="10" cy="34" r="2" fill="#fff" opacity=".6"/>`),
};

/** Motif d'une matière (ou motif wax par défaut). */
export function motif(id: string): string {
  return (MOTIFS[id] ?? MOTIFS.wax)();
}

/** Définition <pattern> d'un motif, sous l'identifiant demandé (pour remplir des formes SVG). */
export function patternMotif(id: string, idPattern: string, echelle = 1): string {
  motif(id);
  return dernierPattern.replace('__ID__', idPattern).replace('patternUnits="userSpaceOnUse"', `patternUnits="userSpaceOnUse" patternTransform="scale(${echelle})"`);
}
