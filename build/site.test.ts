import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MENTION_AMAZON } from '../src/amazon.ts';
import { couperTexte, suivantsEnBoucle, titrePage } from './config.ts';
import { codeAdsense, compteAdsense, pageAvecAdsense, datesSitemap, footer, header, insecables, mesureAudience, pagesGenerees, fluxRss, imagesDePage, referencement, sitemap, toutesLesPages, transformerPage, verificationGoogle, verificationPinterest } from './site.ts';

describe('parties communes', () => {
  it('navigation : la rubrique courante est signalée', () => {
    expect(header('matiere-wax.html')).toContain('<a href="matieres.html" aria-current="page">');
    expect(header('index.html')).not.toContain('aria-current');
  });

  it('le pied de page porte la mention Partenaires Amazon', () => {
    expect(footer()).toContain(MENTION_AMAZON);
    expect(MENTION_AMAZON).toBe('En tant que Partenaire Amazon, Keur Déco réalise un bénéfice sur les achats remplissant les conditions requises.');
  });

  it('marqueurs remplacés et typographie française', () => {
    const html = transformerPage('<html><head><title>T</title><!--#head--></head><body><!--#header--><p>Salut : ça va ?</p><!--#footer--></body></html>', 'a-propos.html');
    expect(html).not.toContain('<!--#');
    expect(html).toContain('Salut : ça va ?');
  });

  it('insécables : pas de modification dans les scripts', () => {
    expect(insecables('<script>a ? b : c</script>')).toBe('<script>a ? b : c</script>');
  });
});

