// Prépare les articles complets de la veille avant « vite build » (lancé par npm run build).
// Lit l'index de TOUS les articles (https://teiki5320.github.io/veille/articles/keurdeco/index.json : la veille
// ne supprime jamais un article, même quand son actu sort des 60 plus récentes), puis chaque article
// (articles/keurdeco/<id>.json), et les actus récentes (actus/keurdeco.json, pour « Autres actus ») ;
// range le tout dans .veille/articles-keurdeco.json (non suivi par git). Une page indexée ne disparaît donc jamais.
// build/articles-veille.ts en fait une page /actus/<slug>/ par article.
// Si la veille ne répond pas, le fichier est écrit vide : 0 page article, et le build continue (jamais d'échec).
// VEILLE_BASE=https://… change l'adresse de la veille (essais).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fichierCache, nettoyerCache } from '../build/articles-veille.ts';
import { urlArticle } from '../src/article-veille.ts';
import { BASE_VEILLE, SITE_VEILLE } from '../src/veille.ts';

const BASE = (process.env.VEILLE_BASE ?? BASE_VEILLE).replace(/\/?$/, '/');
const DELAI_MS = 15000;

async function lireJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), DELAI_MS);
  try {
    const rep = await fetch(url, { signal: ctrl.signal });
    if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
    return await rep.json();
  } finally {
    clearTimeout(minuteur);
  }
}

const fichier = fichierCache();
let actus: unknown[] = [];
const articles: unknown[] = [];

/** Identifiants des articles à construire : l'index de la veille (tous les articles, jamais supprimés). */
async function idsArticles(): Promise<string[]> {
  try {
    const index = (await lireJson(`${BASE}articles/${SITE_VEILLE}/index.json`)) as { articles?: unknown };
    if (Array.isArray(index?.articles)) return index.articles.map((a) => (a as { id?: unknown })?.id).filter((id): id is string => typeof id === 'string');
  } catch (e) {
    console.warn(`Index des articles injoignable (${(e as Error).message}) : on se rabat sur les actus récentes.`);
  }
  // Secours : les actus récentes qui annoncent un article.
  return actus.filter((a) => !!a && typeof (a as { slug?: unknown }).slug === 'string').map((a) => String((a as { id?: unknown }).id));
}

try {
  // Actus récentes : pour les vignettes « Autres actus » (une panne ici n'empêche pas de construire les articles).
  try {
    const brut = (await lireJson(`${BASE}actus/${SITE_VEILLE}.json`)) as { actus?: unknown };
    actus = Array.isArray(brut?.actus) ? brut.actus : [];
  } catch (e) {
    console.warn(`Fichier des actus injoignable (${(e as Error).message}).`);
  }
  const ids = [...new Set(await idsArticles())];
  // 6 lectures à la fois : rapide sans surcharger GitHub Pages.
  for (let i = 0; i < ids.length; i += 6) {
    const lot = await Promise.all(
      ids.slice(i, i + 6).map(async (id) => {
        const url = urlArticle(id, BASE);
        if (!url) return null;
        try {
          return await lireJson(url);
        } catch {
          return null; // article illisible cette fois : la carte mènera à la page de secours ou à la source
        }
      }),
    );
    articles.push(...lot.filter(Boolean));
  }
} catch (e) {
  console.warn(`Veille injoignable (${(e as Error).message}) : aucune page d'article cette fois.`);
}
const propre = nettoyerCache({ actus, articles });
mkdirSync(dirname(fichier), { recursive: true });
writeFileSync(fichier, `${JSON.stringify({ lu_le: new Date().toISOString(), actus, articles }, null, 1)}\n`);
console.log(`Veille : ${propre.actus.length} actu(s), ${propre.articles.length} article(s) complet(s) → ${propre.articles.length} page(s) /actus/<slug>/`);
