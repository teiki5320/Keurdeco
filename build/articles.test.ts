import { describe, expect, it } from 'vitest';
import { ancre, articlesPublies, donneesStructurees, lienEpingler, lireArticle, rendreAmbiance, rendreClassement, rendreCorps, sourcePageArticle, type Article } from './articles.ts';
import { estAffichable, type Produit } from './produits.ts';

// Données de test : les ASIN ci-dessous sont des valeurs fictives réservées aux tests (jamais publiées).
const produit = (id: string, statut: Produit['statut'] = 'actif', asin: string | null = 'TESTASIN01'): Produit => ({
  id,
  asin,
  nom: `Produit ${id}`,
  type_objet: 'coussin',
  matieres: ['wax'],
  couleurs: [],
  pieces: ['salon'],
  statut,
  verifie_le: '2026-09-01',
});

const produits = new Map<string, Produit>([
  ['a', produit('a')],
  ['b', produit('b', 'actif', 'TESTASIN02')],
  ['c', produit('c', 'a_selectionner', null)],
  ['d', produit('d', 'indisponible', 'TESTASIN04')],
]);

const entete = (supplement: string, type = 'ambiance') => `---
titre: "Titre de test"
description: "Une description de test suffisamment longue pour respecter la règle des soixante-dix caractères."
publie_le: 2026-10-05
type: ${type}
pieces: [salon]
matieres: [wax]
image: image-test
image_alt: "Texte alternatif de test"
image_ia: true
produits: [a, b, c]
epingles: ["Un", "Deux", "Trois"]
tableau_pinterest: salon
${supplement}
---

## Première partie

Texte.

{{produit: b}}
`;

const ambiance = lireArticle('test-ambiance', entete('hotspots:\n  - { produit: a, x: 10, y: 20 }\n  - { produit: c, x: 50, y: 50 }\n  - { produit: b, x: 80, y: 70 }'));

describe('lecture des articles', () => {
  it('lit l’en-tête et le corps', () => {
    expect(ambiance.titre).toBe('Titre de test');
    expect(ambiance.publieLe).toBe('2026-10-05');
    expect(ambiance.hotspots).toHaveLength(3);
    expect(ambiance.imageIa).toBe(true);
    expect(ambiance.corps).toContain('## Première partie');
  });

  it('refuse une description trop courte', () => {
    expect(() => lireArticle('x', entete('hotspots: [{ produit: a, x: 1, y: 1 }]').replace(/description: .*/, 'description: "Trop court"'))).toThrow(/70 à 180/);
  });

  it('refuse une rubrique inconnue', () => {
    expect(() => lireArticle('x', entete('hotspots: [{ produit: a, x: 1, y: 1 }]').replace('pieces: [salon]', 'pieces: [grenier]'))).toThrow(/grenier/);
  });

  it('exige des points cliquables pour une ambiance et 5 à 10 produits pour un top', () => {
    expect(() => lireArticle('x', entete(''))).toThrow(/hotspots/);
    expect(() => lireArticle('x', entete('classement:\n  - { produit: a, pourquoi: "p", a_savoir: "s" }', 'top'))).toThrow(/5 à 10/);
  });

  it('exige 3 à 8 titres d’épingles', () => {
    expect(() => lireArticle('x', entete('hotspots: [{ produit: a, x: 1, y: 1 }]').replace('["Un", "Deux", "Trois"]', '["Un"]'))).toThrow(/épingles/);
  });

  it('ne publie que les articles dont la date est passée', () => {
    const futur = { ...ambiance, slug: 'futur', publieLe: '2026-12-01' } as Article;
    expect(articlesPublies('2026-10-05', [ambiance, futur]).map((a) => a.slug)).toEqual(['test-ambiance']);
    expect(articlesPublies('2026-10-04', [ambiance, futur])).toEqual([]);
  });
});

describe('produits affichés', () => {
  it('seuls les produits actifs avec ASIN sont affichables', () => {
    expect(estAffichable(produits.get('a'))).toBe(true);
    expect(estAffichable(produits.get('c'))).toBe(false);
    expect(estAffichable(produits.get('d'))).toBe(false);
    expect(estAffichable(undefined)).toBe(false);
  });
});

describe('rendu', () => {
  it('ambiance : points numérotés accessibles, sans les produits masqués', () => {
    const html = rendreAmbiance(ambiance, produits);
    expect(html.match(/class="hotspot"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Objet 1 : Produit a"');
    expect(html).toContain('aria-label="Objet 2 : Produit b"');
    expect(html).not.toContain('Produit c');
    expect(html).toContain('Dans le même esprit');
    expect(html).toContain('Image d’ambiance créée par IA');
    expect(html).toContain('href="https://www.amazon.fr/dp/TESTASIN01?tag=keurdeco-21" rel="sponsored nofollow noopener" target="_blank"');
    expect(html).toContain('En tant que Partenaire Amazon');
  });

  it('ambiance sans image IA : pas de mention', () => {
    expect(rendreAmbiance({ ...ambiance, imageIa: false }, produits)).not.toContain('créée par IA');
  });

  it('encadrés produits dans le texte et titres avec ancres', () => {
    const html = rendreCorps(ambiance.corps, produits);
    expect(html).toContain('<h2 id="premiere-partie">');
    expect(html).toContain('class="encadre-produit"');
    expect(rendreCorps('{{produit: c}}', produits)).not.toContain('encadre-produit');
  });

  it('top : classement renuméroté sans produit masqué, et ItemList', () => {
    const top = lireArticle(
      'test-top',
      entete(
        `classement:\n${['a', 'c', 'b', 'd', 'a'].map((p) => `  - { produit: ${p}, pourquoi: "Pourquoi ${p}", a_savoir: "À savoir ${p}" }`).join('\n')}`,
        'top',
      ),
    );
    const html = rendreClassement(top, produits);
    expect(html.match(/class="classement__entree"/g)).toHaveLength(3);
    expect(html).toContain('id="rang-3"');
    expect(html).not.toContain('Pourquoi c');
    const ld = donneesStructurees(top, produits);
    expect(ld).toContain('"@type":"ItemList"');
    expect(ld).toContain('"numberOfItems":3');
  });

  it('page complète : Article en données structurées, bouton Épingler sans script externe', () => {
    const page = sourcePageArticle(ambiance, [ambiance], produits);
    expect(page).toContain('"@type":"Article"');
    expect(page).toContain('"datePublished":"2026-10-05"');
    expect(page).toContain('class="epingler"');
    expect(page).toContain('https://www.pinterest.com/pin/create/button/?url=');
    expect(page).not.toMatch(/<script[^>]+pinterest/);
  });

  it('lien Épingler : adresse, image et description encodées', () => {
    const lien = new URL(lienEpingler(ambiance, 'https://www.keurdeco.fr/', 'https://www.keurdeco.fr/epingles/x-1.jpg'));
    expect(lien.searchParams.get('url')).toBe('https://www.keurdeco.fr/test-ambiance.html');
    expect(lien.searchParams.get('media')).toBe('https://www.keurdeco.fr/epingles/x-1.jpg');
    expect(lien.searchParams.get('description')).toBe('Titre de test');
  });

  it('ancres : accents et ponctuation retirés', () => {
    expect(ancre('Où le placer ? L’entrée')).toBe('ou-le-placer-l-entree');
  });
});
