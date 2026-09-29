// Images réalistes du nuancier (« Habillez la maison ») :
//   - tissus : une photo d'échantillon (assets/nuancier/<tissu>.jpg, créée par IA) posée comme un tissu
//     d'ameublement sur chaque meuble dessiné (src/data/nuancier.json), avec un dégradé d'ombre pour le volume ;
//     → public/images/nuancier/<tissu>-<objet>.webp
//   - matières : la photo d'un objet (assets/nuancier/<nom>.jpg, fond blanc) détourée
//     → public/images/nuancier/<nom>.webp
// Usage : npm run nuancier-images (à relancer quand on ajoute une photo dans assets/nuancier).
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const RACINE = resolve(import.meta.dirname, '..');
const SOURCES = resolve(RACINE, 'assets/nuancier');
const SORTIE = resolve(RACINE, 'public/images/nuancier');
const { dessins } = JSON.parse(readFileSync(resolve(RACINE, 'src/data/nuancier.json'), 'utf8')) as { dessins: Record<string, string> };

/** Tissus disponibles en photo (nom du fichier source) ; les autres restent dessinés. */
export const TISSUS_PHOTO = ['wax'];
/** Objets en photo pour les matières (nom du fichier source). */
export const OBJETS_PHOTO = ['panier-bolga'];

/** Taille d'un motif répété, en unités du dessin (400 × 240). */
const MAILLE = 96;

const LUMIERE = `<linearGradient id="lum" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#2a1a0a" stop-opacity=".38"/></linearGradient>`;

/** Formes « tissu » d'un dessin : celles sans couleur propre (les ombres, pieds et coutures en ont une). */
function formesTissu(dessin: string): string {
  return dessin
    .replace(/<g fill="[^"]*"[^>]*>[\s\S]*?<\/g>/g, '')
    .replace(/<(path|rect|circle|ellipse)\b[^>]*\b(fill|stroke)="[^"]*"[^>]*>(<\/\1>)?/g, '');
}

async function tissu(nom: string): Promise<void> {
  const texture = (await sharp(resolve(SOURCES, `${nom}.jpg`)).resize(512, 512).jpeg({ quality: 82 }).toBuffer()).toString('base64');
  const motif = `<pattern id="t" width="${MAILLE}" height="${MAILLE}" patternUnits="userSpaceOnUse"><image href="data:image/jpeg;base64,${texture}" width="${MAILLE}" height="${MAILLE}" preserveAspectRatio="none"/></pattern>`;
  for (const [objet, dessin] of Object.entries(dessins)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="800" height="480"><defs>${motif}${LUMIERE}</defs><g fill="url(#t)">${dessin}</g><g fill="url(#lum)">${formesTissu(dessin)}</g></svg>`;
    await sharp(Buffer.from(svg)).webp({ quality: 82, alphaQuality: 100 }).toFile(resolve(SORTIE, `${nom}-${objet}.webp`));
  }
}

/** Détourage d'une photo sur fond blanc : le fond relié aux bords (et le blanc pur) devient transparent. */
async function objet(nom: string): Promise<void> {
  const { data, info } = await sharp(resolve(SOURCES, `${nom}.jpg`)).resize(900, 900).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: l, height: h } = info;
  const n = l * h;
  const ecart = (i: number) => 255 - Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  const fond = new Uint8Array(n);
  const file = new Int32Array(n);
  let debut = 0;
  let fin = 0;
  const ajouter = (i: number) => {
    if (!fond[i] && ecart(i) < 75) {
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
  const rgba = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    if (ecart(i) < 22) fond[i] = 1;
    const a = fond[i] ? Math.min(1, Math.max(0, (ecart(i) - 22) / 70)) : 1;
    rgba.set([data[i * 3], data[i * 3 + 1], data[i * 3 + 2], Math.round(a * 255)], i * 4);
  }
  await sharp(rgba, { raw: { width: l, height: h, channels: 4 } }).trim().resize(640, 640, { fit: 'inside' }).webp({ quality: 84, alphaQuality: 100 }).toFile(resolve(SORTIE, `${nom}.webp`));
}

if (import.meta.main) {
  mkdirSync(SORTIE, { recursive: true });
  for (const t of TISSUS_PHOTO) if (existsSync(resolve(SOURCES, `${t}.jpg`))) await tissu(t);
  for (const o of OBJETS_PHOTO) if (existsSync(resolve(SOURCES, `${o}.jpg`))) await objet(o);
  console.log('Images du nuancier générées dans public/images/nuancier/.');
}
