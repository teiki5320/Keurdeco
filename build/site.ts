/**
 * Plugin Vite « maison » : insère les parties communes dans chaque page HTML au moment
 * du build, génère les pages d'articles, de rubriques et du glossaire, puis écrit
 * sitemap.xml et robots.txt. Le site reste 100 % statique et lisible sans JavaScript.
 *
 * Marqueurs disponibles dans les pages :
 *   <!--#head-->             favicon, manifeste, référencement (canonique, Open Graph, données structurées)
 *   <!--#header-->           bandeau + navigation (la rubrique courante est mise en évidence)
 *   <!--#footer-->           pied de page (avec la mention Partenaires Amazon)
 *   <!--#une-->              ambiance à la une (accueil)
 *   <!--#derniers-->         derniers articles publiés
 *   <!--#tops-->             derniers Top 10
 *   <!--#entrees:piece-->    tuiles d'entrée d'une famille (piece, matiere, occasion)
 *   <!--#mention-amazon-->   mention obligatoire du programme Partenaires Amazon
 *   <!--#icone:nom-->        une icône de build/icones.ts
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { MENTION_AMAZON } from '../src/amazon.ts';
import { FAMILLES, type Famille } from '../src/taxonomie.ts';
import { insecables } from '../src/typo.ts';
import { articlesPublies, pagesArticles } from './articles.ts';
import { NOM_SITE, SITE_URL, SLOGAN } from './config.ts';
import { icone, marque, type NomIcone } from './icones.ts';
import { blocDerniers, blocTops, blocUne, pagesRubriques, tuilesRubriques } from './rubriques.ts';
import { calculerRapport, texteRapport } from './rapport.ts';

export { insecables, NOM_SITE, SITE_URL };

/** Rubriques de la navigation principale ; `pages` = fichiers rattachés à la rubrique. */
export const NAVIGATION: { href: string; libelle: string; pages: RegExp }[] = [
  { href: 'pieces.html', libelle: 'Pièces', pages: /^(pieces|piece-.*)\.html$/ },
  { href: 'matieres.html', libelle: 'Matières', pages: /^(matieres|matiere-.*)\.html$/ },
  { href: 'occasions.html', libelle: 'Occasions', pages: /^(occasions|occasion-.*)\.html$/ },
  { href: 'articles.html', libelle: 'Articles', pages: /^articles\.html$/ },
  { href: 'glossaire.html', libelle: 'Glossaire', pages: /^glossaire(-.*)?\.html$/ },
];

const FAVICON = `data:image/svg+xml,${encodeURIComponent(marque().replace('class="logo-marque" ', 'xmlns="http://www.w3.org/2000/svg" '))}`;

export function head(): string {
  return `<script>document.documentElement.classList.add('js')</script>
    <link rel="icon" href="${FAVICON}" />
    <link rel="apple-touch-icon" href="icones/apple-touch-icon.png" />
    <link rel="manifest" href="manifest.webmanifest" />
    <meta name="theme-color" content="#1B2442" />`;
}

const DOSSIER_PARTAGE = resolve(import.meta.dirname, '../public/images/partage');

