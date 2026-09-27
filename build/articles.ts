/**
 * Articles : un fichier Markdown par article dans contenu/articles/<slug>.md, avec un en-tête YAML.
 *
 * En-tête commun :
 *   titre, description (70 à 180 caractères), publie_le (AAAA-MM-JJ),
 *   type (ambiance | top | guide), pieces[], matieres[], occasions[],
 *   image (nom de l'image, voir build/images.ts), image_alt, image_ia (booléen),
 *   produits[] (identifiants de src/data/produits.json),
 *   epingles[] (3 à 8 titres d'épingles Pinterest), tableau_pinterest (config/tableaux-pinterest.json)
 * Ambiance : hotspots: [{ produit, x, y }] (x et y en % de l'image).
 * Top : classement: [{ produit, pourquoi, a_savoir }] (5 à 10 produits).
 *
 * Dans le texte, une ligne {{produit: <id>}} insère un encadré produit ;
 * {{classement}} place le classement d'un top (sinon il suit le texte).
 *
 * Seuls les articles dont la date est passée (heure de Paris) sont construits.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Marked } from 'marked';
import { parse as parseYaml } from 'yaml';
import { attributsLienAmazon } from '../src/amazon.ts';
import { FAMILLES, fichierRubrique, trouverRubrique, type Famille } from '../src/taxonomie.ts';
import { dateDuJour, dateLongue, NOM_SITE, SITE_URL } from './config.ts';
import { icone } from './icones.ts';
import { imageArticle, imageExiste } from './images.ts';
import { carteProduit, echapper, encadreProduit, estAffichable, grilleProduits, indexProduits, libelleType, mentionAmazon, type Produit } from './produits.ts';

export const DOSSIER_ARTICLES = resolve(import.meta.dirname, '../contenu/articles');

export type TypeArticle = 'ambiance' | 'top' | 'guide';

export const TYPES: Record<TypeArticle, { nom: string; pluriel: string; icone: 'maison' | 'classement' | 'livre' }> = {
  ambiance: { nom: 'Ambiance', pluriel: 'Ambiances', icone: 'maison' },
  top: { nom: 'Top', pluriel: 'Tops', icone: 'classement' },
  guide: { nom: 'Guide', pluriel: 'Guides', icone: 'livre' },
};

export interface Hotspot {
  produit: string;
  x: number;
  y: number;
}

export interface EntreeClassement {
  produit: string;
  pourquoi: string;
  a_savoir: string;
}

export interface Article {
  slug: string;
  fichier: string;
  titre: string;
  description: string;
  publieLe: string;
  type: TypeArticle;
  pieces: string[];
  matieres: string[];
  occasions: string[];
  image: string;
  imageAlt: string;
  imageIa: boolean;
  produits: string[];
  epingles: string[];
  tableauPinterest: string;
  hotspots: Hotspot[];
  classement: EntreeClassement[];
  corps: string;
}

export function fichierArticle(slug: string): string {
  return `${slug}.html`;
}

const liste = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v == null ? [] : [String(v)]);

/** Lit un article et vérifie son en-tête ; lève une erreur explicite en cas de problème. */
export function lireArticle(slug: string, source: string): Article {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`Article ${slug} : en-tête YAML manquant (entre deux lignes « --- »)`);
  const e = (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
  const erreur = (msg: string) => new Error(`Article ${slug} : ${msg}`);
  for (const champ of ['titre', 'description', 'publie_le', 'type', 'image', 'image_alt', 'tableau_pinterest']) {
    if (e[champ] === undefined || e[champ] === null || String(e[champ]).trim() === '') throw erreur(`champ « ${champ} » manquant`);
  }
  // YAML lit une date AAAA-MM-JJ comme une chaîne ou un objet Date selon la syntaxe : on normalise.
  const publieLe = e.publie_le instanceof Date ? e.publie_le.toISOString().slice(0, 10) : String(e.publie_le);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publieLe)) throw erreur(`publie_le doit être au format AAAA-MM-JJ (« ${publieLe} »)`);
  const type = String(e.type) as TypeArticle;
  if (!(type in TYPES)) throw erreur(`type inconnu « ${type} » (ambiance, top ou guide)`);
  const description = String(e.description).trim();
  if (description.length < 70 || description.length > 180) throw erreur(`la description doit faire 70 à 180 caractères (${description.length})`);
  const epingles = liste(e.epingles);
  if (epingles.length < 3 || epingles.length > 8) throw erreur(`il faut 3 à 8 titres d'épingles (${epingles.length})`);

  const rubriques: Record<Famille, string[]> = { piece: liste(e.pieces), matiere: liste(e.matieres), occasion: liste(e.occasions) };
  for (const [famille, ids] of Object.entries(rubriques) as [Famille, string[]][]) {
    for (const id of ids) if (!trouverRubrique(famille, id)) throw erreur(`${FAMILLES[famille].champ} : « ${id} » inconnu (voir src/taxonomie.ts)`);
  }

  const hotspots = (Array.isArray(e.hotspots) ? e.hotspots : []).map((h: Record<string, unknown>) => ({ produit: String(h.produit), x: Number(h.x), y: Number(h.y) }));
  const classement = (Array.isArray(e.classement) ? e.classement : []).map((c: Record<string, unknown>) => ({
    produit: String(c.produit),
    pourquoi: String(c.pourquoi ?? '').trim(),
    a_savoir: String(c.a_savoir ?? '').trim(),
  }));
  if (type === 'ambiance' && hotspots.length === 0) throw erreur('un article « ambiance » doit avoir des hotspots');
  if (type === 'top') {
    if (classement.length < 5 || classement.length > 10) throw erreur(`un top classe 5 à 10 produits (${classement.length})`);
    for (const c of classement) if (!c.pourquoi || !c.a_savoir) throw erreur(`classement : « pourquoi » et « a_savoir » sont obligatoires (${c.produit})`);
  }

  return {
    slug,
    fichier: fichierArticle(slug),
    titre: String(e.titre).trim(),
    description,
    publieLe,
    type,
    pieces: rubriques.piece,
    matieres: rubriques.matiere,
    occasions: rubriques.occasion,
    image: String(e.image).trim(),
    imageAlt: String(e.image_alt).trim(),
    imageIa: e.image_ia === true,
    produits: liste(e.produits),
    epingles,
    tableauPinterest: String(e.tableau_pinterest).trim(),
    hotspots,
    classement,
    corps: m[2].trim(),
  };
}

