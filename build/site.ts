/**
 * Plugin Vite « maison » : insère les parties communes dans chaque page HTML au moment
 * du build, génère les pages d'articles, de rubriques et du glossaire, puis écrit
 * sitemap.xml et robots.txt. Le site reste 100 % statique et lisible sans JavaScript.
 *
 * Marqueurs disponibles dans les pages :
 *   <!--#head-->             favicon, manifeste, référencement (canonique, Open Graph, données structurées), code AdSense
 *   <!--#header-->           bandeau + navigation (la rubrique courante est mise en évidence)
 *   <!--#footer-->           pied de page (avec la mention Partenaires Amazon)
 *   <!--#une-->              ambiance à la une (accueil)
 *   <!--#tops-->             derniers Top 10
 *   <!--#conseils-->         derniers conseils publiés
 *   <!--#entrees:piece-->    tuiles d'entrée d'une famille (piece, matiere, occasion)
 *   <!--#mention-amazon-->   mention obligatoire du programme Partenaires Amazon
 *   <!--#icone:nom-->        une icône de build/icones.ts
 *   <!--#motif:nom-->        un motif de tissu de build/motifs.ts (arche des pages écrites à la main)
 *   <!--#actus:4-->          section d'actus de la veille (cachée, remplie par le navigateur : src/veille.ts)
 *   <!--#actus:3:matiere:wax-->  idem, seulement les actus d'une matière
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { MENTION_AMAZON } from '../src/amazon.ts';
import { FAMILLES, type Famille, fichierRubrique } from '../src/taxonomie.ts';
import { insecables } from '../src/typo.ts';
import { articlesPublies, pagesArticles } from './articles.ts';
import { datesArticlesVeille, pagesArticlesVeille } from './articles-veille.ts';
import { ADSENSE_EDITEUR, NOM_SITE, SITE_URL, SLOGAN } from './config.ts';
import { blocConseils, conseilsPublies, pagesConseils } from './conseils.ts';
import { essayage } from './essayage.ts';
import { icone, type NomIcone } from './icones.ts';
import { motif } from './motifs.ts';
import { ambiancesDeRubrique, blocGlossaire, blocTops, blocUne, imagePorte, pagesRubriques, tuilesRubriques, visiteMaison } from './rubriques.ts';
import { calculerRapport, texteRapport } from './rapport.ts';
import { pagesTop10 } from './top10.ts';
import { blocActus, entitesVeille } from './veille.ts';

export { insecables, NOM_SITE, SITE_URL };

/** Rubriques de la navigation principale ; `pages` = fichiers rattachés à la rubrique. */
export const NAVIGATION: { href: string; libelle: string; pages: RegExp }[] = [
  { href: 'pieces.html', libelle: 'Pièces', pages: /^(pieces|piece-.*)\.html$/ },
  { href: 'matieres.html', libelle: 'Matières', pages: /^(matieres|matiere-.*)\.html$/ },
  { href: 'occasions.html', libelle: 'Occasions', pages: /^(occasions|occasion-.*)\.html$/ },
  { href: 'top-10/', libelle: 'Top 10', pages: /^top-10\// },
  { href: 'guides.html', libelle: 'Guides', pages: /^guides\.html$/ },
  { href: 'conseils.html', libelle: 'Conseils', pages: /^conseils?(-.*)?\.html$/ },
  { href: 'glossaire.html', libelle: 'Glossaire', pages: /^glossaire(-.*)?\.html$/ },
  { href: 'actus.html', libelle: 'Actus', pages: /^actus(\.html$|\/)/ },
];

export function head(): string {
  return `<script>document.documentElement.classList.add('js')</script>
    <link rel="icon" type="image/png" sizes="32x32" href="icones/favicon-32.png" />
    <link rel="icon" type="image/png" sizes="48x48" href="icones/favicon-48.png" />
    <link rel="apple-touch-icon" href="icones/apple-touch-icon.png" />
    <link rel="manifest" href="manifest.webmanifest" />
    <meta name="theme-color" content="#F7F0E6" />
    <meta name="robots" content="max-image-preview:large" />
    <link rel="alternate" type="application/rss+xml" title="${NOM_SITE}" href="feed.xml" />`;
}

const DOSSIER_PARTAGE = resolve(import.meta.dirname, '../public/images/partage');

function attribut(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Adresse publique d'une page (l'accueil est servi à la racine). Les pages d'un sous-dossier (Top 10)
 * ont une adresse sans « .html » : top-10/<sujet>, et top-10/ pour leur page d'entrée.
 */
export function urlPage(fichier: string, url = SITE_URL): string {
  if (fichier === 'index.html') return url;
  if (fichier.includes('/')) return `${url}${fichier.replace(/index\.html$/, '').replace(/\.html$/, '')}`;
  return `${url}${fichier}`;
}

/** Balise de vérification Google Search Console (variable GOOGLE_VERIFY, méthode « balise HTML »). */
export function verificationGoogle(code = process.env.GOOGLE_VERIFY): string {
  return code ? `<meta name="google-site-verification" content="${attribut(code)}" />` : '';
}

/** Balise de propriété AdSense, sur toutes les pages : Google voit le compte même avant le chargement (retardé) de son code. */
export function compteAdsense(editeur = ADSENSE_EDITEUR): string {
  return editeur ? `<meta name="google-adsense-account" content="ca-${attribut(editeur)}" />` : '';
}

/** Balise de revendication du domaine Pinterest (variable PINTEREST_VERIFY). */
export function verificationPinterest(code = process.env.PINTEREST_VERIFY): string {
  return code ? `<meta name="p:domain_verify" content="${attribut(code)}" />` : '';
}

/**
 * Balises de partage (Open Graph complet pour les Rich Pins, Twitter), adresse canonique
 * et, pour l'accueil, données structurées du site. Les articles ajoutent leurs propres
 * données structurées (Article, BreadcrumbList, ItemList) dans build/articles.ts.
 */
export function referencement(html: string, fichier: string, url = SITE_URL): string {
  if (/content="noindex"/.test(html)) return '';
  const titre = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? NOM_SITE;
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  const datePublication = html.match(/<meta name="date-publication" content="([^"]+)"/)?.[1];
  const nomImage = html.match(/<meta name="image-partage" content="([^"]+)"/)?.[1];
  const partage = nomImage && existsSync(resolve(DOSSIER_PARTAGE, `${nomImage}.jpg`)) ? nomImage : 'accueil';
  // Une page peut donner une image extérieure (article de la veille : la photo de l'actu) et sa taille.
  const imageExterne = html.match(/<meta name="image-partage-url" content="([^"]+)"/)?.[1];
  const [largeurImage, hauteurImage] = (imageExterne && html.match(/<meta name="image-partage-taille" content="(\d+)x(\d+)"/)?.slice(1)) || ['1200', '630'];
  const image = imageExterne ?? `${url}images/partage/${partage}.jpg`;
  // Une page peut désigner une autre adresse canonique (page d'entrée du Top 10 = premier onglet).
  const canonique = html.match(/<meta name="adresse-canonique" content="([^"]+)"/)?.[1];
  const adresse = canonique ? `${url}${canonique}` : urlPage(fichier, url);
  const donnees =
    fichier === 'index.html'
      ? [
          { '@context': 'https://schema.org', '@type': 'WebSite', name: NOM_SITE, url, inLanguage: 'fr', description },
          { '@context': 'https://schema.org', '@type': 'Organization', name: NOM_SITE, url, logo: `${url}images/marque/logo.png` },
        ]
      : [];
  const json = donnees.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`).join('\n    ');
  return `<link rel="canonical" href="${adresse}" />
    <meta property="og:type" content="${datePublication ? 'article' : 'website'}" />
    <meta property="og:site_name" content="${NOM_SITE}" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:title" content="${attribut(titre.replace(/ · Keur Déco$/, ''))}" />
    <meta property="og:description" content="${attribut(description)}" />
    <meta property="og:url" content="${adresse}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="${largeurImage}" />
    <meta property="og:image:height" content="${hauteurImage}" />${
      datePublication
        ? `
    <meta property="article:published_time" content="${datePublication}" />
    <meta property="article:author" content="${NOM_SITE}" />`
        : ''
    }
    <meta name="twitter:card" content="summary_large_image" />
    ${verificationPinterest()}
    ${verificationGoogle()}
    ${compteAdsense()}
    ${json}`;
}

/**
 * Mesure d'audience facultative et sans cookie, activée par une variable au build :
 * CLOUDFLARE_WEB_ANALYTICS (token public du « JS Snippet » de Cloudflare Web Analytics, utilisé en production)
 * ou PLAUSIBLE_DOMAIN (www.keurdeco.com).
 */
export function mesureAudience(domaine = process.env.PLAUSIBLE_DOMAIN, jetonCloudflare = process.env.CLOUDFLARE_WEB_ANALYTICS): string {
  if (jetonCloudflare) {
    return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${attribut(JSON.stringify({ token: jetonCloudflare }))}'></script>`;
  }
  return domaine ? `<script defer data-domain="${attribut(domaine)}" src="https://plausible.io/js/script.js"></script>` : '';
}

