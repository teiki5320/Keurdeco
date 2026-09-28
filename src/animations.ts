/**
 * Animations du site (confort seulement : sans JavaScript, tout reste visible et lisible).
 * - apparition au défilement ([data-reveal]) et titres révélés mot par mot ([data-mots]) ;
 * - porte en arche de l'accueil qui s'ouvre au défilement, objets flottants ;
 * - visite de la maison : les pièces défilent de côté pendant qu'on descend ;
 * - rideau de kente entre les pages (bandes de tissu qui tombent puis remontent) ;
 * - cartes d'articles qui s'agrandissent jusqu'à l'image de l'article (View Transitions entre pages) ;
 * - nuancier de l'accueil (src/nuancier.ts) : objets, matières, coussins qui tombent sur le canapé ;
 * - rangées de cartes défilantes (.rail) avec boutons et glisser à la souris ;
 * - cartes qui s'inclinent sous le curseur ([data-inclinaison]) ;
 * - en-tête compact après défilement.
 * « Réduire les animations » (préférence du système) désactive tout ce qui bouge.
 */

import { nuancier } from './nuancier.ts';

const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

/** Couleurs des bandes du rideau de kente. */
const BANDES = ['#B4532F', '#D49A2A', '#1E2A47', '#52693A', '#D49A2A', '#B4532F', '#1E2A47'];
const DUREE_RIDEAU = 520;

/** Transition entre les pages : des bandes de tissu tombent l'une après l'autre, puis remontent. */
function transitions(): void {
  const rideau = document.createElement('div');
  rideau.className = 'rideau';
  rideau.setAttribute('aria-hidden', 'true');
  rideau.innerHTML = `${BANDES.map((c, i) => `<span class="rideau__bande" style="--c:${c};--i:${i}"></span>`).join('')}<span class="rideau__texte"></span>`;
  document.body.append(rideau);
  const texte = rideau.querySelector<HTMLElement>('.rideau__texte')!;
  const poser = (etat: '' | 'couvre' | 'sort', sansTransition = false) => {
    rideau.classList.toggle('rideau--sans-transition', sansTransition);
    rideau.classList.toggle('rideau--couvre', etat === 'couvre');
    rideau.classList.toggle('rideau--sort', etat === 'sort');
  };

  // Arrivée après une transition : le rideau couvre la page, puis les bandes descendent.
  const arrivee = sessionStorage.getItem('kd-transition');
  if (arrivee !== null && !reduit()) {
    sessionStorage.removeItem('kd-transition');
    texte.textContent = arrivee;
    poser('couvre', true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        poser('sort');
        setTimeout(() => poser('', true), DUREE_RIDEAU + BANDES.length * 60 + 100);
      }),
    );
  }
  // Retour arrière (cache du navigateur) : pas de rideau resté fermé.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) poser('', true);
    // Retour sur la page : on retire les noms de transition posés au clic (ils doivent rester uniques).
    document.querySelectorAll<HTMLElement>('[style*="view-transition-name"]').forEach((el) => el.style.removeProperty('view-transition-name'));
  });

  document.addEventListener('click', (e) => {
    const lien = (e.target as HTMLElement).closest?.('a');
    if (!lien || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (lien.target || lien.hasAttribute('download') || reduit()) return;
    const url = new URL(lien.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return; // ancre dans la page
    // Carte d'article : l'image s'agrandit jusqu'à la couverture de l'article (transition native du navigateur).
    if (lien.matches('.carte-article, .une') && vueTransitionPossible()) {
      lien.querySelector<HTMLElement>('img')?.style.setProperty('view-transition-name', 'couverture');
      lien.querySelector<HTMLElement>('.carte-article__titre, .une__titre')?.style.setProperty('view-transition-name', 'titre-article');
      return; // navigation normale : le navigateur anime le passage d'une page à l'autre
    }
    e.preventDefault();
    const libelle = (lien.dataset.libelle ?? lien.querySelector('strong')?.textContent ?? lien.textContent ?? '').trim().replace(/\s+/g, ' ');
    const court = libelle.length > 48 ? `${libelle.slice(0, 46)}…` : libelle;
    texte.textContent = court;
    sessionStorage.setItem('kd-transition', court);
    poser('couvre');
    setTimeout(() => (location.href = url.href), DUREE_RIDEAU + BANDES.length * 60);
  });
}

/** Le navigateur sait-il animer le passage d'une page à l'autre (View Transitions entre documents) ? */
function vueTransitionPossible(): boolean {
  return 'onpagereveal' in window && CSS.supports('view-transition-name: a');
}

/** Avancement (0 → 1) du défilement à travers une section « collante ». */
function avancement(section: HTMLElement): number {
  const r = section.getBoundingClientRect();
  const course = r.height - window.innerHeight;
  return course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 0;
}

/** Porte en arche : elle s'ouvre jusqu'à remplir l'écran ; les objets flottent au défilement et à la souris. */
function porte(): void {
  const section = document.querySelector<HTMLElement>('[data-porte]');
  if (!section || reduit()) return;
  section.classList.add('porte--active');
  const objets = [...section.querySelectorAll<HTMLElement>('[data-vitesse]')];
  let sx = 0, sy = 0, mx = 0, my = 0, p = -1;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  });
  const boucle = () => {
    requestAnimationFrame(boucle);
    const r = section.getBoundingClientRect();
    if (r.bottom < 0) return;
    const np = avancement(section);
    sx += (mx - sx) * 0.08;
    sy += (my - sy) * 0.08;
    if (Math.abs(np - p) > 0.0005) {
      p = np;
      section.style.setProperty('--p', p.toFixed(4));
    }
    for (const o of objets) {
      const v = Number(o.dataset.vitesse);
      o.style.transform = `translate(${(sx * 60 * v).toFixed(1)}px, ${(sy * 50 * v - p * 260 * v).toFixed(1)}px) rotate(${(sx * 10 * v).toFixed(1)}deg)`;
    }
  };
  boucle();
}

/** Visite de la maison : la piste des pièces glisse de côté pendant qu'on descend. */
function visite(): void {
  const section = document.querySelector<HTMLElement>('[data-visite]');
  if (!section || reduit()) return;
  section.classList.add('visite--active');
  const piste = section.querySelector<HTMLElement>('.visite__piste')!;
  const num = section.querySelector<HTMLElement>('[data-visite-num]');
  const barre = section.querySelector<HTMLElement>('[data-visite-barre]');
  const n = piste.children.length;
  const maj = () => {
    const p = avancement(section);
    const course = Math.max(0, piste.scrollWidth - piste.clientWidth);
    piste.style.transform = `translateX(${(-p * course).toFixed(1)}px)`;
    if (num) num.textContent = String(Math.min(n, 1 + Math.floor(p * n * 0.999))).padStart(2, '0');
    if (barre) barre.style.transform = `scaleX(${p.toFixed(4)})`;
  };
  window.addEventListener('scroll', maj, { passive: true });
  window.addEventListener('resize', maj);
  maj();
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
  porte();
  visite();
  nuancier();
  rails();
  inclinaisons();
  entete();
}
