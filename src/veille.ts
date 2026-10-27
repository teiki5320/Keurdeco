/**
 * Veille actus (code du navigateur) : actus de la déco, du design et de l'artisanat africains,
 * préparées 2 fois par jour par la tâche de veille (dépôt public teiki5320/veille) et lues en direct,
 * sans reconstruire le site. Schéma : https://teiki5320.github.io/veille/schema/actus-schema-v3.json
 *
 * Les sections <section data-actus data-limite="4" data-tag="matiere:wax" hidden> sont posées au build
 * (build/veille.ts) ; on ne les montre que s'il y a au moins une actu à afficher. En cas d'erreur
 * (réseau coupé, fichier illisible), elles restent cachées : la page n'est jamais cassée.
 * Le HTML est construit avec createElement et textContent : jamais de texte du JSON dans innerHTML.
 */

export const URL_VEILLE = 'https://teiki5320.github.io/veille/actus/keurdeco.json';

/** Adresse de base des fichiers de la veille : seule origine admise pour les images d'actus. */
const BASE_VEILLE = 'https://teiki5320.github.io/veille/';

export interface ImageActu {
  url: string;
  source: 'wikimedia' | 'openverse' | 'banque' | 'carte';
  credit: string;
  licence: string | null;
  page?: string | null;
  alt: string;
  mots_cles?: string[];
  largeur: number;
  hauteur: number;
}

/** Une actu (schéma v3). */
export interface Actu {
  id: string;
  titre: string;
  resume: string;
  theme?: string;
  pays?: string[];
  competition?: string | null;
  /** Liens vers les pages du site, ex. « matiere:wax ». */
  tags?: string[];
  source_nom: string;
  source_url: string;
  autres_sources?: string[];
  publie_le: string;
  collecte_le?: string;
  langue?: string;
  image: ImageActu;
}

export interface FichierActus {
  version: number;
  site: string;
  genere_le: string;
  actus: Actu[];
}

const DELAI_MS = 8000;
const CACHE_MS = 15 * 60 * 1000;
const CLE_CACHE = 'keurdeco-veille-actus-v3';

const estHttp = (u: unknown): u is string => typeof u === 'string' && /^https?:\/\//.test(u);

/** Lien Amazon (et ses liens courts) : jamais dans un bloc d'actus. */
function estLienAmazon(u: string): boolean {
  return /(^|\.)(amazon\.[a-z.]+|amzn\.[a-z]+)$/i.test(new URL(u).hostname);
}

/** Garde seulement les actus complètes et sûres (source http(s) hors Amazon, image servie par la veille). */
export function actuValide(a: unknown): a is Actu {
  if (!a || typeof a !== 'object') return false;
  const x = a as Partial<Actu>;
  if (typeof x.id !== 'string' || typeof x.titre !== 'string' || typeof x.resume !== 'string') return false;
  if (typeof x.source_nom !== 'string' || !estHttp(x.source_url) || typeof x.publie_le !== 'string') return false;
  try {
    if (estLienAmazon(x.source_url)) return false;
  } catch {
    return false;
  }
  const i = x.image;
  if (!i || typeof i.url !== 'string' || !i.url.startsWith(BASE_VEILLE)) return false;
  if (typeof i.credit !== 'string' || typeof i.alt !== 'string') return false;
  if (i.page != null && !estHttp(i.page)) return false;
  return true;
}

/** Nettoie un fichier reçu : actus valides, de la plus récente à la plus ancienne. */
export function nettoyerFichier(brut: unknown): FichierActus | null {
  if (!brut || typeof brut !== 'object') return null;
  const f = brut as Partial<FichierActus>;
  if (!Array.isArray(f.actus)) return null;
  const actus = f.actus.filter(actuValide).sort((a, b) => Date.parse(b.publie_le) - Date.parse(a.publie_le));
  return { version: Number(f.version) || 3, site: String(f.site ?? 'keurdeco'), genere_le: String(f.genere_le ?? ''), actus };
}

/** Actus d'une matière (« matiere:wax »), ou toutes si aucun tag n'est donné. */
export function filtrerParTag(actus: Actu[], tag?: string | null): Actu[] {
  return tag ? actus.filter((a) => a.tags?.includes(tag)) : actus;
}

/** Vignette carrée : « -carre.webp » pour les photos ; la carte SVG reste la même image, recadrée à l'affichage. */
export function imageCarree(image: ImageActu): string {
  return image.source !== 'carte' && image.url.endsWith('.webp') ? image.url.replace(/\.webp$/, '-carre.webp') : image.url;
}