/**
 * Code Google AdSense, identique sur toutes les pages qui portent des annonces.
 * Chargé au premier geste du visiteur (défilement, toucher, clavier, souris) ou au plus tard après 4 secondes :
 * ses ~300 Ko ne ralentissent plus l'affichage, et le robot de Google le trouve quand même s'il attend un peu.
 * Les annonces sont toutes plus bas dans le texte : elles ont le temps de se charger avant d'être vues.
 * Il ne place aucune annonce à lui seul : les emplacements se décident à part (build/annonces.ts).
 */
export function codeAdsense(editeur = ADSENSE_EDITEUR, delai = 4000): string {
  if (!editeur) return '';
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${editeur}`;
  return `<script>(function(){var f=0,g=['scroll','touchstart','pointerdown','keydown','mousemove'];function c(){if(f)return;f=1;g.forEach(function(e){removeEventListener(e,c)});var s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';s.src=${JSON.stringify(src)};document.head.appendChild(s)}g.forEach(function(e){addEventListener(e,c,{passive:true})});setTimeout(c,${delai})})()</script>`;
}

/**
 * Pages sans annonce (accueil, Tops, Actus, pages légales, 404) : on n'y charge pas le script de Google,
 * pour qu'elles restent aussi rapides. Confidentialité le garde : son lien « Gérer mes cookies »
 * doit pouvoir rouvrir la fenêtre de choix de Google.
 */
export function pageAvecAdsense(fichier: string): boolean {
  // Pages d'articles de la veille (actus/<slug>/) : oui, comme un conseil (1 annonce au plus) ; page de secours et renvoi : non.
  return !/^(index|tops|top-.*|a-propos|mentions-legales|actus|404|actus\/index|actus\/article\/index)\.html$/.test(fichier);
}

function liensNavigation(fichier: string): string {
  return NAVIGATION.map(({ href, libelle, pages }) => `<li><a href="${href}"${pages.test(fichier) ? ' aria-current="page"' : ''}>${libelle}</a></li>`).join('');
}

/** Emblème Keur Déco (Afrique et maison), détouré par npm run visuels-marque ; version sombre pour les fonds indigo. */
function embleme(surFonce = false): string {
  const nom = `images/marque/embleme-${surFonce ? 'sombre' : 'clair'}`;
  return `<img class="logo-marque" src="${nom}-96.webp" srcset="${nom}-96.webp 1x, ${nom}-192.webp 2x" width="48" height="48" alt="" />`;
}

function logo(surFonce = false): string {
  return `<a class="logo" href="index.html" aria-label="${NOM_SITE}, accueil">${embleme(surFonce)}<span class="logo__texte">Keur <em>Déco</em></span></a>`;
}

export function header(fichier: string): string {
  const liens = liensNavigation(fichier);
  return `<a class="evitement" href="#contenu">Aller au contenu</a>
<header class="site-entete">
  <div class="conteneur site-entete__barre">
    ${logo()}
    <nav class="site-nav" aria-label="Navigation principale"><ul>${liens}</ul></nav>
    <details class="menu-mobile">
      <summary aria-label="Ouvrir le menu">${icone('menu')}<span>Menu</span></summary>
      <nav aria-label="Navigation principale (mobile)"><ul>${liens}<li><a href="a-propos.html">À propos</a></li></ul></nav>
    </details>
  </div>
</header>`;
}

/** Objets dessinés qui flottent autour de la porte en arche (jarre, panier, coussin, feuille, perles). */
export function objetsPorte(): string {
  const objets: [string, string, number][] = [
    ['jarre', '<svg viewBox="0 0 100 120"><path d="M38 8h24v10c20 10 30 30 26 55-4 28-22 42-38 42S16 101 12 73C8 48 18 28 38 18Z" fill="#B4532F"/><path d="M16 60h68M18 72h64" stroke="#D49A2A" stroke-width="4"/><path d="M34 8h32" stroke="#8F3F22" stroke-width="6" stroke-linecap="round"/></svg>', 0.9],
    ['panier', '<svg viewBox="0 0 120 100"><path d="M10 40h100l-10 55H20Z" fill="#D49A2A"/><path d="M14 52h92M17 66h86M20 80h80" stroke="#9C6B12" stroke-width="4"/><path d="M30 40c0-40 60-40 60 0" fill="none" stroke="#6B3E1E" stroke-width="7"/></svg>', 1.4],
    ['coussin', '<svg viewBox="0 0 110 100"><defs><pattern id="po-wax" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#1E2A47"/><circle cx="11" cy="11" r="6" fill="none" stroke="#D49A2A" stroke-width="3"/><circle cx="11" cy="11" r="2" fill="#B4532F"/></pattern></defs><path d="M8 12c30 8 64 8 94 0-6 26-6 50 0 76-30-8-64-8-94 0 6-26 6-50 0-76Z" fill="url(#po-wax)"/></svg>', 1.15],
    ['feuille', '<svg viewBox="0 0 80 140"><path d="M40 136C38 90 40 50 40 6" stroke="#52693A" stroke-width="5" fill="none"/><path d="M40 30c-26 6-34 26-30 44 18-2 30-18 30-44ZM40 60c26 6 34 26 30 44-18-2-30-18-30-44Z" fill="#52693A"/></svg>', 0.6],
    ['perles', '<svg viewBox="0 0 120 60"><path d="M6 10c20 40 88 40 108 0" fill="none" stroke="#6B5A4E" stroke-width="2"/>' + [12, 26, 42, 60, 78, 94, 108].map((x, i) => `<circle cx="${x}" cy="${10 + Math.sin((x / 120) * Math.PI) * 28}" r="7" fill="${['#B4532F', '#D49A2A', '#1E2A47', '#52693A'][i % 4]}"/>`).join('') + '</svg>', 1.7],
  ];
  return objets.map(([nom, svg, vitesse]) => `<span class="porte__objet porte__objet--${nom}" data-vitesse="${vitesse}" aria-hidden="true">${svg}</span>`).join('');
}

/**
 * « Couture » : une ligne de motifs bogolan (zigzag, cercle, croix, points, chevrons) qui se
 * dessinent trait par trait quand elle entre à l'écran. Sert de séparateur entre les sections.
 */
export function couture(): string {
  const glyphes = [
    'M0 30l10-14 10 14 10-14 10 14',
    'M20 30a10 10 0 1 0 20 0a10 10 0 1 0-20 0M26 30a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
    'M30 14v32M14 30h32M22 22h16v16H22z',
    'M18 22h.01M30 22h.01M42 22h.01M24 36h.01M36 36h.01',
    'M8 20l14 10-14 10M28 20l14 10-14 10',
    'M12 18h36v24H12zM12 18l36 24M48 18L12 42',
  ];
  const n = 18;
  const traits = Array.from({ length: n }, (_, i) => {
    const d = glyphes[i % glyphes.length];
    return `<g transform="translate(${i * 70} 0)"><path class="trait" pathLength="1" style="--i:${i}" d="${d}"/></g><path class="trait trait--fil" pathLength="1" style="--i:${i}" d="M${i * 70 + 58} 30h12"/>`;
  }).join('');
  return `<div class="couture" data-reveal aria-hidden="true"><svg viewBox="0 0 ${n * 70} 60" preserveAspectRatio="xMidYMid meet" focusable="false">${traits}</svg></div>`;
}

export function footer(): string {
  const colonne = (famille: Famille) =>
    `<div><h2>${FAMILLES[famille].titre}</h2><ul>${FAMILLES[famille].liste.map((r) => `<li><a href="${famille}-${r.id}.html">${r.nom}</a></li>`).join('')}</ul></div>`;
  return `<footer class="site-pied">
  <div class="conteneur site-pied__grille">
    <div class="site-pied__marque">
      ${logo(true)}
      <p>${SLOGAN}. Idées d’aménagement, sélections et savoir-faire, pour la diaspora et tous les amoureux de déco.</p>
      <p class="site-pied__note">${MENTION_AMAZON}</p>
      <p class="site-pied__note">Certaines images d’ambiance sont créées par intelligence artificielle ; elles sont alors signalées sous l’image.</p>
      <p class="site-pied__note">Un site <a href="https://toakeur.com"><strong>TOA KEUR</strong></a></p>
    </div>
    ${colonne('piece')}
    ${colonne('matiere')}
    <div>
      ${colonne('occasion').replace(/^<div>|<\/div>$/g, '')}
      <h2>Keur Déco</h2>
      <ul><li><a href="top-10/">Top 10</a></li><li><a href="tops.html">Tops</a></li><li><a href="guides.html">Guides</a></li><li><a href="conseils.html">Conseils</a></li><li><a href="glossaire.html">Glossaire</a></li><li><a href="actus.html">Actus</a></li><li><a href="a-propos.html">À propos</a></li><li><a href="mentions-legales.html">Mentions légales</a></li><li><a href="confidentialite.html">Confidentialité</a></li><li><a href="confidentialite.html#publicite" data-cookies>Gérer mes cookies</a></li></ul>
    </div>
  </div>
</footer>`;
}

/** Pages HTML écrites à la racine du projet. */
export function pagesHtml(racine: string): Record<string, string> {
  const entrees: Record<string, string> = {};
  for (const f of readdirSync(racine)) {
    if (f.endsWith('.html')) entrees[f.replace(/\.html$/, '')] = resolve(racine, f);
  }
  return entrees;
}

let cachePages: Map<string, string> | null = null;

/** Pages générées au build (elles n'existent pas sur le disque) : articles et conseils publiés, rubriques, glossaire. */
export function pagesGenerees(): Map<string, string> {
  if (!cachePages || process.env.VITEST) {
    const articles = pagesArticles();
    const rubriques = pagesRubriques();
    const conseils = pagesConseils();
    for (const f of articles.keys()) if (rubriques.has(f)) throw new Error(`Conflit d'adresse : l'article ${f} porte le nom d'une page de rubrique`);
    for (const f of conseils.keys()) if (rubriques.has(f) || articles.has(f)) throw new Error(`Conflit d'adresse : ${f}`);
    const top10 = pagesTop10();
    // Articles complets de la veille (actus/<slug>/), page de secours et renvoi /actus/.
    const veille = pagesArticlesVeille();
    cachePages = new Map([...rubriques, ...articles, ...conseils, ...top10, ...veille]);
  }
  return cachePages;
}

/** Toutes les entrées du build multi-pages : pages écrites + pages générées. */
export function toutesLesPages(racine: string): Record<string, string> {
  const entrees = pagesHtml(racine);
  for (const f of pagesGenerees().keys()) {
    const nom = f.replace(/\.html$/, '');
    if (entrees[nom]) throw new Error(`Conflit d'adresse : ${f} existe déjà à la racine du projet`);
    entrees[nom] = resolve(racine, f);
  }
  return entrees;
}

/** Contenu source d'une page (avec marqueurs) : fichier écrit, ou page générée. */
export function sourcePage(racine: string, fichier: string): string {
  const chemin = resolve(racine, fichier);
  if (existsSync(chemin)) return readFileSync(chemin, 'utf8');
  const genere = pagesGenerees().get(fichier);
  if (genere === undefined) throw new Error(`Page inconnue : ${fichier}`);
  return genere;
}

let racineSite = process.cwd();

/** Chemin d'une page relatif à la racine du projet (« top-10/paniers.html »), à partir d'un id Vite ou d'une URL. */
function cheminRelatif(id: string): string {
  const p = decodeURIComponent(id.split('?')[0]);
  return isAbsolute(p) && p.startsWith(racineSite) ? relative(racineSite, p) : p.replace(/^\.?\//, '');
}

function pageGeneree(id: string): string | null {
  const f = cheminRelatif(id);
  return f.endsWith('.html') && pagesGenerees().has(f) ? f : null;
}

/** Date du dernier commit qui a modifié un fichier (AAAA-MM-JJ), ou undefined hors dépôt git. */
function dateGit(racine: string, fichier: string): string | undefined {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', fichier], { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Date de dernière mise à jour de chaque page (<lastmod> du sitemap) : publication pour les articles
 * et les conseils, contenu le plus récent pour les pages de liste, dernier commit du fichier source
 * pour le glossaire et les pages fixes.
 */
export function datesSitemap(racine: string): Map<string, string> {
  const articles = articlesPublies();
  const conseils = conseilsPublies();
  const plusRecente = (liste: { publieLe: string }[]) => liste.reduce((m, x) => (x.publieLe > m ? x.publieLe : m), '');
  const dates = new Map<string, string>([...articles, ...conseils].map((x) => [x.fichier, x.publieLe]));
  const poser = (fichier: string, date: string | undefined) => {
    if (date) dates.set(fichier, date);
  };
  for (const famille of Object.keys(FAMILLES) as Famille[]) {
    const ambiances = FAMILLES[famille].liste.map((r) => {
      const liste = ambiancesDeRubrique(famille, r.id, articles);
      poser(fichierRubrique(famille, r.id), plusRecente(liste));
      return liste;
    });
    poser(FAMILLES[famille].hub, plusRecente(ambiances.flat()));
  }
  poser('tops.html', plusRecente(articles.filter((a) => a.type === 'top')));
  poser('guides.html', plusRecente(articles.filter((a) => a.type === 'guide')));
  poser('conseils.html', plusRecente(conseils));
  poser('index.html', plusRecente([...articles, ...conseils]));
  const glossaire = dateGit(racine, 'src/data/glossaire.json');
  for (const f of readdirSync(racine)) if (f.endsWith('.html') && !dates.has(f)) poser(f, dateGit(racine, f));
  for (const f of pagesGenerees().keys()) if (f.startsWith('glossaire')) poser(f, glossaire);
  // Top 10 : dernier commit du fichier du sujet (à défaut, le jour du build) ; la page d'entrée suit le premier onglet.
  const aujourdhui = new Date().toISOString().slice(0, 10);
  for (const f of pagesGenerees().keys()) {
    const m = f.match(/^top-10\/(.+)\.html$/);
    if (m && m[1] !== 'index') poser(f, dateGit(racine, `contenu/top-10/${m[1]}.md`) ?? aujourdhui);
  }
  const premier = [...pagesGenerees().keys()].find((f) => /^top-10\/(?!index)/.test(f));
  if (premier) poser('top-10/index.html', dates.get(premier));
  for (const [f, d] of datesArticlesVeille()) poser(f, d);
  return dates;
}

/** Flux RSS (feed.xml) : les 30 derniers articles et conseils publiés, du plus récent au plus ancien. */
export function fluxRss(url = SITE_URL, articles = articlesPublies(), conseils = conseilsPublies()): string {
  const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const date = (iso: string) => new Date(`${iso}T06:00:00Z`).toUTCString();
  const entrees = [
    ...articles.map((a) => ({ titre: a.titre, lien: urlPage(a.fichier, url), description: a.description, publieLe: a.publieLe, image: `${url}images/articles/${a.image}-800.webp` })),
    ...conseils.map((c) => ({ titre: c.titre, lien: urlPage(c.fichier, url), description: c.description, publieLe: c.publieLe, image: '' })),
  ]
    .sort((a, b) => b.publieLe.localeCompare(a.publieLe))
    .slice(0, 30);
  const items = entrees
    .map((e) => `    <item><title>${x(e.titre)}</title><link>${e.lien}</link><guid isPermaLink="true">${e.lien}</guid><pubDate>${date(e.publieLe)}</pubDate><description>${x(e.description)}</description>${e.image ? `<enclosure url="${e.image}" type="image/webp" length="0" />` : ''}</item>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${x(NOM_SITE)}</title>
    <link>${url}</link>
    <description>${x(SLOGAN)}</description>
    <language>fr</language>
    <atom:link href="${url}feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

/** Images d'ambiance d'une page (nos images IA, en 1600 px), pour Google Images : une seule fois chacune. */
export function imagesDePage(html: string, url = SITE_URL): string[] {
  const noms = new Set([...html.matchAll(/images\/articles\/([a-z0-9-]+)-(?:400|800|1600)\.webp/g)].map((m) => m[1]));
  return [...noms].map((n) => `${url}images/articles/${n}-1600.webp`);
}

export function sitemap(pages: string[], url = SITE_URL, dates: Map<string, string> = new Map(), images: Map<string, string[]> = new Map()): string {
  const urls = pages
    .filter((p) => p !== '404.html')
    .sort()
    .map((p) => {
      const img = (images.get(p) ?? []).map((i) => `<image:image><image:loc>${i}</image:loc></image:image>`).join('');
      return `  <url><loc>${urlPage(p, url)}</loc>${dates.has(p) ? `<lastmod>${dates.get(p)}</lastmod>` : ''}${img}</url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`;
}

/** Applique toutes les transformations à une page. */
export function transformerPage(html: string, fichier: string): string {
  const publies = articlesPublies();
  // La 404 peut être servie sous n'importe quel chemin : liens résolus depuis la racine du site.
  // Pages d'un sous-dossier (Top 10) : liens relatifs résolus depuis la racine (« ../ »), ancres de la page conservées.
  const profondeur = fichier.split('/').length - 1;
  const base = fichier === '404.html' ? `<base href="${SITE_URL}" />\n    ` : profondeur ? `<base href="${'../'.repeat(profondeur)}" />\n    ` : '';
  const ici = fichier.replace(/index\.html$/, '').replace(/\.html$/, '');
  const page = html
    .replace('<!--#head-->', `${base}${head()}\n    ${referencement(html, fichier)}\n    ${mesureAudience()}${pageAvecAdsense(fichier) ? `\n    ${codeAdsense()}` : ''}`)
    .replace('<!--#header-->', header(fichier))
    .replace('<!--#footer-->', footer())
    .replace('<!--#une-->', () => blocUne(publies))
    .replace('<!--#tops-->', () => blocTops(publies))
    .replace('<!--#conseils-->', () => blocConseils())
    .replace('<!--#glossaire-accueil-->', () => blocGlossaire())
    .replace(/<!--#couture-->/g, () => couture())
    .replace('<!--#visite-->', () => visiteMaison(publies))
    .replace('<!--#essayage-->', () => essayage())
    .replace('<!--#porte-image-->', () => imagePorte(publies))
    .replace('<!--#porte-objets-->', () => objetsPorte())
    .replace(/<!--#entrees:(piece|matiere|occasion)-->/g, (_m, f: Famille) => tuilesRubriques(f, publies))
    .replace(/<!--#actus:(\d+)(?::([a-z]+:[a-z0-9-]+))?-->/g, (_m, n: string, tag?: string) => blocActus(Number(n), tag))
    .replace(/<!--#mention-amazon-->/g, MENTION_AMAZON)
    .replace(/<!--#icone:([a-z-]+)-->/g, (_m, nom: NomIcone) => icone(nom))
    .replace(/<!--#motif:([a-z-]+)-->/g, (_m, nom: string) => motif(nom));
  return insecables(profondeur ? page.replace(/href="#/g, `href="${ici}#`) : page);
}

export function pluginSite(): Plugin {
  let racine = process.cwd();
  return {
    name: 'keurdeco-site',
    configResolved(config) {
      racine = config.root;
      racineSite = config.root;
    },
    buildStart() {
      console.log(texteRapport(calculerRapport()));
    },
    // Pages générées : elles n'existent pas sur le disque, on les fournit à Vite.
    resolveId(id) {
      const f = pageGeneree(id);
      return f ? resolve(racine, f) : null;
    },
    load(id) {
      const f = pageGeneree(id);
      return f ? sourcePage(racine, f) : null;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        cachePages = null; // en développement, les articles modifiés sont relus à chaque requête
        const f = req.url ? pageGeneree(req.url) : null;
        if (!f) return next();
        const html = await server.transformIndexHtml(req.url!, sourcePage(racine, f));
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      });
    },
    transformIndexHtml(html, ctx) {
      return transformerPage(html, relative(racine, ctx.filename));
    },
    generateBundle() {
      // Les pages marquées noindex (404) et celles qui renvoient vers une autre adresse canonique (top-10/) ne vont pas dans le sitemap.
      const pages = Object.keys(toutesLesPages(racine))
        .map((nom) => `${nom}.html`)
        .filter((f) => !/content="noindex"|name="adresse-canonique"/.test(sourcePage(racine, f)));
      // Date de publication des articles et conseils (<lastmod>), pour aider Google à les découvrir.
      const dates = datesSitemap(racine);
      // Images d'ambiance de chaque page (page construite), pour Google Images.
      const images = new Map(pages.map((f) => [f, imagesDePage(transformerPage(sourcePage(racine, f), f))]));
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(pages, SITE_URL, dates, images) });
      // Matières du site pour la tâche de veille (relier une actu à une page matière).
      this.emitFile({ type: 'asset', fileName: 'veille/entites.json', source: `${JSON.stringify(entitesVeille(), null, 2)}\n` });
      this.emitFile({ type: 'asset', fileName: 'feed.xml', source: fluxRss() });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n` });
      // Service worker : une version par publication, pour que les caches (images comprises) se renouvellent.
      const modele = readFileSync(resolve(import.meta.dirname, 'sw.js'), 'utf8');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: modele.replace('__VERSION__', Date.now().toString(36)) });
    },
  };
}

/**
 * Préchargement des polices principales (titres et texte, sous-ensemble latin) : sans lui, le texte
 * s'affiche d'abord dans une police de secours, puis « saute » quand la vraie police arrive.
 * Les noms de fichiers portent une empreinte : on les lit dans le paquet produit par Vite.
 */
export function pluginPrechargePolices(): Plugin {
  return {
    name: 'keurdeco-precharge-polices',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const polices = Object.keys(ctx.bundle).filter((f) => /(fraunces|source-sans-3)-latin-wght-normal-[\w-]+\.woff2$/.test(f));
        const liens = polices.map((f) => `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin />`).join('\n    ');
        if (!liens) return html;
        // Page 404 : ses liens se résolvent depuis <base> ; le préchargement doit venir après.
        const base = html.match(/<base [^>]*>/)?.[0];
        return base ? html.replace(base, `${base}\n    ${liens}`) : html.replace('</title>', `</title>\n    ${liens}`);
      },
    },
  };
}
