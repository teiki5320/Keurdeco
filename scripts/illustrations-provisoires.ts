// Illustrations provisoires (dessins vectoriels maison) des trois articles de départ,
// en attendant les images d'ambiance définitives (OpenArt, voir docs/workflow.md).
// Usage : node scripts/illustrations-provisoires.ts
// Chaque illustration passe ensuite par la même conversion que les vraies images (scripts/images.ts).
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { convertirImage } from './images.ts';

const L = 2400;
const H = 1600;
const C = { indigo: '#1B2442', indigoClair: '#2C3A66', terracotta: '#A6432A', terracottaMur: '#B9603F', safran: '#E2A62A', sable: '#ECE1CF', ivoire: '#FBF8F2', baobab: '#3F5D46', brun: '#5A3A22', bois: '#8A5A34', creme: '#F1E4C8' };

/** Motif « wax » : cercles concentriques et points, dans un carré. */
function motifWax(id: string, fond: string, a: string, b: string, t = 70): string {
  return `<pattern id="${id}" width="${t}" height="${t}" patternUnits="userSpaceOnUse"><rect width="${t}" height="${t}" fill="${fond}"/><circle cx="${t / 2}" cy="${t / 2}" r="${t * 0.34}" fill="none" stroke="${a}" stroke-width="${t * 0.1}"/><circle cx="${t / 2}" cy="${t / 2}" r="${t * 0.12}" fill="${b}"/><circle cx="0" cy="0" r="${t * 0.1}" fill="${b}"/><circle cx="${t}" cy="${t}" r="${t * 0.1}" fill="${b}"/></pattern>`;
}

/** Tressage : rayures obliques alternées. */
function motifTresse(id: string, a: string, b: string, t = 36): string {
  return `<pattern id="${id}" width="${t}" height="${t}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${t}" height="${t}" fill="${a}"/><rect width="${t / 2}" height="${t}" fill="${b}"/></pattern>`;
}

