import { describe, expect, it } from 'vitest';
import { MENTION_AMAZON } from '../src/amazon.ts';
import { footer, header, insecables, mesureAudience, pagesGenerees, referencement, sitemap, transformerPage, verificationGoogle, verificationPinterest } from './site.ts';

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

  it('sitemap sans la 404', () => {
    const s = sitemap(['index.html', '404.html', 'articles.html'], 'https://www.keurdeco.com/');
    expect(s).toContain('<loc>https://www.keurdeco.com/</loc>');
    expect(s).toContain('<loc>https://www.keurdeco.com/articles.html</loc>');
    expect(s).not.toContain('404');
  });
});

describe('pages générées', () => {
  it('rubriques, glossaire et liste des articles', () => {
    const pages = pagesGenerees();
    for (const f of ['pieces.html', 'matieres.html', 'occasions.html', 'piece-salon.html', 'matiere-bogolan.html', 'occasion-tabaski.html', 'articles.html', 'glossaire.html', 'glossaire-bogolan.html']) {
      expect(pages.has(f), f).toBe(true);
    }
  });
});
