import { describe, expect, it } from 'vitest';
import { FAMILLES } from '../src/taxonomie.ts';
import { articlesPublies } from './articles.ts';
import { pagesConseils } from './conseils.ts';
import { estAffichable, indexProduits } from './produits.ts';
import { ambiancesDeRubrique, PRODUITS_BANDEAU, produitsDeRubrique } from './rubriques.ts';
import { selectionAssortie } from './selection.ts';

describe('liens « Notre sélection »', () => {
  it('chaque conseil publié finit par un lien interne « Notre sélection », sans lien Amazon', () => {
    for (const [fichier, html] of pagesConseils()) {
      if (fichier === 'conseils.html') continue;
      const lien = html.match(/<p class="lien-selection">[\s\S]*?<\/p>/)?.[0];
      expect(lien, fichier).toBeTruthy();
      expect(lien).not.toContain('amazon');
    }
  });
  it('un titre qui cite un objet mène au Top 10 de cet objet', () => {
    expect(selectionAssortie('Quelle taille de tapis pour un salon ?', []).href).toBe('top-10/tapis-esprit-africain');
    expect(selectionAssortie('Comment entretenir un panier tressé ?', ['raphia-paniers']).href).toBe('top-10/paniers-tresses-africains');
  });
});

describe('bandeau de produits des pièces et matières', () => {
  it('4 produits affichables de la rubrique, ou rien', () => {
    const produits = indexProduits();
    const publies = articlesPublies();
    for (const famille of ['piece', 'matiere'] as const) {
      for (const r of FAMILLES[famille].liste) {
        const choix = produitsDeRubrique(famille, r.id, ambiancesDeRubrique(famille, r.id, publies));
        expect([0, PRODUITS_BANDEAU]).toContain(choix.length);
        for (const p of choix) {
          expect(estAffichable(produits.get(p.id))).toBe(true);
          expect(p[famille === 'piece' ? 'pieces' : 'matieres']).toContain(r.id);
        }
      }
    }
  });
});
