/**
 * « Essayez le tissu » (accueil) : un salon dessiné dont on change le tissu d'un clic sur une
 * pastille. Le nouveau motif se propage en cercle depuis la pastille (src/animations.ts).
 *
 * Le dessin existe en deux couches identiques : la couche de base (tissu actuel) et la couche
 * « révélée » (nouveau tissu), découpée par un cercle qui grandit. Les couleurs et motifs de
 * chaque couche sont des variables CSS (--mur, --disque, --sol, --tissu, --coussin).
 */
import { fichierRubrique } from '../src/taxonomie.ts';
import { motif, patternMotif } from './motifs.ts';
import { echapper } from './produits.ts';

export interface Tissu {
  id: string;
  nom: string;
  phrase: string;
  mur: string;
  disque: string;
  sol: string;
  /** Motif du canapé et motif des coussins (identifiants de build/motifs.ts). */
  canape: string;
  coussins: string;
}

export const TISSUS: Tissu[] = [
  { id: 'wax', nom: 'Wax', phrase: 'Couleurs franches et grands cercles : le wax réveille un canapé en un instant.', mur: '#F1D9CC', disque: '#B4532F', sol: '#E3D2B8', canape: 'wax', coussins: 'kente' },
  { id: 'bogolan', nom: 'Bogolan', phrase: 'Tons terre et motifs peints à la boue : le bogolan apporte calme et caractère.', mur: '#EFE3D0', disque: '#5A3A22', sol: '#D9C3A0', canape: 'bogolan', coussins: 'raphia-paniers' },
  { id: 'kente', nom: 'Kente', phrase: 'Bandes tissées et couleurs vives : le kente, tissu de fête, en version salon.', mur: '#F6E7C1', disque: '#D49A2A', sol: '#E3D2B8', canape: 'kente', coussins: 'indigo' },
  { id: 'indigo', nom: 'Indigo', phrase: 'Bleu profond et motifs en réserve : l’indigo apaise toute la pièce.', mur: '#DCE3F0', disque: '#1E2A47', sol: '#E8E4DA', canape: 'indigo', coussins: 'wax' },
  { id: 'raphia-paniers', nom: 'Raphia', phrase: 'Fibre tressée et tons naturels : le raphia pour un salon doux et lumineux.', mur: '#DDE4D2', disque: '#52693A', sol: '#E3D2B8', canape: 'raphia-paniers', coussins: 'terre-cuite' },
];

/** Variables CSS d'une couche pour un tissu. */
export function variablesTissu(t: Tissu): string {
  return `--mur:${t.mur};--disque:${t.disque};--sol:${t.sol};--tissu:url(#es-${t.canape});--coussin:url(#es-${t.coussins})`;
}

/** Une couche du dessin (murs, disque, sol, canapé, coussins). */
function couche(classe: string, t: Tissu, extra = ''): string {
  return `<g class="${classe}" style="${variablesTissu(t)}"${extra}>
    <rect width="1000" height="520" style="fill:var(--mur)"/>
    <circle cx="560" cy="300" r="250" style="fill:var(--disque)"/>
    <rect y="520" width="1000" height="180" style="fill:var(--sol)"/>
    <rect x="270" y="290" width="520" height="150" rx="60" style="fill:var(--tissu)"/>
    <rect x="240" y="400" width="580" height="120" rx="42" style="fill:var(--tissu)"/>
    <rect x="220" y="340" width="90" height="190" rx="42" style="fill:var(--tissu)"/>
    <rect x="750" y="340" width="90" height="190" rx="42" style="fill:var(--tissu)"/>
    <rect x="330" y="320" width="150" height="120" rx="30" transform="rotate(-6 405 380)" style="fill:var(--coussin)"/>
    <rect x="590" y="320" width="150" height="120" rx="30" transform="rotate(6 665 380)" style="fill:var(--coussin)"/>
  </g>`;
}

