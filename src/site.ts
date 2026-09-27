// Point d'entrée commun des pages. Le JavaScript n'ajoute que du confort :
// les pages restent complètes et lisibles sans lui (la liste « Dans le même esprit »
// reprend tous les produits des points cliquables).
import '@fontsource-variable/fraunces';
import '@fontsource-variable/source-sans-3';
import './theme.css';
import './site.css';
import { demarrerAnimations } from './animations.ts';

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

pointsCliquables();
menuMobile();
lienEvitement();
demarrerAnimations();

/** Site installable et consultable hors ligne : service worker (site publié en HTTPS uniquement). */
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* sans service worker, le site fonctionne normalement en ligne */
    });
  });
}
