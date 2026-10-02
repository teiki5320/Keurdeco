// Génère les épingles Pinterest des articles publiés, avant le build Vite (npm run build).
// Usage : node scripts/epingles.ts   (ou npm run epingles)
//
// Pour chaque article publié et chaque titre de sa liste « epingles », une image JPG
// 1000 × 1500 px : recadrage de l'image d'ambiance + titre en surimpression + petit logo.
// Quatre gabarits alternent : bandeau haut, bandeau bas, cadre, split.
// Uniquement nos propres visuels : jamais de photo de produit Amazon.
//
// Sortie : public/epingles/<slug>-<n>.jpg et public/epingles.json (manifeste lu par
// scripts/pinterest-publier.mjs une fois le site publié).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { FAMILLES, trouverRubrique, type Famille } from '../src/taxonomie.ts';
import { typographier } from '../src/typo.ts';
import { adresseArticle, articlesPublies, type Article } from '../build/articles.ts';
import { lienPinterest, SITE_URL } from '../build/config.ts';
import { conseilsPublies, THEMES, type Conseil } from '../build/conseils.ts';
import { motif } from '../build/motifs.ts';

const RACINE = resolve(import.meta.dirname, '..');
const SORTIE = resolve(RACINE, 'public/epingles');
const MANIFESTE = resolve(RACINE, 'public/epingles.json');
const CSV = resolve(RACINE, 'public/epingles-pinterest.csv');
const TABLEAUX = resolve(RACINE, 'config/tableaux-pinterest.json');
const POLICE_TITRE = resolve(RACINE, 'assets/polices/Fraunces_600SemiBold.ttf');
const POLICE_TEXTE = resolve(RACINE, 'assets/polices/SourceSans3_600SemiBold.ttf');

export const LARGEUR = 1000;
export const HAUTEUR = 1500;
export const GABARITS = ['bandeau-haut', 'bandeau-bas', 'cadre', 'split'] as const;
export type Gabarit = (typeof GABARITS)[number] | 'question';

// Palette « Terre de Dakar » (src/theme.css).
const C = { indigo: '#1E2A47', ivoire: '#FDF9F3', sable: '#EFE3D0', terracotta: '#B4532F', safran: '#D49A2A', ocreFonce: '#9C6B12' };

export interface EntreeManifeste {
  id: string;
  slug: string;
  numero: number;
  gabarit: Gabarit;
  image: string;
  titre: string;
  description: string;
  alt: string;
  lien: string;
  tableau: string;
  publie_le: string;
}

/** Gabarit de la n-ième épingle d'un article (décalé selon l'article pour varier d'un article à l'autre). */
export function gabaritPour(a: Article, index: number): Gabarit {
  const decalage = [...a.slug].reduce((s, c) => s + c.charCodeAt(0), 0);
  return GABARITS[(index + decalage) % GABARITS.length];
}

/** Description de l'épingle : description de l'article + mots-clés des rubriques (500 caractères max). */
export function descriptionEpingle(a: Article): string {
  const mots = ['déco africaine', 'décoration africaine'];
  for (const famille of ['piece', 'matiere', 'occasion'] as Famille[]) {
    for (const id of a[FAMILLES[famille].champ]) {
      const r = trouverRubrique(famille, id);
      if (r) mots.push(r.nom.toLowerCase());
    }
  }
  const texte = `${a.description} Idées ${[...new Set(mots)].join(', ')} sur Keur Déco.`;
  return texte.length > 500 ? `${texte.slice(0, 497)}…` : texte;
}

