// Images réalistes du nuancier (« Habillez la maison ») :
//   une photo de matière vue à plat (assets/nuancier/<matière>.jpg, créée par IA : wax, bogolan, kente,
//   indigo, terre cuite, bois sculpté, perles, raphia) posée sur les objets dessinés qu'elle habille
//   (src/data/nuancier.json), avec un dégradé d'ombre pour le volume → public/images/nuancier/<matière>-<objet>.webp
// Exception : un meuble peut être une vraie photo (assets/nuancier/<objet>-<tissu>.jpg, même meuble retouché
// par IA pour chaque tissu, cadrage identique) détourée du fond crème, ombre au sol conservée
// → public/images/nuancier/<tissu>-<objet>.webp (canapé et fauteuil pour l'instant).
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

/** Cadre commun des photos d'un meuble (même zone pour les 4 tissus : les transitions restent alignées). */
const CADRE_PHOTO = { left: 0, top: 0.05, width: 1, height: 0.93 };

/** Photo d'un meuble : fond crème retiré (relié aux bords), l'ombre au sol devient une ombre transparente. */
async function meublePhoto(nom: string, objet: string): Promise<void> {
  const source = sharp(resolve(SOURCES, `${objet}-${nom}.jpg`));
  const { width = 0, height = 0 } = await source.metadata();
  const zone = { left: Math.round(CADRE_PHOTO.left * width), top: Math.round(CADRE_PHOTO.top * height), width: Math.round(CADRE_PHOTO.width * width), height: Math.round(CADRE_PHOTO.height * height) };
  const { data, info } = await sharp(resolve(SOURCES, `${objet}-${nom}.jpg`)).extract(zone).resize(1200).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const l = info.width;
  const h = info.height;
  const n = l * h;
  // Couleur du fond : moyenne d'un coin.
  const fond = [0, 1, 2].map((c) => data[(5 * l + 5) * 3 + c]);
  const ecart = (i: number) => Math.max(...[0, 1, 2].map((c) => Math.abs(data[i * 3 + c] - fond[c])));
  const dehors = new Uint8Array(n);
  const file = new Int32Array(n);
  let debut = 0;
  let fin = 0;
  const ajouter = (i: number) => {
    if (!dehors[i] && ecart(i) < 70) {
      dehors[i] = 1;
      file[fin++] = i;
    }
  };
  for (let x = 0; x < l; x++) ajouter(x), ajouter((h - 1) * l + x);
  for (let y = 0; y < h; y++) ajouter(y * l), ajouter(y * l + l - 1);
  while (debut < fin) {
    const i = file[debut++];
    const x = i % l;
    if (x) ajouter(i - 1);
    if (x < l - 1) ajouter(i + 1);
    if (i >= l) ajouter(i - l);
    if (i < n - l) ajouter(i + l);
  }
  const rgba = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    // Hors du canapé : plus le pixel s'éloigne du fond, plus il est opaque (ombre douce), couleur « dé-mélangée ».
    const a = dehors[i] ? Math.min(1, Math.max(0, (ecart(i) - 4) / 66)) : 1;
    for (let c = 0; c < 3; c++) rgba[i * 4 + c] = a > 0 ? Math.round(Math.min(255, Math.max(0, (data[i * 3 + c] - fond[c] * (1 - a)) / a))) : 0;
    rgba[i * 4 + 3] = Math.round(a * 255);
  }
  await sharp(rgba, { raw: { width: l, height: h, channels: 4 } }).webp({ quality: 84, alphaQuality: 90 }).toFile(resolve(SORTIE, `${nom}-${objet}.webp`));
}

async function tissu(nom: string, objets: string[]): Promise<void> {
  const maille = MAILLE[nom] ?? 96;
  const texture = (await sharp(resolve(SOURCES, `${nom}.jpg`)).resize(512, 512).jpeg({ quality: 82 }).toBuffer()).toString('base64');
  const motif = `<pattern id="t" width="${maille}" height="${maille}" patternUnits="userSpaceOnUse"><image href="data:image/jpeg;base64,${texture}" width="${maille}" height="${maille}" preserveAspectRatio="none"/></pattern>`;
  for (const objet of objets) {
    if (existsSync(resolve(SOURCES, `${objet}-${nom}.jpg`))) {
      await meublePhoto(nom, objet);
      continue;
    }
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
