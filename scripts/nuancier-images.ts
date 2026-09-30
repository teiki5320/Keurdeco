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
/** Cadres particuliers (meuble qui remplit presque toute la photo). */
const CADRES: Record<string, typeof CADRE_PHOTO> = { coussin: { left: 0, top: 0, width: 1, height: 1 } };

/**
 * Photos d'un meuble (une par tissu, même cadrage) : ce qui est identique sur toutes les photos et clair
 * (le fond crème et son ombre) devient transparent ; ce qui change (le tissu) et ce qui est sombre
 * (les pieds en bois) reste. L'ombre au sol devient une ombre brune transparente.
 */
async function meublesPhoto(objet: string, noms: string[]): Promise<void> {
  const images = await Promise.all(
    noms.map(async (nom) => {
      const source = resolve(SOURCES, `${objet}-${nom}.jpg`);
      const { width = 0, height = 0 } = await sharp(source).metadata();
      const cadre = CADRES[objet] ?? CADRE_PHOTO;
      const zone = { left: Math.round(cadre.left * width), top: Math.round(cadre.top * height), width: Math.round(cadre.width * width), height: Math.round(cadre.height * height) };
      return sharp(source).extract(zone).resize(1200).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    }),
  );
  const { width: l, height: h } = images[0].info;
  const n = l * h;
  const lum = (d: Buffer, i: number) => 0.3 * d[i * 3] + 0.59 * d[i * 3 + 1] + 0.11 * d[i * 3 + 2];
  const chroma = (d: Buffer, i: number) => Math.max(d[i * 3], d[i * 3 + 1], d[i * 3 + 2]) - Math.min(d[i * 3], d[i * 3 + 1], d[i * 3 + 2]);
  // Fond ou ombre : clair et peu coloré sur TOUTES les photos (le tissu est coloré sur au moins l'une),
  // et relié aux bords de l'image (les motifs clairs à l'intérieur du tissu ne sont pas touchés).
  const candidat = new Uint8Array(n);
  for (let i = 0; i < n; i++) candidat[i] = images.every(({ data }) => lum(data, i) > 100 && chroma(data, i) < 70) ? 1 : 0;
  const fond = new Uint8Array(n);
  const file = new Int32Array(n);
  let debut = 0;
  let fin = 0;
  const ajouter = (i: number) => {
    if (candidat[i] && !fond[i]) {
      fond[i] = 1;
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
  // Luminosité du fond par ligne, prise sur les bords : l'ombre est ce qui est plus sombre que ce fond.
  const d0 = images[0].data;
  const fondLigne = Array.from({ length: h }, (_, y) => {
    const v: number[] = [];
    for (let x = 0; x < l * 0.05; x++) v.push(lum(d0, y * l + x), lum(d0, y * l + l - 1 - x));
    v.sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  });
  for (const [k, nom] of noms.entries()) {
    const { data } = images[k];
    const rgba = Buffer.alloc(n * 4);
    for (let i = 0; i < n; i++) {
      const y = Math.floor(i / l);
      // L'ombre s'estompe près des bords de la photo (sinon elle s'arrête net en ligne droite).
      const x = i % l;
      const bord = Math.min(1, Math.min(x, l - 1 - x) / (l * 0.14), Math.min(y, h - 1 - y) / (h * 0.1));
      const a = fond[i] ? Math.min(0.55, Math.max(0, (fondLigne[y] - lum(data, i) - 5) / 90)) * bord : 1;
      for (let c = 0; c < 3; c++) rgba[i * 4 + c] = fond[i] ? [42, 30, 20][c] : data[i * 3 + c];
      rgba[i * 4 + 3] = Math.round(a * 255);
    }
    // Léger adoucissement du masque pour éviter les contours en escalier.
    const png = await sharp(rgba, { raw: { width: l, height: h, channels: 4 } }).png().toBuffer();
    await sharp(png).webp({ quality: 84, alphaQuality: 90 }).toFile(resolve(SORTIE, `${nom}-${objet}.webp`));
  }
}

async function tissu(nom: string, objets: string[]): Promise<void> {
  const maille = MAILLE[nom] ?? 96;
  const texture = (await sharp(resolve(SOURCES, `${nom}.jpg`)).resize(512, 512).jpeg({ quality: 82 }).toBuffer()).toString('base64');
  const motif = `<pattern id="t" width="${maille}" height="${maille}" patternUnits="userSpaceOnUse"><image href="data:image/jpeg;base64,${texture}" width="${maille}" height="${maille}" preserveAspectRatio="none"/></pattern>`;
  for (const objet of objets) {
    if (existsSync(resolve(SOURCES, `${objet}-${nom}.jpg`))) continue; // photo : voir meublesPhoto
    const dessin = dessins[objet];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="800" height="480"><defs>${motif}${LUMIERE}</defs><g fill="url(#t)">${dessin}</g><g fill="url(#lum)">${formesTissu(dessin)}</g></svg>`;
    await sharp(Buffer.from(svg)).webp({ quality: 82, alphaQuality: 100 }).toFile(resolve(SORTIE, `${nom}-${objet}.webp`));
  }
}

if (import.meta.main) {
  mkdirSync(SORTIE, { recursive: true });
  for (const [nom, objets] of Object.entries(HABILLAGES)) if (existsSync(resolve(SOURCES, `${nom}.jpg`))) await tissu(nom, objets);
  for (const objet of MEUBLES) {
    const noms = ['wax', 'bogolan', 'kente', 'indigo'].filter((t) => existsSync(resolve(SOURCES, `${objet}-${t}.jpg`)));
    if (noms.length > 1) await meublesPhoto(objet, noms);
  }
  console.log('Images du nuancier générées dans public/images/nuancier/.');
}
