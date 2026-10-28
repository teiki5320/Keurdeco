/**
 * Article complet d'une actu, rédigé par la tâche de veille (dépôt public teiki5320/veille) :
 * https://teiki5320.github.io/veille/articles/keurdeco/<id>.json, schéma
 * https://teiki5320.github.io/veille/schema/article-schema-v1.json
 *
 * Le même contenu sert à deux pages :
 *   - /actus/<slug>/ : page statique construite au build (build/articles-veille.ts), indexée par Google ;
 *   - /actus/article/?id=<id> : page de secours (noindex), rendue dans le navigateur pour les actus
 *     publiées après la dernière construction du site.
 * Le contenu est décrit une seule fois (vueArticle) puis écrit en HTML échappé au build, ou en éléments
 * du navigateur (createElement, textContent) : jamais de texte du JSON dans innerHTML.
 */
import { type Element_, enDom, h, type Noeud } from './noeud.ts';
import { MATIERES } from './taxonomie.ts';
import {
  type Actu,
  ARTICLES_CONSTRUITS,
  BASE_VEILLE,
  carteActu,
  chargerActus,
  creditImage,
  dateActu,
  estHttp,
  estLienAmazon,
  type ImageActu,
  imageValide,
  lienExterne,
  SITE_VEILLE,
  SLUG,
} from './veille.ts';

export const NOM_SITE_ARTICLE = 'Keur Déco';

export interface BlocArticle {
  intertitre?: string | null;
  paragraphes: string[];
}

/** Un article (schéma article-schema-v1). */
export interface ArticleVeille {
  version: number;
  site: string;
  id: string;
  slug: string;
  titre: string;
  chapo: string;
  blocs: BlocArticle[];
  mots: number;
  lecture_min: number;
  theme?: string;
  pays?: string[];
  competition?: string | null;
  tags?: string[];
  source_nom: string;
  source_url: string;
  autres_sources?: string[];
  publie_le: string;
  redige_le: string;
  image: ImageActu;
}

export const ID_ARTICLE = /^[0-9a-f]{40}$/;

/** Adresse du fichier d'un article ; null si l'identifiant n'a pas la bonne forme. */
export function urlArticle(id: string, base = BASE_VEILLE): string | null {
  return ID_ARTICLE.test(id) ? `${base}articles/${SITE_VEILLE}/${id}.json` : null;
}

const texte = (s: unknown, min = 1): s is string => typeof s === 'string' && s.trim().length >= min;
const sourceSure = (u: unknown): u is string => {
  if (!estHttp(u)) return false;
  try {
    return !estLienAmazon(u);
  } catch {
    return false;
  }
};

/**
 * Garde seulement un article complet et sûr : identifiant et slug valides, texte présent, source http(s)
 * hors Amazon, image servie par la veille. Les autres sources douteuses sont simplement retirées.
 */
export function articleValide(x: unknown): x is ArticleVeille {
  if (!x || typeof x !== 'object') return false;
  const a = x as Partial<ArticleVeille>;
  if (typeof a.id !== 'string' || !ID_ARTICLE.test(a.id)) return false;
  if (typeof a.slug !== 'string' || !SLUG.test(a.slug) || a.slug.length > 80) return false;
  if (!texte(a.titre, 5) || !texte(a.chapo, 20) || !texte(a.source_nom)) return false;
  if (!sourceSure(a.source_url)) return false;
  if (typeof a.publie_le !== 'string' || Number.isNaN(Date.parse(a.publie_le))) return false;
  if (typeof a.redige_le !== 'string' || Number.isNaN(Date.parse(a.redige_le))) a.redige_le = a.publie_le;
  if (!Array.isArray(a.blocs) || a.blocs.length === 0) return false;
  for (const b of a.blocs) {
    if (!b || typeof b !== 'object' || !Array.isArray(b.paragraphes) || !b.paragraphes.every((p) => texte(p))) return false;
    if (b.intertitre != null && typeof b.intertitre !== 'string') return false;
  }
  if (!imageValide(a.image)) return false;
  if (!(Number.isInteger(a.lecture_min) && (a.lecture_min as number) > 0)) a.lecture_min = Math.max(1, Math.round((Number(a.mots) || 300) / 200));
  a.autres_sources = Array.isArray(a.autres_sources) ? a.autres_sources.filter(sourceSure) : [];
  a.tags = Array.isArray(a.tags) ? a.tags.filter((t) => typeof t === 'string') : [];
  return true;
}

