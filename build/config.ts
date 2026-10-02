/** Réglages généraux du site, lus au build. */

export const NOM_SITE = 'Keur Déco';

/** Titre de l'onglet : « Titre · Keur Déco », sans le nom du site quand l'ensemble dépasserait 65 caractères (Google coupe au-delà). */
export function titrePage(titre: string): string {
  const complet = `${titre} · ${NOM_SITE}`;
  return complet.length > 65 ? titre : complet;
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
