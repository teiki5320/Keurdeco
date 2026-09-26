import { describe, expect, it } from 'vitest';
import { AMAZON_TAG, attributsLienAmazon, lienAmazon } from './amazon.ts';

describe('liens Amazon', () => {
  it('construit le lien avec l’identifiant de suivi', () => {
    expect(lienAmazon('B0ABCDEFGH')).toBe(`https://www.amazon.fr/dp/B0ABCDEFGH?tag=${AMAZON_TAG}`);
  });
  it('refuse un ASIN mal formé', () => {
    expect(() => lienAmazon('b0abc')).toThrow(/ASIN invalide/);
  });
  it('ajoute rel sponsored nofollow noopener et target _blank', () => {
    const a = attributsLienAmazon('B0ABCDEFGH');
    expect(a).toContain('rel="sponsored nofollow noopener"');
    expect(a).toContain('target="_blank"');
  });
});
