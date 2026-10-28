/**
 * Page « Top 10 » à onglets : un onglet par sujet (contenu/top-10/<slug>.md), chaque onglet étant une vraie
 * page construite à part, à l'adresse /top-10/<slug> (titre, description et contenu propres). /top-10/ montre
 * le premier onglet, avec une adresse canonique vers celui-ci.
 *
 * En-tête d'un sujet : onglet (libellé court), titre (« Top 10 des … »), description (70 à 180 caractères),
 * ordre, classement_le (date du relevé des notes, AAAA-MM-JJ), image_partage (propre à l'onglet), voir_aussi[]
 * (3 autres onglets), tops_lies[] (pages Top existantes qui renvoient vers cet onglet),
 * produits[] : { produit, pourquoi, ideal_pour } (au moins 10), ambiances[] (facultatif) : images d'ambiance créées par IA
 * { image, alt, hotspots: [{ produit, x, y, cadre? }] }, points numérotés comme le classement ; les vignettes des
 * produits en sont découpées (npm run vignettes).
 *
 * Classement : l'ordre de produits[] suit la note moyenne des acheteurs sur Amazon.fr relevée le jour de
 * classement_le ; à égalité, le plus évalué passe devant ; seuls les produits disponibles avec au moins
 * 10 évaluations sont retenus. Les notes servent à classer : elles ne sont ni enregistrées ni affichées.
 * L'intro (critère + n° 1) est écrite par le code.
 * Texte : « ## Comment choisir… » (une liste) puis « ## Questions fréquentes » (3 questions en ###).
 *
 * Règles : uniquement de vrais produits (actifs, ASIN vérifié) ; un sujet n'est publié que s'il en a au moins 10,
 * et seuls les 10 premiers affichables sont montrés. Ni prix, ni note, ni étoiles, ni filtre, ni tri.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Marked } from 'marked';
import { parse as parseYaml } from 'yaml';
import { attributsLienAmazon, MENTION_AMAZON } from '../src/amazon.ts';
import { dateLongue, NOM_SITE, SITE_URL, titrePage } from './config.ts';
import { icone, iconeObjet } from './icones.ts';
import { imageArticle } from './images.ts';
import { MENTION_IA, pointsImage, type Hotspot } from './articles.ts';
import { boutonAmazon, echapper, estAffichable, indexProduits, libelleType, type Produit } from './produits.ts';

export const DOSSIER_TOP10 = resolve(import.meta.dirname, '../contenu/top-10');
const DOSSIER_VIGNETTES = resolve(import.meta.dirname, '../public/images/produits');
export const NOMBRE = 10;

export interface EntreeTop10 {
  produit: string;
  pourquoi: string;
  ideal_pour: string;
}

export interface SujetTop10 {
  slug: string;
  onglet: string;
  titre: string;
  description: string;
  ordre: number;
  classementLe: string;
  imagePartage: string;
  voirAussi: string[];
  topsLies: string[];
  produits: EntreeTop10[];
  ambiances: AmbianceTop10[];
  corps: string;
}

export interface AmbianceTop10 {
  image: string;
  alt: string;
  hotspots: Hotspot[];
}

/** Adresse d'un onglet, relative à la racine du site (sans « .html » : /top-10/<slug>). */
export const adresseTop10 = (slug: string) => `top-10/${slug}`;
/** Fichier construit pour un onglet. */
export const fichierTop10 = (slug: string) => `top-10/${slug}.html`;

const markdown = new Marked({ gfm: true });

