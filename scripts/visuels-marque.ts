// Génère les visuels de marque à partir des logos Keur Déco rangés dans assets/marque/ :
//   logo-fond-blanc.png, logo-fond-noir.png (sources 1254 × 1254, emblème Afrique + maison, puis « KEUR DECO »)
// Produit :
//   public/images/marque/embleme-clair-{96,192}.webp  emblème détouré (fonds clairs : en-tête, épingles claires)
//   public/images/marque/embleme-sombre-{96,192}.webp emblème détouré (fonds foncés : pied de page, épingles foncées)
//   public/icones/favicon-32.png, favicon-48.png, icone-192.png, icone-512.png, icone-masquable-512.png, apple-touch-icon.png
//   public/images/marque/logo.png (logo complet), public/images/partage/accueil.jpg (partage par défaut, 1200 × 630)
//   assets/marque/profil-pinterest.png (photo de profil Pinterest : emblème seul, lisible en petit rond)
// Usage : npm run visuels-marque (à relancer seulement si le logo change).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const RACINE = resolve(import.meta.dirname, '..');
const MARQUE = resolve(RACINE, 'assets/marque');
const SORTIE = resolve(RACINE, 'public/images/marque');
const ICONES = resolve(RACINE, 'public/icones');
const POLICE_TITRE = resolve(RACINE, 'assets/polices/Fraunces_600SemiBold.ttf');
const POLICE_TEXTE = resolve(RACINE, 'assets/polices/SourceSans3_600SemiBold.ttf');
const IVOIRE = '#F7F0E6';
const INDIGO = '#1E2A47';
/** Zone de l'emblème dans les sources (au-dessus du texte « KEUR DECO »). */
const ZONE_EMBLEME = { left: 150, top: 30, width: 950, height: 848 };

/**
 * Détoure l'emblème : le fond (blanc ou noir) relié aux bords de l'image devient transparent,
 * avec un bord adouci ; les zones de même couleur enfermées dans le dessin sont conservées.
 */
async function detourer(fichier: string, fond: number, seuil: number, douceur: number): Promise<Buffer> {
  const { data, info } = await sharp(resolve(MARQUE, fichier)).extract(ZONE_EMBLEME).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: l, height: h } = info;
  const ecart = (i: number) => Math.max(Math.abs(data[i * 3] - fond), Math.abs(data[i * 3 + 1] - fond), Math.abs(data[i * 3 + 2] - fond));
  const dansFond = new Uint8Array(l * h);
  const file = new Int32Array(l * h);
  let debut = 0;
  let fin = 0;
  const ajouter = (i: number) => {
    if (!dansFond[i] && ecart(i) < seuil) {
      dansFond[i] = 1;
      file[fin++] = i;
    }
  };
  for (let x = 0; x < l; x++) ajouter(x), ajouter((h - 1) * l + x);
  for (let y = 0; y < h; y++) ajouter(y * l), ajouter(y * l + l - 1);
  while (debut < fin) {
    const i = file[debut++];
    const x = i % l;
    if (x > 0) ajouter(i - 1);
    if (x < l - 1) ajouter(i + 1);
    if (i >= l) ajouter(i - l);
    if (i < (h - 1) * l) ajouter(i + l);
  }
  const rgba = Buffer.alloc(l * h * 4);
  for (let i = 0; i < l * h; i++) {
    const a = dansFond[i] ? Math.min(1, Math.max(0, (ecart(i) - douceur) / (seuil - douceur))) : 1;
    for (let c = 0; c < 3; c++) {
      // Couleur « dé-mélangée » du fond pour éviter un liseré blanc ou noir.
      const v = a > 0 ? (data[i * 3 + c] - fond * (1 - a)) / a : 0;
      rgba[i * 4 + c] = Math.round(Math.min(255, Math.max(0, v)));
    }
    rgba[i * 4 + 3] = Math.round(a * 255);
  }
  return sharp(rgba, { raw: { width: l, height: h, channels: 4 } }).trim().png().toBuffer();
}

