import { describe, expect, it } from 'vitest';
import { AMAZON_TAG, attributsLienAmazon, codeSuivi, CODES_SUIVI, EMPLACEMENTS, lienAmazon } from './amazon.ts';

describe('liens Amazon', () => {
  it('construit le lien avec l’identifiant de suivi', () => {
    expect(lienAmazon('B0ABCDEFGH')).toBe(`https://www.amazon.fr/dp/B0ABCDEFGH?tag=${AMAZON_TAG}`);
  });
  it('refuse un ASIN mal formé', () => {
    expect(() => lienAmazon('b0abc')).toThrow(/ASIN invalide/);
  });
  it('ajoute rel sponsored nofollow noopener et target _blank', () => {
    const a = attributsLienAmazon('B0ABCDEFGH', 'conseil');
    expect(a).toContain('rel="sponsored nofollow noopener"');
    expect(a).toContain('target="_blank"');
  });
});

describe('codes de suivi par emplacement', () => {
  it('chaque emplacement a un code de suivi au format Amazon', () => {
    for (const e of EMPLACEMENTS) expect(codeSuivi(e)).toMatch(/^[a-z0-9]{1,20}-21$/);
    expect(Object.keys(CODES_SUIVI).sort()).toEqual([...EMPLACEMENTS].sort());
  });
  it('le lien prend le code de son emplacement', () => {
    for (const e of EMPLACEMENTS) expect(attributsLienAmazon('B0ABCDEFGH', e)).toContain(`?tag=${CODES_SUIVI[e]}"`);
  });
  it('pour l’instant, tous les emplacements gardent le code actuel du site', () => {
    expect(new Set(Object.values(CODES_SUIVI))).toEqual(new Set([AMAZON_TAG]));
  });
});
