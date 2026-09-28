/**
 * Rubrique « Conseils » : une question pratique par page, publiée à sa date (comme sur OptiLED et Alohash).
 *
 * Un fichier Markdown par conseil dans contenu/conseils/<slug>.md, avec un en-tête YAML :
 *   titre        la question (« Comment laver un coussin en wax ? »)
 *   description  70 à 180 caractères (Google, partage)
 *   publie_le    AAAA-MM-JJ : seuls les conseils dont la date est passée (heure de Paris) sont construits
 *   theme        entretien | associer | choisir | accrocher | comprendre (voir THEMES)
 *   reponse      la réponse courte, affichée en tête de page
 *   matieres[]   facultatif : rubriques matières liées (src/taxonomie.ts)
 *   epingles[]   facultatif : titres d'épingles Pinterest (par défaut : le titre)
 * Dans le texte, {{produit: <id>}} insère un encadré produit, comme dans les articles.
 *
 * Pages générées : conseils.html (liste par thème) et conseil-<slug>.html.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { fichierRubrique, trouverRubrique } from '../src/taxonomie.ts';
import { rendreCorps } from './articles.ts';
import { dateDuJour, dateLongue, NOM_SITE, SITE_URL } from './config.ts';
import { icone, type NomIcone } from './icones.ts';
import { motif } from './motifs.ts';
import { echapper, indexProduits } from './produits.ts';

export const DOSSIER_CONSEILS = resolve(import.meta.dirname, '../contenu/conseils');
export const PREFIXE_CONSEIL = 'conseil-';

export const THEMES = {
  entretien: { nom: 'Entretenir', icone: 'textile', motif: 'indigo' },
  associer: { nom: 'Associer les styles', icone: 'coussin', motif: 'wax' },
  choisir: { nom: 'Bien choisir', icone: 'panier', motif: 'raphia-paniers' },
  accrocher: { nom: 'Accrocher et installer', icone: 'assiette-murale', motif: 'terre-cuite' },
  comprendre: { nom: 'Comprendre les motifs', icone: 'livre', motif: 'bogolan' },
} as const satisfies Record<string, { nom: string; icone: NomIcone; motif: string }>;

export type Theme = keyof typeof THEMES;

export interface Conseil {
  slug: string;
  fichier: string;
  titre: string;
  description: string;
  publieLe: string;
  theme: Theme;
  reponse: string;
  matieres: string[];
  epingles: string[];
  corps: string;
}

export function fichierConseil(slug: string): string {
  return `${PREFIXE_CONSEIL}${slug}.html`;
}

/** Lit un conseil et vérifie son en-tête ; lève une erreur explicite en cas de problème. */
export function lireConseil(slug: string, source: string): Conseil {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`Conseil ${slug} : en-tête YAML manquant`);
  const e = (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
  const erreur = (msg: string) => new Error(`Conseil ${slug} : ${msg}`);
  for (const champ of ['titre', 'description', 'publie_le', 'theme', 'reponse']) {
    if (e[champ] == null || String(e[champ]).trim() === '') throw erreur(`champ « ${champ} » manquant`);
  }
  const publieLe = e.publie_le instanceof Date ? e.publie_le.toISOString().slice(0, 10) : String(e.publie_le);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publieLe)) throw erreur(`publie_le doit être au format AAAA-MM-JJ (« ${publieLe} »)`);
  const theme = String(e.theme) as Theme;
  if (!(theme in THEMES)) throw erreur(`thème inconnu « ${theme} » (${Object.keys(THEMES).join(', ')})`);
  const description = String(e.description).trim();
  if (description.length < 70 || description.length > 180) throw erreur(`la description doit faire 70 à 180 caractères (${description.length})`);
  const matieres = Array.isArray(e.matieres) ? e.matieres.map(String) : [];
  for (const id of matieres) if (!trouverRubrique('matiere', id)) throw erreur(`matière « ${id} » inconnue`);
  const titre = String(e.titre).trim();
  const epingles = Array.isArray(e.epingles) && e.epingles.length ? e.epingles.map(String) : [titre];
  return { slug, fichier: fichierConseil(slug), titre, description, publieLe, theme, reponse: String(e.reponse).trim(), matieres, epingles, corps: m[2].trim() };
}

