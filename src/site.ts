// Point d'entrée commun des pages. Le JavaScript n'ajoute que du confort :
// les pages restent complètes et lisibles sans lui (la liste « Dans le même esprit »
// reprend tous les produits des points cliquables).
import '@fontsource-variable/fraunces';
import '@fontsource-variable/source-sans-3';
import './theme.css';
import './site.css';
import { demarrerAnimations } from './animations.ts';
import { afficherActus } from './veille.ts';

/** Photos pas encore chargées : cachées puis montrées en fondu (voir .img-attente dans site.css). */
function fonduImages(): void {
  for (const img of document.querySelectorAll<HTMLImageElement>('img')) {
    if (img.complete) continue;
    img.classList.add('img-attente');
    const montrer = () => img.classList.remove('img-attente');
    img.addEventListener('load', montrer, { once: true });
    img.addEventListener('error', montrer, { once: true });
  }
}

/** Points cliquables des images d'ambiance : un seul ouvert à la fois, Échap pour fermer. */
function pointsCliquables(): void {
  const boutons = [...document.querySelectorAll<HTMLButtonElement>('.hotspot')];
  if (boutons.length === 0) return;
  const carte = (b: HTMLButtonElement) => document.getElementById(b.getAttribute('aria-controls') ?? '');
  const fermer = (b: HTMLButtonElement, rendreFocus = false) => {
    b.setAttribute('aria-expanded', 'false');
    carte(b)?.setAttribute('hidden', '');
    if (rendreFocus) b.focus();
  };
  const ouvrir = (b: HTMLButtonElement) => {
    boutons.filter((x) => x !== b).forEach((x) => fermer(x));
    b.setAttribute('aria-expanded', 'true');
    const c = carte(b);
    c?.removeAttribute('hidden');
    c?.querySelector<HTMLAnchorElement>('a')?.focus();
  };
  for (const b of boutons) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (b.getAttribute('aria-expanded') === 'true') fermer(b);
      else ouvrir(b);
    });
    const c = carte(b);
    c?.addEventListener('click', (e) => e.stopPropagation());
    c?.querySelector('.hotspot-carte__fermer')?.addEventListener('click', () => fermer(b, true));
  }
  document.addEventListener('click', () => boutons.forEach((b) => fermer(b)));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const ouvert = boutons.find((b) => b.getAttribute('aria-expanded') === 'true');
    if (ouvert) fermer(ouvert, true);
  });
}

/** Referme le menu mobile quand on choisit un lien ou qu'on touche ailleurs. */
function menuMobile(): void {
  const menu = document.querySelector<HTMLDetailsElement>('.menu-mobile');
  if (!menu) return;
  document.addEventListener('click', (e) => {
    if (menu.open && !menu.contains(e.target as Node)) menu.open = false;
  });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => (menu.open = false)));
}

/** Page 404 : son <base> pointe vers la racine du site ; le lien d'évitement vise la page courante. */
function lienEvitement(): void {
  const lien = document.querySelector<HTMLAnchorElement>('a.evitement');
  if (lien && document.querySelector('base')) lien.href = `${location.href.split('#')[0]}#contenu`;
}

/**
 * Liens « Gérer mes cookies » : rouvrent la fenêtre de choix de Google (AdSense, Confidentialité et messages).
 * Sans JavaScript ou si Google n'est pas chargé, le lien mène à la politique de confidentialité.
 */
function gererCookies(): void {
  type FileGoogle = { callbackQueue?: (() => void)[]; showRevocationMessage?: () => void };
  const w = window as unknown as { googlefc?: FileGoogle };
  for (const lien of document.querySelectorAll<HTMLAnchorElement>('a[data-cookies]')) {
    lien.addEventListener('click', (e) => {
      const fc = w.googlefc;
      if (!fc?.showRevocationMessage) return;
      e.preventDefault();
      fc.showRevocationMessage();
    });
  }
}

/** Emplacements d'annonces AdSense placés au build (build/annonces.ts) : on demande à Google de les remplir. */
function annonces(): void {
  const blocs = document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])');
  if (blocs.length === 0) return;
  const w = window as unknown as { adsbygoogle?: object[] };
  w.adsbygoogle = w.adsbygoogle || [];
  blocs.forEach(() => w.adsbygoogle!.push({}));
}

pointsCliquables();
menuMobile();
gererCookies();
annonces();
lienEvitement();
fonduImages();
demarrerAnimations();
// Actus de la veille (accueil, actus.html, pages matières) : lues en direct, jamais bloquantes.
afficherActus().catch(() => {
  /* sans actus, les sections restent cachées */
});
// Page de secours d'un article de la veille (/actus/article/?id=…) : code chargé seulement sur cette page.
if (document.querySelector('[data-article-secours]')) {
  import('./article-veille.ts').then((m) => m.demarrerPageSecours()).catch(() => {
    /* la page garde son message de chargement et son lien vers les actus */
  });
}

/** Site installable et consultable hors ligne : service worker (site publié en HTTPS uniquement). */
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* sans service worker, le site fonctionne normalement en ligne */
    });
  });
}
