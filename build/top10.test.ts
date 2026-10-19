import { describe, expect, it } from 'vitest';
import type { Produit } from './produits.ts';
import { urlPage } from './site.ts';
import { dixProduits, lireSujet, onglets, pagesTop10, rendreListe, rendreTexte, sujetsPublies, tousLesSujets } from './top10.ts';

const produit = (n: number, statut: Produit['statut'] = 'actif'): Produit => ({
  id: `p${n}`,
  asin: statut === 'actif' ? `TESTASIN${String(n).padStart(2, '0')}` : null,
  nom: `Produit ${n}`,
  type_objet: 'panier',
  matieres: [],
  couleurs: [],
  pieces: [],
  statut,
  verifie_le: null,
});

const source = (ids: number[], corps = '## Comment choisir\n\n- Un\n- Deux\n\n## Questions fréquentes\n\n### Q1 ?\n\nR1\n\n### Q2 ?\n\nR2\n\n### Q3 ?\n\nR3\n') => `---
onglet: "Paniers"
titre: "Top 10 des paniers"
description: "Une description de test assez longue pour respecter la règle des soixante-dix caractères."
ordre: 1
intro: "Comment le classement est fait."
produits:
${ids.map((n) => `  - { produit: p${n}, pourquoi: "Pourquoi ${n}.", ideal_pour: "les tests ${n}." }`).join('\n')}
---
${corps}`;

describe('Top 10 à onglets', () => {
  const tous = new Map([...Array.from({ length: 11 }, (_, i) => produit(i + 1)), produit(12, 'indisponible')].map((p) => [p.id, p]));

  it('vérifie l’en-tête : au moins 10 produits, « Comment choisir » et exactement 3 questions', () => {
    expect(() => lireSujet('x', source([1, 2, 3]))).toThrow(/au moins 10/);
    expect(() => lireSujet('x', source([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], '## Questions fréquentes\n\n### Q ?\n\nR\n'))).toThrow(/Comment choisir/);
    expect(() => lireSujet('x', source([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], '## Comment choisir\n\n- Un\n\n## Questions fréquentes\n\n### Q ?\n\nR\n'))).toThrow(/3 questions/);
  });

  it('montre exactement 10 vrais produits, sans les produits masqués ; moins de 10 : sujet non publié', () => {
    const s = lireSujet('paniers', source([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
    const dix = dixProduits(s, tous);
    expect(dix).toHaveLength(10);
    expect(dix.map((e) => e.p.id)).not.toContain('p12');
    expect(sujetsPublies(tous, [s])).toHaveLength(1);
    const neuf = lireSujet('court', source([12, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    expect(sujetsPublies(tous, [neuf])).toHaveLength(0);
  });

  it('chaque fiche : numéro, nom, pourquoi, idéal pour, bouton Amazon sponsorisé et « Lien partenaire » ; ni prix ni étoiles', () => {
    const html = rendreListe(dixProduits(lireSujet('paniers', source([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])), tous));
    expect(html.match(/class="top10__produit"/g)).toHaveLength(10);
    expect(html).toContain('id="n-10"');
    expect(html.match(/rel="sponsored nofollow noopener"/g)?.length).toBeGreaterThanOrEqual(10);
    expect(html.match(/Lien partenaire/g)).toHaveLength(10);
    expect(html).toContain('<strong>Idéal pour</strong> les tests 1.');
    expect(html).toContain('tag=keurdecofr-21');
    expect(html).not.toMatch(/€|prix|étoile|testé par nous/i);
  });

  it('« Comment choisir » en cartes, FAQ en accordéon, onglet actif marqué', () => {
    const texte = rendreTexte('## Comment choisir\n\n- Un\n\n## Questions fréquentes\n\n### Q1 ?\n\nR1\n\n### Q2 ?\n\nR2\n\n### Q3 ?\n\nR3\n');
    expect(texte).toContain('<ul class="choix-cartes">');
    expect(texte.match(/<details class="faq__question">/g)).toHaveLength(3);
    const s = lireSujet('paniers', source([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(onglets([s], 'paniers')).toContain('href="top-10/paniers" aria-current="page"');
  });

  it('une vraie page par onglet (top-10/<sujet>), et top-10/ qui renvoie au premier onglet', () => {
    const pages = pagesTop10();
    const sujets = sujetsPublies();
    expect(sujets.length).toBeGreaterThan(0);
    for (const s of sujets) {
      const html = pages.get(`top-10/${s.slug}.html`)!;
      expect(html).toContain(`<title>`);
      expect(html).toContain(s.description.slice(0, 40));
      expect(html.match(/class="top10__produit"/g)).toHaveLength(10);
    }
    expect(pages.get('top-10/index.html')).toContain(`<meta name="adresse-canonique" content="top-10/${sujets[0].slug}" />`);
    expect(urlPage(`top-10/${sujets[0].slug}.html`, 'https://x/')).toBe(`https://x/top-10/${sujets[0].slug}`);
    expect(urlPage('top-10/index.html', 'https://x/')).toBe('https://x/top-10/');
    expect(tousLesSujets().length).toBeGreaterThanOrEqual(sujets.length);
  });
});
