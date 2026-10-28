/**
 * Lien « Notre sélection » posé en bas des conseils et des fiches du glossaire : il mène vers le Top 10
 * (ou, à défaut, l'ambiance) qui correspond au sujet de la page, pour qu'aucune page ne soit une impasse.
 *
 * Choix, dans l'ordre :
 *   1. un onglet Top 10 publié dont le sujet est cité dans le titre (tapis, coussin, suspension…) ;
 *   2. l'onglet Top 10 de la première matière de la page qui en a un (raphia → paniers tressés…) ;
 *   3. la dernière ambiance publiée de la même matière (matière principale, et citée dans le titre, d'abord) ;
 *   4. la page d'entrée des Top 10.
 * Aucun lien Amazon ici : seulement un lien interne.
 */
import { trouverRubrique } from '../src/taxonomie.ts';
import { articlesPublies, type Article } from './articles.ts';
import { icone } from './icones.ts';
import { echapper, indexProduits } from './produits.ts';
import { adresseTop10, sujetsPublies, type SujetTop10 } from './top10.ts';

/** Mots du titre → onglet Top 10 (le premier qui correspond l'emporte : du plus précis au plus large). */
const PAR_MOTS: [RegExp, string][] = [
  [/chemins? de table/i, 'chemins-de-table'],
  [/\bnappes?\b|sets? de table|table de f[êe]te/i, 'nappes-sets-de-table'],
  [/\btapis\b/i, 'tapis-esprit-africain'],
  [/suspension|\blampes?\b|luminaire|lumi[èe]re/i, 'luminaires-fibres-naturelles'],
  [/coussin/i, 'coussins-imprimes-africains'],
  [/linge de lit|parure|t[êe]te de lit|housse de couette/i, 'parures-de-lit'],
  [/assiette|miroir|masque|\bcadres?\b|accrocher|au mur\b|murale?s?\b/i, 'decos-murales'],
  [/panier|bolga|vannerie|raphia/i, 'paniers-tresses-africains'],
  [/tabouret|bois sculpt/i, 'bois-sculpte'],
  [/indigo|kente|adire|ndop/i, 'indigo-kente'],
];

/** Matière → onglet Top 10 (seulement quand l'onglet parle vraiment de cette matière). */
const PAR_MATIERE: Record<string, string> = {
  'raphia-paniers': 'paniers-tresses-africains',
  'bois-sculpte': 'bois-sculpte',
  indigo: 'indigo-kente',
  kente: 'indigo-kente',
};

/** Onglets Top 10 publiés, lus une seule fois par construction (chaque page de conseil en a besoin). */
let sujetsEnCache: SujetTop10[] | undefined;
function sujets(): SujetTop10[] {
  return (sujetsEnCache ??= sujetsPublies(indexProduits()));
}
let publiesEnCache: Article[] | undefined;
function publies(): Article[] {
  return (publiesEnCache ??= articlesPublies());
}

/** Onglet Top 10 publié consacré à une matière, s'il existe. */
export function topDeMatiere(matiere: string, listeTops: SujetTop10[] = sujets()): SujetTop10 | undefined {
  return listeTops.find((s) => s.slug === PAR_MATIERE[matiere]);
}

export interface Selection {
  href: string;
  titre: string;
}

/** Destination du lien « Notre sélection » pour une page (titre et matières). */
export function selectionAssortie(titre: string, matieres: string[], listeTops: SujetTop10[] = sujets(), articles: Article[] = publies()): Selection {
  const top = (slug: string | undefined) => listeTops.find((s) => s.slug === slug);
  const parTitre = PAR_MOTS.find(([re]) => re.test(titre));
  const s = top(parTitre?.[1]) ?? matieres.map((m) => top(PAR_MATIERE[m])).find((x) => !!x);
  if (s) return { href: adresseTop10(s.slug), titre: s.titre };
  // Ambiance : d'abord une ambiance dont c'est la matière principale (la première citée), sinon une qui la cite.
  const ambiances = articles.filter((a) => a.type === 'ambiance');
  const nomCite = (a: Article, m: string) => a.titre.toLowerCase().includes((trouverRubrique('matiere', m)?.nom ?? m).split(' ')[0].toLowerCase());
  const ambiance =
    matieres.map((m) => ambiances.find((a) => a.matieres[0] === m && nomCite(a, m)) ?? ambiances.find((a) => a.matieres[0] === m)).find((a) => !!a) ??
    ambiances.find((a) => a.matieres.some((m) => matieres.includes(m)));
  if (ambiance) return { href: ambiance.fichier, titre: ambiance.titre };
  return { href: 'top-10/', titre: 'Nos Top 10 de la déco africaine' };
}

/** Paragraphe « Notre sélection » (lien interne, jamais de lien Amazon). */
export function lienSelection(sel: Selection): string {
  return `<p class="lien-selection"><span class="lien-selection__titre">Notre sélection</span> <a class="lien-fleche" href="${sel.href}">${echapper(sel.titre)} ${icone('fleche', 'icone icone--petite')}</a></p>`;
}
