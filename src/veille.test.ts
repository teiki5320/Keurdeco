import { describe, expect, it } from 'vitest';
import { actuValide, ageActu, filtrerParTag, imageCarree, nettoyerFichier, texteCredit, URL_VEILLE, type Actu } from './veille.ts';

const actu = (x: Partial<Actu> = {}): Actu => ({
  id: 'a'.repeat(40),
  titre: 'Une actu de déco',
  resume: 'Un résumé réécrit en français, de deux phrases.',
  source_nom: 'Le Monde',
  source_url: 'https://www.lemonde.fr/article',
  publie_le: '2026-10-26T10:00:00.000Z',
  tags: ['matiere:wax'],
  image: { url: 'https://teiki5320.github.io/veille/images/keurdeco/x.webp', source: 'wikimedia', credit: 'Auteur', licence: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:X.jpg', alt: 'Une image', largeur: 1600, hauteur: 900 },
  ...x,
});

describe('veille (navigateur)', () => {
  it('lit le fichier de Keur Déco', () => {
    expect(URL_VEILLE).toBe('https://teiki5320.github.io/veille/actus/keurdeco.json');
  });

  it('refuse les actus incomplètes, les liens Amazon et les images hors de la veille', () => {
    expect(actuValide(actu())).toBe(true);
    expect(actuValide(actu({ source_url: 'https://www.amazon.fr/dp/X' }))).toBe(false);
    expect(actuValide(actu({ source_url: 'javascript:alert(1)' }))).toBe(false);
    expect(actuValide(actu({ image: { ...actu().image, url: 'https://exemple.com/x.webp' } }))).toBe(false);
    expect(actuValide({ titre: 'x' })).toBe(false);
  });

  it('nettoie et trie de la plus récente à la plus ancienne ; fichier illisible = null', () => {
    const f = nettoyerFichier({ version: 3, site: 'keurdeco', genere_le: 'x', actus: [actu({ id: '1', publie_le: '2026-10-01T00:00:00Z' }), actu({ id: '2' }), { cassé: true }] });
    expect(f?.actus.map((a) => a.id)).toEqual(['2', '1']);
    expect(nettoyerFichier(null)).toBeNull();
    expect(nettoyerFichier({ actus: 'non' })).toBeNull();
  });

  it('filtre par matière', () => {
    const liste = [actu({ id: '1' }), actu({ id: '2', tags: ['matiere:kente'] }), actu({ id: '3', tags: undefined })];
    expect(filtrerParTag(liste, 'matiere:wax').map((a) => a.id)).toEqual(['1']);
    expect(filtrerParTag(liste)).toHaveLength(3);
  });

  it('vignette carrée et crédit', () => {
    expect(imageCarree(actu().image)).toBe('https://teiki5320.github.io/veille/images/keurdeco/x-carre.webp');
    const carte = { ...actu().image, url: 'https://teiki5320.github.io/veille/cartes/keurdeco/x.svg', source: 'carte' as const, credit: 'Illustration : Keur Déco', licence: null, page: null };
    expect(imageCarree(carte)).toBe(carte.url);
    expect(texteCredit(actu().image)).toBe('Photo : Auteur · CC BY 4.0');
    expect(texteCredit(carte)).toBe('Illustration : Keur Déco');
  });

  it('âge lisible', () => {
    const maintenant = Date.parse('2026-10-27T12:00:00Z');
    expect(ageActu('2026-10-27T09:00:00Z', maintenant)).toBe('il y a 3 h');
    expect(ageActu('2026-10-26T09:00:00Z', maintenant)).toBe('hier');
    expect(ageActu('2026-10-23T09:00:00Z', maintenant)).toBe('il y a 4 jours');
    expect(ageActu('pas une date', maintenant)).toBe('');
  });
});
