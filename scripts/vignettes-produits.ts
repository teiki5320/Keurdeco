// Vignettes des cartes produits, découpées dans NOS images d'ambiance (créées par IA), jamais dans
// des photos Amazon. Pour chaque produit placé sur une ambiance (ou sur l'image d'un top), un carré est découpé autour de son
// point cliquable (première ambiance où il apparaît, par date), depuis la source haute définition
// contenu/images/<image>.jpg.
//
// Usage : npm run vignettes
// Produit public/images/produits/<id>-160.webp et <id>-320.webp, et src/data/vignettes.json
// ({ id: { article, x, y, cadre } }). Réglage facultatif par point dans l'article :
//   - { produit: tapis-jute-rond, x: 53, y: 94, cadre: 40 }   (côté du carré en % de la hauteur, 30 par défaut)
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { tousLesArticles } from '../build/articles.ts';

const RACINE = resolve(import.meta.dirname, '..');
const SORTIE = resolve(RACINE, 'public/images/produits');
const FICHIER = resolve(RACINE, 'src/data/vignettes.json');
export const CADRE_DEFAUT = 30;

mkdirSync(SORTIE, { recursive: true });
for (const f of readdirSync(SORTIE)) rmSync(resolve(SORTIE, f));

// Les ambiances d'abord, puis les tops (dont l'image porte aussi des points) : un produit garde la vignette
// de la première image où il apparaît.
const parDate = (a: { publieLe: string; slug: string }, b: { publieLe: string; slug: string }) => a.publieLe.localeCompare(b.publieLe) || a.slug.localeCompare(b.slug);
const articles = tousLesArticles();
const ambiances = [...articles.filter((a) => a.type === 'ambiance').sort(parDate), ...articles.filter((a) => a.type === 'top').sort(parDate)];

const vignettes: Record<string, { article: string; x: number; y: number; cadre: number }> = {};
for (const a of ambiances) {
  const source = resolve(RACINE, 'contenu/images', `${a.image}.jpg`);
  if (!existsSync(source)) {
    console.log(`⚠ ${a.slug} : source ${a.image}.jpg absente, ignorée`);
    continue;
  }
  const { width = 0, height = 0 } = await sharp(source).metadata();
  for (const h of a.hotspots) {
    if (vignettes[h.produit]) continue;
    const cadre = h.cadre ?? CADRE_DEFAUT;
    const cote = Math.round(Math.min(width, height) * (cadre / 100));
    const left = Math.min(Math.max(0, Math.round((h.x / 100) * width - cote / 2)), width - cote);
    const top = Math.min(Math.max(0, Math.round((h.y / 100) * height - cote / 2)), height - cote);
    for (const taille of [160, 320]) {
      await sharp(source)
        .extract({ left, top, width: cote, height: cote })
        .resize(taille, taille)
        .webp({ quality: 74 })
        .toFile(resolve(SORTIE, `${h.produit}-${taille}.webp`));
    }
    vignettes[h.produit] = { article: a.slug, x: h.x, y: h.y, cadre };
  }
}

const triees = Object.fromEntries(Object.entries(vignettes).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(FICHIER, JSON.stringify(triees, null, 2) + '\n');
console.log(`${Object.keys(triees).length} vignettes dans public/images/produits/ (src/data/vignettes.json).`);
