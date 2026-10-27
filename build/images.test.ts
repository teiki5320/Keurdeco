import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conseilsPublies, imageConseil, sourcePageConseil, tousLesConseils } from './conseils.ts';
import { creditImage, DOSSIER_IMAGES, imageExiste, legendeCredit, RACINE, texteAlternatif, texteCredit } from './images.ts';

const credits = JSON.parse(readFileSync(resolve(RACINE, 'src/data/credits-images.json'), 'utf8')) as Record<string, Record<string, string>>;
/** Licences admises : usage commercial possible (les pages ont de la publicité). */
const LICENCES = /^(CC0|Public domain|CC BY( \d\.\d)?|CC BY-SA( \d\.\d)?)$/;

describe('images libres et cartes générées (src/data/credits-images.json)', () => {
  it('chaque entrée a ses fichiers WebP rangés dans le dépôt et son texte alternatif', () => {
    for (const nom of Object.keys(credits)) {
      expect(imageExiste(nom), nom).toBe(true);
      expect(texteAlternatif(nom).length, nom).toBeGreaterThan(10);
    }
  });

  it('photos : auteur connu, licence commerciale, page d’origine', () => {
    for (const [nom, c] of Object.entries(credits).filter(([, c]) => c.type === 'photo')) {
      expect(c.auteur.trim(), nom).not.toMatch(/^$|inconnu|unknown|anonym/i);
      expect(c.licence, nom).toMatch(LICENCES);
      expect(c.page, nom).toMatch(/^https:\/\/(commons\.wikimedia\.org|.*openverse|www\.flickr\.com)\//);
      expect(['wikimedia', 'openverse'], nom).toContain(c.source);
    }
  });

  it('jamais deux fois la même image sur le site', () => {
    const pages = Object.values(credits).filter((c) => c.type === 'photo').map((c) => c.page);
    expect(new Set(pages).size).toBe(pages.length);
    const empreintes = new Map<string, string>();
    for (const f of readdirSync(DOSSIER_IMAGES).filter((f) => f.endsWith('-800.webp'))) {
      const h = createHash('sha1').update(readFileSync(resolve(DOSSIER_IMAGES, f))).digest('hex');
      expect(empreintes.get(h), `${f} identique à ${empreintes.get(h)}`).toBeUndefined();
      empreintes.set(h, f);
    }
  });

  it('crédit affiché : « Photo : auteur · licence » avec lien, ou « Illustration : Keur Déco »', () => {
    expect(texteCredit('conseil-aso-oke')).toBe('Photo : Toyinvisuals · CC BY-SA 4.0');
    expect(legendeCredit('conseil-aso-oke')).toContain('href="https://commons.wikimedia.org/wiki/File:Aso-Oke.jpg"');
    expect(texteCredit('conseil-plaid-deco-africaine')).toBe('Illustration : Keur Déco');
    expect(creditImage('conseil-origine-wax')).toBeUndefined();
    expect(legendeCredit('conseil-origine-wax')).toBe('');
  });

  it('chaque conseil a désormais une image ; la page porte le crédit et pas la mention IA', () => {
    const tous = tousLesConseils();
    for (const c of tous) expect(imageExiste(imageConseil(c)), c.slug).toBe(true);
    const c = tous.find((x) => x.slug === 'tissu-ndop')!;
    const html = sourcePageConseil(c, conseilsPublies('2099-12-31'));
    expect(html).toContain('Photo : <a href="https://commons.wikimedia.org/wiki/File:Tissu_ndop_de_Bati%C3%A9.jpg"');
    expect(html).not.toContain('créée par IA');
    expect(html).toMatch(/alt="Grand tissu ndop/);
  });
});
