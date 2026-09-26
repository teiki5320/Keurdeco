// Génère les visuels de marque à partir du logo (build/icones.ts) :
//   public/icones/icone-192.png, icone-512.png, icone-masquable-512.png, apple-touch-icon.png
//   public/logo.svg (logo texte) et public/images/partage/accueil.jpg (image de partage par défaut, 1200 × 630)
// Usage : node scripts/visuels-marque.ts (à relancer seulement si le logo change).
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { logoSvgAutonome, marque } from '../build/icones.ts';

const RACINE = resolve(import.meta.dirname, '..');
const POLICE_TITRE = resolve(RACINE, 'assets/polices/Fraunces_600SemiBold.ttf');
const POLICE_TEXTE = resolve(RACINE, 'assets/polices/SourceSans3_600SemiBold.ttf');
const INDIGO = '#1B2442';

const svgMarque = (taille: number, surFonce = false) => Buffer.from(marque('logo-marque', surFonce).replace('class="logo-marque"', 'xmlns="http://www.w3.org/2000/svg"').replace('width="40" height="40"', `width="${taille}" height="${taille}"`));

/** Icône carrée : la marque centrée sur fond ivoire (ou indigo pour la version masquable). */
async function icone(taille: number, fichier: string, marge: number, fond: string): Promise<void> {
  const interieur = Math.round(taille * (1 - 2 * marge));
  const png = await sharp(svgMarque(interieur)).png().toBuffer();
  await sharp({ create: { width: taille, height: taille, channels: 4, background: fond } })
    .composite([{ input: png, gravity: 'center' }])
    .png()
    .toFile(resolve(RACINE, 'public/icones', fichier));
}

/** Texte rendu avec une police du dépôt (Pango), en PNG transparent. */
export async function texte(contenu: string, police: string, fichierPolice: string, largeur: number): Promise<Buffer> {
  return sharp({ text: { text: contenu, font: police, fontfile: fichierPolice, width: largeur, rgba: true, wrap: 'word' } }).png().toBuffer();
}

async function imagePartage(): Promise<void> {
  const fond = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="${INDIGO}"/>
    <circle cx="1080" cy="120" r="260" fill="none" stroke="#E2A62A" stroke-opacity=".25" stroke-width="40"/>
    <circle cx="1080" cy="120" r="150" fill="#A6432A" fill-opacity=".55"/>
    <g fill="#E2A62A" fill-opacity=".5">${Array.from({ length: 14 }, (_, i) => `<circle cx="${80 + i * 80}" cy="580" r="6"/>`).join('')}</g>
    <path d="M0 540h1200" stroke="#ECE1CF" stroke-opacity=".25" stroke-width="2"/>
  </svg>`);
  const titre = await texte('<span foreground="#FBF8F2">Keur <i>Déco</i></span>', 'Fraunces SemiBold 96', POLICE_TITRE, 900);
  const slogan = await texte('<span foreground="#ECE1CF">Décoration africaine pour la maison</span>', 'Source Sans 3 SemiBold 40', POLICE_TEXTE, 900);
  const logo = await sharp(svgMarque(150, true)).png().toBuffer();
  mkdirSync(resolve(RACINE, 'public/images/partage'), { recursive: true });
  await sharp(fond)
    .composite([
      { input: logo, left: 80, top: 150 },
      { input: titre, left: 260, top: 160 },
      { input: slogan, left: 264, top: 300 },
    ])
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(resolve(RACINE, 'public/images/partage/accueil.jpg'));
}

if (import.meta.main) {
  mkdirSync(resolve(RACINE, 'public/icones'), { recursive: true });
  await icone(192, 'icone-192.png', 0.08, '#FBF8F2');
  await icone(512, 'icone-512.png', 0.08, '#FBF8F2');
  await icone(180, 'apple-touch-icon.png', 0.1, '#FBF8F2');
  await icone(512, 'icone-masquable-512.png', 0.2, INDIGO);
  writeFileSync(resolve(RACINE, 'public/logo.svg'), logoSvgAutonome());
  await imagePartage();
  console.log('Visuels de marque générés.');
}