describe('référencement', () => {
  const page = '<title>Salon terracotta · Keur Déco</title><meta name="description" content="Desc" /><meta name="date-publication" content="2026-10-05" />';
  it('canonique, Open Graph complet pour les Rich Pins', () => {
    const r = referencement(page, 'salon.html', 'https://www.keurdeco.com/');
    expect(r).toContain('<link rel="canonical" href="https://www.keurdeco.com/salon.html" />');
    expect(r).toContain('<meta property="og:type" content="article" />');
    expect(r).toContain('<meta property="og:title" content="Salon terracotta" />');
    expect(r).toContain('<meta property="og:site_name" content="Keur Déco" />');
    expect(r).toContain('<meta property="article:published_time" content="2026-10-05" />');
    expect(r).toContain('og:image');
  });

  it('max-image-preview:large sur toutes les pages, une seule balise robots (noindex compris)', () => {
    const tete = (robots: string) => `<html><head>${robots}<!--#head--></head><body></body></html>`;
    const indexee = transformerPage(tete(''), 'a-propos.html');
    expect(indexee.match(/<meta name="robots"/g)).toHaveLength(1);
    expect(indexee).toContain('<meta name="robots" content="max-image-preview:large" />');
    const cachee = transformerPage(tete('<meta name="robots" content="noindex" />'), '404.html');
    expect(cachee.match(/<meta name="robots"/g)).toHaveLength(1);
    expect(cachee).toContain('<meta name="robots" content="noindex, max-image-preview:large" />');
  });

  it('pas de référencement sur les pages noindex', () => {
    expect(referencement('<meta name="robots" content="noindex" />', '404.html')).toBe('');
  });

  it('revendication Pinterest et Plausible seulement si configurés', () => {
    expect(verificationPinterest('')).toBe('');
    expect(verificationPinterest('abc123')).toBe('<meta name="p:domain_verify" content="abc123" />');
    expect(verificationGoogle('')).toBe('');
    expect(verificationGoogle('xyz')).toBe('<meta name="google-site-verification" content="xyz" />');
    expect(mesureAudience('', '')).toBe('');
    expect(mesureAudience('', 'abc123')).toContain('static.cloudflareinsights.com/beacon.min.js');
    expect(mesureAudience('', 'abc123')).toContain('&quot;token&quot;:&quot;abc123&quot;');
    expect(mesureAudience('www.keurdeco.com', '')).toContain('data-domain="www.keurdeco.com"');
  });

  it('code AdSense avec l’identifiant éditeur, sauf sur les pages sans annonce', () => {
    expect(codeAdsense('')).toBe('');
    // Chargement retardé (comme keurkado.com) : après le chargement complet, quand le navigateur est libre, au plus tard 3 secondes ;
    // jamais de balise <script src> bloquante.
    expect(codeAdsense()).toContain('"https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2680784147246798"');
    expect(codeAdsense()).toContain("addEventListener('load',p,{once:true})");
    expect(codeAdsense()).toContain('requestIdleCallback(c,{timeout:3000})');
    expect(codeAdsense()).not.toContain('scroll');
    expect(codeAdsense()).not.toContain('<script async src=');
    // Balise de propriété sur toutes les pages, même sans annonce.
    expect(compteAdsense('')).toBe('');
    expect(compteAdsense()).toBe('<meta name="google-adsense-account" content="ca-pub-2680784147246798" />');
    expect(transformerPage('<html><head><!--#head--></head><body></body></html>', 'index.html')).toContain('google-adsense-account');
    const tete = '<html><head><!--#head--></head><body></body></html>';
    expect(transformerPage(tete, 'salon-terracotta-wax.html')).toContain('client=ca-pub-2680784147246798');
    expect(transformerPage(tete, 'confidentialite.html')).toContain('client=ca-pub-2680784147246798');
    for (const f of ['index.html', 'tops.html', 'top-nappes-wax.html', 'a-propos.html', 'mentions-legales.html', '404.html']) {
      expect(pageAvecAdsense(f), f).toBe(false);
      expect(transformerPage(tete, f), f).not.toContain('adsbygoogle');
    }
  });

  it('sitemap sans la 404', () => {
    const s = sitemap(['index.html', '404.html', 'articles.html'], 'https://www.keurdeco.com/');
    expect(s).toContain('<loc>https://www.keurdeco.com/</loc>');
    expect(s).toContain('<loc>https://www.keurdeco.com/articles.html</loc>');
    expect(s).not.toContain('404');
  });

  it('chaque page du sitemap a une date de mise à jour (lastmod)', () => {
    const racine = resolve(import.meta.dirname, '..');
    const dates = datesSitemap(racine);
    // Pages hors sitemap (noindex : page de secours des articles de la veille, renvoi /actus/) : pas de date.
    const generees = [...pagesGenerees()].filter(([, html]) => !/content="noindex"/.test(html)).map(([f]) => f);
    const pages = ['index.html', 'a-propos.html', 'mentions-legales.html', 'confidentialite.html', ...generees];
    for (const p of pages) expect(dates.get(p), p).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('les pages fixes portent des données structurées', () => {
    const racine = resolve(import.meta.dirname, '..');
    for (const f of ['a-propos.html', 'mentions-legales.html', 'confidentialite.html']) expect(readFileSync(resolve(racine, f), 'utf8'), f).toContain('application/ld+json');
    expect(pagesGenerees().get('conseils.html')).toContain('"CollectionPage"');
  });
});

describe('pages générées', () => {
  it('rubriques, glossaire et liste des articles', () => {
    const pages = pagesGenerees();
    for (const f of ['pieces.html', 'matieres.html', 'occasions.html', 'piece-salon.html', 'matiere-bogolan.html', 'occasion-tabaski.html', 'tops.html', 'guides.html', 'glossaire.html', 'glossaire-bogolan.html']) {
      expect(pages.has(f), f).toBe(true);
    }
  });
});

describe('titres et descriptions pour Google', () => {
  it('couperTexte coupe au dernier mot entier ; titrePage tient en 60 caractères', () => {
    expect(couperTexte('Un texte court', 60)).toBe('Un texte court');
    const coupe = couperTexte('Ibrahim Mahama investit la Fondation Cartier avec « Le temps des fêtes » et ses sacs de jute', 60);
    expect(coupe.length).toBeLessThanOrEqual(60);
    expect(coupe.endsWith('…')).toBe(true);
    expect(titrePage('x'.repeat(30) + ' ' + 'y'.repeat(40)).length).toBeLessThanOrEqual(60);
  });

  it('chaque page indexable : titre de 60 caractères au plus, description de 70 à 160 caractères', () => {
    const racine = resolve(import.meta.dirname, '..');
    const decoder = (s: string) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const generees = pagesGenerees();
    for (const [nom, chemin] of Object.entries(toutesLesPages(racine))) {
      const html = generees.get(`${nom}.html`) ?? readFileSync(chemin, 'utf8');
      if (/content="noindex"/.test(html)) continue;
      const titre = decoder(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
      const description = decoder(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
      expect(titre.length, `${nom} : titre (${titre.length})`).toBeLessThanOrEqual(60);
      expect(description.length, `${nom} : description (${description.length})`).toBeLessThanOrEqual(160);
      expect(description.length, `${nom} : description (${description.length})`).toBeGreaterThanOrEqual(70);
    }
  });
});

describe('sitemap des images', () => {
  it('chaque page liste ses images d’ambiance en 1600 px, sans doublon', () => {
    const html = '<img src="images/articles/salon-kente-800.webp" srcset="images/articles/salon-kente-400.webp 400w, images/articles/salon-kente-1600.webp 1600w" /><img src="images/produits/x-160.webp" />';
    expect(imagesDePage(html, 'https://x/')).toEqual(['https://x/images/articles/salon-kente-1600.webp']);
    const s = sitemap(['index.html'], 'https://x/', new Map(), new Map([['index.html', ['https://x/images/articles/a-1600.webp']]]));
    expect(s).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    expect(s).toContain('<image:image><image:loc>https://x/images/articles/a-1600.webp</image:loc></image:image>');
  });
});

describe('liens « À lire aussi » en boucle', () => {
  it('suivantsEnBoucle prend les suivants et reprend au début, sans l’élément courant', () => {
    expect(suivantsEnBoucle([1, 2, 3, 4, 5], 4, 3)).toEqual([5, 1, 2]);
    expect(suivantsEnBoucle([1, 2], 1, 3)).toEqual([2]);
  });
});

describe('flux RSS', () => {
  it('liste les articles et conseils publiés, du plus récent au plus ancien', () => {
    const flux = fluxRss('https://x/');
    expect(flux).toContain('<rss version="2.0"');
    expect(flux).toContain('<atom:link href="https://x/feed.xml" rel="self"');
    const dates = [...flux.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) => Date.parse(m[1]));
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.length).toBeLessThanOrEqual(30);
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
  });
});

describe('liens Amazon des pages construites', () => {
  it('chaque lien Amazon porte un code de suivi de la table CODES_SUIVI', async () => {
    const { CODES_SUIVI } = await import('../src/amazon.ts');
    const codes = new Set(Object.values(CODES_SUIVI));
    let liens = 0;
    for (const [fichier, html] of pagesGenerees()) {
      for (const [, href] of html.matchAll(/href="(https:\/\/www\.amazon\.fr\/[^"]*)"/g)) {
        liens++;
        const tag = new URL(href.replace(/&amp;/g, '&')).searchParams.get('tag');
        expect(tag, `${fichier} : ${href}`).not.toBeNull();
        expect(codes.has(tag!), `${fichier} : ${href}`).toBe(true);
      }
    }
    expect(liens).toBeGreaterThan(100);
  });
});
