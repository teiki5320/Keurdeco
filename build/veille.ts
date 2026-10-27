/**
 * Veille actus (côté build) : actus de la déco, du design et de l'artisanat africains, préparées
 * 2 fois par jour par la tâche de veille (dépôt public teiki5320/veille) et lues en direct dans le
 * navigateur (src/veille.ts). Le build ne fait que deux choses :
 *   - écrire veille/entites.json : les matières du site, pour que la veille relie une actu à une matière ;
 *   - remplacer les marqueurs <!--#actus:4--> et <!--#actus:3:matiere:wax--> par une section vide et
 *     cachée (attribut hidden), que le navigateur remplit seulement s'il y a des actus.
 * Sans JavaScript, ou si le fichier de la veille ne répond pas, rien ne s'affiche.
 */
import { MATIERES } from '../src/taxonomie.ts';

export interface EntiteVeille {
  tag: string;
  nom: string;
  autres_noms: string[];
}

/** Variantes utiles de chaque matière (noms locaux, orthographes, mots anglais des sources). */
const AUTRES_NOMS: Record<string, string[]> = {
  wax: ['wax hollandais', 'tissu wax', 'pagne wax', 'pagne', 'ankara', 'Dutch wax', 'Vlisco', 'African print', 'tissu africain imprimé'],
  bogolan: ['bògòlanfini', 'bogolanfini', 'mud cloth', 'mudcloth', 'tissu de boue', 'toile de boue'],
  kente: ['kenté', 'kente cloth', 'kenteh', 'tissu kente', 'asasia', 'adweneasa'],
  indigo: ['adire', 'adiré', 'teinture à l’indigo', 'indigo dye', 'tissu indigo', 'ndop', 'shibori africain'],
  'raphia-paniers': ['raphia', 'vannerie', 'paniers tressés', 'panier bolga', 'bolga', 'basketry', 'woven baskets', 'tressage', 'osier', 'palmier doum'],
  'terre-cuite': ['poterie', 'céramique', 'jarre', 'canari', 'terre cuite', 'pottery', 'ceramics', 'terracotta', 'argile'],
  'bois-sculpte': ['sculpture sur bois', 'bois sculpté', 'masque africain', 'tabouret ashanti', 'woodcarving', 'wood carving', 'ébène'],
  perles: ['perlage', 'perles de verre', 'perles krobo', 'beadwork', 'beads', 'perles de Venise', 'juju hat'],
};

/** Contenu de veille/entites.json : une entrée par matière du site. */
export function entitesVeille(): EntiteVeille[] {
  return MATIERES.map((m) => ({ tag: `matiere:${m.id}`, nom: m.nom, autres_noms: AUTRES_NOMS[m.id] ?? [] }));
}

/** « L'actu du wax », « L'actu de l'indigo »… : le bon article devant chaque matière. */
const DU_MATIERE: Record<string, string> = {
  wax: 'du wax',
  bogolan: 'du bogolan',
  kente: 'du kente',
  indigo: 'de l’indigo',
  'raphia-paniers': 'de la vannerie',
  'terre-cuite': 'de la terre cuite',
  'bois-sculpte': 'du bois sculpté',
  perles: 'des perles',
};

export function titreActusMatiere(id: string): string {
  return `L’actu ${DU_MATIERE[id] ?? `de la matière ${id}`}`;
}

/**
 * Section d'actus, vide et cachée, remplie par le navigateur (src/veille.ts).
 *   limite : nombre d'actus au plus (4 sur l'accueil, 20 sur actus.html, 3 sur une page matière) ;
 *   tag    : « matiere:wax » pour ne garder que les actus de cette matière.
 * Accueil (4, sans tag) : titre et lien « Toutes les actus » ; actus.html (plus de 4) : pas de titre (le h1 suffit).
 */
export function blocActus(limite: number, tag?: string): string {
  const id = tag ? `actus-${tag.replace(/[^a-z0-9]+/g, '-')}` : `actus-${limite}`;
  const matiere = tag?.startsWith('matiere:') ? tag.slice('matiere:'.length) : undefined;
  const titre = matiere ? titreActusMatiere(matiere) : limite <= 4 ? 'Actus de la déco africaine' : '';
  const entete = titre
    ? `<div class="section__entete actus__entete">
    <div>
      <p class="surtitre">${matiere ? 'Actus' : 'L’actualité'}</p>
      <h2 id="${id}">${titre}<span class="point">.</span></h2>
    </div>${matiere ? '' : '\n    <a class="actus__tout" href="actus.html">Toutes les actus →</a>'}
  </div>`
    : '';
  const accueil = !tag && limite <= 4;
  const classes = `actus${matiere ? ' actus--matiere' : ''}${accueil ? ' actus--accueil conteneur section' : ''}`;
  const attributs = `class="${classes}" data-actus data-limite="${limite}"${tag ? ` data-tag="${tag}"` : ''}${titre ? ` aria-labelledby="${id}"` : ' aria-label="Actus de la déco africaine"'}${accueil ? ' data-bandeau-prioritaire' : ''}`;
  return `<section ${attributs} hidden>
  ${entete}
  <div class="actus__liste" data-actus-liste></div>
</section>`;
}
