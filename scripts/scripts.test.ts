import { describe, expect, it } from 'vitest';
import { tousLesArticles } from '../build/articles.ts';
import { appliquerReponse } from './amazon-sync.mjs';
import { descriptionEpingle, GABARITS, gabaritPour } from './epingles.ts';
import { blocHotspots, remplacerHotspots } from './hotspots.mjs';
import { choisirEpingles, corpsEpingle, tableauPour } from './pinterest-lib.mjs';

const entree = (slug: string, numero: number, publie_le = '2026-10-05') => ({
  id: `${slug}-${numero}`,
  slug,
  numero,
  publie_le,
  titre: `Titre ${slug} ${numero}`,
  description: 'Description',
  alt: 'Alt',
  image: `https://www.keurdeco.fr/epingles/${slug}-${numero}.jpg`,
  lien: `https://www.keurdeco.fr/${slug}.html?utm_source=pinterest`,
  tableau: 'salon',
});

describe('épingles', () => {
  it('les 4 gabarits alternent pour un même article', () => {
    const a = tousLesArticles()[0];
    const g = [0, 1, 2, 3].map((i) => gabaritPour(a, i));
    expect(new Set(g).size).toBe(GABARITS.length);
  });

  it('description avec mots-clés, 500 caractères au plus', () => {
    for (const a of tousLesArticles()) {
      const d = descriptionEpingle(a);
      expect(d).toContain('déco africaine');
      expect(d.length).toBeLessThanOrEqual(500);
    }
  });
});

describe('publication Pinterest', () => {
  const manifeste = {
    epingles: [entree('salon', 1), entree('salon', 2), entree('bogolan', 1, '2026-10-19'), entree('bogolan', 2, '2026-10-19'), entree('paniers', 1, '2026-10-12'), entree('futur', 1, '2027-01-01')],
  };

  it('une seule épingle par article et par jour, les 1res épingles des articles récents d’abord', () => {
    const choix = choisirEpingles(manifeste, { publiees: [] }, { max: 5, aujourdhui: '2026-10-20' });
    expect(choix.map((e: { id: string }) => e.id)).toEqual(['bogolan-1', 'paniers-1', 'salon-1']);
  });

  it('respecte le maximum par exécution', () => {
    expect(choisirEpingles(manifeste, { publiees: [] }, { max: 2, aujourdhui: '2026-10-20' })).toHaveLength(2);
  });

  it('ignore les épingles déjà publiées et les articles déjà épinglés aujourd’hui', () => {
    const etat = { publiees: [{ id: 'bogolan-1', slug: 'bogolan', publie_le: '2026-10-19' }, { id: 'salon-1', slug: 'salon', publie_le: '2026-10-20' }] };
    const choix = choisirEpingles(manifeste, etat, { max: 5, aujourdhui: '2026-10-20' });
    expect(choix.map((e: { id: string }) => e.id)).toEqual(['paniers-1', 'bogolan-2']);
  });

  it('corps de POST /v5/pins : image_url et lien de l’article', () => {
    const c = corpsEpingle(entree('salon', 1), '123');
    expect(c.board_id).toBe('123');
    expect(c.media_source).toEqual({ source_type: 'image_url', url: 'https://www.keurdeco.fr/epingles/salon-1.jpg' });
    expect(c.link).toContain('utm_source=pinterest');
  });

  it('tableau de la rubrique, ou tableau général par défaut', () => {
    const config = { tableaux: { general: { board_id: '1' }, salon: { board_id: '2' }, wax: { board_id: '' } } };
    expect(tableauPour('salon', config)).toBe('2');
    expect(tableauPour('wax', config)).toBe('1');
    expect(tableauPour('inconnu', { tableaux: {} })).toBeNull();
  });
});

describe('synchronisation Amazon', () => {
  const base = { nom: 'Nom', type_objet: 'coussin', matieres: [], couleurs: [], pieces: [], source: 'manuel', image_url: null, image_maj_le: null };
  it('met à jour les produits vendus et passe en indisponible les autres', () => {
    // ASIN fictifs réservés aux tests.
    const produits = [
      { ...base, id: 'vendu', asin: 'TESTASIN01', statut: 'actif', verifie_le: '2026-01-01' },
      { ...base, id: 'rupture', asin: 'TESTASIN02', statut: 'actif', verifie_le: '2026-01-01' },
      { ...base, id: 'perdu', asin: 'TESTASIN03', statut: 'actif', verifie_le: '2026-01-01', image_url: 'https://m.media-amazon.com/x.jpg' },
    ];
    const reponse = {
      itemResults: {
        items: [
          { asin: 'TESTASIN02', offersV2: { listings: [{ availability: { type: 'OUT_OF_STOCK' } }] } },
          { asin: 'TESTASIN01', itemInfo: { title: { displayValue: 'Titre Amazon' } }, images: { primary: { large: { url: 'https://m.media-amazon.com/images/I/a.jpg' } } }, offersV2: { listings: [{ availability: { type: 'IN_STOCK' } }] } },
        ],
      },
      errors: [{ code: 'ItemNotAccessible', message: 'The ItemId TESTASIN03 is not accessible through the Creators API.' }],
    };
    const changements = appliquerReponse(produits, reponse, { date: '2026-10-05', maintenant: '2026-10-05T04:00:00Z' });
    expect(produits[0]).toMatchObject({ statut: 'actif', nom: 'Titre Amazon', verifie_le: '2026-10-05', source: 'creators-api', image_url: 'https://m.media-amazon.com/images/I/a.jpg', image_maj_le: '2026-10-05T04:00:00Z' });
    expect(produits[1].statut).toBe('indisponible');
    expect(produits[2]).toMatchObject({ statut: 'indisponible', image_url: null });
    expect(changements).toHaveLength(3);
  });
});

describe('outil des points cliquables', () => {
  it('produit le bloc YAML et le remplace dans l’en-tête', () => {
    const points = [{ produit: 'coussin', x: 12.5, y: 40 }];
    expect(blocHotspots(points)).toBe('hotspots:\n  - { produit: coussin, x: 12.5, y: 40 }');
    const source = '---\ntitre: "T"\nhotspots:\n  - { produit: ancien, x: 1, y: 1 }\n  - { produit: autre, x: 2, y: 2 }\nepingles: [a]\n---\n\nCorps\n';
    const nouveau = remplacerHotspots(source, points);
    expect(nouveau).toBe('---\ntitre: "T"\nhotspots:\n  - { produit: coussin, x: 12.5, y: 40 }\nepingles: [a]\n---\n\nCorps\n');
    expect(remplacerHotspots('---\ntitre: "T"\n---\nCorps', points)).toBe('---\ntitre: "T"\nhotspots:\n  - { produit: coussin, x: 12.5, y: 40 }\n---\nCorps');
  });
});
