/**
 * Rapport de build, affiché dans la console à chaque construction :
 * articles programmés, produits à sélectionner, produits non vérifiés depuis plus de 60 jours,
 * et articles qui citent des produits non affichables.
 */
import { produitsCites, tousLesArticles, type Article } from './articles.ts';
import { dateDuJour } from './config.ts';
import { chargerProduits, estAffichable, type Produit } from './produits.ts';

export const DELAI_VERIFICATION_JOURS = 60;

export interface Rapport {
  programmes: Article[];
  aSelectionner: { produit: Produit; articles: string[] }[];
  nonVerifies: Produit[];
  /** Articles concernés par des produits masqués (a_selectionner, indisponible, inconnus). */
  articlesIncomplets: { article: Article; produits: string[] }[];
}

function joursEntre(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

export function calculerRapport(date = dateDuJour(), articles = tousLesArticles(), produits = chargerProduits()): Rapport {
  const index = new Map(produits.map((p) => [p.id, p]));
  const citesPar = (id: string) => articles.filter((a) => produitsCites(a).includes(id)).map((a) => a.slug);
  return {
    programmes: articles.filter((a) => a.publieLe > date).sort((a, b) => a.publieLe.localeCompare(b.publieLe)),
    aSelectionner: produits.filter((p) => p.statut === 'a_selectionner').map((p) => ({ produit: p, articles: citesPar(p.id) })),
    nonVerifies: produits.filter((p) => p.statut === 'actif' && (!p.verifie_le || joursEntre(p.verifie_le, date) > DELAI_VERIFICATION_JOURS)),
    articlesIncomplets: articles
      .map((article) => ({ article, produits: produitsCites(article).filter((id) => !estAffichable(index.get(id))) }))
      .filter((x) => x.produits.length > 0),
  };
}

export function texteRapport(r: Rapport, date = dateDuJour()): string {
  const lignes: string[] = ['', '── Rapport Keur Déco ──'];
  lignes.push(`Articles programmés (après le ${date}) : ${r.programmes.length}`);
  for (const a of r.programmes) lignes.push(`  • ${a.publieLe}  ${a.slug} (${a.type})`);
  lignes.push(`Produits à sélectionner : ${r.aSelectionner.length}`);
  for (const { produit, articles } of r.aSelectionner) lignes.push(`  • ${produit.id}${articles.length ? `  ← ${articles.join(', ')}` : ''}`);
  lignes.push(`Produits actifs non vérifiés depuis plus de ${DELAI_VERIFICATION_JOURS} jours : ${r.nonVerifies.length}`);
  for (const p of r.nonVerifies) lignes.push(`  • ${p.id} (vérifié le ${p.verifie_le ?? 'jamais'})`);
  if (r.articlesIncomplets.length) {
    lignes.push(`⚠ Articles avec des produits masqués (a_selectionner, indisponible ou inconnus) : ${r.articlesIncomplets.length}`);
    for (const { article, produits } of r.articlesIncomplets) lignes.push(`  • ${article.slug} (${article.publieLe}) : ${produits.join(', ')}`);
  }
  lignes.push('');
  return lignes.join('\n');
}
