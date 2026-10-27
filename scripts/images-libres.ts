// Images des conseils et des guides qui n'en ont pas : photos libres (Wikimedia Commons, puis Openverse
// en usage commercial) ou, si rien ne colle vraiment au sujet, une carte générée aux couleurs du site.
// Usage : npm run images-libres            (traite les images pas encore produites)
//         npm run images-libres -- --forcer (refait tout)
//
// Tout part de src/data/credits-images.json, une entrée par image (même nom que pour npm run images) :
//   photo : { "type": "photo", "source": "wikimedia" | "openverse", "auteur", "licence", "page", "telechargement" }
//   carte : { "type": "carte", "libelle", "icone", "motif" }
// Le texte alternatif va, comme pour les autres photos, dans src/data/textes-alternatifs.json.
//
// Produit public/images/articles/<nom>-400.webp, -800.webp et -1600.webp (proportions conservées) et
// enregistre les dimensions dans src/data/images.json. Les images sont rangées dans le dépôt : aucune
// n'est servie depuis un serveur tiers. Pas d'image de partage ni de source HD : ces images ne sont
// pas nos visuels et ne doivent jamais servir aux épingles Pinterest.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { icone, type NomIcone } from '../build/icones.ts';
import { patternMotif } from '../build/motifs.ts';

const RACINE = resolve(import.meta.dirname, '..');
const SORTIE = resolve(RACINE, 'public/images/articles');
const DIMENSIONS = resolve(RACINE, 'src/data/images.json');
export const FICHIER_CREDITS = resolve(RACINE, 'src/data/credits-images.json');
const USER_AGENT = 'KeurDeco/1.0 (https://www.keurdeco.com/ ; keurdeco@toakeur.com)';

export interface CreditPhoto {
  type: 'photo';
  source: 'wikimedia' | 'openverse';
  auteur: string;
  licence: string;
  page: string;
  telechargement: string;
}

export interface CreditCarte {
  type: 'carte';
  libelle: string;
  icone: string;
  motif: string;
}

export type CreditImage = CreditPhoto | CreditCarte;

/** Couleurs de la carte : celles de src/theme.css (terracotta → encre, texte ivoire). */
const C = { terracotta: '#a3472a', encre: '#2a1d15', ivoire: '#fdf9f3', ocre: '#d49a2a' };

/** Icônes en plus de build/icones.ts, dessinées au même trait (24 × 24). */
const TRACES_EN_PLUS: Record<string, string> = {
  cadeau: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18v-3H3zM12 6v14"/><path d="M12 6c-2-4-6-3-5 0M12 6c2-4 6-3 5 0"/>',
  'tete-de-lit': '<path d="M4 20V8a8 5 0 0 1 16 0v12"/><path d="M4 14h16M7 14v-3a5 3 0 0 1 10 0v3"/><path d="M2 20h20"/>',
};

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Icône en traits ivoire, placée dans un carré de `taille` px. */
function iconeSvg(nom: string, x: number, y: number, taille: number, couleur: string): string {
  const traces = TRACES_EN_PLUS[nom] ?? icone(nom as NomIcone).replace(/^<svg[^>]*>|<\/svg>$/g, '');
  return `<svg x="${x}" y="${y}" width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="${couleur}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${traces}</svg>`;
}

/** Carte générée (1600 × 1067) : dégradé terracotta → encre, porte en arche garnie du motif, icône et libellé. */
export function carteSvg(c: CreditCarte): string {
  const L = 1600;
  const H = 1067;
  const bandes = Array.from({ length: 40 }, (_, i) => `<rect x="${i * 40 + 18}" y="0" width="4" height="${H}"/>`).join('');
  const aL = 460;
  const aH = 600;
  const aX = (L - aL) / 2;
  const aY = 90;
  const arche = `M${aX} ${aY + aL / 2} A${aL / 2} ${aL / 2} 0 0 1 ${aX + aL} ${aY + aL / 2} V${aY + aH} H${aX} Z`;
  const libelle = echapper(c.libelle);
  const taille = libelle.length > 18 ? 76 : 92;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}" viewBox="0 0 ${L} ${H}">
<defs><linearGradient id="fond" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.terracotta}"/><stop offset="1" stop-color="${C.encre}"/></linearGradient>${patternMotif(c.motif, 'motif', 2.2)}</defs>
<rect width="${L}" height="${H}" fill="url(#fond)"/>
<g fill="${C.ivoire}" opacity="0.06">${bandes}</g>
<path d="${arche}" fill="url(#motif)" stroke="${C.ivoire}" stroke-width="14"/>
<circle cx="${L / 2}" cy="${aY + 340}" r="150" fill="${C.ivoire}"/>
${iconeSvg(c.icone, L / 2 - 110, aY + 230, 220, C.terracotta)}
<text x="${L / 2}" y="${aY + aH + 150}" text-anchor="middle" fill="${C.ivoire}" font-family="Fraunces" font-weight="600" font-size="${taille}">${libelle}</text>
<text x="${L / 2}" y="${aY + aH + 240}" text-anchor="middle" fill="${C.ocre}" font-family="Source Sans 3" font-weight="600" font-size="34" letter-spacing="6">KEUR DÉCO · CONSEILS</text>
</svg>`;
}

async function telecharger(url: string): Promise<Buffer> {
  const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} pour ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Écrit les 3 tailles WebP (proportions conservées) et renvoie les dimensions de la version 1600 px. */
async function ecrireWebp(nom: string, source: Buffer): Promise<{ largeur: number; hauteur: number }> {
  mkdirSync(SORTIE, { recursive: true });
  let dims = { largeur: 0, hauteur: 0 };
  for (const largeur of [1600, 800, 400]) {
    const info = await sharp(source, { failOn: 'none' })
      .rotate()
      .resize({ width: largeur })
      .webp({ quality: largeur > 1000 ? 76 : largeur > 500 ? 72 : 70 })
      .toFile(join(SORTIE, `${nom}-${largeur}.webp`));
    if (largeur === 1600) dims = { largeur: info.width, hauteur: info.height };
  }
  return dims;
}

export function lireCredits(): Record<string, CreditImage> {
  return existsSync(FICHIER_CREDITS) ? JSON.parse(readFileSync(FICHIER_CREDITS, 'utf8')) : {};
}

if (import.meta.main) {
  const forcer = process.argv.includes('--forcer');
  const credits = lireCredits();
  const textes = JSON.parse(readFileSync(resolve(RACINE, 'src/data/textes-alternatifs.json'), 'utf8')) as Record<string, string>;
  const dimensions = existsSync(DIMENSIONS) ? JSON.parse(readFileSync(DIMENSIONS, 'utf8')) : {};
  for (const [nom, credit] of Object.entries(credits)) {
    if (!textes[nom]) throw new Error(`${nom} : texte alternatif manquant dans src/data/textes-alternatifs.json`);
    if (!forcer && existsSync(join(SORTIE, `${nom}-1600.webp`)) && dimensions[nom]) continue;
    const source = credit.type === 'photo' ? await telecharger(credit.telechargement) : Buffer.from(carteSvg(credit));
    dimensions[nom] = await ecrireWebp(nom, source);
    console.log(`${nom} : ${credit.type === 'photo' ? `photo de ${credit.auteur} (${credit.licence})` : 'carte générée'}, ${dimensions[nom].largeur} × ${dimensions[nom].hauteur}`);
  }
  const triees = Object.fromEntries(Object.entries(dimensions).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(DIMENSIONS, JSON.stringify(triees, null, 2) + '\n');
}
