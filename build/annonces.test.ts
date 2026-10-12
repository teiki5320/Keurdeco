import { describe, expect, it } from 'vitest';
import { blocAnnonce, placerAnnonces } from './annonces.ts';

const para = (n: number) => `<p>${'mot '.repeat(n).trim()}</p>`;
const ENCADRE = '<aside class="encadre-produit" aria-label="Produit conseillé"><p>Voir sur Amazon</p></aside>';
const compter = (h: string) => (h.match(/class="annonce"/g) ?? []).length;

describe('annonces', () => {
  it('bloc In-Article avec l’éditeur et le bloc, signalé « Annonce »', () => {
    const b = blocAnnonce();
    expect(b).toContain('data-ad-client="ca-pub-2680784147246798"');
    expect(b).toContain('data-ad-slot="7493402587"');
    expect(b).toContain('>Annonce<');
  });

  it('deux annonces au plus, après l’introduction et vers la fin', () => {
    const html = [para(150), '<h2 id="a">A</h2>', para(200), '<h2 id="b">B</h2>', para(200), '<h2 id="c">C</h2>', para(150)].join('\n');
    const r = placerAnnonces(html, 2);
    expect(compter(r)).toBe(2);
    expect(r.indexOf('class="annonce"')).toBeLessThan(r.indexOf('<h2 id="a">'));
    expect(r.lastIndexOf('class="annonce"')).toBeLessThan(r.indexOf('<h2 id="c">'));
    expect(r.lastIndexOf('class="annonce"')).toBeGreaterThan(r.indexOf('<h2 id="b">'));
  });

  it('jamais collée à un encadré produit, ni texte trop court', () => {
    expect(compter(placerAnnonces([para(150), ENCADRE, '<h2 id="a">A</h2>', para(50)].join('\n'), 2))).toBe(0);
    expect(compter(placerAnnonces([para(150), '<h2 id="a">A</h2>', ENCADRE, para(50)].join('\n'), 2))).toBe(0);
    expect(compter(placerAnnonces([para(40), '<h2 id="a">A</h2>', para(40)].join('\n'), 2))).toBe(0);
    expect(compter(placerAnnonces([para(150), '<h2 id="a">A</h2>', para(300)].join('\n'), 1))).toBe(1);
  });
});
