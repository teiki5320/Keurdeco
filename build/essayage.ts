/**
 * « Essayez le tissu » (accueil) : le nuancier. On choisit un objet (canapé, fauteuil, pouf,
 * coussin, suspension) à gauche et l’un des 4 tissus (wax, bogolan, kente, indigo) à droite ; il se propage en cercle.
 * À gauche, seul l’objet choisi porte le tissu : les autres restent en teinte neutre.
 * Sur le canapé, un clic fait tomber des coussins. Rendu statique ici (lisible sans JavaScript),
 * animé par src/nuancier.ts. Les dessins des objets sont dans src/data/nuancier.json, les motifs dans build/motifs.ts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fichierRubrique, MATIERES } from '../src/taxonomie.ts';
import { patternMotif } from './motifs.ts';

const { dessins } = JSON.parse(readFileSync(resolve(import.meta.dirname, '../src/data/nuancier.json'), 'utf8')) as {
  dessins: Record<string, string>;
};

/** Seuls les tissus habillent un meuble (pas la terre cuite, le bois, les perles ni le raphia). */
const TISSUS_AMEUBLEMENT = ['wax', 'bogolan', 'kente', 'indigo'];
const MATIERES_TISSU = MATIERES.filter((m) => TISSUS_AMEUBLEMENT.includes(m.id));

/** Teinte des objets non choisis, à gauche. */
export const NEUTRE = '#DDD0BD';

/** Motifs des tissus (les mêmes que sur les tuiles), réduits pour habiller les dessins. */
const motifs = MATIERES_TISSU.map((m) => patternMotif(m.id, `kd-${m.id}`, 0.55)).join('');

export const OBJETS = [
  { id: 'canape', nom: 'Saly', sous: 'Canapé deux places' },
  { id: 'fauteuil', nom: 'Gorée', sous: 'Fauteuil capitonné' },
  { id: 'pouf', nom: 'Joal', sous: 'Pouf rond' },
  { id: 'coussin', nom: 'Ngor', sous: 'Coussin carré' },
  { id: 'lampe', nom: 'Casamance', sous: 'Suspension' },
];

/** Pastille, contour, teinte du disque et phrase de chaque tissu (src/taxonomie.ts pour les noms, build/motifs.ts pour les motifs). */
const PASTILLES: Record<string, { pastille: string; contour: string; teinte: string; phrase: string }> = {
  wax: { pastille: 'radial-gradient(circle,#D49A2A 0 5px,#B4532F 5px 8px,transparent 8px) 0 0/16px 16px,#1E2A47', contour: '#1E2A47', teinte: '#F2D6A8', phrase: 'Coton imprimé à la cire, aux motifs et aux couleurs vives, emblème des pagnes d’Afrique de l’Ouest.' },
  bogolan: { pastille: 'radial-gradient(#E9DCC3 1.5px,transparent 2px) 0 0/8px 8px,#4A2F1C', contour: '#4A2F1C', teinte: '#E0CFB2', phrase: 'Coton du Mali teint à la boue fermentée ; les motifs sont peints à la main, trait par trait.' },
  kente: { pastille: 'repeating-linear-gradient(90deg,#D49A2A 0 5px,#1E2A47 5px 7px,#5E7640 7px 11px,#B4532F 11px 14px)', contour: '#B4532F', teinte: '#F4DC98', phrase: 'Bandes étroites tissées au Ghana puis cousues ensemble ; chaque couleur porte un sens.' },
  indigo: { pastille: 'radial-gradient(circle,#7F95D6 0 2.5px,transparent 3px) 0 0/10px 10px,#1B2442', contour: '#1B2442', teinte: '#B5BFD6', phrase: 'Le bleu des teinturiers de Kano et de Guinée, obtenu à partir des feuilles d’indigotier.' },
};

export const TISSUS = MATIERES_TISSU.map((m) => ({
  id: m.id,
  nom: m.nom,
  remplissage: `url(#kd-${m.id})`,
  titre: m.nom,
  lien: fichierRubrique('matiere', m.id),
  ...PASTILLES[m.id],
}));

/** Matière affichée au premier chargement (wax). */
export const DEPART = 0;

