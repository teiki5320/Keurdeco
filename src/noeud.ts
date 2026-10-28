/**
 * Petit arbre HTML sans dépendance, pour décrire une seule fois un morceau de page et l'obtenir :
 *   - en texte HTML au build (enHtml : tout le texte et les attributs sont échappés) ;
 *   - en éléments du navigateur (enDom : createElement et textContent, jamais innerHTML).
 * Sert aux cartes d'actus et à la page de l'article complet (src/article-veille.ts), qui sont
 * construites au build pour les pages statiques et dans le navigateur pour la page de secours.
 */

export type Attributs = Record<string, string | number | boolean | null | undefined>;
export type Noeud = string | Element_ | null | undefined | false;
export interface Element_ {
  t: string;
  a?: Attributs;
  c?: Noeud[];
}

/** Élément : h('p', { class: 'x' }, 'texte', h('a', { href }, 'lien')). */
export function h(t: string, a?: Attributs | null, ...c: Noeud[]): Element_ {
  return { t, a: a ?? undefined, c };
}

const VIDES = new Set(['img', 'br', 'hr', 'meta', 'link', 'source']);

export function echapperHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Texte HTML (build). */
export function enHtml(n: Noeud | Noeud[]): string {
  if (Array.isArray(n)) return n.map(enHtml).join('');
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string') return echapperHtml(n);
  const attributs = Object.entries(n.a ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${echapperHtml(String(v))}"`))
    .join('');
  if (VIDES.has(n.t)) return `<${n.t}${attributs} />`;
  return `<${n.t}${attributs}>${enHtml(n.c ?? [])}</${n.t}>`;
}

/** Éléments du navigateur (aucun texte n'est jamais interprété comme du HTML). */
export function enDom(n: Noeud, doc: Document = document): Node | null {
  if (n === null || n === undefined || n === false) return null;
  if (typeof n === 'string') return doc.createTextNode(n);
  const e = doc.createElement(n.t);
  for (const [k, v] of Object.entries(n.a ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const enfant of n.c ?? []) {
    const d = enDom(enfant, doc);
    if (d) e.append(d);
  }
  return e;
}
