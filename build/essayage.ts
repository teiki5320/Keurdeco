/**
 * « Essayez le tissu » (accueil) : le nuancier. On choisit un objet (canapé, fauteuil, pouf,
 * coussin, suspension) à gauche et une matière à droite ; la matière se propage en cercle.
 * Sur le canapé, un clic fait tomber des coussins. Rendu statique ici (lisible sans JavaScript),
 * animé par src/nuancier.ts. Les dessins et motifs SVG sont dans src/data/nuancier.json.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fichierRubrique } from '../src/taxonomie.ts';

const { motifs, dessins } = JSON.parse(readFileSync(resolve(import.meta.dirname, '../src/data/nuancier.json'), 'utf8')) as {
  motifs: string;
  dessins: Record<string, string>;
};

export const OBJETS = [
  { id: 'canape', nom: 'Saly', sous: 'Canapé deux places' },
  { id: 'fauteuil', nom: 'Gorée', sous: 'Fauteuil capitonné' },
  { id: 'pouf', nom: 'Joal', sous: 'Pouf rond' },
  { id: 'coussin', nom: 'Ngor', sous: 'Coussin carré' },
  { id: 'lampe', nom: 'Casamance', sous: 'Suspension' },
];

export const TISSUS = [
  { nom: 'Terracotta', remplissage: '#B4532F', pastille: '#B4532F', contour: '#B4532F', teinte: '#EBC0A8', titre: 'Terracotta, la terre de Dakar', phrase: 'La couleur des murs en banco et des jarres en terre cuite. Chaude, mate, elle se marie au bois foncé.', lien: fichierRubrique('matiere', 'terre-cuite') },
  { nom: 'Ocre safran', remplissage: '#D49A2A', pastille: '#D49A2A', contour: '#D49A2A', teinte: '#F3DCA8', titre: 'Ocre safran', phrase: 'Le jaune des épices et des pagnes du marché. Une touche lumineuse pour une pièce sombre.', lien: 'matieres.html' },
  { nom: 'Indigo', remplissage: '#233257', pastille: '#233257', contour: '#233257', teinte: '#B5BFD6', titre: 'Indigo', phrase: 'Le bleu des teinturiers de Kano et de Guinée, obtenu à partir des feuilles d’indigotier.', lien: fichierRubrique('matiere', 'indigo') },
  { nom: 'Baobab', remplissage: '#5E7640', pastille: '#5E7640', contour: '#5E7640', teinte: '#CCD5B0', titre: 'Vert baobab', phrase: 'Le vert des feuilles de baobab et de la savane après la pluie. Il apaise les imprimés vifs.', lien: 'matieres.html' },
  { nom: 'Wax', remplissage: 'url(#kd-wax)', pastille: 'radial-gradient(circle,#D49A2A 0 5px,#B4532F 5px 8px,transparent 8px) 0 0/16px 16px,#1E2A47', contour: '#1E2A47', teinte: '#F2D6A8', titre: 'Wax', phrase: 'Coton imprimé à la cire, aux motifs et aux couleurs vives, emblème des pagnes d’Afrique de l’Ouest.', lien: fichierRubrique('matiere', 'wax') },
  { nom: 'Bogolan', remplissage: 'url(#kd-bog)', pastille: 'radial-gradient(#E9DCC3 1.5px,transparent 2px) 0 0/8px 8px,#4A2F1C', contour: '#4A2F1C', teinte: '#E0CFB2', titre: 'Bogolan', phrase: 'Coton du Mali teint à la boue fermentée ; les motifs sont peints à la main, trait par trait.', lien: fichierRubrique('matiere', 'bogolan') },
  { nom: 'Kente', remplissage: 'url(#kd-kente)', pastille: 'repeating-linear-gradient(90deg,#D49A2A 0 5px,#1E2A47 5px 7px,#5E7640 7px 11px,#B4532F 11px 14px)', contour: '#B4532F', teinte: '#F4DC98', titre: 'Kente', phrase: 'Bandes étroites tissées au Ghana puis cousues ensemble ; chaque couleur porte un sens.', lien: fichierRubrique('matiere', 'kente') },
];

/** Matière affichée au premier chargement (wax). */
export const DEPART = 4;

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
  const oy = (i: number) => `${14 + i * 12}%`;
  const vignettes = OBJETS.map(
    (x, i) =>
      `<button type="button" class="nuancier__vignette" data-objet="${i}" aria-pressed="${i === 0}" aria-label="${echapper(x.sous)}"><img src="${dessin(x.id, t.remplissage)}" alt="" width="84" height="52"><span>0${i + 1}</span></button>`,
  ).join('');
  const disques = TISSUS.map((x, i) => `<span class="nuancier__disque${i === DEPART ? ' est-actif' : ''}" style="--t:${x.teinte};--oy:${oy(i)}"></span>`).join('');
  const calques = TISSUS.map(
    (x, i) =>
      `<span class="nuancier__calque${i === DEPART ? ' est-actif' : ''}" style="--oy:${oy(i)}"><img src="${dessin(o.id, x.remplissage)}" alt="${i === DEPART ? echapper(`${o.sous} habillé en ${x.nom.toLowerCase()}`) : ''}"></span>`,
  ).join('');
  const pastilles = TISSUS.map(
    (x, i) => `<button type="button" class="nuancier__pastille" data-tissu="${i}" aria-pressed="${i === DEPART}" aria-label="${echapper(x.nom)}" style="--c:${x.pastille};--s:${x.contour}"></button>`,
  ).join('');
  const donnees = JSON.stringify({ motifs, dessins, objets: OBJETS, tissus: TISSUS }).replace(/</g, '\\u003c');
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
      <div class="nuancier__pastilles" role="group" aria-label="Choisir une matière">${pastilles}</div>
    </div>
    <p class="nuancier__aide" data-nuancier-aide>Cliquez sur le canapé pour y faire tomber des coussins.</p>
  </div>
  <script type="application/json" data-nuancier-donnees>${donnees}</script>
</section>`;
}