/** Dessin d'un objet habillé d'une matière, en image SVG autonome. */
export function dessin(objet: string, remplissage: string): string {
  // Seul le motif réellement utilisé est embarqué (url(#kd-…)), pas toute la bibliothèque.
  const id = remplissage.match(/url\(#([\w-]+)\)/)?.[1];
  const motif = id ? (motifs.match(new RegExp(`<pattern id="${id}"[\\s\\S]*?</pattern>`))?.[0] ?? '') : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240">${motif ? `<defs>${motif}</defs>` : ''}<g fill="${remplissage}">${dessins[objet]}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encoderSvg(svg)}`;
}

/** Encodage compact d'un SVG pour une adresse data: (guillemets simples, seuls les caractères sensibles échappés). */
export function encoderSvg(svg: string): string {
  return svg
    .replace(/"/g, "'")
    .replace(/[\r\n]+/g, ' ')
    .replace(/[%#<>{}]/g, (c) => encodeURIComponent(c));
}

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function essayage(): string {
  const t = TISSUS[DEPART];
  const o = OBJETS[0];
  const oy = (i: number) => `${50 + (i - (TISSUS.length - 1) / 2) * 11.5}%`;
  const vignettes = OBJETS.map(
    (x, i) =>
      `<button type="button" class="nuancier__vignette" data-objet="${i}" aria-pressed="${i === 0}" aria-label="${echapper(x.sous)}"><img src="${dessin(x.id, i === 0 ? t.remplissage : NEUTRE)}" alt="" width="84" height="52"><span>0${i + 1}</span></button>`,
  ).join('');
  const disques = TISSUS.map((x, i) => `<span class="nuancier__disque${i === DEPART ? ' est-actif' : ''}" style="--t:${x.teinte};--oy:${oy(i)}"></span>`).join('');
  const calques = TISSUS.map(
    (x, i) =>
      `<span class="nuancier__calque${i === DEPART ? ' est-actif' : ''}" style="--oy:${oy(i)}"><img src="${dessin(o.id, x.remplissage)}" alt="${i === DEPART ? echapper(`${o.sous} habillé en ${x.nom.toLowerCase()}`) : ''}"></span>`,
  ).join('');
  const pastilles = TISSUS.map(
    (x, i) => `<button type="button" class="nuancier__pastille" data-tissu="${i}" aria-pressed="${i === DEPART}" aria-label="${echapper(x.nom)}" style="--c:${x.pastille};--s:${x.contour}"></button>`,
  ).join('');
  const donnees = JSON.stringify({ motifs, dessins, neutre: NEUTRE, objets: OBJETS, tissus: TISSUS }).replace(/</g, '\\u003c');
  return `<section class="section nuancier" data-nuancier data-depart="${DEPART}" aria-labelledby="nuancier-titre">
  <div class="conteneur">
    <div class="section__entete">
      <div>
        <p class="surtitre" data-reveal>Essayez le tissu</p>
        <h2 id="nuancier-titre" data-mots>Habillez la <em>maison</em><span class="point">.</span></h2>
      </div>
    </div>
    <div class="nuancier__carte" data-reveal>
      <div class="nuancier__objets" role="group" aria-label="Choisir un objet">${vignettes}</div>
      <div class="nuancier__scene nuancier__scene--canape" data-nuancier-scene>
        <p class="nuancier__nom" data-nuancier-nom aria-hidden="true">${o.nom.toUpperCase()}</p><p class="visuellement-cache" data-nuancier-annonce aria-live="polite">${o.nom}</p>
        <p class="nuancier__sous" data-nuancier-sous>${o.sous}</p>
        <div class="nuancier__disques" aria-hidden="true">${disques}</div>
        <div class="nuancier__zone" data-nuancier-zone>
          <div class="nuancier__pose" data-nuancier-pose>${calques}</div>
        </div>
        <div class="nuancier__texte">
          <p class="nuancier__titre" data-nuancier-titre>${echapper(t.titre)}</p>
          <p class="nuancier__phrase" data-nuancier-phrase aria-live="polite">${echapper(t.phrase)}</p>
          <a class="bouton bouton--contour" href="${t.lien}" data-nuancier-lien data-libelle="${t.nom}">Voir la matière</a>
        </div>
      </div>
      <div class="nuancier__pastilles" role="group" aria-label="Choisir un tissu">${pastilles}</div>
    </div>
    <p class="nuancier__aide" data-nuancier-aide>Cliquez sur le canapé pour y faire tomber des coussins.</p>
  </div>
  <script type="application/json" data-nuancier-donnees>${donnees}</script>
</section>`;
}
