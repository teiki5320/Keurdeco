/**
 * Gabarit des pages « Nos sélections » (articles de type top) :
 * top 3, classement complet, tableau comparatif, conseils en cartes et questions fréquentes en accordéon.
 *
 * Règle absolue : rien d'inventé. Les fiches ne montrent que ce que contiennent les données du site
 * (type d'objet, matières, couleurs du produit, dimensions et quantité lues dans son nom vérifié) ;
 * les avis sont les textes de l'article (« pourquoi », « a_savoir »). Ni prix, ni note, ni étoiles.
 */
import { Marked } from 'marked';
import { attributsLienAmazon, MENTION_AMAZON } from '../src/amazon.ts';
import { trouverRubrique } from '../src/taxonomie.ts';
import { icone } from './icones.ts';
import { echapper, estAffichable, libelleType, visuelProduit, type Produit } from './produits.ts';

/** Entrée de classement telle que lue dans l'en-tête de l'article (build/articles.ts). */
export interface EntreeSelection {
  produit: string;
  pourquoi: string;
  a_savoir: string;
  /** Facultatif : étiquette éditoriale de la carte (« Le plus sobre »…). Le n° 1 reçoit « Notre choix » par défaut. */
  badge?: string;
}

interface Classe extends EntreeSelection {
  p: Produit & { asin: string };
  rang: number;
}

const markdown = new Marked({ gfm: true });
const enLigne = (s: string) => markdown.parseInline(s, { async: false }) as string;
const texteBrut = (s: string) => s.replace(/\*\*|__|\*|_/g, '').trim();

/** Produits affichables du classement, renumérotés sans trou (un produit masqué disparaît). */
export function classes(entrees: EntreeSelection[], produits: Map<string, Produit>): Classe[] {
  return entrees
    .map((c) => ({ ...c, p: produits.get(c.produit) }))
    .filter((c): c is EntreeSelection & { p: Produit & { asin: string } } => estAffichable(c.p))
    .map((c, i) => ({ ...c, rang: i + 1 }));
}

/** Le type d'objet n'est montré que s'il varie dans la sélection (sinon il répète la même chose partout). */
const typesVaries = (liste: Classe[]) => new Set(liste.map((c) => c.p.type_objet)).size > 1;

/** Badge d'une carte : celui de l'article, sinon « Notre choix » pour le n° 1. */
function badge(c: Classe): string {
  return c.badge?.trim() || (c.rang === 1 ? 'Notre choix' : '');
}

/**
 * Faits sûrs sur un produit, sans rien inventer : type, matières et couleurs des données,
 * dimensions et quantité seulement si elles figurent dans le nom vérifié du produit.
 */
export function faitsProduit(p: Produit): { libelle: string; valeur: string }[] {
  const faits: { libelle: string; valeur: string }[] = [{ libelle: 'Type', valeur: libelleType(p.type_objet) }];
  const matieres = p.matieres.map((m) => trouverRubrique('matiere', m)?.nom ?? m).filter(Boolean);
  if (matieres.length) faits.push({ libelle: 'Matière', valeur: matieres.join(', ') });
  if (p.couleurs.length) faits.push({ libelle: 'Couleurs', valeur: p.couleurs.map((c, i) => (i === 0 ? c.charAt(0).toUpperCase() + c.slice(1) : c)).join(', ') });
  const dimensions = p.nom.match(/\d+(?:[,.]\d+)?(?:\s*×\s*\d+(?:[,.]\d+)?){0,2}\s*cm/);
  if (dimensions) faits.push({ libelle: 'Dimensions', valeur: dimensions[0].replace(/\s+/g, ' ') });
  const lot = p.nom.match(/lot de (\d+)/i);
  if (lot) faits.push({ libelle: 'Quantité', valeur: `Lot de ${lot[1]}` });
  return faits;
}

/** « À savoir » sans la partie « Pour qui ? », qui devient la ligne « Idéal pour ». */
export function decouperASavoir(texte: string): { aSavoir: string; pourQui: string } {
  const m = texte.match(/^([\s\S]*?)\s*\*\*Pour qui\s*\?\*\*\s*([\s\S]*)$/);
  // « Idéal pour ceux qui… » : minuscule en tête, sauf sigle ou nom propre (deuxième lettre majuscule).
  const pourQui = m ? m[2].trim().replace(/^(\p{Lu})(?=\p{Ll})/u, (l) => l.toLowerCase()) : '';
  return m ? { aSavoir: m[1].trim(), pourQui } : { aSavoir: texte.trim(), pourQui: '' };
}

/** Première phrase du « pourquoi », pour les cartes du top 3. */
function premierePhrase(texte: string): string {
  const brut = texteBrut(texte);
  const m = brut.match(/^.+?[.!?…](?=\s|$)/);
  return (m ? m[0] : brut).trim();
}

function boutonAmazon(p: Produit & { asin: string }, classe = ''): string {
  return `<div class="selection-action${classe}"><a class="bouton bouton--amazon" ${attributsLienAmazon(p.asin)}>Voir sur Amazon ${icone('externe', 'icone icone--petite')}</a><span class="lien-partenaire">Lien partenaire</span></div>`;
}

function vignette(p: Produit & { asin: string }): string {
  const v = visuelProduit(p);
  return `<a class="produit__visuel${v.startsWith('<img') ? ' produit__visuel--photo' : ''}" ${attributsLienAmazon(p.asin)} tabindex="-1" aria-hidden="true">${v}</a>`;
}