function salon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}">
  <defs>
    ${motifWax('wax1', C.safran, C.terracotta, C.indigo)}
    ${motifWax('wax2', C.baobab, C.safran, C.creme, 60)}
    ${motifWax('wax3', C.terracotta, C.creme, C.safran, 64)}
    ${motifTresse('tresse', C.creme, C.safran)}
    ${motifTresse('tresse2', C.sable, C.terracotta, 28)}
    <pattern id="tapis" width="160" height="120" patternUnits="userSpaceOnUse"><rect width="160" height="120" fill="${C.creme}"/><path d="M80 10 150 60 80 110 10 60Z" fill="none" stroke="${C.indigo}" stroke-width="12"/><circle cx="80" cy="60" r="12" fill="${C.terracotta}"/></pattern>
  </defs>
  <rect width="${L}" height="1150" fill="${C.terracottaMur}"/>
  <rect y="1150" width="${L}" height="450" fill="#D9C3A0"/>
  <rect y="1140" width="${L}" height="16" fill="${C.brun}" opacity=".35"/>
  <!-- assiettes murales tressées -->
  <g><circle cx="1000" cy="380" r="150" fill="url(#tresse)"/><circle cx="1000" cy="380" r="150" fill="none" stroke="${C.brun}" stroke-width="6"/><circle cx="1000" cy="380" r="55" fill="${C.indigo}"/></g>
  <g><circle cx="1260" cy="300" r="110" fill="url(#tresse2)"/><circle cx="1260" cy="300" r="110" fill="none" stroke="${C.brun}" stroke-width="6"/><circle cx="1260" cy="300" r="35" fill="${C.safran}"/></g>
  <g><circle cx="1420" cy="480" r="90" fill="${C.creme}"/><circle cx="1420" cy="480" r="60" fill="none" stroke="${C.terracotta}" stroke-width="14"/><circle cx="1420" cy="480" r="90" fill="none" stroke="${C.brun}" stroke-width="6"/></g>
  <!-- canapé -->
  <rect x="640" y="700" width="1120" height="260" rx="60" fill="${C.indigoClair}"/>
  <rect x="580" y="860" width="1240" height="220" rx="50" fill="${C.indigo}"/>
  <rect x="560" y="800" width="140" height="300" rx="60" fill="${C.indigo}"/>
  <rect x="1700" y="800" width="140" height="300" rx="60" fill="${C.indigo}"/>
  <rect x="640" y="1080" width="30" height="80" fill="${C.brun}"/><rect x="1730" y="1080" width="30" height="80" fill="${C.brun}"/>
  <!-- coussins en wax -->
  <rect x="720" y="730" width="250" height="220" rx="40" fill="url(#wax1)" transform="rotate(-6 845 840)"/>
  <rect x="1000" y="740" width="230" height="200" rx="40" fill="url(#wax2)"/>
  <rect x="1440" y="730" width="250" height="220" rx="40" fill="url(#wax3)" transform="rotate(6 1565 840)"/>
  <!-- plaid -->
  <path d="M1250 860h170l30 240h-230Z" fill="${C.creme}"/><path d="M1260 900h160M1255 960h175M1250 1020h185" stroke="${C.brun}" stroke-width="12"/>
  <!-- panier et plante -->
  <path d="M200 900c-40-200 60-380 130-420M330 900c0-220-40-360-10-460M300 900c80-180 200-300 260-320M260 900c-100-120-150-260-160-330" stroke="${C.baobab}" stroke-width="26" fill="none" stroke-linecap="round"/>
  <ellipse cx="160" cy="560" rx="60" ry="26" fill="${C.baobab}" transform="rotate(-50 160 560)"/><ellipse cx="560" cy="470" rx="70" ry="28" fill="${C.baobab}" transform="rotate(-20 560 470)"/><ellipse cx="320" cy="440" rx="30" ry="80" fill="${C.baobab}"/>
  <path d="M170 880h320l-40 330H210Z" fill="url(#tresse2)"/><path d="M170 880h320" stroke="${C.brun}" stroke-width="14"/>
  <!-- tapis -->
  <path d="M520 1300h1360l140 260H380Z" fill="url(#tapis)"/><path d="M520 1300h1360l140 260H380Z" fill="none" stroke="${C.terracotta}" stroke-width="14"/>
  <!-- tabouret sculpté et vase -->
  <path d="M1930 960h240l-30 40h-180Z" fill="${C.bois}"/><path d="M1980 1000h140l-20 120h40l-20 60h-140l-20-60h40Z" fill="${C.bois}"/><path d="M2000 1040h100M2010 1080h80" stroke="${C.brun}" stroke-width="10"/>
  <path d="M2020 960c-60-40-60-140 0-180v-40h60v40c60 40 60 140 0 180Z" fill="${C.terracotta}"/><path d="M2000 860h100" stroke="${C.safran}" stroke-width="10"/>
  <!-- pouf -->
  <ellipse cx="1950" cy="1330" rx="200" ry="70" fill="${C.safran}"/><rect x="1750" y="1330" width="400" height="160" fill="${C.safran}"/><ellipse cx="1950" cy="1490" rx="200" ry="70" fill="#C98D1C"/><ellipse cx="1950" cy="1330" rx="200" ry="70" fill="none" stroke="${C.brun}" stroke-width="8"/><path d="M1800 1380v90M1870 1390v100M1950 1395v100M2030 1390v100M2100 1380v90" stroke="${C.brun}" stroke-width="8"/>