/** Carré transparent contenant l'emblème centré. */
async function carre(embleme: Buffer, taille: number, marge = 0): Promise<Buffer> {
  const interieur = Math.round(taille * (1 - 2 * marge));
  const png = await sharp(embleme).resize(interieur, interieur, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: taille, height: taille, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: png, gravity: 'center' }])
    .png()
    .toBuffer();
}

/** Icône carrée : l'emblème centré sur un fond uni. */
async function icone(embleme: Buffer, taille: number, fichier: string, marge: number, fond: string): Promise<void> {
  await sharp({ create: { width: taille, height: taille, channels: 4, background: fond } })
    .composite([{ input: await carre(embleme, taille, marge) }])
    .png()
    .toFile(resolve(ICONES, fichier));
}

/** Texte rendu avec une police du dépôt (Pango), en PNG transparent. */
export async function texte(contenu: string, police: string, fichierPolice: string, largeur: number): Promise<Buffer> {
  return sharp({ text: { text: contenu, font: police, fontfile: fichierPolice, width: largeur, rgba: true, wrap: 'word' } }).png().toBuffer();
}

async function imagePartage(emblemeSombre: Buffer): Promise<void> {
  const fond = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="${INDIGO}"/>
    <g fill="#D49A2A" fill-opacity=".5">${Array.from({ length: 14 }, (_, i) => `<circle cx="${80 + i * 80}" cy="580" r="6"/>`).join('')}</g>
    <path d="M0 540h1200" stroke="#EFE3D0" stroke-opacity=".25" stroke-width="2"/>
  </svg>`);
  const titre = await texte('<span foreground="#F7F0E6">Keur <i>Déco</i></span>', 'Fraunces SemiBold 96', POLICE_TITRE, 700);
  const slogan = await texte('<span foreground="#EFE3D0">Décoration africaine pour la maison</span>', 'Source Sans 3 SemiBold 40', POLICE_TEXTE, 700);
  mkdirSync(resolve(RACINE, 'public/images/partage'), { recursive: true });
  await sharp(fond)
    .composite([
      { input: await carre(emblemeSombre, 380), left: 70, top: 75 },
      { input: titre, left: 490, top: 170 },
      { input: slogan, left: 494, top: 310 },
    ])
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(resolve(RACINE, 'public/images/partage/accueil.jpg'));
}

if (import.meta.main) {
  mkdirSync(SORTIE, { recursive: true });
  mkdirSync(ICONES, { recursive: true });
  const clair = await detourer('logo-fond-blanc.png', 255, 60, 10);
  const sombre = await detourer('logo-fond-noir.png', 0, 22, 4);
  for (const [nom, embleme] of [['clair', clair], ['sombre', sombre]] as const) {
    for (const taille of [96, 192]) {
      await sharp(await carre(embleme, taille)).webp({ quality: 90, alphaQuality: 100 }).toFile(resolve(SORTIE, `embleme-${nom}-${taille}.webp`));
    }
    await sharp(await carre(embleme, 512)).png().toFile(resolve(RACINE, 'assets/marque', `embleme-${nom}.png`));
  }
  await sharp(await carre(clair, 32)).png().toFile(resolve(ICONES, 'favicon-32.png'));
  await sharp(await carre(clair, 48)).png().toFile(resolve(ICONES, 'favicon-48.png'));
  await icone(clair, 192, 'icone-192.png', 0.08, IVOIRE);
  await icone(clair, 512, 'icone-512.png', 0.08, IVOIRE);
  await icone(clair, 180, 'apple-touch-icon.png', 0.1, IVOIRE);
  await icone(clair, 512, 'icone-masquable-512.png', 0.2, IVOIRE);
  await icone(clair, 1100, '../../assets/marque/profil-pinterest.png', 0.12, '#FFFFFF');
  await sharp(resolve(MARQUE, 'logo-fond-blanc.png')).resize(600, 600).png({ compressionLevel: 9, palette: true }).toFile(resolve(SORTIE, 'logo.png'));
  await imagePartage(sombre);
  console.log('Visuels de marque générés.');
}