/** Ombres, pieds et décor fixe, dessinés par-dessus les deux couches. */
const DECOR = `<g class="essayage__decor">
  <rect x="240" y="400" width="580" height="120" rx="42" fill="url(#es-ombre)"/>
  <rect x="270" y="514" width="16" height="50" rx="4" fill="#6B3E1E"/><rect x="774" y="514" width="16" height="50" rx="4" fill="#6B3E1E"/>
  <ellipse cx="530" cy="575" rx="330" ry="16" fill="#2A1D15" opacity=".12"/>
  <path d="M110 520h110l-14 110h-82Z" fill="#B4532F"/><path d="M118 545h94M122 570h86M126 595h78" stroke="#8F3F22" stroke-width="5"/>
  <path d="M165 520c-6-80 10-150 40-190M165 520c-30-70-70-110-100-120M165 520c20-60 60-100 100-110" stroke="#52693A" stroke-width="12" fill="none" stroke-linecap="round"/>
  <ellipse cx="205" cy="330" rx="22" ry="44" fill="#52693A" transform="rotate(25 205 330)"/><ellipse cx="70" cy="402" rx="20" ry="40" fill="#52693A" transform="rotate(-60 70 402)"/><ellipse cx="262" cy="410" rx="20" ry="38" fill="#52693A" transform="rotate(60 262 410)"/>
  <path d="M870 470h90l-10 20h-70Z" fill="#8A5A34"/><path d="M885 490h60l-8 70h-44Z" fill="#8A5A34"/>
  <path d="M895 470c-26-18-26-66 0-84v-18h30v18c26 18 26 66 0 84Z" fill="#D49A2A"/><path d="M890 420h40" stroke="#9C6B12" stroke-width="5"/>
</g>`;

export function essayage(): string {
  const depart = TISSUS[0];
  const patterns = [...new Set(TISSUS.flatMap((t) => [t.canape, t.coussins]))].map((id) => patternMotif(id, `es-${id}`, 0.9)).join('');
  const donnees = JSON.stringify(TISSUS.map((t) => ({ id: t.id, nom: t.nom, phrase: t.phrase, vars: variablesTissu(t), lien: fichierRubrique('matiere', t.id) })));
  return `<section class="section essayage" data-essayage aria-labelledby="essayage-titre">
  <div class="conteneur essayage__grille">
    <div class="essayage__texte">
      <p class="surtitre" data-reveal>Essayez le tissu</p>
      <h2 id="essayage-titre" data-mots>Même canapé, <em>autre</em> histoire<span class="point">.</span></h2>
      <p class="essayage__phrase" data-essayage-phrase aria-live="polite">${echapper(depart.phrase)}</p>
      <div class="essayage__pastilles" role="group" aria-label="Choisir un tissu">
        ${TISSUS.map(
          (t, i) =>
            `<button type="button" class="pastille-tissu" data-tissu="${i}" aria-pressed="${i === 0}" aria-label="${t.nom}"><span class="pastille-tissu__motif">${motif(t.canape)}</span><span class="pastille-tissu__nom">${t.nom}</span></button>`,
        ).join('')}
      </div>
      <p data-reveal><a class="lien-fleche" href="${fichierRubrique('matiere', depart.id)}" data-essayage-lien data-libelle="${depart.nom}">Idées déco <span data-essayage-nom>${depart.nom}</span> <svg class="icone icone--petite" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></a></p>
    </div>
    <div class="essayage__scene" data-reveal>
      <svg class="essayage__dessin" viewBox="0 0 1000 700" role="img" aria-label="Salon dessiné : un canapé habillé du tissu choisi, devant un grand disque de couleur">
        <defs>${patterns}
          <linearGradient id="es-ombre" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
          <clipPath id="es-revele"><circle data-essayage-cercle cx="0" cy="0" r="0"/></clipPath>
        </defs>
        ${couche('essayage__base', depart)}
        ${couche('essayage__nouveau', depart, ' clip-path="url(#es-revele)"')}
        ${DECOR}
      </svg>
    </div>
  </div>
  <script type="application/json" data-essayage-tissus>${donnees.replace(/</g, '\\u003c')}</script>
</section>`;
}
