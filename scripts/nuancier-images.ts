// Images réalistes du nuancier (« Habillez la maison ») :
//   une photo de matière vue à plat (assets/nuancier/<matière>.jpg, créée par IA : wax, bogolan, kente,
//   indigo, terre cuite, bois sculpté, perles, raphia) posée sur les objets dessinés qu'elle habille
//   (src/data/nuancier.json), avec un dégradé d'ombre pour le volume → public/images/nuancier/<matière>-<objet>.webp
// Usage : npm run nuancier-images (à relancer quand on ajoute une photo dans assets/nuancier).
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const RACINE = resolve(import.meta.dirname, '..');
const SOURCES = resolve(RACINE, 'assets/nuancier');
const SORTIE = resolve(RACINE, 'public/images/nuancier');
const { dessins } = JSON.parse(readFileSync(resolve(RACINE, 'src/data/nuancier.json'), 'utf8')) as { dessins: Record<string, string> };

/** Matières en photo et objets qu'elles habillent (les mêmes que dans build/essayage.ts). */
const MEUBLES = ['canape', 'fauteuil', 'pouf', 'coussin', 'lampe'];
const HABILLAGES: Record<string, string[]> = {
  wax: MEUBLES,
  bogolan: MEUBLES,
  kente: MEUBLES,
  indigo: MEUBLES,
  'terre-cuite': ['jarre'],
  'bois-sculpte': ['tabouret'],
  perles: ['calebasse'],
  'raphia-paniers': ['panier'],
};

/** Taille d'un motif répété, en unités du dessin (400 × 240) : plus grande pour les objets. */
const MAILLE: Record<string, number> = { 'terre-cuite': 170, 'bois-sculpte': 150, perles: 110, 'raphia-paniers': 130 };

const LUMIERE = `<linearGradient id="lum" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#2a1a0a" stop-opacity=".38"/></linearGradient>`;

/** Formes « tissu » d'un dessin : celles sans couleur propre (les ombres, pieds et coutures en ont une). */
function formesTissu(dessin: string): string {
  return dessin
    .replace(/<g fill="[^"]*"[^>]*>[\s\S]*?<\/g>/g, '')
    .replace(/<(path|rect|circle|ellipse)\b[^>]*\b(fill|stroke)="[^"]*"[^>]*>(<\/\1>)?/g, '');
}

async function tissu(nom: string, objets: string[]): Promise<void> {
  const maille = MAILLE[nom] ?? 96;
  const texture = (await sharp(resolve(SOURCES, `${nom}.jpg`)).resize(512, 512).jpeg({ quality: 82 }).toBuffer()).toString('base64');
  const motif = `<pattern id="t" width="${maille}" height="${maille}" patternUnits="userSpaceOnUse"><image href="data:image/jpeg;base64,${texture}" width="${maille}" height="${maille}" preserveAspectRatio="none"/></pattern>`;
  for (const objet of objets) {
    const dessin = dessins[objet];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="800" height="480"><defs>${motif}${LUMIERE}</defs><g fill="url(#t)">${dessin}</g><g fill="url(#lum)">${formesTissu(dessin)}</g></svg>`;
    await sharp(Buffer.from(svg)).webp({ quality: 82, alphaQuality: 100 }).toFile(resolve(SORTIE, `${nom}-${objet}.webp`));
  }
}

if (import.meta.main) {
  mkdirSync(SORTIE, { recursive: true });
  for (const [nom, objets] of Object.entries(HABILLAGES)) if (existsSync(resolve(SOURCES, `${nom}.jpg`))) await tissu(nom, objets);
  console.log('Images du nuancier générées dans public/images/nuancier/.');
}
