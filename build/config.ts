/** Réglages généraux du site, lus au build. */

export const NOM_SITE = 'Keur Déco';

/** Titre de l'onglet : « Titre · Keur Déco », sans le nom du site quand l'ensemble dépasserait 60 caractères (Google coupe au-delà). */
/**
 * Les `n` éléments qui suivent `courant` dans `liste`, en reprenant au début (sans `courant`) : chaque page
 * recommande ses suivantes, si bien que toutes reçoivent des liens, même les plus anciennes.
 */
export function suivantsEnBoucle<T>(liste: T[], courant: T, n: number): T[] {
  const i = liste.indexOf(courant);
  const autres = i < 0 ? liste : [...liste.slice(i + 1), ...liste.slice(0, i)];
  return autres.slice(0, n);
}

/** Coupe un texte trop long au dernier mot entier et ajoute « … » (au plus `max` caractères). */
export function couperTexte(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max - 1);
  const espace = coupe.lastIndexOf(' ');
  return `${(espace > max / 2 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:.!?«»–—-]+$/, '')}…`;
}

/** Balise title : « titre · Keur Déco » si cela tient en 60 caractères, sinon le titre seul (coupé à 60). */
export function titrePage(titre: string): string {
  const complet = `${titre} · ${NOM_SITE}`;
  return complet.length > 60 ? couperTexte(titre, 60) : complet;
}

export const SLOGAN = 'Décoration africaine pour la maison';

/** Adresse publique du site. Surchargeable : SITE_URL=https://mon-domaine.fr/ npm run build */
export const SITE_URL = (process.env.SITE_URL ?? 'https://www.keurdeco.com/').replace(/\/?$/, '/');

/** Date du jour à Paris (AAAA-MM-JJ), ou DATE_PUBLICATION si elle est définie (prévisualisation). */
export function dateDuJour(): string {
  return process.env.DATE_PUBLICATION ?? new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

export function dateLongue(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Paramètres de suivi ajoutés aux liens des épingles Pinterest. Le numéro de l'épingle (utm_content) rend
 * chaque lien unique : Pinterest refuse à l'import « Dupliquer le lien de l'Épingle » deux épingles au même lien.
 */
export function lienPinterest(adresse: string, slug: string, numero?: number): string {
  const contenu = numero === undefined ? '' : `&utm_content=${numero}`;
  return `${adresse}?utm_source=pinterest&utm_medium=social&utm_campaign=${encodeURIComponent(slug)}${contenu}`;
}

/** Identifiant d'éditeur Google AdSense (public : il figure aussi dans public/ads.txt). Défini ici seulement. */
export const ADSENSE_EDITEUR = 'pub-2680784147246798';

/** Bloc d'annonces AdSense « Keur Déco - dans le texte » (format In-Article), utilisé par build/annonces.ts. */
export const ADSENSE_BLOC = '7493402587';
