// Convertit les images d'ambiance sources (PNG/JPG) pour le site.
// Usage : npm run images -- <dossier-source>
// Pour chaque <nom>.png|jpg, produit :
//   public/images/articles/<nom>-800.webp et <nom>-1600.webp (proportions conservées)
//   public/images/partage/<nom>.jpg (1200 × 630, image de partage Open Graph)
//   contenu/images/<nom>.jpg (source haute définition, 2400 px max, pour les épingles Pinterest)
// et enregistre les dimensions dans src/data/images.json.
// Le <nom> est celui à indiquer dans le champ « image » de l'article.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const RACINE = resolve(import.meta.dirname, '..');
const SORTIE = resolve(RACINE, 'public/images/articles');
const PARTAGE = resolve(RACINE, 'public/images/partage');
const SOURCES = resolve(RACINE, 'contenu/images');
const DIMENSIONS = resolve(RACINE, 'src/data/images.json');

const ko = (octets: number) => `${Math.round(octets / 1024)} Ko`;

export async function convertirImage(fichier: string): Promise<{ nom: string; largeur: number; hauteur: number }> {
  const nom = basename(fichier, extname(fichier))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  for (const d of [SORTIE, PARTAGE, SOURCES]) mkdirSync(d, { recursive: true });
  let dims = { largeur: 0, hauteur: 0 };
  for (const largeur of [1600, 800]) {
    const dest = join(SORTIE, `${nom}-${largeur}.webp`);
    const info = await sharp(fichier).rotate().resize({ width: largeur, withoutEnlargement: false }).webp({ quality: largeur > 1000 ? 76 : 72 }).toFile(dest);
    if (largeur === 1600) dims = { largeur: info.width, hauteur: info.height };
    console.log(`${dest.replace(RACINE + '/', '')} : ${info.width} × ${info.height}, ${ko(info.size)}`);
  }
  const partage = join(PARTAGE, `${nom}.jpg`);
  const infoPartage = await sharp(fichier).rotate().resize({ width: 1200, height: 630, fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true }).toFile(partage);
  console.log(`${partage.replace(RACINE + '/', '')} : ${ko(infoPartage.size)}`);
  const source = join(SOURCES, `${nom}.jpg`);
  const infoSource = await sharp(fichier)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(source);
  console.log(`${source.replace(RACINE + '/', '')} : ${ko(infoSource.size)}`);
  const toutes = existsSync(DIMENSIONS) ? JSON.parse(readFileSync(DIMENSIONS, 'utf8')) : {};
  toutes[nom] = dims;
  const triees = Object.fromEntries(Object.entries(toutes).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(DIMENSIONS, JSON.stringify(triees, null, 2) + '\n');
  return { nom, ...dims };
}

if (import.meta.main) {
  const dossier = process.argv[2];
  if (!dossier || !existsSync(dossier)) {
    console.error('Usage : npm run images -- <dossier-source contenant des .png ou .jpg>');
    process.exit(1);
  }
  const fichiers = readdirSync(dossier).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  if (fichiers.length === 0) console.error(`Aucune image dans ${dossier}.`);
  for (const f of fichiers) {
    const { nom } = await convertirImage(join(dossier, f));
    console.log(`→ image: ${nom}\n`);
  }
}
