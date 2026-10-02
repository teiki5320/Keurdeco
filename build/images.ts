/**
 * Images d'ambiance des articles (nos propres visuels, jamais des photos Amazon).
 *
 * `npm run images -- <dossier>` produit, pour chaque <nom>.jpg|png :
 *   public/images/articles/<nom>-400.webp, -800.webp et -1600.webp (proportions conservées)
 *   public/images/partage/<nom>.jpg (1200 × 630, Open Graph)
 *   contenu/images/<nom>.jpg (source haute définition, pour les épingles Pinterest)
 * et enregistre les dimensions dans src/data/images.json.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { echapper } from './produits.ts';

export const RACINE = resolve(import.meta.dirname, '..');
export const DOSSIER_IMAGES = resolve(RACINE, 'public/images/articles');
export const FICHIER_DIMENSIONS = resolve(RACINE, 'src/data/images.json');

export interface Dimensions {
  largeur: number;
  hauteur: number;
}

export function chargerDimensions(): Record<string, Dimensions> {
  return existsSync(FICHIER_DIMENSIONS) ? JSON.parse(readFileSync(FICHIER_DIMENSIONS, 'utf8')) : {};
}

/** L'image existe-t-elle (fichiers WebP et dimensions connues) ? */
export function imageExiste(nom: string): boolean {
  return !!chargerDimensions()[nom] && existsSync(resolve(DOSSIER_IMAGES, `${nom}-800.webp`)) && existsSync(resolve(DOSSIER_IMAGES, `${nom}-1600.webp`));
}

/** Balise <img> responsive (400/800/1600 px) ; chaîne vide si l'image n'existe pas encore. */
export function imageArticle(nom: string, alt: string, sizes: string, chargement: 'lazy' | 'eager' = 'lazy', classe = ''): string {
  const d = chargerDimensions()[nom];
  if (!d || !imageExiste(nom)) return '';
  const prioritaire = chargement === 'eager' ? ' fetchpriority="high"' : '';
  // Version 400 px (vignettes, écrans simples) quand elle existe : bien plus légère à charger.
  const petite = existsSync(resolve(DOSSIER_IMAGES, `${nom}-400.webp`)) ? `images/articles/${nom}-400.webp 400w, ` : '';
  return `<img${classe ? ` class="${classe}"` : ''} src="images/articles/${nom}-800.webp" srcset="${petite}images/articles/${nom}-800.webp 800w, images/articles/${nom}-1600.webp 1600w" sizes="${sizes}" width="${d.largeur}" height="${d.hauteur}" alt="${echapper(alt)}" loading="${chargement}" decoding="async"${prioritaire} />`;
}

/**
 * Photo d'ambiance d'une rubrique ou d'un conseil (images créées par IA) : « piece-salon »,
 * « matiere-wax », « occasion-mariage », « conseil-<slug> ». Même chaîne que les articles
 * (npm run images). Tant que la photo n'existe pas, le motif dessiné reste affiché.
 */
export function photoFond(nom: string, sizes: string, chargement: 'lazy' | 'eager' = 'lazy', alt = texteAlternatif(nom)): string {
  return imageArticle(nom, alt, sizes, chargement, 'photo-fond');
}

let textesAlternatifs: Record<string, string> | null = null;

/** Texte alternatif d'une photo de rubrique ou de conseil (src/data/textes-alternatifs.json) ; vide s'il manque. */
export function texteAlternatif(nom: string): string {
  textesAlternatifs ??= JSON.parse(readFileSync(resolve(RACINE, 'src/data/textes-alternatifs.json'), 'utf8')) as Record<string, string>;
  return textesAlternatifs[nom] ?? '';
}

export const MENTION_IA_ILLUSTRATION = 'Photo d’illustration créée par IA.';
