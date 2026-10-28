import { describe, expect, it } from 'vitest';
import { type ArticleVeille, articleValide, chargerArticle, encadreSources, fichesDesTags, urlArticle, vueArticle, vueIntrouvable } from './article-veille.ts';
import { enHtml, h } from './noeud.ts';
import { type Actu, actuValide, carteActu, lienCarte } from './veille.ts';

const ID = 'a'.repeat(40);
const image = { url: 'https://teiki5320.github.io/veille/images/keurdeco/x.webp', source: 'wikimedia' as const, credit: 'Auteur', licence: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:X.jpg', alt: 'Une image', largeur: 1600, hauteur: 900 };

const actu = (x: Partial<Actu> = {}): Actu => ({
  id: ID,
  titre: 'Une actu de déco',
  resume: 'Un résumé réécrit en français, de deux phrases.',
  source_nom: 'Le Monde',
  source_url: 'https://www.lemonde.fr/article',
  publie_le: '2026-10-26T10:00:00.000Z',
  image,
  ...x,
});

const article = (x: Partial<ArticleVeille> = {}): ArticleVeille => ({
  version: 1,
  site: 'keurdeco',
  id: ID,
  slug: 'une-actu-de-deco',
  titre: 'Une actu de déco',
  chapo: 'Un chapô de démonstration, assez long pour passer la validation du schéma.',
  blocs: [
    { intertitre: null, paragraphes: ['Premier paragraphe de démonstration, réécrit.'] },
    { intertitre: 'Un intertitre', paragraphes: ['Deuxième paragraphe <b>pas du HTML</b>.', 'Troisième paragraphe de démonstration.'] },
  ],
  mots: 320,
  lecture_min: 2,
  tags: ['matiere:wax', 'matiere:inconnue', 'personne:x'],
  source_nom: 'Le Monde',
  source_url: 'https://www.lemonde.fr/article',
  autres_sources: ['https://www.bbc.com/afrique/x', 'https://www.amazon.fr/dp/X', 'javascript:alert(1)'],
  publie_le: '2026-10-26T10:00:00.000Z',
  redige_le: '2026-10-27T10:00:00.000Z',
  image,
  ...x,
});

describe('choix du lien d’une carte d’actu', () => {
  const construits = new Set(['une-actu-de-deco']);

  it('page construite /actus/<slug>/ en priorité', () => {
    expect(lienCarte(actu({ slug: 'une-actu-de-deco', article_url: 'https://teiki5320.github.io/veille/articles/keurdeco/x.json' }), construits)).toEqual({ href: 'actus/une-actu-de-deco/', type: 'article' });
  });

  it('page de secours quand l’article existe mais n’a pas encore de page', () => {
    expect(lienCarte(actu({ slug: 'nouvelle-actu', article_url: 'https://teiki5320.github.io/veille/articles/keurdeco/x.json' }), construits)).toEqual({ href: `actus/article/?id=${ID}`, type: 'secours' });
  });

  it('la source quand l’actu n’a pas encore d’article', () => {
    expect(lienCarte(actu(), construits)).toEqual({ href: 'https://www.lemonde.fr/article', type: 'source' });
    expect(lienCarte(actu({ slug: 'sans-article-url' }), construits).type).toBe('source');
  });

  it('un slug ou un article_url douteux est ignoré (la carte mène à la source)', () => {
    const a = actu({ slug: '../pirate', article_url: 'https://exemple.com/x.json' });
    expect(actuValide(a)).toBe(true);
    expect(a.slug).toBeUndefined();
    expect(a.article_url).toBeUndefined();
    expect(lienCarte(a, construits).type).toBe('source');
  });

  it('toute la carte est un lien ; la source reste écrite en texte', () => {
    const interne = enHtml(carteActu(actu({ slug: 'une-actu-de-deco', article_url: 'https://teiki5320.github.io/veille/articles/keurdeco/x.json', lecture_min: 3 }), { bandeau: false, niveau: 'h3', construits }));
    expect(interne).toContain('<a class="actu__lien" href="actus/une-actu-de-deco/">');
    expect(interne).toContain('Source : Le Monde<');
    expect(interne).toContain('Lire l’article · 3 min');
    expect(interne).not.toContain('href="https://www.lemonde.fr');
    const externe = enHtml(carteActu(actu(), { bandeau: true, niveau: 'h2', construits }));
    expect(externe).toContain('href="https://www.lemonde.fr/article" target="_blank" rel="noopener nofollow"');
    expect(externe).toContain('Source : Le Monde ↗');
  });
});

describe('article complet de la veille', () => {
  it('valide un article et retire les autres sources douteuses', () => {
    const a = article();
    expect(articleValide(a)).toBe(true);
    expect(a.autres_sources).toEqual(['https://www.bbc.com/afrique/x']);
    expect(articleValide(article({ id: 'pas-un-id' }))).toBe(false);
    expect(articleValide(article({ slug: 'article' }))).toBe(false);
    expect(articleValide(article({ source_url: 'https://www.amazon.fr/dp/X' }))).toBe(false);
    expect(articleValide(article({ image: { ...image, url: 'https://exemple.com/x.webp' } }))).toBe(false);
    expect(articleValide(article({ blocs: [] }))).toBe(false);
  });

  it('fiches liées : seulement les matières qui existent sur le site', () => {
    expect(fichesDesTags(['matiere:wax', 'matiere:inconnue', 'personne:x', 'matiere:wax'])).toEqual([{ href: 'matiere-wax.html', libelle: 'Lire la fiche « Wax »' }]);
  });

  it('contenu : fil d’Ariane, h1, chapô, durée, image et crédit, intertitres, sources, autres actus', () => {
    const a = article();
    articleValide(a);
    const autres = [actu({ id: ID }), actu({ id: 'b'.repeat(40), titre: 'Autre 1' }), actu({ id: 'c'.repeat(40), titre: 'Autre 2' }), actu({ id: 'd'.repeat(40), titre: 'Autre 3' }), actu({ id: 'e'.repeat(40), titre: 'Autre 4' })];
    const html = enHtml(vueArticle(a, { autres, construits: new Set() }));
    expect(html).toContain('<a href="index.html">Accueil</a> › <a href="actus.html">Actus</a> › <span class="fil__courant">Une actu de déco</span>');
    expect(html).toMatch(/<h1 class="article-actu__titre">Une actu de déco<\/h1>/);
    expect(html).toContain('2 min de lecture');
    expect(html).toContain('26 octobre 2026');
    expect(html).toContain('fetchpriority="high"');
    expect(html).toContain('Photo : Auteur · CC BY 4.0');
    expect(html).toContain('<h2>Un intertitre</h2>');
    expect(html).toContain('&lt;b&gt;pas du HTML&lt;/b&gt;');
    expect(html).toContain('Article rédigé par Keur Déco à partir de : <a href="https://www.lemonde.fr/article" target="_blank" rel="noopener nofollow">Le Monde ↗</a>, <a href="https://www.bbc.com/afrique/x" target="_blank" rel="noopener nofollow">bbc.com ↗</a>');
    expect(html).toContain('href="matiere-wax.html"');
    // 3 autres actus, sans l'article lui-même, images en chargement différé.
    expect(html.match(/class="actu actu--vignette"/g)).toHaveLength(3);
    expect(html).not.toContain('Autre 4');
    expect(html.match(/loading="lazy"/g)).toHaveLength(3);
    expect(html).not.toMatch(/amazon/i);
  });

  it('encadré des sources sans autre source', () => {
    expect(enHtml(encadreSources(article({ autres_sources: [] })))).toContain('à partir de : <a href="https://www.lemonde.fr/article" target="_blank" rel="noopener nofollow">Le Monde ↗</a>.');
  });

  it('échappe le texte et les attributs', () => {
    expect(enHtml(h('a', { href: 'x"><script>' }, '<i>'))).toBe('<a href="x&quot;&gt;&lt;script&gt;">&lt;i&gt;</a>');
  });
});

describe('page de secours /actus/article/?id=…', () => {
  const reponse = (corps: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } }));

  it('lit articles/keurdeco/<id>.json, et refuse un identifiant mal formé sans rien demander', async () => {
    expect(urlArticle(ID)).toBe(`https://teiki5320.github.io/veille/articles/keurdeco/${ID}.json`);
    expect(urlArticle('../../secret')).toBeNull();
    let appels = 0;
    const lire = (() => {
      appels++;
      return reponse(article());
    }) as typeof fetch;
    expect(await chargerArticle('../../secret', lire)).toBeNull();
    expect(appels).toBe(0);
    expect((await chargerArticle(ID, lire))?.slug).toBe('une-actu-de-deco');
  });

  it('id inconnu, fichier invalide ou veille injoignable : null (message « Article introuvable »)', async () => {
    expect(await chargerArticle(ID, (() => reponse({}, 404)) as typeof fetch)).toBeNull();
    expect(await chargerArticle(ID, (() => reponse({ titre: 'x' })) as typeof fetch)).toBeNull();
    expect(await chargerArticle(ID, (() => reponse(article({ id: 'f'.repeat(40) }))) as typeof fetch)).toBeNull();
    expect(await chargerArticle(ID, (() => Promise.reject(new Error('réseau'))) as typeof fetch)).toBeNull();
    const message = enHtml(vueIntrouvable());
    expect(message).toContain('Article introuvable');
    expect(message).toContain('href="actus.html"');
  });
});