/** Nom lisible d'une adresse (« www.lemonde.fr » → « lemonde.fr »). */
export function nomDomaine(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
}

/** Fiches existantes du site liées aux tags de l'article (les autres tags sont ignorés). */
export function fichesDesTags(tags: string[] = []): { href: string; libelle: string }[] {
  const fiches: { href: string; libelle: string }[] = [];
  for (const tag of new Set(tags)) {
    const m = tag.match(/^matiere:([a-z0-9-]+)$/);
    const matiere = m && MATIERES.find((x) => x.id === m[1]);
    if (matiere) fiches.push({ href: `matiere-${matiere.id}.html`, libelle: `Lire la fiche « ${matiere.nom} »` });
  }
  return fiches;
}

export interface OptionsVue {
  /** Autres actus proposées en fin de page (3 au plus, l'article lui-même est retiré). */
  autres?: Actu[];
  construits?: ReadonlySet<string>;
  /** Corps déjà écrit en HTML (build : annonces placées) ; sinon les blocs sont écrits ici. */
  corpsHtml?: string;
}

/** Corps de l'article : un h2 par intertitre, puis les paragraphes. */
export function corpsArticle(a: ArticleVeille): Noeud[] {
  return a.blocs.flatMap((b) => [b.intertitre ? h('h2', null, b.intertitre) : null, ...b.paragraphes.map((p) => h('p', null, p))]);
}

/** Encadré « Sources » : article rédigé par le site à partir de la source (et des autres sources). */
export function encadreSources(a: ArticleVeille): Element_ {
  const liens: Noeud[] = [lienExterne(a.source_url, `${a.source_nom} ↗`)];
  for (const u of a.autres_sources ?? []) liens.push(', ', lienExterne(u, `${nomDomaine(u)} ↗`));
  return h(
    'aside',
    { class: 'article-actu__sources', 'aria-labelledby': 'sources-article' },
    h('h2', { id: 'sources-article', class: 'article-actu__sources-titre' }, 'Sources'),
    h('p', null, `Article rédigé par ${NOM_SITE_ARTICLE} à partir de : `, ...liens, '.'),
  );
}

/** Contenu de la page d'un article (fil d'Ariane, titre, chapô, image, texte, sources, fiches, autres actus). */
export function vueArticle(a: ArticleVeille, o: OptionsVue = {}): Element_[] {
  const fiches = fichesDesTags(a.tags);
  const autres = (o.autres ?? []).filter((x) => x.id !== a.id).slice(0, 3);
  const date = dateActu(a.publie_le);
  const corps: Noeud = o.corpsHtml !== undefined ? null : h('div', { class: 'prose article-actu__corps' }, ...corpsArticle(a));
  const article = h(
    'article',
    { class: 'article-actu conteneur' },
    h(
      'header',
      { class: 'article-actu__entete' },
      h('p', { class: 'fil' }, h('a', { href: 'index.html' }, 'Accueil'), ' › ', h('a', { href: 'actus.html' }, 'Actus'), ' › ', h('span', { class: 'fil__courant' }, a.titre)),
      h('h1', { class: 'article-actu__titre' }, a.titre),
      h('p', { class: 'article-actu__chapo' }, a.chapo),
      h('p', { class: 'article-actu__meta' }, date && h('time', { datetime: a.publie_le }, date), date && ' · ', `${a.lecture_min} min de lecture`),
    ),
    h(
      'figure',
      { class: 'article-actu__figure' },
      h('div', { class: 'article-actu__image' }, h('img', { src: a.image.url, alt: a.image.alt, width: a.image.largeur || 1600, height: a.image.hauteur || 900, decoding: 'async', fetchpriority: 'high' })),
      creditImage(a.image),
    ),
    corps ?? h('div', { 'data-corps': '' }),
    encadreSources(a),
    fiches.length > 0 && h('p', { class: 'article-actu__fiches' }, ...fiches.flatMap((f, i) => [i > 0 && ' · ', h('a', { href: f.href }, `${f.libelle} →`)])),
  );
  const vues: Element_[] = [article];
  if (autres.length) {
    vues.push(
      h(
        'section',
        { class: 'conteneur a-lire autres-actus', 'aria-labelledby': 'autres-actus' },
        h('h2', { id: 'autres-actus' }, 'Autres actus'),
        h('div', { class: 'actus__liste' }, h('div', { class: 'actus__vignettes' }, ...autres.map((x) => carteActu(x, { bandeau: false, niveau: 'h3', dateFixe: true, construits: o.construits })))),
        h('p', { class: 'autres-actus__tout' }, h('a', { class: 'actus__tout', href: 'actus.html' }, 'Toutes les actus →')),
      ),
    );
  }
  return vues;
}