/** Tous les articles, publiés ou programmés, du plus récent au plus ancien. */
export function tousLesArticles(dossier = DOSSIER_ARTICLES): Article[] {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier)
    .filter((f) => f.endsWith('.md'))
    .map((f) => lireArticle(f.replace(/\.md$/, ''), readFileSync(resolve(dossier, f), 'utf8')))
    .sort((a, b) => b.publieLe.localeCompare(a.publieLe) || a.titre.localeCompare(b.titre, 'fr'));
}

/** Articles publiés à la date de référence (heure de Paris). */
export function articlesPublies(date = dateDuJour(), tous = tousLesArticles()): Article[] {
  return tous.filter((a) => a.publieLe <= date);
}

/** Tous les identifiants de produits cités par un article (liste, points, classement, encadrés). */
export function produitsCites(a: Article): string[] {
  const encadres = [...a.corps.matchAll(/\{\{\s*produit:\s*([a-z0-9-]+)\s*\}\}/g)].map((m) => m[1]);
  return [...new Set([...a.produits, ...a.hotspots.map((h) => h.produit), ...a.classement.map((c) => c.produit), ...encadres])];
}

export function adresseArticle(a: Article, url = SITE_URL): string {
  return `${url}${a.fichier}`;
}

/** Identifiant d'ancre à partir d'un titre (« Où le placer ? » → « ou-le-placer »). */
export function ancre(texte: string): string {
  return texte
    .replace(/<[^>]+>/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const markdown = new Marked({
  gfm: true,
  renderer: {
    heading({ tokens, depth }) {
      const texte = this.parser.parseInline(tokens);
      return `<h${depth} id="${ancre(texte)}">${texte}</h${depth}>\n`;
    },
  },
});

/** Convertit le texte Markdown d'un article ; les encadrés produits sont insérés à leur place. */
export function rendreCorps(corps: string, produits: Map<string, Produit>, classement = ''): string {
  const prepare = corps
    .replace(/^\{\{\s*produit:\s*([a-z0-9-]+)\s*\}\}\s*$/gm, '\n<!--produit:$1-->\n')
    .replace(/^\{\{\s*classement\s*\}\}\s*$/gm, '\n<!--classement-->\n');
  const html = markdown.parse(prepare, { async: false }) as string;
  return html.replace(/<!--produit:([a-z0-9-]+)-->/g, (_m, id: string) => encadreProduit(produits.get(id))).replace('<!--classement-->', classement);
}

/** Lien « Épingler » sans script externe (bouton officiel de création d'épingle). */
export function lienEpingler(a: Article, url = SITE_URL, media = mediaEpingle(a, url)): string {
  const params = new URLSearchParams({ url: adresseArticle(a, url), media, description: a.titre });
  return `https://www.pinterest.com/pin/create/button/?${params.toString()}`;
}

/** Image proposée à l'épinglage : la première épingle générée (1000 × 1500), sinon l'image d'article. */
export function mediaEpingle(a: Article, url = SITE_URL): string {
  const epingle = resolve(import.meta.dirname, `../public/epingles/${a.slug}-1.jpg`);
  return existsSync(epingle) ? `${url}epingles/${a.slug}-1.jpg` : `${url}images/articles/${a.image}-1600.webp`;
}

function boutonEpingler(a: Article): string {
  return `<a class="epingler" href="${echapper(lienEpingler(a))}" target="_blank" rel="noopener">${icone('epingle', 'icone icone--petite')}<span>Épingler</span></a>`;
}

const MENTION_IA = 'Image d’ambiance créée par IA : les produits proposés sont dans le même esprit, pas les objets exacts.';

/** Image d'ambiance avec points cliquables, puis la liste « Dans le même esprit ». */
export function rendreAmbiance(a: Article, produits: Map<string, Produit>): string {
  const points = a.hotspots
    .map((h) => ({ ...h, p: produits.get(h.produit) }))
    .filter((h): h is Hotspot & { p: Produit & { asin: string } } => estAffichable(h.p));
  const numeros = new Map(points.map((h, i) => [h.produit, i + 1]));
  const boutons = points
    .map((h, i) => {
      const n = i + 1;
      return `<button type="button" class="hotspot" style="left:${h.x}%;top:${h.y}%" aria-expanded="false" aria-controls="carte-${a.slug}-${n}" aria-label="Objet ${n} : ${echapper(h.p.nom)}"><span aria-hidden="true">${n}</span></button>
      <div class="hotspot-carte${h.x > 55 ? ' hotspot-carte--gauche' : ''}${h.y > 60 ? ' hotspot-carte--haut' : ''}" id="carte-${a.slug}-${n}" style="left:${h.x}%;top:${h.y}%" hidden>
        <p class="hotspot-carte__type">${echapper(libelleType(h.p.type_objet))}</p>
        <p class="hotspot-carte__nom">${echapper(h.p.nom)}</p>
        <a class="bouton bouton--amazon" ${attributsLienAmazon(h.p.asin)}>Voir sur Amazon</a>
        <button type="button" class="hotspot-carte__fermer" aria-label="Fermer">×</button>
      </div>`;
    })
    .join('\n      ');
  // La liste reprend tous les produits de l'article (repli sans JavaScript), numérotés comme les points.
  const tous = [...new Set([...a.hotspots.map((h) => h.produit), ...a.produits])]
    .map((id) => produits.get(id))
    .filter(estAffichable)
    .map((p) => ({ produit: p, numero: numeros.get(p.id) }));
  return `<figure class="ambiance">
    <div class="ambiance__image">
      ${imageArticle(a.image, a.imageAlt, '(min-width: 1100px) 1040px, 100vw', 'eager')}
      ${boutons}
      ${boutonEpingler(a)}
    </div>
    ${a.imageIa ? `<figcaption class="mention-ia">${icone('ia', 'icone icone--petite')} ${MENTION_IA}</figcaption>` : ''}
  </figure>
  <section class="meme-esprit" aria-labelledby="meme-esprit-titre">
    <h2 id="meme-esprit-titre">Dans le même esprit</h2>
    ${grilleProduits(tous)}
  </section>`;
}

/** Classement numéroté d'un top (produits non affichables retirés, numérotation continue). */
export function rendreClassement(a: Article, produits: Map<string, Produit>): string {
  const visibles = a.classement.map((c) => ({ ...c, p: produits.get(c.produit) })).filter((c) => estAffichable(c.p));
  if (visibles.length === 0) return '<p class="produits-vide">Le classement arrive bientôt.</p>';
  const md = (s: string) => markdown.parseInline(s, { async: false }) as string;
  return `<ol class="classement">${visibles
    .map(
      (c, i) => `<li class="classement__entree" id="rang-${i + 1}">
    <span class="classement__rang" aria-hidden="true">${i + 1}</span>
    ${carteProduit(c.p as Produit & { asin: string })}
    <div class="classement__avis">
      <p><strong>Pourquoi on l’aime.</strong> ${md(c.pourquoi)}</p>
      <p><strong>À savoir.</strong> ${md(c.a_savoir)}</p>
    </div>
  </li>`,
    )
    .join('')}</ol>
${mentionAmazon()}`;
}

/** Produits d'un top affichés, dans l'ordre (pour les données structurées ItemList). */
export function produitsClassement(a: Article, produits: Map<string, Produit>): (Produit & { asin: string })[] {
  return a.classement.map((c) => produits.get(c.produit)).filter(estAffichable);
}

function etiquettesRubriques(a: Article): string {
  const liens: string[] = [];
  for (const famille of ['piece', 'matiere', 'occasion'] as Famille[]) {
    for (const id of a[FAMILLES[famille].champ]) {
      const r = trouverRubrique(famille, id);
      if (r) liens.push(`<a class="pastille pastille--${famille}" href="${fichierRubrique(famille, id)}">${r.nom}</a>`);
    }
  }
  return liens.join('');
}

/** Articles proches : mêmes rubriques d'abord, puis les plus récents. */
export function articlesProches(a: Article, publies: Article[], n = 3): Article[] {
  const score = (b: Article) =>
    b.pieces.filter((x) => a.pieces.includes(x)).length * 2 + b.matieres.filter((x) => a.matieres.includes(x)).length * 2 + b.occasions.filter((x) => a.occasions.includes(x)).length;
  return publies
    .filter((b) => b.slug !== a.slug)
    .map((b) => ({ b, s: score(b) }))
    .sort((x, y) => y.s - x.s || y.b.publieLe.localeCompare(x.b.publieLe))
    .slice(0, n)
    .map(({ b }) => b);
}

/** Carte d'article (listes, accueil, rubriques). */
export function carteArticle(a: Article, chargement: 'lazy' | 'eager' = 'lazy'): string {
  const t = TYPES[a.type];
  return `<a class="carte-article carte-article--${a.type}" href="${a.fichier}" data-inclinaison data-reveal data-libelle="${echapper(a.titre)}">
  <span class="carte-article__image">${imageArticle(a.image, '', '(min-width: 1100px) 340px, (min-width: 700px) 45vw, 92vw', chargement)}</span>
  <span class="carte-article__type">${icone(t.icone, 'icone icone--petite')} ${t.nom}</span>
  <strong class="carte-article__titre">${echapper(a.titre)}</strong>
  <span class="carte-article__resume">${echapper(a.description)}</span>
</a>`;
}

export function grilleArticles(articles: Article[], vide = '<p class="liste-vide">Les premiers articles arrivent bientôt.</p>'): string {
  return articles.length ? `<div class="grille-articles">${articles.map((a) => carteArticle(a)).join('')}</div>` : vide;
}

function jsonLd(donnees: object): string {
  return `<script type="application/ld+json">${JSON.stringify(donnees).replace(/</g, '\\u003c')}</script>`;
}

/** Données structurées de l'article : Article (Rich Pins, Google), fil d'Ariane et, pour un top, ItemList. */
export function donneesStructurees(a: Article, produits: Map<string, Produit>, url = SITE_URL): string {
  const adresse = adresseArticle(a, url);
  const image = imageExiste(a.image) ? `${url}images/articles/${a.image}-1600.webp` : `${url}images/partage/accueil.jpg`;
  const blocs: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: a.titre,
      description: a.description,
      image,
      datePublished: a.publieLe,
      inLanguage: 'fr',
      mainEntityOfPage: adresse,
      author: { '@type': 'Organization', name: NOM_SITE, url },
      publisher: { '@type': 'Organization', name: NOM_SITE, url, logo: { '@type': 'ImageObject', url: `${url}icones/icone-512.png` } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: url },
        { '@type': 'ListItem', position: 2, name: 'Articles', item: `${url}articles.html` },
        { '@type': 'ListItem', position: 3, name: a.titre, item: adresse },
      ],
    },
  ];
  if (a.type === 'top') {
    const classes = produitsClassement(a, produits);
    if (classes.length) {
      blocs.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: a.titre,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: classes.length,
        itemListElement: classes.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.nom, url: `${adresse}#rang-${i + 1}` })),
      });
    }
  }
  return blocs.map(jsonLd).join('\n    ');
}

