/**
 * Emplacements d'annonces Google AdSense choisis à la main (pas d'annonces automatiques).
 *
 * Règles (décidées avec l'éditeur) :
 *   - seulement sur les pages de lecture : articles (sauf les Tops), conseils, guides, glossaire,
 *     pages de pièces, de matières et d'occasions ; jamais sur l'accueil, les Tops, À propos,
 *     Confidentialité, Mentions légales ni la 404 ;
 *   - 2 annonces au plus par article (1 pour un conseil ou une page de liste) ;
 *   - jamais collée à un encadré produit Amazon : ni juste avant, ni juste après ;
 *   - toujours signalée par la mention « Annonce ».
 */
import { ADSENSE_BLOC, ADSENSE_EDITEUR } from './config.ts';

/** Un emplacement d'annonce In-Article (rempli par src/site.ts, mention visible une fois l'annonce affichée). */
export function blocAnnonce(editeur = ADSENSE_EDITEUR, bloc = ADSENSE_BLOC): string {
  if (!editeur || !bloc) return '';
  return `<aside class="annonce" aria-label="Annonce"><p class="annonce__mention">Annonce</p><ins class="adsbygoogle" style="display:block; text-align:center;" data-ad-layout="in-article" data-ad-format="fluid" data-ad-client="ca-${editeur}" data-ad-slot="${bloc}"></ins></aside>`;
}

const mots = (html: string) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const PRODUIT = /encadre-produit|class="classement|class="meme-esprit|class="epingler/;

/** Début des deux premiers blocs qui suivent une position : on n'y veut aucun produit. */
function debutSuivant(html: string, i: number): string {
  const fin = html.indexOf('</h2>', i);
  const reste = html.slice(fin < 0 ? i : fin + 5);
  const coupe = reste.search(/<\/(p|ul|ol|aside|figure)>/);
  return reste.slice(0, coupe < 0 ? 400 : coupe + 10).slice(0, 1200);
}

/**
 * Insère jusqu'à `max` annonces devant des intertitres <h2> d'un corps de texte :
 * la première après au moins `minAvant` mots, la seconde vers la fin, avec assez de texte entre les deux.
 */
export function placerAnnonces(html: string, max: number, minAvant = 120, bloc = blocAnnonce()): string {
  if (!bloc || max < 1) return html;
  const positions = [...html.matchAll(/<h2[\s>]/g)].map((m) => m.index as number);
  const valides = positions.filter((i) => {
    const avant = html.slice(0, i).trimEnd();
    // Bloc juste avant : un encadré (<aside>, <section>) en entier, sinon le dernier paragraphe ou la dernière liste.
    const ouvrant = /<\/aside>$/.test(avant) ? '<aside' : /<\/section>$/.test(avant) ? '<section' : '';
    const blocPrecedent = avant.slice(ouvrant ? avant.lastIndexOf(ouvrant) : Math.max(avant.lastIndexOf('<p'), avant.lastIndexOf('<ul'), avant.lastIndexOf('<ol')));
    return !PRODUIT.test(blocPrecedent) && !PRODUIT.test(debutSuivant(html, i));
  });
  const choisies: number[] = [];
  const premiere = valides.find((i) => mots(html.slice(0, i)) >= minAvant);
  if (premiere === undefined) return html;
  choisies.push(premiere);
  if (max >= 2) {
    const total = mots(html);
    const derniere = [...valides].reverse().find((i) => i > premiere && mots(html.slice(premiere, i)) >= 250 && total - mots(html.slice(0, i)) >= 80);
    if (derniere !== undefined) choisies.push(derniere);
  }
  return choisies.reverse().reduce((h, i) => `${h.slice(0, i)}${bloc}\n${h.slice(i)}`, html);
}
