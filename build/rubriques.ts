/**
 * Pages générées au build (elles n'existent pas sur le disque) :
 *   pieces.html, matieres.html, occasions.html   (entrées de chaque famille)
 *   piece-<id>.html, matiere-<id>.html, occasion-<id>.html   (articles publiés de la rubrique)
 *   articles.html   (tous les articles publiés, par type)
 *   glossaire.html et glossaire-<id>.html   (glossaire des matières, motifs et savoir-faire)
 * et les blocs de l'accueil (marqueurs <!--#une-->, <!--#derniers-->, <!--#tops-->, <!--#entrees:piece-->…).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FAMILLES, fichierRubrique, type Famille, type Rubrique } from '../src/taxonomie.ts';
import { articlesPublies, carteArticle, grilleArticles, tousLesArticles, TYPES, type Article, type TypeArticle } from './articles.ts';
import { dateLongue, NOM_SITE, SITE_URL } from './config.ts';
import { icone, type NomIcone } from './icones.ts';
import { motif } from './motifs.ts';
import { imageArticle, imageExiste, MENTION_IA_ILLUSTRATION, photoFond } from './images.ts';
import { echapper } from './produits.ts';

export interface EntreeGlossaire {
  id: string;
  nom: string;
  categorie: string;
  origine: string;
  resume: string;
  texte: string[];
  matieres: string[];
}

export const FICHIER_GLOSSAIRE = resolve(import.meta.dirname, '../src/data/glossaire.json');

export function chargerGlossaire(): EntreeGlossaire[] {
  return (JSON.parse(readFileSync(FICHIER_GLOSSAIRE, 'utf8')) as EntreeGlossaire[]).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export function fichierGlossaire(id: string): string {
  return `glossaire-${id}.html`;
}

interface PageSimple {
  titre: string;
  description: string;
  fil: [string, string][];
  h1: string;
  chapo: string;
  contenu: string;
  classe?: string;
  /** Motif de l'arche en haut de page (voir build/motifs.ts). */
  motif?: string;
  /** Photo de l'arche (voir photoFond) ; à défaut, le motif. */
  image?: string;
  /** Page encore vide : cachée à Google et absente du sitemap jusqu'à son premier contenu. */
  noindex?: boolean;
  /** Données structurées JSON-LD à ajouter dans l'en-tête. */
  ld?: object;
}