/** Tous les conseils, publiés ou programmés, du plus récent au plus ancien. */
export function tousLesConseils(dossier = DOSSIER_CONSEILS): Conseil[] {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier)
    .filter((f) => f.endsWith('.md'))
    .map((f) => lireConseil(f.replace(/\.md$/, ''), readFileSync(resolve(dossier, f), 'utf8')))
    .sort((a, b) => b.publieLe.localeCompare(a.publieLe) || a.titre.localeCompare(b.titre, 'fr'));
}

export function conseilsPublies(date = dateDuJour(), tous = tousLesConseils()): Conseil[] {
  return tous.filter((c) => c.publieLe <= date);
}

/** Carte d'un conseil (liste, accueil, suggestions). */
export function carteConseil(c: Conseil, i = 0): string {
  const t = THEMES[c.theme];
  return `<a class="carte-conseil" href="${c.fichier}" data-reveal style="--i:${i}" data-libelle="${echapper(c.titre)}">
  <span class="carte-conseil__motif">${motif(t.motif)}<span class="carte-conseil__icone">${icone(t.icone, 'icone')}</span></span>
  <span class="carte-conseil__texte">
    <span class="carte-conseil__theme">${t.nom}</span>
    <strong class="carte-conseil__titre">${echapper(c.titre)}</strong>
    <span class="carte-conseil__reponse">${echapper(c.reponse)}</span>
  </span>
</a>`;
}

/** Derniers conseils publiés (accueil). */
export function blocConseils(publies = conseilsPublies(), n = 4): string {
  return publies.length ? `<div class="grille-conseils">${publies.slice(0, n).map(carteConseil).join('')}</div>` : '';
}

function jsonLd(donnees: object): string {
  return `<script type="application/ld+json">${JSON.stringify(donnees).replace(/</g, '\\u003c')}</script>`;
}

/** Page complète (avec marqueurs) d'un conseil publié. */
export function sourcePageConseil(c: Conseil, publies: Conseil[], produits = indexProduits(), url = SITE_URL): string {
  const t = THEMES[c.theme];
  const corps = rendreCorps(c.corps, produits);
  const voisins = publies.filter((v) => v.slug !== c.slug && v.theme === c.theme);
  const autres = publies.filter((v) => v.slug !== c.slug && v.theme !== c.theme);
  const lire = [...voisins, ...autres].slice(0, 3);
  const matieres = c.matieres.map((id) => trouverRubrique('matiere', id)).filter((r) => !!r);
  const adresse = `${url}${c.fichier}`;
  // Données structurées : la question et sa réponse courte (FAQ), plus l'article et le fil d'Ariane.
  const ld = [
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: c.titre, acceptedAnswer: { '@type': 'Answer', text: c.reponse } }] },
    { '@context': 'https://schema.org', '@type': 'Article', headline: c.titre, description: c.description, datePublished: c.publieLe, inLanguage: 'fr', mainEntityOfPage: adresse, author: { '@type': 'Organization', name: NOM_SITE, url }, publisher: { '@type': 'Organization', name: NOM_SITE, url } },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: url },
        { '@type': 'ListItem', position: 2, name: 'Conseils', item: `${url}conseils.html` },
        { '@type': 'ListItem', position: 3, name: c.titre, item: adresse },
      ],
    },
  ];
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${echapper(c.description)}" />
    <meta name="date-publication" content="${c.publieLe}" />
    <title>${echapper(c.titre)} · ${NOM_SITE}</title>
    <!--#head-->
    ${ld.map(jsonLd).join('\n    ')}
  </head>
  <body>
    <!--#header-->
    <main id="contenu" class="page page--conseil">
      <header class="page__entete conteneur">
        <div class="page__entete-texte">
          <p class="fil"><a href="index.html">Accueil</a> › <a href="conseils.html">Conseils</a> › ${t.nom}</p>
          <p class="article__meta"><span class="article__type">${icone(t.icone, 'icone icone--petite')} ${t.nom}</span><time datetime="${c.publieLe}">${dateLongue(c.publieLe)}</time></p>
          <h1 data-mots>${echapper(c.titre)}</h1>
        </div>
        <div class="page__arche" data-reveal aria-hidden="true">${motif(t.motif)}</div>
      </header>
      <div class="conteneur conteneur--etroit">
        <aside class="reponse-courte" data-reveal>
          <p class="reponse-courte__titre">La réponse courte</p>
          <p>${echapper(c.reponse)}</p>
        </aside>
        <div class="prose">
          ${corps}
          ${matieres.length ? `<p>Pour aller plus loin : ${matieres.map((r) => `<a href="${fichierRubrique('matiere', r!.id)}">${r!.nom}</a>`).join(', ')}.</p>` : ''}
        </div>
      </div>
      ${lire.length ? `<section class="conteneur a-lire" aria-labelledby="a-lire"><h2 id="a-lire">D’autres conseils</h2><div class="grille-conseils">${lire.map(carteConseil).join('')}</div></section>` : ''}
    </main>
    <!--#footer-->
    <script type="module" src="/src/site.ts"></script>
  </body>