/** Les trois premiers du classement, en cartes. Vide s'il y a moins de trois produits affichables. */
export function rendreTop3(liste: Classe[]): string {
  if (liste.length < 3) return '';
  return `<div class="top3">${liste
    .slice(0, 3)
    .map((c) => {
      const faits = faitsProduit(c.p).filter((f) => f.libelle !== 'Type').map((f) => f.valeur);
      const b = badge(c);
      return `<article class="top3__carte">
      <p class="top3__entete">${b ? `<span class="badge-selection">${echapper(b)}</span>` : '<span></span>'}<span class="top3__rang">n° ${c.rang}</span></p>
      <div class="top3__produit">${vignette(c.p)}<div><h3 class="top3__nom"><a href="#rang-${c.rang}">${echapper(c.p.nom)}</a></h3>${faits.length ? `<p class="top3__faits">${echapper(faits.join(' · '))}</p>` : ''}</div></div>
      <p class="top3__resume">${echapper(premierePhrase(c.pourquoi))}</p>
      ${boutonAmazon(c.p)}
    </article>`;
    })
    .join('')}</div>`;
}

/** Classement complet : une fiche par produit (faits sûrs, avis de l'article, bouton Amazon). */
export function rendreFiches(liste: Classe[]): string {
  if (liste.length === 0) return '<p class="produits-vide">Le classement arrive bientôt.</p>';
  const avecType = typesVaries(liste);
  return `<ol class="classement">${liste
    .map((c) => {
      const { aSavoir, pourQui } = decouperASavoir(c.a_savoir);
      const b = badge(c);
      return `<li class="classement__entree" id="rang-${c.rang}">
    <div class="fiche__entete">
      <span class="classement__rang" aria-hidden="true">${c.rang}</span>
      ${vignette(c.p)}
      <div class="fiche__titre">
        ${b ? `<span class="badge-selection">${echapper(b)}</span>` : ''}
        ${avecType ? `<p class="produit__type">${echapper(libelleType(c.p.type_objet))}</p>` : ''}
        <h3 class="produit__nom">${echapper(c.p.nom)}</h3>
      </div>
    </div>
    <dl class="fiche__faits">${faitsProduit(c.p)
      .filter((f) => avecType || f.libelle !== 'Type')
      .map((f) => `<div><dt>${f.libelle}</dt><dd>${echapper(f.valeur)}</dd></div>`)
      .join('')}</dl>
    <div class="classement__avis">
      <p><strong>Pourquoi on l’a choisi.</strong> ${enLigne(c.pourquoi)}</p>
      ${aSavoir ? `<p><strong>À savoir.</strong> ${enLigne(aSavoir)}</p>` : ''}
      ${pourQui ? `<p class="fiche__ideal"><strong>Idéal pour</strong> ${enLigne(pourQui)}</p>` : ''}
    </div>
    ${boutonAmazon(c.p)}
  </li>`;
    })
    .join('')}</ol>`;
}

/** Tableau comparatif : seulement les colonnes renseignées pour au moins un produit. */
export function rendreTableau(liste: Classe[]): string {
  if (liste.length < 2) return '';
  const faits = liste.map((c) => new Map(faitsProduit(c.p).map((f) => [f.libelle, f.valeur])));
  const colonnes = ['Type', 'Matière', 'Couleurs', 'Dimensions', 'Quantité'].filter((col) => faits.some((f) => f.has(col)) && (col !== 'Type' || typesVaries(liste)));
  return `<div class="tableau-selection" tabindex="0" role="region" aria-label="Tableau comparatif, faites glisser pour tout voir">
    <table>
      <thead><tr><th scope="col">Produit</th>${colonnes.map((c) => `<th scope="col">${c}</th>`).join('')}<th scope="col"><span class="visuellement-cache">Lien</span></th></tr></thead>
      <tbody>${liste
        .map(
          (c, i) => `<tr><th scope="row"><a class="tableau-selection__produit" href="#rang-${c.rang}"><span class="tableau-selection__rang">${c.rang}</span>${echapper(c.p.nom)}</a></th>${colonnes
            .map((col) => `<td>${echapper(faits[i].get(col) ?? '–')}</td>`)
            .join('')}<td class="tableau-selection__lien"><a ${attributsLienAmazon(c.p.asin)}>Voir</a><span class="lien-partenaire">Lien partenaire</span></td></tr>`,
        )
        .join('')}</tbody>
    </table>
  </div>`;
}

/**
 * Mise en forme du texte d'une sélection : la liste qui suit un titre « Comment choisir… » devient des cartes
 * numérotées ; les questions (h3) de « Questions fréquentes » deviennent un accordéon.
 */
export function mettreEnFormeTexte(html: string): string {
  const cartes = html.replace(/(<h2 id="comment-choisir[^"]*">[\s\S]*?<\/h2>\s*)<ul>/g, '$1<ul class="choix-cartes">');
  return cartes.replace(/(<h2 id="questions-frequentes">[\s\S]*?<\/h2>)([\s\S]*?)(?=<h2|$)/, (_m, titre: string, bloc: string) => {
    const questions = [...bloc.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|$)/g)];
    if (!questions.length) return titre + bloc;
    return `${titre}\n<div class="faq">${questions.map(([, q, r]) => `<details class="faq__question"><summary>${q}</summary><div class="faq__reponse">${r.trim()}</div></details>`).join('')}</div>\n`;
  });
}

/** Mention Amazon en haut d'une sélection, avec la précision sur les prix. */
export function mentionHaut(): string {
  return `<p class="mention-amazon mention-amazon--haut">${MENTION_AMAZON} Aucun prix n’est affiché : le prix du jour est sur Amazon.</p>`;
}