/** Lit un sujet et vérifie son en-tête ; lève une erreur explicite en cas de problème. */
export function lireSujet(slug: string, source: string): SujetTop10 {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`Top 10 ${slug} : en-tête YAML manquant`);
  const e = (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
  const erreur = (msg: string) => new Error(`Top 10 ${slug} : ${msg}`);
  for (const champ of ['onglet', 'titre', 'description', 'image_partage']) if (!String(e[champ] ?? '').trim()) throw erreur(`champ « ${champ} » manquant`);
  const description = String(e.description).trim();
  if (description.length < 70 || description.length > 180) throw erreur(`la description doit faire 70 à 180 caractères (${description.length})`);
  const classementLe = String(e.classement_le ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(classementLe)) throw erreur('« classement_le » doit être une date AAAA-MM-JJ');
  const voirAussi = Array.isArray(e.voir_aussi) ? e.voir_aussi.map(String) : [];
  if (voirAussi.length !== 3 || new Set(voirAussi).size !== 3 || voirAussi.includes(slug)) throw erreur('« voir_aussi » doit nommer 3 autres onglets');
  const produits = (Array.isArray(e.produits) ? e.produits : []).map((p: Record<string, unknown>) => ({
    produit: String(p.produit ?? '').trim(),
    pourquoi: String(p.pourquoi ?? '').trim(),
    ideal_pour: String(p.ideal_pour ?? '').trim(),
  }));
  if (produits.length < NOMBRE) throw erreur(`il faut au moins ${NOMBRE} produits (${produits.length})`);
  for (const p of produits) if (!p.produit || !p.pourquoi || !p.ideal_pour) throw erreur(`« produit », « pourquoi » et « ideal_pour » sont obligatoires (${p.produit || '?'})`);
  if (new Set(produits.map((p) => p.produit)).size !== produits.length) throw erreur('un produit apparaît deux fois');
  const ambiances = (Array.isArray(e.ambiances) ? e.ambiances : []).map((a: Record<string, unknown>) => ({
    image: String(a.image ?? '').trim(),
    alt: String(a.alt ?? '').trim(),
    hotspots: (Array.isArray(a.hotspots) ? a.hotspots : []).map((h: Record<string, unknown>) => ({ produit: String(h.produit), x: Number(h.x), y: Number(h.y), ...(h.cadre != null ? { cadre: Number(h.cadre) } : {}) })),
  }));
  for (const a of ambiances) {
    if (!a.image || !a.alt || a.hotspots.length === 0) throw erreur('une ambiance demande « image », « alt » et des « hotspots »');
    for (const h of a.hotspots) if (!produits.some((p) => p.produit === h.produit)) throw erreur(`le point « ${h.produit} » ne désigne pas un produit du sujet`);
  }
  const corps = m[2].trim();
  if (!/^## Comment choisir/m.test(corps)) throw erreur('section « ## Comment choisir… » manquante');
  const faq = corps.split(/^## Questions fréquentes\s*$/m)[1];
  if (!faq || (faq.match(/^### /gm) ?? []).length !== 3) throw erreur('« ## Questions fréquentes » doit contenir exactement 3 questions (###)');
  return {
    slug,
    onglet: String(e.onglet).trim(),
    titre: String(e.titre).trim(),
    description,
    ordre: Number(e.ordre ?? 99),
    classementLe,
    imagePartage: String(e.image_partage).trim(),
    voirAussi,
    topsLies: Array.isArray(e.tops_lies) ? e.tops_lies.map(String) : [],
    produits,
    ambiances,
    corps,
  };
}

export function tousLesSujets(dossier = DOSSIER_TOP10): SujetTop10[] {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier)
    .filter((f) => f.endsWith('.md'))
    .map((f) => lireSujet(f.replace(/\.md$/, ''), readFileSync(resolve(dossier, f), 'utf8')))
    .sort((a, b) => a.ordre - b.ordre || a.titre.localeCompare(b.titre, 'fr'));
}

/** Les 10 premiers produits affichables d'un sujet (moins de 10 : le sujet n'est pas publié). */
export function dixProduits(s: SujetTop10, produits: Map<string, Produit>): (EntreeTop10 & { p: Produit & { asin: string } })[] {
  return s.produits
    .map((e) => ({ ...e, p: produits.get(e.produit) }))
    .filter((e): e is EntreeTop10 & { p: Produit & { asin: string } } => estAffichable(e.p))
    .slice(0, NOMBRE);
}

/** Sujets publiés : ceux qui ont au moins 10 vrais produits, dans l'ordre des onglets. */
export function sujetsPublies(produits = indexProduits(), sujets = tousLesSujets()): SujetTop10[] {
  return sujets.filter((s) => dixProduits(s, produits).length === NOMBRE);
}

/** Intro d'un onglet : le critère de classement, puis le n° 1. */
export function introClassement(s: SujetTop10, dix: ReturnType<typeof dixProduits>): string {
  return `Classés selon la note moyenne des acheteurs relevée sur Amazon.fr le ${dateLongue(s.classementLe)} ; à égalité, le produit qui a le plus d’évaluations passe devant, et seuls les produits disponibles avec au moins 10 évaluations sont retenus. Les notes servent à classer mais ne sont pas affichées ; nous n’avons pas testé ces produits. N° 1 : ${dix[0]?.p.nom ?? ''}.`;
}

/** Images d'ambiance du sujet, avec des points numérotés comme le classement affiché. */
export function rendreAmbiances(s: SujetTop10, dix: ReturnType<typeof dixProduits>, produits: Map<string, Produit>): string {
  if (!s.ambiances.length) return '';
  const rangs = new Map(dix.map((e, i) => [e.p.id, i + 1]));
  const figures = s.ambiances
    .map(
      (a, i) => `<figure class="ambiance">
          <div class="ambiance__image">
            ${imageArticle(a.image, a.alt, '(min-width: 800px) 760px, 100vw')}
            ${pointsImage(`${s.slug}-${i + 1}`, a.hotspots, produits, (id) => rangs.get(id))}
          </div>
          <figcaption class="mention-ia">${icone('ia', 'icone icone--petite')} ${MENTION_IA}</figcaption>
        </figure>`,
    )
    .join('\n        ');
  return `<section class="top10__ambiances" aria-labelledby="en-situation"><h2 id="en-situation">Ces produits en situation</h2>
        ${figures}
      </section>`;
}

/** Images d'ambiance de tous les sujets, dans l'ordre des onglets (pour les vignettes des produits). */
export function ambiancesTop10(sujets = tousLesSujets()): { cle: string; image: string; hotspots: Hotspot[] }[] {
  return sujets.flatMap((s) => s.ambiances.map((a) => ({ cle: adresseTop10(s.slug), image: a.image, hotspots: a.hotspots })));
}

/** Bloc « Voir aussi » : 3 autres onglets publiés. */
export function voirAussi(s: SujetTop10, sujets: SujetTop10[]): string {
  const autres = s.voirAussi.map((slug) => sujets.find((t) => t.slug === slug)).filter((t): t is SujetTop10 => !!t);
  if (!autres.length) return '';
  return `<nav class="voisines-glossaire top10__voir-aussi" aria-label="Voir aussi"><h2>Voir aussi</h2><ul class="liste-glossaire">${autres
    .map((t) => `<li><a href="${adresseTop10(t.slug)}"><strong>${echapper(t.titre)}</strong> <span>${echapper(t.description)}</span></a></li>`)
    .join('')}</ul></nav>`;
}

/** Grande image d'un produit : vignette découpée dans nos images d'ambiance (IA), sinon l'icône du type d'objet. */
function grandeImage(p: Produit & { asin: string }): string {
  const vignette = existsSync(resolve(DOSSIER_VIGNETTES, `${p.id}-320.webp`));
  const contenu = vignette
    ? `<img src="images/produits/${p.id}-320.webp" srcset="images/produits/${p.id}-160.webp 160w, images/produits/${p.id}-320.webp 320w" sizes="(min-width: 700px) 220px, 70vw" width="320" height="320" alt="Illustration : ${echapper(p.nom)}" loading="lazy" decoding="async" /><span class="produit__ia">Illustration IA</span>`
    : iconeObjet(p.type_objet);
  return `<a class="top10__image${vignette ? '' : ' top10__image--icone'}" ${attributsLienAmazon(p.asin)} tabindex="-1" aria-hidden="true">${contenu}</a>`;
}

/** Les 10 produits numérotés. */
export function rendreListe(dix: ReturnType<typeof dixProduits>): string {
  const enLigne = (s: string) => markdown.parseInline(s, { async: false }) as string;
  return `<ol class="top10__liste">${dix
    .map(
      (e, i) => `<li class="top10__produit" id="n-${i + 1}">
      <span class="top10__numero" aria-hidden="true">${i + 1}</span>
      ${grandeImage(e.p)}
      <div class="top10__texte">
        <p class="produit__type">${echapper(libelleType(e.p.type_objet))}</p>
        <h3 class="top10__nom"><span class="visuellement-cache">N° ${i + 1} : </span>${echapper(e.p.nom)}</h3>
        <p><strong>Pourquoi il est dans le top.</strong> ${enLigne(e.pourquoi)}</p>
        <p class="top10__ideal"><strong>Idéal pour</strong> ${enLigne(e.ideal_pour)}</p>
        <div class="top10__action">${boutonAmazon(e.p)}</div>
      </div>
    </li>`,
    )
    .join('')}</ol>`;
}

/** Texte du sujet : la liste « Comment choisir » en cartes numérotées, les 3 questions en accordéon. */
export function rendreTexte(corps: string): string {
  const html = markdown.parse(corps, { async: false }) as string;
  const ids = (h: string) =>
    h
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  return html
    .replace(/<h2>([\s\S]*?)<\/h2>/g, (_m, h: string) => `<h2 id="${ids(h)}">${h}</h2>`)
    .replace(/(<h2 id="comment-choisir[^"]*">[\s\S]*?<\/h2>\s*)<ul>/, '$1<ul class="choix-cartes">')
    .replace(/(<h2 id="questions-frequentes">[\s\S]*?<\/h2>)([\s\S]*)$/, (_m, titre: string, bloc: string) => {
      const questions = [...bloc.matchAll(/<h3>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3>|$)/g)];
      return `${titre}\n<div class="faq">${questions.map(([, q, r]) => `<details class="faq__question"><summary>${q}</summary><div class="faq__reponse">${r.trim()}</div></details>`).join('')}</div>`;
    });
}

/** Rangée d'onglets, l'onglet actif en surbrillance (aria-current). */
export function onglets(sujets: SujetTop10[], actif: string): string {
  return `<nav class="top10-onglets" aria-label="Sujets du Top 10"><div class="conteneur top10-onglets__bande">${sujets
    .map((s) => `<a href="${adresseTop10(s.slug)}"${s.slug === actif ? ' aria-current="page"' : ''}>${echapper(s.onglet)}</a>`)
    .join('')}</div></nav>`;
}

function donnees(s: SujetTop10, dix: ReturnType<typeof dixProduits>, url = SITE_URL): string {
  const adresse = `${url}${adresseTop10(s.slug)}`;
  const blocs = [
    { '@context': 'https://schema.org', '@type': 'ItemList', name: s.titre, numberOfItems: dix.length, itemListElement: dix.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.p.nom, url: `${adresse}#n-${i + 1}` })) },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: url },
        { '@type': 'ListItem', position: 2, name: 'Top 10', item: `${url}top-10/` },
        { '@type': 'ListItem', position: 3, name: s.titre, item: adresse },
      ],
    },
  ];
  return blocs.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`).join('\n    ');
}

/** Page complète (avec marqueurs) d'un onglet. `canonique` : adresse canonique si elle diffère (page /top-10/). */
export function sourcePageTop10(s: SujetTop10, sujets: SujetTop10[], produits: Map<string, Produit>, canonique = ''): string {
  const dix = dixProduits(s, produits);
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${echapper(s.description)}" />
    ${s.imagePartage ? `<meta name="image-partage" content="${echapper(s.imagePartage)}" />` : ''}
    ${canonique ? `<meta name="adresse-canonique" content="${canonique}" />` : ''}
    <title>${echapper(titrePage(s.titre))}</title>
    <!--#head-->
    ${donnees(s, dix)}
  </head>
  <body>
    <!--#header-->
    <main id="contenu" class="top10">
      <div class="conteneur top10__entete">
        <p class="fil"><a href="index.html">Accueil</a> › <a href="top-10/">Top 10</a> › ${echapper(s.onglet)}</p>
        <p class="top10__marque">${icone('classement', 'icone icone--petite')} Les Top 10 de ${NOM_SITE}</p>
      </div>
      ${onglets(sujets, s.slug)}
      <article class="conteneur conteneur--etroit top10__sujet">
        <h1>${echapper(s.titre)}</h1>
        <p class="chapo">${echapper(introClassement(s, dix))}</p>
        <p class="mention-amazon mention-amazon--haut">${MENTION_AMAZON} Aucun prix n’est affiché : le prix du jour est sur Amazon.</p>
        ${rendreListe(dix)}
        ${rendreAmbiances(s, dix, produits)}
        <div class="prose top10__texte-bas">
          ${rendreTexte(s.corps)}
        </div>
        ${voirAussi(s, sujets)}
      </article>
    </main>
    <!--#footer-->
    <script type="module" src="/src/site.ts"></script>
  </body>
</html>
`;
}

/** Pages des onglets publiés (top-10/<slug>.html) et la page d'entrée (top-10/index.html = premier onglet). */
export function pagesTop10(produits = indexProduits()): Map<string, string> {
  const sujets = sujetsPublies(produits);
  const pages = new Map<string, string>(sujets.map((s) => [fichierTop10(s.slug), sourcePageTop10(s, sujets, produits)]));
  if (sujets[0]) pages.set('top-10/index.html', sourcePageTop10(sujets[0], sujets, produits, adresseTop10(sujets[0].slug)));
  return pages;
}

/** Onglet Top 10 lié à une page Top existante (champ tops_lies), pour le lien « Voir aussi ». */
export function top10Lie(slugArticle: string, produits = indexProduits()): SujetTop10 | undefined {
  return sujetsPublies(produits).find((s) => s.topsLies.includes(slugArticle));
}
