/**
 * Liens Partenaires Amazon.fr : l'identifiant de suivi est défini ici, et nulle part ailleurs.
 */

/** Identifiant de suivi Partenaires Amazon : keurdecofr-21, sur le nouveau compte (toakeur) créé le 18 octobre 2026, l'ancien compte ayant été fermé par Amazon. */
export const AMAZON_TAG = 'keurdecofr-21';

/** Attributs obligatoires des liens affiliés : sponsorisés, non suivis, ouverts dans un nouvel onglet. */
export const REL_AMAZON = 'sponsored nofollow noopener';

/** Mention obligatoire du programme Partenaires, près des liens, dans le pied de page et les mentions légales. */
export const MENTION_AMAZON = 'En tant que Partenaire Amazon, Keur Déco réalise un bénéfice sur les achats remplissant les conditions requises.';

/** Petite ligne posée juste sous chaque bouton « Voir sur Amazon » (même texte que sur keurcook.com). */
export const NOTE_LIEN_AMAZON = 'Lien partenaire Amazon. Prix, disponibilité et vendeur sont indiqués sur Amazon.';

/** Seconde ligne sous le bouton : nos visuels de produits sont des illustrations créées par IA. */
export const NOTE_ILLUSTRATION_IA = 'Illustration IA : l’article vendu peut différer.';

/** Format d'un ASIN : 10 caractères, majuscules et chiffres. */
export const FORMAT_ASIN = /^[A-Z0-9]{10}$/;

/** Adresse de la fiche produit sur Amazon.fr, avec l'identifiant de suivi. */
export function lienAmazon(asin: string, tag = AMAZON_TAG): string {
  if (!FORMAT_ASIN.test(asin)) throw new Error(`ASIN invalide : « ${asin} »`);
  return `https://www.amazon.fr/dp/${asin}?tag=${encodeURIComponent(tag)}`;
}

/** Attributs HTML d'un lien vers Amazon (à placer dans la balise <a>). */
export function attributsLienAmazon(asin: string): string {
  return `href="${lienAmazon(asin)}" rel="${REL_AMAZON}" target="_blank"`;
}
