/**
 * Pages des articles complets de la veille (côté build).
 *
 * Avant « vite build », scripts/veille-articles.ts lit en ligne le fichier des actus de Keur Déco
 * et l'article de chaque actu qui a un slug, puis les range dans .veille/articles-keurdeco.json
 * (fichier local, non suivi par git). Ici, on lit ce fichier pour produire :
 *   - actus/<slug>/index.html : une page statique par article (indexée, dans le sitemap) ;
 *   - actus/article/index.html : la page de secours, remplie dans le navigateur (noindex, hors sitemap) ;
 *   - actus/index.html : simple renvoi vers actus.html (noindex), au cas où l'adresse /actus/ serait tapée.
 * Si la veille n'a pas répondu, le fichier est vide (ou absent) : 0 page article, le build continue.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type ArticleVeille, articleValide, corpsArticle, vueArticle } from '../src/article-veille.ts';
import { enHtml } from '../src/noeud.ts';
import { type Actu, nettoyerFichier } from '../src/veille.ts';
import { placerAnnonces } from './annonces.ts';
import { NOM_SITE, SITE_URL, titrePage } from './config.ts';
import { echapper } from './produits.ts';

/** Fichier préparé par scripts/veille-articles.ts (VEILLE_ARTICLES_FICHIER pour les tests de bout en bout). */
export function fichierCache(): string {
  return process.env.VEILLE_ARTICLES_FICHIER ?? resolve(import.meta.dirname, '../.veille/articles-keurdeco.json');
}

export interface CacheVeille {
  actus: Actu[];
  articles: ArticleVeille[];
}

/** Nettoie le contenu du fichier : actus valides, articles valides et un seul article par slug (le plus récent). */
export function nettoyerCache(brut: unknown): CacheVeille {
  const vide: CacheVeille = { actus: [], articles: [] };
  if (!brut || typeof brut !== 'object') return vide;
  const b = brut as { actus?: unknown; articles?: unknown };
  const actus = nettoyerFichier({ actus: b.actus })?.actus ?? [];
  const parSlug = new Map<string, ArticleVeille>();
  const valides = (Array.isArray(b.articles) ? b.articles : []).filter(articleValide).sort((x, y) => Date.parse(y.publie_le) - Date.parse(x.publie_le));
  for (const a of valides) if (!parSlug.has(a.slug)) parSlug.set(a.slug, a);
  return { actus, articles: [...parSlug.values()] };
}

/** Lit le fichier préparé ; jamais d'erreur (fichier absent ou illisible = aucun article). */
export function lireCache(fichier = fichierCache()): CacheVeille {
  try {
    return existsSync(fichier) ? nettoyerCache(JSON.parse(readFileSync(fichier, 'utf8'))) : nettoyerCache(null);
  } catch {
    return nettoyerCache(null);
  }
}

export function fichierArticle(slug: string): string {
  return `actus/${slug}/index.html`;
}