</svg>`;
}

function paniers(): string {
  const panier = (x: number, y: number, l: number, h: number, a: string, b: string, id: string, anses = true) =>
    `<defs>${motifTresse(id, a, b, 30)}</defs><path d="M${x} ${y}h${l}l-${l * 0.08} ${h}h-${l * 0.84}Z" fill="url(#${id})"/><path d="M${x} ${y}h${l}" stroke="${C.brun}" stroke-width="12"/>${
      anses ? `<path d="M${x + l * 0.2} ${y}c0-${h * 0.7} ${l * 0.6}-${h * 0.7} ${l * 0.6} 0" fill="none" stroke="${C.brun}" stroke-width="14"/>` : ''
    }`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}">
  <rect width="${L}" height="${H}" fill="${C.sable}"/>
  <rect y="1300" width="${L}" height="300" fill="#CDB892"/>
  <circle cx="1950" cy="330" r="190" fill="${C.creme}"/><circle cx="1950" cy="330" r="120" fill="none" stroke="${C.terracotta}" stroke-width="30"/><circle cx="1950" cy="330" r="190" fill="none" stroke="${C.brun}" stroke-width="8"/>
  <rect x="300" y="560" width="1300" height="36" fill="${C.bois}"/><rect x="300" y="960" width="1300" height="36" fill="${C.bois}"/>
  <rect x="330" y="596" width="24" height="700" fill="${C.bois}"/><rect x="1546" y="596" width="24" height="700" fill="${C.bois}"/>
  ${panier(380, 360, 320, 200, C.creme, C.safran, 'p1')}
  ${panier(760, 400, 260, 160, C.indigo, C.creme, 'p2', false)}
  ${panier(1080, 330, 380, 230, C.terracotta, C.creme, 'p3')}
  ${panier(400, 780, 420, 180, C.baobab, C.safran, 'p4', false)}
  ${panier(900, 740, 300, 220, C.creme, C.indigo, 'p5')}
  ${panier(1260, 800, 250, 160, C.safran, C.terracotta, 'p6', false)}
  ${panier(1720, 900, 460, 400, C.creme, C.terracotta, 'p7')}
  ${panier(500, 1080, 520, 220, C.indigo, C.safran, 'p8', false)}
  ${panier(1080, 1060, 420, 240, C.creme, C.baobab, 'p9')}
  <path d="M1900 900c-30-160 20-300 80-340M1980 900c10-170 90-260 160-280" stroke="${C.baobab}" stroke-width="22" fill="none" stroke-linecap="round"/>
</svg>`;
}

function bogolan(): string {
  const motifs = [
    (x: number, y: number) => `<g fill="${C.creme}"><circle cx="${x + 50}" cy="${y + 50}" r="10"/><circle cx="${x + 100}" cy="${y + 50}" r="10"/><circle cx="${x + 150}" cy="${y + 50}" r="10"/><circle cx="${x + 75}" cy="${y + 110}" r="10"/><circle cx="${x + 125}" cy="${y + 110}" r="10"/><circle cx="${x + 100}" cy="${y + 170}" r="10"/></g>`,
    (x: number, y: number) => `<path d="M${x + 20} ${y + 60}l40-40 40 40 40-40 40 40M${x + 20} ${y + 130}l40-40 40 40 40-40 40 40M${x + 20} ${y + 200}l40-40 40 40 40-40 40 40" fill="none" stroke="${C.creme}" stroke-width="14"/>`,
    (x: number, y: number) => `<path d="M${x + 100} ${y + 20}v180M${x + 20} ${y + 110}h160" stroke="${C.creme}" stroke-width="18"/><rect x="${x + 70}" y="${y + 80}" width="60" height="60" fill="${C.brun}" stroke="${C.creme}" stroke-width="10"/>`,
    (x: number, y: number) => `<g fill="none" stroke="${C.creme}" stroke-width="12"><circle cx="${x + 100}" cy="${y + 110}" r="70"/><circle cx="${x + 100}" cy="${y + 110}" r="30"/></g>`,
    (x: number, y: number) => `<path d="M${x + 30} ${y + 30}h140v160H${x + 30}Z" fill="none" stroke="${C.creme}" stroke-width="10"/><path d="M${x + 30} ${y + 30}l140 160M${x + 170} ${y + 30}L${x + 30} ${y + 190}" stroke="${C.creme}" stroke-width="8"/>`,
  ];
  let cases = '';
  for (let l = 0; l < 7; l++) {
    for (let c = 0; c < 11; c++) {
      const x = 10 + c * 218;
      const y = 10 + l * 228;
      cases += `<rect x="${x}" y="${y}" width="200" height="210" fill="${(l + c) % 3 === 0 ? '#3B2616' : C.brun}"/>${motifs[(l * 3 + c) % motifs.length](x, y)}`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}"><rect width="${L}" height="${H}" fill="#2A1A0E"/>${cases}
  <path d="M0 ${H * 0.62}h${L}" stroke="${C.safran}" stroke-width="0"/></svg>`;
}

if (import.meta.main) {
  const dossier = mkdtempSync(join(tmpdir(), 'keurdeco-'));
  for (const [nom, svg] of [
    ['salon-terracotta-wax', salon()],
    ['paniers-tresses-africains', paniers()],
    ['bogolan-histoire-deco', bogolan()],
  ] as const) {
    const fichier = join(dossier, `${nom}.png`);
    writeFileSync(join(dossier, `${nom}.svg`), svg);
    await sharp(Buffer.from(svg)).png().toFile(fichier);
    await convertirImage(fichier);
  }
}