// ---------- Page de secours (navigateur) ----------

const DELAI_MS = 8000;

/** Lit un article de la veille ; null si l'identifiant est inconnu, le fichier illisible ou la veille injoignable. */
export async function chargerArticle(id: string, lire: typeof fetch = fetch): Promise<ArticleVeille | null> {
  const url = urlArticle(id);
  if (!url) return null;
  try {
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), DELAI_MS);
    const rep = await lire(url, { signal: ctrl.signal, cache: 'no-cache' }).finally(() => clearTimeout(minuteur));
    if (!rep.ok) return null;
    const brut: unknown = await rep.json();
    return articleValide(brut) && brut.id === id ? brut : null;
  } catch {
    return null;
  }
}

/** Message simple quand l'article n'existe pas (ou plus). */
export function vueIntrouvable(): Element_ {
  return h(
    'div',
    { class: 'article-actu conteneur article-actu--introuvable' },
    h('p', { class: 'fil' }, h('a', { href: 'index.html' }, 'Accueil'), ' › ', h('a', { href: 'actus.html' }, 'Actus')),
    h('h1', { class: 'article-actu__titre' }, 'Article introuvable'),
    h('p', { class: 'article-actu__chapo' }, 'Cet article n’est pas (ou plus) disponible.'),
    h('p', null, h('a', { class: 'bouton bouton--plein', href: 'actus.html' }, 'Voir toutes les actus')),
  );
}

/**
 * Page de secours /actus/article/?id=<id> : affiche l'article, ou un message s'il est inconnu.
 * Si la page construite existe déjà, on y va directement. Renvoie ce qui a été affiché.
 */
export async function afficherArticleSecours(
  conteneur: HTMLElement,
  adresse: string = location.href,
  lire: typeof fetch = fetch,
  construits: ReadonlySet<string> = ARTICLES_CONSTRUITS,
): Promise<'article' | 'introuvable' | 'redirection'> {
  const id = new URL(adresse).searchParams.get('id') ?? '';
  const article = await chargerArticle(id, lire);
  if (!article) {
    conteneur.replaceChildren(enDom(vueIntrouvable())!);
    document.title = `Article introuvable · ${NOM_SITE_ARTICLE}`;
    conteneur.setAttribute('aria-busy', 'false');
    return 'introuvable';
  }
  if (construits.has(article.slug)) {
    location.replace(new URL(`actus/${article.slug}/`, document.baseURI).href);
    return 'redirection';
  }
  const autres = await chargerActus();
  conteneur.replaceChildren(...vueArticle(article, { autres, construits }).map((v) => enDom(v)!));
  document.title = `${article.titre} · ${NOM_SITE_ARTICLE}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', article.chapo);
  conteneur.setAttribute('aria-busy', 'false');
  return 'article';
}

/** Point d'entrée de la page de secours (chargé seulement sur cette page par src/site.ts). */
export function demarrerPageSecours(): void {
  const conteneur = document.querySelector<HTMLElement>('[data-article-secours]');
  if (conteneur) void afficherArticleSecours(conteneur);
}
