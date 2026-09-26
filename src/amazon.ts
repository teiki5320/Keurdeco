/**
 * Liens Partenaires Amazon.fr : l'identifiant de suivi est défini ici, et nulle part ailleurs.
 */

/** Identifiant de suivi Partenaires Amazon (valeur provisoire, à confirmer dans le Partenaires Central). */
export const AMAZON_TAG = 'keurdeco-21';

/** Attributs obligatoires des liens affiliés : sponsorisés, non suivis, ouverts dans un nouvel onglet. */
export const REL_AMAZON = 'sponsored nofollow noopener';

/** Mention obligatoire du programme Partenaires, près des liens, dans le pied de page et les mentions légales. */
export const MENTION_AMAZON = 'En tant que Partenaire Amazon, Keur Déco réalise un bénéfice sur les achats remplissant les conditions requises.';

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