function echapperPango(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Titre en PNG transparent, à la plus grande taille qui tient dans la boîte. */
async function titrePng(titre: string, couleur: string, largeur: number, hauteurMax: number): Promise<Buffer> {
  for (let taille = 84; taille >= 36; taille -= 4) {
    const png = await sharp({
      text: {
        text: `<span foreground="${couleur}" line_height="1.05">${echapperPango(typographier(titre))}</span>`,
        font: `Fraunces SemiBold ${taille}`,
        fontfile: POLICE_TITRE,
        width: largeur,
        align: 'centre',
        rgba: true,
        wrap: 'word',
        dpi: 72,
      },
    })
      .png()
      .toBuffer();
    const { height } = await sharp(png).metadata();
    if ((height ?? 0) <= hauteurMax) return png;
  }
  throw new Error(`Titre d'épingle trop long : « ${titre} »`);
}

/** Signature : emblème Keur Déco (npm run visuels-marque) + « Keur Déco · déco africaine ». */
async function signature(couleurTexte: string, surFonce: boolean): Promise<Buffer> {
  const logo = await sharp(resolve(RACINE, `public/images/marque/embleme-${surFonce ? 'sombre' : 'clair'}-192.webp`))
    .resize(56, 56)
    .png()
    .toBuffer();
  const texte = await sharp({
    text: { text: `<span foreground="${couleurTexte}">Keur Déco · déco africaine</span>`, font: 'Source Sans 3 SemiBold 30', fontfile: POLICE_TEXTE, rgba: true, dpi: 72 },
  })
    .png()
    .toBuffer();
  const { width = 300, height = 36 } = await sharp(texte).metadata();
  return sharp({ create: { width: 56 + 14 + width, height: 56, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: logo, left: 0, top: 0 },
      { input: texte, left: 70, top: Math.round((56 - height) / 2) },
    ])
    .png()
    .toBuffer();
}

/** Source de l'image : l'original haute définition, sinon la version 1600 px du site. */
export function sourceImage(nom: string): string {
  const hd = resolve(RACINE, 'contenu/images', `${nom}.jpg`);
  return existsSync(hd) ? hd : resolve(RACINE, 'public/images/articles', `${nom}-1600.webp`);
}

const rect = (x: number, y: number, l: number, h: number, couleur: string, opacite = 1, rayon = 0) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR}" height="${HAUTEUR}"><rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${rayon}" fill="${couleur}" fill-opacity="${opacite}"/></svg>`);

const centreX = async (png: Buffer) => Math.round((LARGEUR - ((await sharp(png).metadata()).width ?? 0)) / 2);
const hauteurDe = async (png: Buffer) => (await sharp(png).metadata()).height ?? 0;

/** Compose une épingle 1000 × 1500 selon le gabarit. */
export async function composerEpingle(source: string, titre: string, gabarit: Gabarit): Promise<Buffer> {
  const couches: OverlayOptions[] = [];
  let fond: Buffer;

  if (gabarit === 'split') {
    // Image en haut (1000 × 900), bloc indigo en bas avec le titre.
    const image = await sharp(source).resize(LARGEUR, 900, { fit: 'cover', position: 'attention' }).toBuffer();
    fond = await sharp({ create: { width: LARGEUR, height: HAUTEUR, channels: 3, background: C.indigo } })
      .composite([{ input: image, left: 0, top: 0 }])
      .png()
      .toBuffer();
    const t = await titrePng(titre, C.ivoire, 840, 400);
    couches.push({ input: rect(0, 894, LARGEUR, 12, C.safran) });
    couches.push({ input: t, left: await centreX(t), top: 900 + Math.round((500 - (await hauteurDe(t))) / 2) });
    const s = await signature(C.ivoire, true);
    couches.push({ input: s, left: await centreX(s), top: 1410 });
  } else {
    fond = await sharp(source).resize(LARGEUR, HAUTEUR, { fit: 'cover', position: 'attention' }).png().toBuffer();
    if (gabarit === 'bandeau-haut') {
      const t = await titrePng(titre, C.ivoire, 860, 380);
      const h = (await hauteurDe(t)) + 150;
      couches.push({ input: rect(0, 0, LARGEUR, h, C.indigo, 0.94) });
      couches.push({ input: rect(0, h, LARGEUR, 10, C.safran) });
      couches.push({ input: t, left: await centreX(t), top: 75 });
      const s = await signature(C.indigo, false);
      couches.push({ input: rect(260, 1380, 480, 80, C.ivoire, 0.92, 40) });
      couches.push({ input: s, left: await centreX(s), top: 1392 });
    } else if (gabarit === 'bandeau-bas') {
      const t = await titrePng(titre, C.indigo, 860, 380);
      const h = (await hauteurDe(t)) + 210;
      couches.push({ input: rect(0, HAUTEUR - h, LARGEUR, h, C.ivoire, 0.96) });
      couches.push({ input: rect(0, HAUTEUR - h - 10, LARGEUR, 10, C.terracotta) });
      couches.push({ input: t, left: await centreX(t), top: HAUTEUR - h + 60 });
      const s = await signature(C.indigo, false);
      couches.push({ input: s, left: await centreX(s), top: HAUTEUR - 100 });
    } else {
      // Cadre : liseré ivoire autour de l'image et carte centrale avec le titre.
      const cadre = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR}" height="${HAUTEUR}"><path fill-rule="evenodd" fill="${C.ivoire}" d="M0 0h${LARGEUR}v${HAUTEUR}H0Z M40 40v${HAUTEUR - 80}h${LARGEUR - 80}V40Z"/><rect x="58" y="58" width="${LARGEUR - 116}" height="${HAUTEUR - 116}" fill="none" stroke="${C.terracotta}" stroke-width="4"/></svg>`,
      );
      couches.push({ input: cadre });
      const t = await titrePng(titre, C.indigo, 700, 420);
      const h = (await hauteurDe(t)) + 170;
      const haut = Math.round((HAUTEUR - h) / 2) + 180;
      couches.push({ input: rect(110, haut, LARGEUR - 220, h, C.ivoire, 0.95, 18) });
      couches.push({ input: rect(LARGEUR / 2 - 40, haut + 36, 80, 6, C.safran) });
      couches.push({ input: t, left: await centreX(t), top: haut + 70 });
      const s = await signature(C.indigo, false);
      couches.push({ input: rect(260, 1330, 480, 80, C.ivoire, 0.95, 40) });
      couches.push({ input: s, left: await centreX(s), top: 1342 });
    }
  }
  return sharp(fond).composite(couches).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

