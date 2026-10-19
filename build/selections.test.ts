import { describe, expect, it } from 'vitest';
import type { Produit } from './produits.ts';
import { classes, decouperASavoir, faitsProduit, mettreEnFormeTexte, rendreFiches, rendreTableau, rendreTop3 } from './selections.ts';

const produit = (id: string, nom: string, statut: Produit['statut'] = 'actif', type_objet = 'nappe'): Produit => ({
  id,
  asin: statut === 'actif' ? `TESTASIN${id.slice(-2).padStart(2, '0')}` : null,
  nom,
  type_objet,
  matieres: id === 'p01' ? ['kente'] : [],
  couleurs: ['terracotta'],
  pieces: [],
  statut,
  verifie_le: null,
});

const produits = new Map(
  [produit('p01', 'Chemin de table en lin imprimé kente, 33 × 183 cm'), produit('p02', 'Chemin de table à motifs tribaux africains'), produit('p03', 'Chemin masqué', 'a_selectionner'), produit('p04', 'Chemins de table en gaze, 55 × 300 cm, lot de 6')].map((p) => [p.id, p]),
);
const entrees = ['p01', 'p03', 'p02', 'p04'].map((id) => ({ produit: id, pourquoi: `Première phrase ${id}. Suite.`, a_savoir: `Détail ${id}. **Pour qui ?** Ceux qui aiment ${id}.` }));

describe('pages « Nos sélections »', () => {
  it('ne montre que des faits présents dans les données (dimensions et quantité lues dans le nom)', () => {
    const f = Object.fromEntries(faitsProduit(produits.get('p04')!).map((x) => [x.libelle, x.valeur]));
    expect(f).toEqual({ Type: 'Nappe', Couleurs: 'Terracotta', Dimensions: '55 × 300 cm', Quantité: 'Lot de 6' });
    expect(faitsProduit(produits.get('p02')!).map((x) => x.libelle)).not.toContain('Dimensions');
  });

  it('sépare « Pour qui ? » de « À savoir »', () => {
    expect(decouperASavoir('Il se froisse. **Pour qui ?** Les tables d’été.')).toEqual({ aSavoir: 'Il se froisse.', pourQui: 'les tables d’été.' });
    expect(decouperASavoir('Rien de plus.')).toEqual({ aSavoir: 'Rien de plus.', pourQui: '' });
  });

  it('top 3, fiches et tableau sans produit masqué, renumérotés, avec « Lien partenaire » et rel sponsored', () => {
    const liste = classes(entrees, produits);
    expect(liste.map((c) => c.rang)).toEqual([1, 2, 3]);
    const top3 = rendreTop3(liste);
    expect(top3.match(/class="top3__carte"/g)).toHaveLength(3);
    expect(top3).toContain('Notre choix');
    expect(top3).toContain('Première phrase p01.');
    const fiches = rendreFiches(liste);
    expect(fiches).not.toContain('Chemin masqué');
    expect(fiches).toContain('id="rang-3"');
    expect(fiches).toContain('<strong>Idéal pour</strong> ceux qui aiment p01.');
    expect(fiches.match(/Lien partenaire/g)).toHaveLength(3);
    expect(fiches).toContain('rel="sponsored nofollow noopener"');
    expect(fiches).not.toMatch(/€|prix|étoile/i);
    // Tous les produits sont des nappes : le type n'est répété ni dans les fiches ni dans le tableau.
    expect(fiches).not.toContain('<dt>Type</dt>');
    expect(rendreTableau(liste)).not.toContain('>Type<');
    expect(rendreTableau(liste)).toContain('>Dimensions<');
  });

  it('met les conseils « Comment choisir » en cartes et la FAQ en accordéon', () => {
    const html = mettreEnFormeTexte('<h2 id="comment-choisir-son-chemin">Comment choisir</h2>\n<ul><li>Un</li></ul><h2 id="questions-frequentes">Questions fréquentes</h2><h3 id="q1">Q1 ?</h3><p>R1</p><h3 id="q2">Q2 ?</h3><p>R2</p>');
    expect(html).toContain('<ul class="choix-cartes">');
    expect(html.match(/<details class="faq__question">/g)).toHaveLength(2);
    expect(html).toContain('<summary>Q1 ?</summary><div class="faq__reponse"><p>R1</p></div>');
  });
});
