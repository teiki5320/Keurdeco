import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lireCache, nettoyerCache, pagesArticlesVeille, slugsConstruits } from './articles-veille.ts';
import { pageAvecAdsense, sitemap, transformerPage } from './site.ts';

const ID = '1'.repeat(40);
const image = { url: 'https://teiki5320.github.io/veille/images/keurdeco/x.webp', source: 'wikimedia', credit: 'Auteur', licence: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:X.jpg', alt: 'Une image', largeur: 1600, hauteur: 900 };
const actu = (id: string, x: object = {}) => ({ id, titre: `Actu ${id.slice(0, 3)}`, resume: 'Résumé de démonstration.', source_nom: 'Le Monde', source_url: 'https://www.lemonde.fr/a', publie_le: '2026-10-26T10:00:00.000Z', image, ...x });
const article = (x: object = {}) => ({
  version: 1,
  site: 'keurdeco',
  id: ID,
  slug: 'expo-wax-dakar',
  titre: 'Une exposition de wax à Dakar',
  chapo: 'Un chapô de démonstration, assez long pour passer la validation du schéma.',
  blocs: [
    { intertitre: null, paragraphes: ['Premier paragraphe de démonstration. '.repeat(14)] },
    { intertitre: 'Deuxième partie', paragraphes: ['Deuxième paragraphe de démonstration. '.repeat(14)] },
    { intertitre: 'Troisième partie', paragraphes: ['Troisième paragraphe de démonstration. '.repeat(14)] },
  ],
  mots: 330,
  lecture_min: 2,
  tags: ['matiere:wax'],
  source_nom: 'Le Monde',
  source_url: 'https://www.lemonde.fr/a',
  publie_le: '2026-10-26T10:00:00.000Z',
  redige_le: '2026-10-27T10:00:00.000Z',
  image,
  ...x,
});
const cache = () =>
  nettoyerCache({
    actus: [actu(ID, { slug: 'expo-wax-dakar', article_url: 'https://teiki5320.github.io/veille/articles/keurdeco/1.json' }), actu('2'.repeat(40)), actu('3'.repeat(40)), actu('4'.repeat(40))],
    articles: [article(), article({ id: '9'.repeat(40), publie_le: '2026-01-01T00:00:00.000Z' }), { cassé: true }],
  });

describe('pages des articles de la veille', () => {
  it('veille injoignable (fichier absent ou illisible) : aucune page article, le build continue', () => {
    expect(lireCache('/chemin/qui/n-existe/pas.json')).toEqual({ actus: [], articles: [] });
    const dossier = mkdtempSync(join(tmpdir(), 'keurdeco-veille-'));
    writeFileSync(join(dossier, 'casse.json'), '{pas du json');
    expect(lireCache(join(dossier, 'casse.json')).articles).toEqual([]);
    const pages = pagesArticlesVeille({ actus: [], articles: [] });
    expect([...pages.keys()]).toEqual(['actus/index.html', 'actus/article/index.html']);
  });

  it('un seul article par slug (le plus récent) ; les entrées invalides sont ignorées', () => {
    const c = cache();
    expect(c.articles).toHaveLength(1);
    expect(c.articles[0].id).toBe(ID);
    expect(slugsConstruits(c)).toEqual(['expo-wax-dakar']);
  });

  it('page /actus/<slug>/ : titre, description, canonical, Open Graph, JSON-LD NewsArticle, une annonce', () => {
    const source = pagesArticlesVeille(cache()).get('actus/expo-wax-dakar/index.html')!;
    const html = transformerPage(source, 'actus/expo-wax-dakar/index.html');
    expect(html).toContain('<title>Une exposition de wax à Dakar · Keur Déco</title>');
    expect(html).toContain('<meta name="description" content="Un chapô de démonstration');
    expect(html).toContain('<base href="../../" />');
    expect(html).toContain('<link rel="canonical" href="https://www.keurdeco.com/actus/expo-wax-dakar/" />');
    expect(html).toContain('<meta property="og:image" content="https://teiki5320.github.io/veille/images/keurdeco/x.webp" />');
    expect(html).toContain('<meta property="og:image:width" content="1600" />');
    expect(html).toContain('<meta property="og:type" content="article" />');
    expect(html).toMatch(/<a href="actus\.html" aria-current="page">Actus<\/a>/);
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
    const news = ld['@graph'][0];
    expect(news).toMatchObject({ '@type': 'NewsArticle', headline: 'Une exposition de wax à Dakar', datePublished: '2026-10-26T10:00:00.000Z', dateModified: '2026-10-27T10:00:00.000Z', image: [image.url], isBasedOn: 'https://www.lemonde.fr/a' });
    expect(news.publisher).toMatchObject({ '@type': 'Organization', name: 'Keur Déco' });
    expect(html.match(/class="adsbygoogle"/g)).toHaveLength(1);
    expect(html).toContain('pagead2.googlesyndication.com');
    expect(html).toContain('<h2>Deuxième partie</h2>');
    expect(html).toContain('Autres actus');
    expect(html).not.toMatch(/amazon\.fr|tag=keurdeco/);
    expect(html).not.toContain('data-corps');
  });

  it('page de secours : noindex, sans annonce, hors sitemap', () => {
    const pages = pagesArticlesVeille(cache());
    const secours = transformerPage(pages.get('actus/article/index.html')!, 'actus/article/index.html');
    expect(secours).toContain('<meta name="robots" content="noindex" />');
    expect(secours).toContain('data-article-secours');
    expect(secours).not.toContain('rel="canonical"');
    expect(pageAvecAdsense('actus/article/index.html')).toBe(false);
    expect(pageAvecAdsense('actus/index.html')).toBe(false);
    expect(pageAvecAdsense('actus/expo-wax-dakar/index.html')).toBe(true);
    const indexees = [...pages].filter(([, h]) => !/content="noindex"/.test(h)).map(([f]) => f);
    const plan = sitemap(indexees);
    expect(plan).toContain('<loc>https://www.keurdeco.com/actus/expo-wax-dakar/</loc>');
    expect(plan).not.toContain('actus/article');
  });

  it('les cartes « Autres actus » de la page mènent à la page construite, à la secours ou à la source', () => {
    const c = nettoyerCache({
      actus: [actu(ID, { slug: 'expo-wax-dakar' }), actu('2'.repeat(40), { slug: 'pas-encore-construit', article_url: 'https://teiki5320.github.io/veille/articles/keurdeco/2.json' }), actu('3'.repeat(40))],
      articles: [article(), article({ id: '5'.repeat(40), slug: 'autre-article-construit', titre: 'Un autre article construit' })],
    });
    c.actus.push({ ...c.actus[2], id: '5'.repeat(40), slug: 'autre-article-construit' });
    const html = pagesArticlesVeille(c).get('actus/expo-wax-dakar/index.html')!;
    expect(html).toContain(`href="actus/article/?id=${'2'.repeat(40)}"`);
    expect(html).toContain('href="https://www.lemonde.fr/a" target="_blank" rel="noopener nofollow"');
    expect(html).toContain('href="actus/autre-article-construit/"');
  });
});
