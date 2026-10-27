import { describe, expect, it } from 'vitest';
import { MATIERES } from '../src/taxonomie.ts';
import { pagesGenerees, transformerPage } from './site.ts';
import { blocActus, entitesVeille, titreActusMatiere } from './veille.ts';

describe('veille : fichier des matières (veille/entites.json)', () => {
  it('contient toutes les matières, avec leur tag, leur nom et des variantes', () => {
    const entites = entitesVeille();
    expect(entites.map((e) => e.tag)).toEqual(MATIERES.map((m) => `matiere:${m.id}`));
    expect(entites).toHaveLength(8);
    for (const e of entites) {
      expect(e.tag).toMatch(/^matiere:[a-z0-9-]+$/);
      expect(e.nom.length).toBeGreaterThan(1);
      expect(e.autres_noms.length).toBeGreaterThan(0);
    }
    expect(entites.find((e) => e.tag === 'matiere:wax')?.autres_noms).toContain('wax hollandais');
    expect(entites.find((e) => e.tag === 'matiere:bogolan')?.autres_noms).toContain('bògòlanfini');
    expect(entites.find((e) => e.tag === 'matiere:indigo')?.autres_noms).toContain('adire');
  });
});

describe('veille : sections d’actus', () => {
  it('accueil : section cachée, titre et lien vers actus.html', () => {
    const html = blocActus(4);
    expect(html).toMatch(/<section [^>]*data-actus data-limite="4"[^>]* hidden>/);
    expect(html).toContain('Actus de la déco africaine');
    expect(html).toContain('href="actus.html"');
    expect(html).toContain('data-bandeau-prioritaire');
  });

  it('page matière : 3 actus de la matière, titre « L’actu du wax », sans lien', () => {
    const html = blocActus(3, 'matiere:wax');
    expect(html).toContain('data-tag="matiere:wax"');
    expect(html).toContain('data-limite="3"');
    expect(html).toContain('L’actu du wax');
    expect(html).not.toContain('actus.html');
    expect(titreActusMatiere('indigo')).toBe('L’actu de l’indigo');
  });

  it('marqueurs remplacés, sans lien Amazon ni bouton Épingler', () => {
    const html = transformerPage('<html><head><title>T</title><!--#head--></head><body><!--#actus:20--><!--#actus:3:matiere:kente--></body></html>', 'actus.html');
    expect(html).not.toContain('<!--#');
    expect(html).toContain('data-limite="20"');
    expect(html).toContain('data-tag="matiere:kente"');
    expect(html).not.toMatch(/amazon|epingler/i);
  });

  it('chaque page matière porte son bloc d’actus', () => {
    const pages = pagesGenerees();
    for (const m of MATIERES) expect(pages.get(`matiere-${m.id}.html`)).toContain(`<!--#actus:3:matiere:${m.id}-->`);
    expect(pages.get('piece-salon.html')).not.toContain('<!--#actus');
  });
});