function attribut(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Adresse publique d'une page (l'accueil est servi à la racine). */
export function urlPage(fichier: string, url = SITE_URL): string {
  return fichier === 'index.html' ? url : `${url}${fichier}`;
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
  const image = `${url}images/partage/${partage}.jpg`;
  const adresse = urlPage(fichier, url);
  const donnees =
    fichier === 'index.html'
      ? [
          { '@context': 'https://schema.org', '@type': 'WebSite', name: NOM_SITE, url, inLanguage: 'fr', description },
          { '@context': 'https://schema.org', '@type': 'Organization', name: NOM_SITE, url, logo: `${url}icones/icone-512.png` },
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
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />${
      datePublication
        ? `
    <meta property="article:published_time" content="${datePublication}" />
    <meta property="article:author" content="${NOM_SITE}" />`
        : ''
    }
    <meta name="twitter:card" content="summary_large_image" />
    ${verificationPinterest()}
    ${json}`;
}

/** Mesure d'audience facultative et sans cookie : PLAUSIBLE_DOMAIN=www.keurdeco.fr npm run build */
export function mesureAudience(domaine = process.env.PLAUSIBLE_DOMAIN): string {
  return domaine ? `<script defer data-domain="${attribut(domaine)}" src="https://plausible.io/js/script.js"></script>` : '';
}

function liensNavigation(fichier: string): string {
  return NAVIGATION.map(({ href, libelle, pages }) => `<li><a href="${href}"${pages.test(fichier) ? ' aria-current="page"' : ''}>${libelle}</a></li>`).join('');
}

function logo(): string {
  return `<a class="logo" href="index.html" aria-label="${NOM_SITE}, accueil">${marque('logo-marque', true)}<span class="logo__texte">Keur <em>Déco</em></span></a>`;
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

export function footer(): string {
  const colonne = (famille: Famille) =>
    `<div><h2>${FAMILLES[famille].titre}</h2><ul>${FAMILLES[famille].liste.map((r) => `<li><a href="${famille}-${r.id}.html">${r.nom}</a></li>`).join('')}</ul></div>`;
  return `<footer class="site-pied">
  <div class="conteneur site-pied__grille">
    <div class="site-pied__marque">
      ${logo()}
      <p>${SLOGAN}. Idées d’aménagement, sélections et savoir-faire, pour la diaspora et tous les amoureux de déco.</p>
      <p class="site-pied__note">${MENTION_AMAZON} Les liens vers Amazon sont des liens sponsorisés ; aucun prix n’est affiché sur le site.</p>
      <p class="site-pied__note">Certaines images d’ambiance sont créées par intelligence artificielle ; elles sont alors signalées sous l’image.</p>
    </div>
    ${colonne('piece')}
    ${colonne('matiere')}
    <div>
      ${colonne('occasion').replace(/^<div>|<\/div>$/g, '')}
      <h2>Keur Déco</h2>
      <ul><li><a href="articles.html">Tous les articles</a></li><li><a href="glossaire.html">Glossaire</a></li><li><a href="a-propos.html">À propos</a></li><li><a href="mentions-legales.html">Mentions légales</a></li><li><a href="confidentialite.html">Confidentialité</a></li></ul>
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

/** Pages générées au build (elles n'existent pas sur le disque) : articles publiés, rubriques, glossaire. */
export function pagesGenerees(): Map<string, string> {
  if (!cachePages || process.env.VITEST) {
    const articles = pagesArticles();
    const rubriques = pagesRubriques();
    for (const f of articles.keys()) if (rubriques.has(f)) throw new Error(`Conflit d'adresse : l'article ${f} porte le nom d'une page de rubrique`);
    cachePages = new Map([...rubriques, ...articles]);
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

function pageGeneree(id: string): string | null {
  const f = basename(id.split('?')[0]);
  return f.endsWith('.html') && pagesGenerees().has(f) ? f : null;
}

export function sitemap(pages: string[], url = SITE_URL): string {
  const urls = pages
    .filter((p) => p !== '404.html')
    .sort()
    .map((p) => `  <url><loc>${url}${p === 'index.html' ? '' : p}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Applique toutes les transformations à une page. */
export function transformerPage(html: string, fichier: string): string {
  const publies = articlesPublies();
  // La 404 peut être servie sous n'importe quel chemin : liens résolus depuis la racine du site.
  const base = fichier === '404.html' ? `<base href="${SITE_URL}" />\n    ` : '';
  const page = html
    .replace('<!--#head-->', `${base}${head()}\n    ${referencement(html, fichier)}\n    ${mesureAudience()}`)
    .replace('<!--#header-->', header(fichier))
    .replace('<!--#footer-->', footer())
    .replace('<!--#une-->', () => blocUne(publies))
    .replace('<!--#derniers-->', () => blocDerniers(publies))
    .replace('<!--#tops-->', () => blocTops(publies))
    .replace(/<!--#entrees:(piece|matiere|occasion)-->/g, (_m, f: Famille) => tuilesRubriques(f, publies))
    .replace(/<!--#mention-amazon-->/g, MENTION_AMAZON)
    .replace(/<!--#icone:([a-z-]+)-->/g, (_m, nom: NomIcone) => icone(nom));
  return insecables(page);
}

export function pluginSite(): Plugin {
  let racine = process.cwd();
  return {
    name: 'keurdeco-site',
    configResolved(config) {
      racine = config.root;
    },
    buildStart() {
      console.log(texteRapport(calculerRapport()));
    },
    // Pages générées : elles n'existent pas sur le disque, on les fournit à Vite.
    resolveId(id) {
      return pageGeneree(id) ? resolve(racine, basename(id.split('?')[0])) : null;
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
      return transformerPage(html, basename(ctx.filename));
    },
    generateBundle() {
      // Les pages marquées noindex (404) ne vont pas dans le sitemap.
      const pages = Object.keys(toutesLesPages(racine))
        .map((nom) => `${nom}.html`)
        .filter((f) => !sourcePage(racine, f).includes('content="noindex"'));
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(pages) });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n` });
    },
  };
}