/** Âge d'une actu : « il y a 3 h », « hier », « il y a 4 jours », puis la date. */
export function ageActu(iso: string, maintenant: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const min = Math.max(0, Math.round((maintenant - t) / 60000));
  if (min < 60) return min <= 1 ? 'à l’instant' : `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j === 1) return 'hier';
  if (j < 7) return `il y a ${j} jours`;
  return `le ${new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })}`;
}

/** Texte du crédit : « Photo : auteur · licence », ou « Illustration : Keur Déco » pour une carte générée. */
export function texteCredit(image: ImageActu): string {
  if (image.source === 'carte') return /^Illustration\s*:/.test(image.credit) ? image.credit : 'Illustration : Keur Déco';
  return `Photo : ${image.credit}${image.licence ? ` · ${image.licence}` : ''}`;
}

let enCours: Promise<FichierActus | null> | null = null;

/**
 * Fichier des actus : délai de 8 s, cache de 15 min (sessionStorage, protégé par try/catch).
 * En cas d'erreur, renvoie null, sans jamais casser la page.
 */
export function chargerFichier(): Promise<FichierActus | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (enCours) return enCours;
  enCours = (async () => {
    try {
      const enCache = sessionStorage.getItem(CLE_CACHE);
      if (enCache) {
        const { t, f } = JSON.parse(enCache) as { t: number; f: unknown };
        if (Date.now() - t < CACHE_MS) {
          const propre = nettoyerFichier(f);
          if (propre) return propre;
        }
      }
    } catch {
      // Stockage indisponible (navigation privée…) : on lit le fichier en ligne.
    }
    try {
      const ctrl = new AbortController();
      const minuteur = setTimeout(() => ctrl.abort(), DELAI_MS);
      const rep = await fetch(URL_VEILLE, { signal: ctrl.signal, cache: 'no-cache' }).finally(() => clearTimeout(minuteur));
      if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
      const brut: unknown = await rep.json();
      const propre = nettoyerFichier(brut);
      if (!propre) throw new Error('fichier illisible');
      try {
        sessionStorage.setItem(CLE_CACHE, JSON.stringify({ t: Date.now(), f: brut }));
      } catch {
        // Cache impossible : sans conséquence.
      }
      return propre;
    } catch {
      enCours = null; // nouvel essai possible à la prochaine page
      return null;
    }
  })();
  return enCours;
}

/** Actus, de la plus récente à la plus ancienne ; [] en cas d'erreur. */
export async function chargerActus(): Promise<Actu[]> {
  return (await chargerFichier())?.actus ?? [];
}

// ---------- Affichage ----------

function el<K extends keyof HTMLElementTagNameMap>(nom: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(nom);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

/** Lien vers une source externe : nouvel onglet, sans transmettre la page ni le classement. */
function lienExterne(href: string, texte: string, classe?: string): HTMLAnchorElement {
  const a = el('a', classe, texte);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener nofollow';
  return a;
}

/** Une actu : bandeau (image 16:9) ou vignette (image carrée). */
function carteActu(a: Actu, bandeau: boolean, niveauTitre: 'h2' | 'h3', prioritaire: boolean): HTMLElement {
  const article = el('article', `actu ${bandeau ? 'actu--bandeau' : 'actu--vignette'}`);

  const figure = el('figure', 'actu__figure');
  const cadre = el('div', 'actu__image');
  const img = el('img');
  img.src = bandeau ? a.image.url : imageCarree(a.image);
  img.alt = a.image.alt;
  img.width = bandeau ? a.image.largeur || 1600 : 600;
  img.height = bandeau ? a.image.hauteur || 900 : 600;
  img.decoding = 'async';
  if (bandeau && prioritaire) img.setAttribute('fetchpriority', 'high');
  else img.loading = 'lazy';
  cadre.append(img);
  const credit = el('figcaption', 'actu__credit');
  if (a.image.source !== 'carte' && a.image.page) credit.append(lienExterne(a.image.page, texteCredit(a.image)));
  else credit.textContent = texteCredit(a.image);
  figure.append(cadre, credit);

  const texte = el('div', 'actu__texte');
  const age = ageActu(a.publie_le);
  if (age) {
    const t = el('time', 'actu__age', age);
    t.dateTime = a.publie_le;
    texte.append(t);
  }
  texte.append(el(niveauTitre, 'actu__titre', a.titre), el('p', 'actu__resume', a.resume));
  const source = el('p', 'actu__source', 'Source : ');
  source.append(lienExterne(a.source_url, `${a.source_nom} ↗`));
  texte.append(source);

  article.append(figure, texte);
  return article;
}

/**
 * Remplit une section [data-actus] : la 1re actu en bandeau, les suivantes en vignettes.
 * Sans actu à afficher, la section reste cachée. Renvoie le nombre d'actus affichées.
 */
export function remplirActus(section: HTMLElement, actus: Actu[]): number {
  const limite = Math.max(1, Number(section.dataset.limite) || 4);
  const liste = filtrerParTag(actus, section.dataset.tag).slice(0, limite);
  const conteneur = section.querySelector<HTMLElement>('[data-actus-liste]') ?? section;
  if (liste.length === 0) {
    section.hidden = true;
    return 0;
  }
  const niveau = section.querySelector('h2') ? 'h3' : 'h2';
  const prioritaire = section.hasAttribute('data-bandeau-prioritaire');
  const [premiere, ...suivantes] = liste;
  conteneur.replaceChildren(carteActu(premiere, true, niveau, prioritaire));
  if (suivantes.length) {
    const grille = el('div', 'actus__vignettes');
    grille.append(...suivantes.map((a) => carteActu(a, false, niveau, false)));
    conteneur.append(grille);
  }
  section.hidden = false;
  requestAnimationFrame(() => section.classList.add('actus--visible'));
  return liste.length;
}

/** Date de mise à jour du fichier (« 27 octobre à 9 h 00 »), pour la page actus.html. */
export function dateMiseAJour(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  const jour = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).replace(':', ' h ');
  return `${jour} à ${heure}`;
}

/** Remplit toutes les sections d'actus de la page (et la date de mise à jour sur actus.html). */
export async function afficherActus(): Promise<void> {
  const sections = [...document.querySelectorAll<HTMLElement>('[data-actus]')];
  if (sections.length === 0) return;
  const fichier = await chargerFichier();
  if (!fichier) return;
  let total = 0;
  for (const s of sections) total += remplirActus(s, fichier.actus);
  const maj = document.querySelector<HTMLElement>('[data-actus-maj]');
  const texteMaj = dateMiseAJour(fichier.genere_le);
  if (maj && total > 0 && texteMaj) {
    const t = maj.querySelector('time');
    if (t) {
      t.dateTime = fichier.genere_le;
      t.textContent = texteMaj;
    }
    maj.hidden = false;
  }
}