const jsonLd = (d: object) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`;

/** Image de partage : la photo de l'actu (une carte SVG n'est pas lue par les réseaux : image du site à la place). */
function metaImage(a: ArticleVeille): string {
  if (/\.svg$/i.test(a.image.url)) return '';
  return `\n    <meta name="image-partage-url" content="${echapper(a.image.url)}" />\n    <meta name="image-partage-taille" content="${a.image.largeur || 1600}x${a.image.hauteur || 900}" />`;
}

/** Page complète (avec marqueurs) d'un article. */
export function sourcePageArticleVeille(a: ArticleVeille, cache: CacheVeille, construits: ReadonlySet<string>, url = SITE_URL): string {
  const adresse = `${url}actus/${a.slug}/`;
  const autres = cache.actus.filter((x) => x.id !== a.id).slice(0, 3);
  const corps = `<div class="prose article-actu__corps">${placerAnnonces(enHtml(corpsArticle(a)), 1, 80)}</div>`;
  const vue = enHtml(vueArticle(a, { autres, construits, corpsHtml: corps })).replace('<div data-corps=""></div>', corps);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        headline: a.titre,
        description: a.chapo,
        datePublished: a.publie_le,
        dateModified: a.redige_le,
        image: [a.image.url],
        inLanguage: 'fr',
        wordCount: a.mots,
        mainEntityOfPage: adresse,
        url: adresse,
        author: { '@type': 'Organization', name: NOM_SITE, url },
        publisher: { '@type': 'Organization', name: NOM_SITE, url, logo: { '@type': 'ImageObject', url: `${url}images/marque/logo.png` } },
        isBasedOn: a.source_url,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: url },
          { '@type': 'ListItem', position: 2, name: 'Actus', item: `${url}actus.html` },
          { '@type': 'ListItem', position: 3, name: a.titre, item: adresse },
        ],
      },
    ],
  };
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${echapper(a.chapo)}" />
    <meta name="date-publication" content="${echapper(a.publie_le)}" />${metaImage(a)}
    <title>${echapper(titrePage(a.titre))}</title>
    <!--#head-->
    ${jsonLd(ld)}
  </head>
  <body>
    <!--#header-->
    <main id="contenu" class="page page--article-actu">
      ${vue}
    </main>
    <!--#footer-->
    <script type="module" src="/src/site.ts"></script>
  </body>
</html>
`;
}

/** Page de secours : coquille vide, remplie dans le navigateur (src/article-veille.ts). */
export function sourcePageSecours(): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <meta name="description" content="Article d’actualité de la déco africaine, rédigé par ${NOM_SITE}." />
    <title>Actus de la déco africaine · ${NOM_SITE}</title>
    <!--#head-->
  </head>
  <body>
    <!--#header-->
    <main id="contenu" class="page page--article-actu">
      <div data-article-secours aria-busy="true" aria-live="polite">
        <div class="article-actu conteneur">
          <p class="fil"><a href="index.html">Accueil</a> › <a href="actus.html">Actus</a></p>
          <h1 class="article-actu__titre">Chargement de l’article…</h1>
          <noscript><p>Cette page a besoin de JavaScript. <a href="actus.html">Voir toutes les actus</a>.</p></noscript>
        </div>
      </div>
    </main>
    <!--#footer-->
    <script type="module" src="/src/site.ts"></script>
  </body>
</html>
`;
}

/** Adresse /actus/ : renvoi vers la page des actus. */
export function sourcePageRenvoiActus(url = SITE_URL): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="robots" content="noindex" />
    <meta http-equiv="refresh" content="0; url=${url}actus.html" />
    <title>Actus · ${NOM_SITE}</title>
  </head>
  <body>
    <main id="contenu"><h1>Actus</h1><p><a href="${url}actus.html">Voir toutes les actus</a></p></main>
  </body>
</html>
`;
}

/** Slugs des articles dont une page est construite (écrits dans le code du navigateur par vite.config.ts). */
export function slugsConstruits(cache = lireCache()): string[] {
  return cache.articles.map((a) => a.slug);
}

/** Date de dernière mise à jour de chaque page d'article (<lastmod> du sitemap). */
export function datesArticlesVeille(cache = lireCache()): Map<string, string> {
  return new Map(cache.articles.map((a) => [fichierArticle(a.slug), a.redige_le.slice(0, 10)]));
}

/** Toutes les pages : une par article, plus la page de secours et le renvoi /actus/. */
export function pagesArticlesVeille(cache = lireCache()): Map<string, string> {
  const construits = new Set(slugsConstruits(cache));
  return new Map<string, string>([
    ['actus/index.html', sourcePageRenvoiActus()],
    ['actus/article/index.html', sourcePageSecours()],
    ...cache.articles.map((a) => [fichierArticle(a.slug), sourcePageArticleVeille(a, cache, construits)] as [string, string]),
  ]);
}