</html>
`;
}

/** Page conseils.html : tous les conseils publiés, regroupés par thème. */
export function sourcePageListeConseils(publies: Conseil[]): string {
  const themes = (Object.keys(THEMES) as Theme[]).map((t) => ({ t, liste: publies.filter((c) => c.theme === t) })).filter((x) => x.liste.length);
  const filtres = themes.map(({ t, liste }) => `<a class="pastille" href="#theme-${t}">${THEMES[t].nom} <span>${liste.length}</span></a>`).join('');
  const sections = themes
    .map(({ t, liste }) => `<section class="section-conseils" aria-labelledby="theme-${t}"><h2 id="theme-${t}" data-mots>${THEMES[t].nom}<span class="point">.</span></h2><div class="grille-conseils">${liste.map(carteConseil).join('')}</div></section>`)
    .join('');
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Nos conseils de décoration africaine : entretenir le wax et les paniers, associer les tissus, choisir un tapis, accrocher des assiettes tressées." />
    <title>Conseils de décoration africaine · ${NOM_SITE}</title>
    <!--#head-->
  </head>
  <body>
    <!--#header-->
    <main id="contenu" class="page page--conseils">
      <header class="page__entete conteneur">
        <div class="page__entete-texte">
          <p class="fil"><a href="index.html">Accueil</a> › Conseils</p>
          <h1 data-mots>Conseils<span class="point">.</span></h1>
          <p class="chapo" data-reveal>Une question, une réponse claire : entretenir, associer, choisir et installer les objets et tissus de la déco africaine.</p>
          ${filtres ? `<p class="pastilles" data-reveal>${filtres}</p>` : ''}
        </div>
        <div class="page__arche" data-reveal aria-hidden="true">${motif('indigo')}</div>
      </header>
      <div class="conteneur">
        ${sections || '<p class="liste-vide">Les premiers conseils arrivent bientôt.</p>'}
      </div>
    </main>
    <!--#footer-->
    <script type="module" src="/src/site.ts"></script>
  </body>
</html>
`;
}

/** Pages générées : liste et conseils publiés. */
export function pagesConseils(date = dateDuJour()): Map<string, string> {
  const publies = conseilsPublies(date);
  const produits = indexProduits();
  return new Map([['conseils.html', sourcePageListeConseils(publies)], ...publies.map((c) => [c.fichier, sourcePageConseil(c, publies, produits)] as [string, string])]);
}