/** Gabarit commun des pages de liste (avec marqueurs). */
export function pageSimple(p: PageSimple): string {
  const photo = p.image ? photoFond(p.image, '(min-width: 900px) 320px, 120px', 'eager') : '';
  const fil = [['index.html', 'Accueil'] as [string, string], ...p.fil]
    .map(([href, nom], i, t) => (i === t.length - 1 ? echapper(nom) : `<a href="${href}">${echapper(nom)}</a>`))
    .join(' › ');
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${echapper(p.description)}" />${p.noindex ? '\n    <meta name="robots" content="noindex" />' : ''}${photo ? `\n    <meta name="image-partage" content="${p.image}" />` : ''}
    <title>${echapper(p.titre)} · ${NOM_SITE}</title>
    <!--#head-->${p.ld ? `\n    <script type="application/ld+json">${JSON.stringify(p.ld).replace(/</g, '\\u003c')}</script>` : ''}
  </head>
  <body>
    <!--#header-->
    <main id="contenu" class="page ${p.classe ?? ''}">
      <header class="page__entete conteneur">
        <div class="page__entete-texte">
          <p class="fil">${fil}</p>
          <h1 data-mots>${p.h1}</h1>
          <p class="chapo" data-reveal>${p.chapo}</p>${photo ? `\n          <p class="mention-ia">${icone('ia', 'icone icone--petite')} ${MENTION_IA_ILLUSTRATION}</p>` : ''}
        </div>
        <div class="page__arche" data-reveal aria-hidden="true">${photo || motif(p.motif ?? 'kente')}</div>
      </header>
      <div class="conteneur">
        ${p.contenu}
      </div>
    </main>
    <!--#footer-->
    <script type="module" src="/src/site.ts"></script>
  </body>
</html>
`;
}

/** Articles publiés rattachés à une rubrique. */
export function articlesDeRubrique(famille: Famille, id: string, publies: Article[]): Article[] {
  return publies.filter((a) => a[FAMILLES[famille].champ].includes(id));
}

/** Nom de la photo d'une rubrique : « piece-salon », « matiere-wax », « occasion-mariage ». */
export function imageRubrique(famille: Famille, id: string): string {
  return `${famille}-${id}`;
}

/** Tuiles d'entrée d'une famille (accueil et page hub) : motif de la matière ou icône de la pièce. */
export function tuilesRubriques(famille: Famille, publies: Article[]): string {
  return `<ul class="tuiles tuiles--${famille}">${FAMILLES[famille].liste
    .map((r, i) => {
      const n = articlesDeRubrique(famille, r.id, publies).length;
      const photo = photoFond(imageRubrique(famille, r.id), '(min-width: 1100px) 300px, (min-width: 700px) 45vw, 92vw');
      const visuel = photo || (famille === 'matiere' ? motif(r.id) : `<span class="tuile__icone">${icone(ICONES_RUBRIQUES[r.id] ?? 'maison', 'icone')}</span>`);
      return `<li data-reveal style="--i:${i}"><a class="tuile${photo ? ' tuile--photo' : ''}" href="${fichierRubrique(famille, r.id)}" data-inclinaison data-libelle="${r.nom}">${visuel}<span class="tuile__texte"><span class="tuile__nom">${r.nom}</span><span class="tuile__nb">${n ? `${n} article${n > 1 ? 's' : ''}` : 'Découvrir'} ${icone('fleche', 'icone icone--petite')}</span></span></a></li>`;
    })
    .join('')}</ul>`;
}

/** Icône de chaque pièce et occasion. */
const ICONES_RUBRIQUES: Record<string, NomIcone> = {
  salon: 'coussin',
  chambre: 'linge-de-lit',
  'cuisine-salle-a-manger': 'vaisselle',
  entree: 'miroir',
  'salle-de-bain': 'panier',
  'balcon-exterieur': 'vase',
  'chambre-enfant': 'pouf',
  mariage: 'bijou',
  bapteme: 'bougie',
  tabaski: 'nappe',
  'fetes-fin-annee': 'luminaire',
};

function pageRubrique(famille: Famille, r: Rubrique, publies: Article[]): string {
  const f = FAMILLES[famille];
  const articles = articlesDeRubrique(famille, r.id, publies);
  const glossaire = famille === 'matiere' ? chargerGlossaire().filter((g) => g.matieres.includes(r.id)) : [];
  return pageSimple({
    titre: `${r.nom} : idées de déco africaine`,
    description: r.accroche,
    fil: [[f.hub, f.titre], ['', r.nom]],
    h1: echapper(r.nom),
    chapo: echapper(r.accroche),
    classe: `page--rubrique page--${famille}`,
    noindex: articles.length === 0,
    motif: famille === 'matiere' ? r.id : famille === 'piece' ? (MOTIF_PIECE[r.id] ?? 'wax') : MOTIF_FAMILLE[famille],
    image: imageExiste(imageRubrique(famille, r.id)) ? imageRubrique(famille, r.id) : undefined,
    contenu: `${grilleArticles(articles, '<p class="liste-vide">Les premiers articles de cette rubrique arrivent bientôt.</p>')}
        ${
          glossaire.length
            ? `<section class="bloc-glossaire" aria-labelledby="comprendre"><h2 id="comprendre">Pour comprendre</h2><ul class="liste-glossaire">${glossaire
                .map((g) => `<li><a href="${fichierGlossaire(g.id)}"><strong>${echapper(g.nom)}</strong> <span>${echapper(g.resume)}</span></a></li>`)
                .join('')}</ul></section>`
            : ''
        }
        <nav class="autres-rubriques" aria-label="${f.titre}"><h2>${f.titre}</h2>${tuilesRubriques(famille, publies)}</nav>`,
  });
}

/** Motif de l'arche par famille. */
const MOTIF_FAMILLE: Record<Famille, string> = { piece: 'wax', matiere: 'bogolan', occasion: 'kente' };

const INTRO_HUB: Record<Famille, { h1: string; chapo: string }> = {
  piece: { h1: 'La déco africaine pièce par pièce', chapo: 'Du salon à la salle de bain, des idées concrètes pour chaque pièce de la maison.' },
  matiere: { h1: 'Matières et styles', chapo: 'Wax, bogolan, kente, indigo, raphia, terre cuite, bois sculpté, perles : comprendre les matières pour bien les associer.' },
  occasion: { h1: 'Décorer pour les grandes occasions', chapo: 'Mariage, baptême, Tabaski, fêtes de fin d’année : des tables et des intérieurs prêts à recevoir.' },
};

function pageHub(famille: Famille, publies: Article[]): string {
  const f = FAMILLES[famille];
  return pageSimple({
    titre: INTRO_HUB[famille].h1,
    description: INTRO_HUB[famille].chapo,
    fil: [['', f.titre]],
    h1: INTRO_HUB[famille].h1,
    chapo: INTRO_HUB[famille].chapo,
    classe: 'page--hub',
    motif: MOTIF_FAMILLE[famille],
    contenu: tuilesRubriques(famille, publies),
  });
}

function pageTousArticles(publies: Article[]): string {
  const sections = (Object.keys(TYPES) as TypeArticle[])
    .map((t) => ({ t, liste: publies.filter((a) => a.type === t) }))
    .filter(({ liste }) => liste.length)
    .map(({ t, liste }) => `<section aria-labelledby="type-${t}"><h2 id="type-${t}">${icone(TYPES[t].icone)} ${TYPES[t].pluriel}</h2>${grilleArticles(liste)}</section>`)
    .join('');
  return pageSimple({
    titre: 'Tous les articles',
    description: 'Tous les articles de Keur Déco : ambiances à reproduire, tops de produits et guides sur les matières et savoir-faire africains.',
    fil: [['', 'Articles']],
    h1: 'Tous les articles',
    chapo: 'Ambiances à reproduire, classements de produits et guides de fond sur les matières africaines.',
    classe: 'page--articles',
    noindex: publies.length === 0,
    contenu: sections || '<p class="liste-vide">Les premiers articles arrivent bientôt.</p>',
  });
}

function pageGlossaire(entrees: EntreeGlossaire[]): string {
  return pageSimple({
    titre: 'Glossaire des matières, motifs et savoir-faire africains',
    description: 'Bogolan, kente, adinkra, wax, indigo, raphia : le glossaire des matières, motifs et savoir-faire de la décoration africaine.',
    fil: [['', 'Glossaire']],
    h1: 'Glossaire',
    chapo: 'Les matières, motifs et savoir-faire à connaître pour choisir et associer les objets de déco africaine.',
    classe: 'page--glossaire',
    motif: 'bogolan',
    contenu: `<ul class="liste-glossaire liste-glossaire--grande">${entrees
      .map((g) => `<li><a href="${fichierGlossaire(g.id)}"><small>${echapper(g.categorie)} · ${echapper(g.origine)}</small><strong>${echapper(g.nom)}</strong> <span>${echapper(g.resume)}</span></a></li>`)
      .join('')}</ul>`,
  });
}

function pageEntreeGlossaire(g: EntreeGlossaire, entrees: EntreeGlossaire[], publies: Article[]): string {
  const articles = publies.filter((a) => a.matieres.some((m) => g.matieres.includes(m))).slice(0, 3);
  const voisines = entrees.filter((e) => e.id !== g.id && e.matieres.some((m) => g.matieres.includes(m))).slice(0, 4);
  const rubriques = g.matieres.map((m) => FAMILLES.matiere.liste.find((r) => r.id === m)).filter((r): r is Rubrique => !!r);
  return pageSimple({
    titre: `${g.nom} : définition et origine`,
    description: g.resume,
    fil: [['glossaire.html', 'Glossaire'], ['', g.nom]],
    h1: echapper(g.nom),
    chapo: echapper(g.resume),
    classe: 'page--entree-glossaire',
    motif: 'bogolan',
    // Fiche de glossaire : un « terme défini » dans l'ensemble « Glossaire Keur Déco ».
    ld: {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: g.nom,
      description: g.resume,
      url: `${SITE_URL}${fichierGlossaire(g.id)}`,
      inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Glossaire Keur Déco', url: `${SITE_URL}glossaire.html` },
    },
    contenu: `<div class="conteneur--etroit prose">
          <p class="entree-glossaire__origine"><strong>${echapper(g.categorie)}</strong> · ${echapper(g.origine)}</p>
          ${g.texte.map((p) => `<p>${echapper(p)}</p>`).join('\n          ')}
          ${rubriques.length ? `<p>Voir la rubrique ${rubriques.map((r) => `<a href="${fichierRubrique('matiere', r.id)}">${r.nom}</a>`).join(', ')}.</p>` : ''}
        </div>
        ${articles.length ? `<section aria-labelledby="articles-lies"><h2 id="articles-lies">Articles liés</h2>${grilleArticles(articles)}</section>` : ''}
        ${voisines.length ? `<nav class="voisines-glossaire" aria-label="Voir aussi"><h2>Voir aussi</h2><ul class="liste-glossaire">${voisines.map((v) => `<li><a href="${fichierGlossaire(v.id)}"><strong>${echapper(v.nom)}</strong> <span>${echapper(v.resume)}</span></a></li>`).join('')}</ul></nav>` : ''}`,
  });
}

/** Toutes les pages de rubriques, de listes et du glossaire. */
export function pagesRubriques(publies = articlesPublies()): Map<string, string> {
  const pages = new Map<string, string>();
  for (const famille of Object.keys(FAMILLES) as Famille[]) {
    pages.set(FAMILLES[famille].hub, pageHub(famille, publies));
    for (const r of FAMILLES[famille].liste) pages.set(fichierRubrique(famille, r.id), pageRubrique(famille, r, publies));
  }
  pages.set('articles.html', pageTousArticles(publies));
  const glossaire = chargerGlossaire();
  pages.set('glossaire.html', pageGlossaire(glossaire));
  for (const g of glossaire) pages.set(fichierGlossaire(g.id), pageEntreeGlossaire(g, glossaire, publies));
  return pages;
}

/* ---------- Blocs de l'accueil ---------- */

/** Ambiance à la une : la dernière ambiance publiée (ou le dernier article), sinon le prochain article programmé. */
export function blocUne(publies = articlesPublies(), tous = tousLesArticles()): string {
  const a = publies.find((x) => x.type === 'ambiance') ?? publies[0];
  if (a) {
    return `<a class="une" href="${a.fichier}" data-reveal data-libelle="${echapper(a.titre)}">
    <span class="une__image">${imageArticle(a.image, a.imageAlt, '100vw', 'eager')}</span>
    <span class="une__texte">
      <span class="une__etiquette">${TYPES[a.type].nom} à la une</span>
      <strong class="une__titre">${echapper(a.titre)}</strong>
      <span class="une__resume">${echapper(a.description)}</span>
      <span class="une__lire">Découvrir ${icone('fleche', 'icone icone--petite')}</span>
    </span>
  </a>`;
  }
  const prochain = [...tous].filter((x) => !publies.includes(x)).sort((x, y) => x.publieLe.localeCompare(y.publieLe))[0];
  if (!prochain) return '';
  return `<div class="une une--bientot" data-reveal>
    <span class="une__image">${imageArticle(prochain.image, prochain.imageAlt, '100vw', 'eager')}</span>
    <span class="une__texte">
      <span class="une__etiquette">Premier article le ${dateLongue(prochain.publieLe)}</span>
      <strong class="une__titre">${echapper(prochain.titre)}</strong>
      <span class="une__resume">${echapper(prochain.description)}</span>
    </span>
  </div>`;
}

/** Articles programmés (sans lien : ils ne sont pas encore en ligne), pour que l'accueil annonce la suite. */
export function blocAVenir(publies = articlesPublies(), tous = tousLesArticles()): string {
  const aVenir = tous.filter((x) => !publies.includes(x)).sort((x, y) => x.publieLe.localeCompare(y.publieLe));
  if (aVenir.length === 0) return '';
  return aVenir
    .map(
      (a, i) => `<div class="carte-article carte-article--bientot" data-reveal style="--i:${i}">
  <span class="carte-article__image">${imageArticle(a.image, '', '(min-width: 1100px) 380px, 80vw')}<span class="carte-article__date">${dateLongue(a.publieLe)}</span></span>
  <span class="carte-article__type">${icone(TYPES[a.type].icone, 'icone icone--petite')} ${TYPES[a.type].nom} · bientôt</span>
  <strong class="carte-article__titre">${echapper(a.titre)}</strong>
  <span class="carte-article__resume">${echapper(a.description)}</span>
</div>`,
    )
    .join('');
}

export function blocDerniers(publies = articlesPublies(), n = 8): string {
  return publies
    .slice(0, n)
    .map((a) => carteArticle(a))
    .join('');
}

export function blocTops(publies = articlesPublies(), n = 3): string {
  const tops = publies.filter((a) => a.type === 'top').slice(0, n);
  return tops.length
    ? `<div class="section__entete"><h2 id="tops-titre" data-mots>Nos Top 10<span class="point">.</span></h2></div><div class="grille-articles">${tops.map((a) => carteArticle(a)).join('')}</div>`
    : '';
}

/** Quelques entrées du glossaire, pour l'accueil. */
export function blocGlossaire(n = 6): string {
  const choix = ['bogolan', 'kente', 'adinkra', 'wax', 'indigo', 'panier-bolga', 'velours-kuba', 'perles-krobo'];
  const entrees = chargerGlossaire();
  return choix
    .map((id) => entrees.find((e) => e.id === id))
    .filter((e): e is EntreeGlossaire => !!e)
    .slice(0, n)
    .map((g, i) => `<li data-reveal style="--i:${i}"><a href="${fichierGlossaire(g.id)}" data-libelle="${echapper(g.nom)}"><small>${echapper(g.categorie)} · ${echapper(g.origine)}</small><strong>${echapper(g.nom)}</strong> <span>${echapper(g.resume)}</span></a></li>`)
    .join('');
}

/** Motif associé à chaque pièce pour la visite de la maison. */
const MOTIF_PIECE: Record<string, string> = {
  salon: 'wax',
  chambre: 'indigo',
  'cuisine-salle-a-manger': 'terre-cuite',
  entree: 'raphia-paniers',
  'salle-de-bain': 'bogolan',
  'balcon-exterieur': 'kente',
  'chambre-enfant': 'perles',
};

/**
 * « Visite de la maison » : les pièces défilent de côté pendant qu'on descend la page
 * (src/animations.ts) ; sans JavaScript, c'est une simple rangée qu'on fait glisser.
 */
export function visiteMaison(publies = articlesPublies()): string {
  const pieces = FAMILLES.piece.liste;
  const total = String(pieces.length).padStart(2, '0');
  const panneaux = pieces
    .map((r, i) => {
      const n = articlesDeRubrique('piece', r.id, publies).length;
      return `<a class="visite__piece visite__piece--${i % 4}" href="${fichierRubrique('piece', r.id)}" data-libelle="${r.nom}">
      <span class="visite__motif">${photoFond(imageRubrique('piece', r.id), '(min-width: 700px) 520px, 80vw') || motif(MOTIF_PIECE[r.id] ?? 'wax')}</span>
      <span class="visite__num">${String(i + 1).padStart(2, '0')}</span>
      <span class="visite__icone">${icone(ICONES_RUBRIQUES[r.id] ?? 'maison', 'icone')}</span>
      <span class="visite__texte">
        <strong class="visite__nom">${r.nom}</strong>
        <span class="visite__accroche">${echapper(r.accroche)}</span>
        <span class="visite__lien">${n ? `${n} article${n > 1 ? 's' : ''} · ` : ''}Entrer ${icone('fleche', 'icone icone--petite')}</span>
      </span>
    </a>`;
    })
    .join('');
  return `<section class="visite" data-visite style="--n:${pieces.length}" aria-labelledby="visite-titre">
  <div class="visite__collant">
    <div class="conteneur visite__entete">
      <div>
        <p class="surtitre">Visite de la maison</p>
        <h2 id="visite-titre" data-mots>Pièce par <em>pièce</em><span class="point">.</span></h2>
      </div>
      <p class="visite__compteur" aria-hidden="true"><span data-visite-num>01</span> / ${total}</p>
      <span class="visite__barre" aria-hidden="true"><span data-visite-barre></span></span>
    </div>
    <div class="visite__piste">${panneaux}</div>
  </div>
</section>`;
}

/** Image de la porte en arche (accueil) : l'article à la une, ou le prochain article programmé. */
export function imagePorte(publies = articlesPublies(), tous = tousLesArticles()): string {
  const a = publies.find((x) => x.type === 'ambiance') ?? publies[0] ?? [...tous].sort((x, y) => x.publieLe.localeCompare(y.publieLe))[0];
  return a ? imageArticle(a.image, a.imageAlt, '100vw', 'eager') : '';
}
