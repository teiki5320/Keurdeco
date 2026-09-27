/**
 * Animations du site (confort seulement : sans JavaScript, tout reste visible et lisible).
 * - apparition au défilement ([data-reveal]) et titres révélés mot par mot ([data-mots]) ;
 * - transition « iris » safran entre les pages, avec dispersion du nuage ;
 * - rangées de cartes défilantes (.rail) avec boutons et glisser à la souris ;
 * - cartes qui s'inclinent sous le curseur ([data-inclinaison]) ;
 * - en-tête compact après défilement.
 * « Réduire les animations » (préférence du système) désactive tout ce qui bouge.
 */

const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const explosion = (v: number) => window.dispatchEvent(new CustomEvent('nuage:explosion', { detail: v }));

/** Découpe les titres [data-mots] en mots animables (le texte reste lisible par les lecteurs d'écran). */
function decouperTitres(): void {
  document.querySelectorAll<HTMLElement>('[data-mots]').forEach((titre) => {
    if (titre.dataset.decoupe) return;
    titre.dataset.decoupe = '1';
    let i = 0;
    const parcourir = (noeud: Node) => {
      for (const enfant of [...noeud.childNodes]) {
        if (enfant.nodeType === Node.TEXT_NODE) {
          const morceaux = (enfant.textContent ?? '').split(/(\s+)/);
          const frag = document.createDocumentFragment();
          for (const m of morceaux) {
            if (!m) continue;
            if (/^\s+$/.test(m)) {
              frag.append(m);
              continue;
            }
            const cadre = document.createElement('span');
            cadre.className = 'mot';
            const interieur = document.createElement('span');
            interieur.className = 'mot__int';
            interieur.style.setProperty('--i', String(i++));
            interieur.textContent = m;
            cadre.append(interieur);
            frag.append(cadre);
          }
          enfant.replaceWith(frag);
        } else if (enfant.nodeType === Node.ELEMENT_NODE) parcourir(enfant);
      }
    };
    parcourir(titre);
  });
}

/** Apparition des éléments quand ils entrent à l'écran. */
function apparitions(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-reveal], [data-mots]');
  if (reduit() || !('IntersectionObserver' in window)) {
    elements.forEach((e) => e.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver(
    (entrees) => {
      for (const e of entrees) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  elements.forEach((e) => obs.observe(e));
}

/** Transition entre les pages : un iris safran se ferme avec le nom de la destination, puis se rouvre. */
function transitions(): void {
  const rideau = document.createElement('div');
  rideau.className = 'rideau';
  rideau.setAttribute('aria-hidden', 'true');
  rideau.innerHTML = '<span class="rideau__texte"></span>';
  document.body.append(rideau);
  const texte = rideau.querySelector<HTMLElement>('.rideau__texte')!;

  // Arrivée après une transition : le rideau couvre la page, puis s'ouvre.
  const arrivee = sessionStorage.getItem('kd-transition');
  if (arrivee !== null && !reduit()) {
    sessionStorage.removeItem('kd-transition');
    texte.textContent = arrivee;
    rideau.classList.add('rideau--couvre', 'rideau--sans-transition');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        rideau.classList.remove('rideau--sans-transition');
        rideau.classList.remove('rideau--couvre');
        rideau.classList.add('rideau--sort');
        setTimeout(() => rideau.classList.remove('rideau--sort'), 700);
      }),
    );
  }
  // Retour arrière (cache du navigateur) : pas de rideau resté fermé.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) rideau.classList.remove('rideau--couvre');
    explosion(0);
  });

  document.addEventListener('click', (e) => {
    const lien = (e.target as HTMLElement).closest?.('a');
    if (!lien || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (lien.target || lien.hasAttribute('download') || reduit()) return;
    const url = new URL(lien.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return; // ancre dans la page
    e.preventDefault();
    const libelle = (lien.dataset.libelle ?? lien.querySelector('strong, .titre-carte')?.textContent ?? lien.textContent ?? '').trim().replace(/\s+/g, ' ');
    const court = libelle.length > 48 ? `${libelle.slice(0, 46)}…` : libelle;
    texte.textContent = court;
    sessionStorage.setItem('kd-transition', court);
    rideau.classList.add('rideau--couvre');
    explosion(1);
    setTimeout(() => (location.href = url.href), 480);
  });
}

/** Rangées de cartes défilantes : boutons précédent/suivant et glisser à la souris. */
function rails(): void {
  document.querySelectorAll<HTMLElement>('[data-rail]').forEach((bloc) => {
    const piste = bloc.querySelector<HTMLElement>('.rail');
    if (!piste) return;
    const pas = () => Math.max(260, piste.clientWidth * 0.8);
    bloc.querySelector('[data-rail-prec]')?.addEventListener('click', () => piste.scrollBy({ left: -pas(), behavior: reduit() ? 'auto' : 'smooth' }));
    bloc.querySelector('[data-rail-suiv]')?.addEventListener('click', () => piste.scrollBy({ left: pas(), behavior: reduit() ? 'auto' : 'smooth' }));
    const maj = () => {
      bloc.classList.toggle('rail--debut', piste.scrollLeft < 8);
      bloc.classList.toggle('rail--fin', piste.scrollLeft + piste.clientWidth > piste.scrollWidth - 8);
    };
    piste.addEventListener('scroll', maj, { passive: true });
    maj();
    // Glisser à la souris (le tactile défile nativement).
    let depart: { x: number; gauche: number } | null = null;
    let glisse = false;
    piste.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      depart = { x: e.clientX, gauche: piste.scrollLeft };
      glisse = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (!depart) return;
      const dx = e.clientX - depart.x;
      if (Math.abs(dx) > 6) {
        glisse = true;
        piste.classList.add('rail--glisse');
      }
      piste.scrollLeft = depart.gauche - dx;
    });
    window.addEventListener('pointerup', () => {
      depart = null;
      piste.classList.remove('rail--glisse');
    });
    piste.addEventListener(
      'click',
      (e) => {
        if (glisse) {
          e.preventDefault();
          e.stopPropagation();
          glisse = false;
        }
      },
      true,
    );
  });
}

/** Cartes qui s'inclinent légèrement sous le curseur. */
function inclinaisons(): void {
  if (reduit() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll<HTMLElement>('[data-inclinaison]').forEach((carte) => {
    carte.addEventListener('pointermove', (e) => {
      const r = carte.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      carte.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
      carte.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`);
      carte.style.setProperty('--lx', `${((x + 0.5) * 100).toFixed(1)}%`);
      carte.style.setProperty('--ly', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    carte.addEventListener('pointerleave', () => {
      carte.style.setProperty('--rx', '0deg');
      carte.style.setProperty('--ry', '0deg');
    });
  });
}

/** En-tête : devient plus compact et plus opaque après un peu de défilement. */
function entete(): void {
  const e = document.querySelector('.site-entete');
  if (!e) return;
  const maj = () => e.classList.toggle('site-entete--defile', window.scrollY > 24);
  window.addEventListener('scroll', maj, { passive: true });
  maj();
}

export function demarrerAnimations(): void {
  decouperTitres();
  apparitions();
  transitions();
  rails();
  inclinaisons();
  entete();
  // Les particules, dispersées au chargement, se rassemblent.
  setTimeout(() => explosion(0), 60);
}
