/**
 * Produits Amazon.fr proposés dans les articles (src/data/produits.json).
 *
 * Règles :
 * - un produit n'est affiché que s'il est « actif » avec un ASIN valide ;
 *   « a_selectionner » et « indisponible » ne sont jamais affichés ;
 * - comme sur OptiLED, les produits sont relevés à la main sur Amazon.fr (pas d'API) ;
 * - aucune photo de produit Amazon : chaque carte montre une vignette découpée dans nos propres images
 *   d'ambiance (créées par IA, mention « Illustration IA »), ou à défaut une icône du type d'objet.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { attributsLienAmazon, FORMAT_ASIN, MENTION_AMAZON } from '../src/amazon.ts';
import { iconeObjet, icone } from './icones.ts';

export type Statut = 'a_selectionner' | 'actif' | 'indisponible';

export interface Produit {
  id: string;
  asin: string | null;
  nom: string;
  type_objet: string;
  matieres: string[];
  couleurs: string[];
  pieces: string[];
  statut: Statut;
  verifie_le: string | null;
}

/** Fichier des produits ; KEURDECO_PRODUITS le remplace (données de démonstration du test de bout en bout). */
export function cheminProduits(): string {
  return resolve(import.meta.dirname, '..', process.env.KEURDECO_PRODUITS ?? 'src/data/produits.json');
}

export function chargerProduits(chemin = cheminProduits()): Produit[] {
  return JSON.parse(readFileSync(chemin, 'utf8')) as Produit[];
}

/** Index des produits par identifiant. */
export function indexProduits(produits = chargerProduits()): Map<string, Produit> {
  return new Map(produits.map((p) => [p.id, p]));
}

/** Un produit est affichable s'il est actif et a un ASIN valide. */
export function estAffichable(p: Produit | undefined): p is Produit & { asin: string } {
  return !!p && p.statut === 'actif' && typeof p.asin === 'string' && FORMAT_ASIN.test(p.asin);
}

export function echapper(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Libellé lisible d'un type d'objet (« assiette-murale » → « Assiette murale »). */
export function libelleType(t: string): string {
  const s = t.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const DOSSIER_VIGNETTES = resolve(import.meta.dirname, '../public/images/produits');

/**
 * Vignette du produit découpée dans une de nos images d'ambiance (créée par IA, jamais une photo Amazon :
 * voir scripts/vignettes-produits.ts) ; à défaut, l'icône du type d'objet.
 */
function visuelProduit(p: Produit): string {
  if (!existsSync(resolve(DOSSIER_VIGNETTES, `${p.id}-160.webp`))) return iconeObjet(p.type_objet);
  return `<img class="produit__vignette" src="images/produits/${p.id}-160.webp" srcset="images/produits/${p.id}-160.webp 160w, images/produits/${p.id}-320.webp 320w" sizes="120px" width="160" height="160" alt="Illustration : ${echapper(p.nom)}" loading="lazy" decoding="async" /><span class="produit__ia">Illustration IA</span>`;
}

/** Carte d'un produit affichable ; `numero` relie la carte au point cliquable de l'image. */
export function carteProduit(p: Produit & { asin: string }, numero?: number, niveau: 'h3' | 'h4' = 'h3'): string {
  const lien = attributsLienAmazon(p.asin);
  const visuel = visuelProduit(p);
  return `<article class="produit" id="produit-${p.id}">
  <a class="produit__visuel${visuel.startsWith('<img') ? ' produit__visuel--photo' : ''}" ${lien} tabindex="-1" aria-hidden="true">${visuel}${numero ? `<span class="produit__numero">${numero}</span>` : ''}</a>
  <div class="produit__texte">
    <p class="produit__type">${echapper(libelleType(p.type_objet))}</p>
    <${niveau} class="produit__nom">${echapper(p.nom)}</${niveau}>
    <a class="bouton bouton--amazon" ${lien}>Voir sur Amazon ${icone('externe', 'icone icone--petite')}</a>
  </div>
</article>`;
}

export function mentionAmazon(): string {
  return `<p class="mention-amazon">${MENTION_AMAZON}</p>`;
}

/** Encadré produit dans le texte d'un article ({{produit: id}}). Vide si le produit n'est pas affichable. */
export function encadreProduit(p: Produit | undefined): string {
  if (!estAffichable(p)) return '';
  return `<aside class="encadre-produit" aria-label="Produit conseillé">
  <p class="encadre-produit__titre">Notre sélection</p>
  ${carteProduit(p, undefined, 'h4')}
  ${mentionAmazon()}
</aside>`;
}

/** Grille de cartes (liste « Dans le même esprit ») ; numérotée comme les points de l'image si demandé. */
export function grilleProduits(produits: { produit: Produit & { asin: string }; numero?: number }[]): string {
  if (produits.length === 0) return '<p class="produits-vide">La sélection de produits arrive bientôt.</p>';
  return `<div class="grille-produits">${produits.map(({ produit, numero }) => carteProduit(produit, numero)).join('')}</div>
${mentionAmazon()}`;
}