/** Page complète (avec marqueurs) d'un article publié. */
export function sourcePageArticle(a: Article, publies: Article[], produits = indexProduits()): string {
  const t = TYPES[a.type];
  const classement = a.type === 'top' ? rendreClassement(a, produits) : '';
  let corps = rendreCorps(a.corps, produits, classement);
  if (a.type === 'top' && !a.corps.includes('{{classement}}')) corps += `\n<h2 id="le-classement">Le classement</h2>\n${classement}`;
  const titres = [...corps.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)];
  const sommaire =
    a.type === 'guide' && titres.length > 2
      ? `<nav class="sommaire" aria-label="Sommaire"><strong>Dans cet article</strong><ol>${titres.map(([, id, h]) => `<li><a href="#${id}">${h.replace(/<[^>]+>/g, '')}</a></li>`).join('')}</ol></nav>`
      : '';
  const couverture =
    a.type === 'ambiance'
      ? rendreAmbiance(a, produits)
      : `<figure class="couverture"><div class="couverture__image">${imageArticle(a.image, a.imageAlt, '(min-width: 1100px) 1040px, 100vw', 'eager')}${boutonEpingler(a)}</div>${
          a.imageIa ? `<figcaption class="mention-ia">${icone('ia', 'icone icone--petite')} Image d’illustration créée par IA.</figcaption>` : ''
        }</figure>`;
  const proches = articlesProches(a, publies);
  const minutes = Math.max(1, Math.round(corps.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 200));
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${echapper(a.description)}" />
    <meta name="date-publication" content="${a.publieLe}" />
    <meta name="image-partage" content="${echapper(a.image)}" />
    <title>${echapper(a.titre)} · ${NOM_SITE}</title>
    <!--#head-->
    ${donneesStructurees(a, produits)}
  </head>
  <body>
    <!--#header-->
    <main id="contenu" class="article article--${a.type}">
      <header class="article__entete conteneur conteneur--etroit">
        <p class="fil"><a href="index.html">Accueil</a> › <a href="articles.html">Articles</a></p>
        <p class="article__meta"><span class="article__type">${icone(t.icone, 'icone icone--petite')} ${t.nom}</span><time datetime="${a.publieLe}">${dateLongue(a.publieLe)}</time><span>${icone('horloge', 'icone icone--petite')} ${minutes} min de lecture</span></p>
        <h1 data-mots>${echapper(a.titre)}</h1>
        <p class="chapo" data-reveal>${echapper(a.description)}</p>
        <p class="pastilles">${etiquettesRubriques(a)}</p>
      </header>
      <div class="conteneur article__visuel">
        ${couverture}
      </div>
      <div class="conteneur conteneur--etroit">
        ${sommaire}
        <div class="prose">
          ${corps}
        </div>
      </div>
      ${
        proches.length
          ? `<section class="conteneur a-lire" aria-labelledby="a-lire">
        <h2 id="a-lire">À lire aussi</h2>
        ${grilleArticles(proches)}
      </section>`
          : ''
      }
    </main>
    <!--#footer-->
    <script type="module" src="/src/site.ts"></script>
  </body>
</html>
`;
}

/** Pages des articles publiés : nom de fichier → contenu HTML (avec marqueurs). */
export function pagesArticles(date = dateDuJour()): Map<string, string> {
  const publies = articlesPublies(date);
  const produits = indexProduits();
  return new Map(publies.map((a) => [a.fichier, sourcePageArticle(a, publies, produits)]));
}