/** Nom lisible du motif d'un conseil (texte alternatif). */
const t = (c: Conseil) => THEMES[c.theme].motif.replace('-paniers', '').replace('-', ' ');

/** Épingle d'un conseil (sans photo) : la question en grand, sur le motif de tissu de son thème. */
export async function composerEpingleConseil(c: Conseil, titre: string): Promise<Buffer> {
  const theme = THEMES[c.theme];
  const fond = Buffer.from(motif(theme.motif).replace('<svg class="motif"', `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR}" height="${HAUTEUR}"`).replace(/ aria-hidden="true" focusable="false"/, ''));
  const titrePngConseil = await titrePng(titre, C.indigo, 700, 620);
  const h = await hauteurDe(titrePngConseil);
  const etiquette = await sharp({
    text: { text: `<span foreground="${C.ocreFonce}" letter_spacing="4000">CONSEIL · ${echapperPango(theme.nom.toUpperCase())}</span>`, font: 'Source Sans 3 SemiBold 30', fontfile: POLICE_TEXTE, rgba: true, dpi: 72 },
  })
    .png()
    .toBuffer();
  const carteH = h + 330;
  const haut = Math.round((HAUTEUR - carteH) / 2) - 40;
  // Carte ivoire en forme d'arche (la porte du logo), qui porte la question.
  const carte = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR}" height="${HAUTEUR}"><path d="M110 ${haut + 260} A390 260 0 0 1 890 ${haut + 260} V${haut + carteH} H110 Z" fill="${C.ivoire}"/><rect x="${LARGEUR / 2 - 40}" y="${haut + 150}" width="80" height="6" fill="${C.terracotta}"/></svg>`,
  );
  const s = await signature(C.ivoire, true);
  return sharp(await sharp(fond).png().toBuffer())
    .composite([
      { input: carte },
      { input: etiquette, left: await centreX(etiquette), top: haut + 190 },
      { input: titrePngConseil, left: await centreX(titrePngConseil), top: haut + 250 },
      { input: rect(260, HAUTEUR - 150, 480, 80, C.indigo, 0.92, 40) },
      { input: s, left: await centreX(s), top: HAUTEUR - 138 },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

/**
 * Fichier d'import en lot pour Pinterest (« Créer des épingles en masse » avec un fichier .csv) :
 * solution manuelle en attendant l'accès complet à l'API. Colonnes du modèle Pinterest :
 * Title, Media URL, Pinterest board, Thumbnail, Description, Link, Publish date, Keywords.
 * Le tableau est désigné par son nom (config/tableaux-pinterest.json) ; les épingles sont
 * programmées une par jour à partir d'aujourd'hui, dans l'ordre du manifeste.
 */
export function csvPinterest(entrees: EntreeManifeste[], tableaux = JSON.parse(readFileSync(TABLEAUX, 'utf8')) as { tableaux: Record<string, { nom: string }> }): string {
  const cellule = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lignes = [['Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords'].join(',')];
  entrees.forEach((e, i) => {
    const date = new Date(Date.now() + (i + 1) * 86400000);
    date.setUTCHours(17, 0, 0, 0); // 19 h à Paris en été : un bon créneau sur Pinterest
    const tableau = tableaux.tableaux[e.tableau]?.nom ?? tableaux.tableaux.general?.nom ?? 'Keur Déco';
    lignes.push([e.titre, e.image, tableau, '', e.description, e.lien, date.toISOString().slice(0, 19), 'déco africaine, décoration africaine'].map(cellule).join(','));
  });
  return lignes.join('\n') + '\n';
}

/** Génère toutes les épingles des articles publiés et le manifeste. */
export async function genererEpingles(articles = articlesPublies(), url = SITE_URL, conseils = conseilsPublies()): Promise<EntreeManifeste[]> {
  rmSync(SORTIE, { recursive: true, force: true });
  mkdirSync(SORTIE, { recursive: true });
  const manifeste: EntreeManifeste[] = [];
  for (const a of articles) {
    const source = sourceImage(a.image);
    if (!existsSync(source)) {
      console.warn(`⚠ Épingles de ${a.slug} : image « ${a.image} » introuvable.`);
      continue;
    }
    for (const [i, titre] of a.epingles.entries()) {
      const numero = i + 1;
      const gabarit = gabaritPour(a, i);
      const fichier = `${a.slug}-${numero}.jpg`;
      writeFileSync(resolve(SORTIE, fichier), await composerEpingle(source, titre, gabarit));
      manifeste.push({
        id: `${a.slug}-${numero}`,
        slug: a.slug,
        numero,
        gabarit,
        image: `${url}epingles/${fichier}`,
        titre: titre.length > 100 ? `${titre.slice(0, 99)}…` : titre,
        description: descriptionEpingle(a),
        alt: a.imageAlt.slice(0, 500),
        lien: lienPinterest(adresseArticle(a, url), a.slug, numero),
        tableau: a.tableauPinterest,
        publie_le: a.publieLe,
      });
    }
  }
  // Conseils : une épingle typographique par titre (tableau général).
  for (const c of conseils) {
    for (const [i, titre] of c.epingles.entries()) {
      const numero = i + 1;
      const fichier = `conseil-${c.slug}-${numero}.jpg`;
      writeFileSync(resolve(SORTIE, fichier), await composerEpingleConseil(c, titre));
      manifeste.push({
        id: `conseil-${c.slug}-${numero}`,
        slug: `conseil-${c.slug}`,
        numero,
        gabarit: 'question',
        image: `${url}epingles/${fichier}`,
        titre: titre.length > 100 ? `${titre.slice(0, 99)}…` : titre,
        description: `${c.reponse} Conseils de décoration africaine sur Keur Déco.`.slice(0, 500),
        alt: `Épingle Keur Déco : « ${titre} » sur un motif ${t(c)}.`,
        lien: lienPinterest(`${url}${c.fichier}`, `conseil-${c.slug}`, numero),
        tableau: 'general',
        publie_le: c.publieLe,
      });
    }
  }
  writeFileSync(CSV, csvPinterest(manifeste));
  writeFileSync(MANIFESTE, JSON.stringify({ genere_le: new Date().toISOString(), site: url, epingles: manifeste }, null, 2) + '\n');
  return manifeste;
}

if (import.meta.main) {
  const m = await genererEpingles();
  console.log(`Épingles Pinterest : ${m.length} image(s) dans public/epingles/, manifeste public/epingles.json.`);
}
