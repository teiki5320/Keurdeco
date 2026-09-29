/**
 * Animations du site (confort seulement : sans JavaScript, tout reste visible et lisible).
 * - apparition au défilement ([data-reveal]) et titres révélés mot par mot ([data-mots]) ;
 * - porte en arche de l'accueil qui s'ouvre au défilement, objets flottants ;
 * - visite de la maison : carrousel des pièces (glisser ou flèches) ;
 * - rideau de kente entre les pages (bandes de tissu qui tombent puis remontent) ;
 * - cartes d'articles qui s'agrandissent jusqu'à l'image de l'article (View Transitions entre pages) ;
 * - nuancier de l'accueil (src/nuancier.ts) : objets, matières, coussins qui tombent sur le canapé ;
 * - cartes qui s'inclinent sous le curseur ([data-inclinaison]) ;
 * - en-tête compact après défilement.
 * « Réduire les animations » (préférence du système) désactive tout ce qui bouge.
 */

import { nuancier } from './nuancier.ts';

const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Mémoire de session protégée : si le navigateur la refuse (cookies bloqués), on s'en passe sans erreur. */
const memoire = {
  lire(cle: string): string | null {
    try {
      return sessionStorage.getItem(cle);
    } catch {
      return null;
    }
  },
  ecrire(cle: string, valeur: string | null): void {
    try {
      if (valeur === null) sessionStorage.removeItem(cle);
      else sessionStorage.setItem(cle, valeur);
    } catch {
      /* mémoire indisponible : la transition d'arrivée sera simplement absente */
    }
  },
};

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
/** Durée d'une bande et décalage entre deux bandes (ms) : le rideau couvre l'écran en 0,35 s environ. */
const DUREE_RIDEAU = 250;
const DECALAGE_BANDE = 15;

/** Attente maximale (ms) avant de lever le rideau, même si une image traîne. */
const ATTENTE_MAX_RIDEAU = 900;

/** Polices chargées et images visibles à l'écran décodées (ou délai dépassé). */
function pagePrete(max: number): Promise<void> {
  const visibles = [...document.images].filter((img) => {
    const r = img.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
  });
  const pret = Promise.all([document.fonts?.ready, ...visibles.map((img) => img.decode().catch(() => undefined))]);
  return Promise.race([pret.then(() => undefined), new Promise<void>((r) => setTimeout(r, max))]);
}

/** Transition entre les pages (menu et logo) : des bandes de tissu tombent l'une après l'autre, puis descendent. */
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
  const arrivee = memoire.lire('kd-transition');
  if (arrivee !== null && !reduit()) {
    memoire.ecrire('kd-transition', null);
    texte.textContent = arrivee;
    poser('couvre', true);
    // On attend que la page soit prête (polices, images visibles) avant de lever le rideau :
    // sinon il découvre une page encore en train de se construire.
    pagePrete(ATTENTE_MAX_RIDEAU).then(() =>
      requestAnimationFrame(() => {
        poser('sort');
        setTimeout(() => poser('', true), DUREE_RIDEAU + BANDES.length * DECALAGE_BANDE + 100);
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
    // Le rideau ne joue que depuis le menu et le logo : les autres liens s'ouvrent immédiatement.
    if (!lien.closest('.site-entete')) return;
    e.preventDefault();
    const libelle = (lien.dataset.libelle ?? lien.querySelector('strong')?.textContent ?? lien.textContent ?? '').trim().replace(/\s+/g, ' ');
    const court = libelle.length > 48 ? `${libelle.slice(0, 46)}…` : libelle;
    texte.textContent = court;
    memoire.ecrire('kd-transition', court);
    poser('couvre');
    setTimeout(() => (location.href = url.href), DUREE_RIDEAU + BANDES.length * DECALAGE_BANDE);
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
  const trouvee = document.querySelector<HTMLElement>('[data-porte]');
  if (!trouvee || reduit()) return;
  const section: HTMLElement = trouvee;
  section.classList.add('porte--active');
  const objets = [...section.querySelectorAll<HTMLElement>('[data-vitesse]')];
  let sx = 0, sy = 0, mx = 0, my = 0, p = -1;
  let visible = true;
  let image = 0;
  // La boucle ne tourne que si la porte est à l'écran et qu'il reste un mouvement à finir.
  const demander = () => {
    if (!image && visible) image = requestAnimationFrame(boucle);
  };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
    demander();
  });
  window.addEventListener('scroll', demander, { passive: true });
  window.addEventListener('resize', demander);
  new IntersectionObserver(([entree]) => {
    visible = entree.isIntersecting;
    demander();
  }).observe(section);
  function boucle(): void {
    image = 0;
    const np = avancement(section);
    sx += (mx - sx) * 0.08;
    sy += (my - sy) * 0.08;
    const bougeEncore = Math.abs(mx - sx) > 0.0005 || Math.abs(my - sy) > 0.0005;
    if (Math.abs(np - p) > 0.0005) {
      p = np;
      section.style.setProperty('--p', p.toFixed(4));
    }
    for (const o of objets) {
      const v = Number(o.dataset.vitesse);
      o.style.transform = `translate(${(sx * 60 * v).toFixed(1)}px, ${(sy * 50 * v - p * 260 * v).toFixed(1)}px) rotate(${(sx * 10 * v).toFixed(1)}deg)`;
    }
    if (bougeEncore) demander();
  }
  demander();
}

/** Visite de la maison : carrousel horizontal (glisser, pavé tactile ou flèches), compteur et barre d'avancement. */
function visite(): void {
  const section = document.querySelector<HTMLElement>('[data-visite]');
  if (!section) return;
  section.classList.add('visite--carrousel');
  const piste = section.querySelector<HTMLElement>('.visite__piste')!;
  const num = section.querySelector<HTMLElement>('[data-visite-num]');
  const barre = section.querySelector<HTMLElement>('[data-visite-barre]');
  const prec = section.querySelector<HTMLButtonElement>('[data-visite-prec]');
  const suiv = section.querySelector<HTMLButtonElement>('[data-visite-suiv]');
  const pieces = [...piste.children] as HTMLElement[];
  const n = pieces.length;
  // Pièce la plus proche du centre de la piste (la première et la dernière aux deux bouts).
  const courante = () => {
    const course = piste.scrollWidth - piste.clientWidth;
    if (piste.scrollLeft <= 2) return 0;
    if (piste.scrollLeft >= course - 2) return n - 1;
    const centre = piste.getBoundingClientRect().left + piste.clientWidth / 2;
    let meilleure = 0;
    let ecart = Infinity;
    pieces.forEach((p, i) => {
      const r = p.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - centre);
      if (d < ecart) [ecart, meilleure] = [d, i];
    });
    return meilleure;
  };
  let image = 0;
  const maj = () => {
    image = 0;
    const course = piste.scrollWidth - piste.clientWidth;
    const p = course > 0 ? piste.scrollLeft / course : 0;
    if (num) num.textContent = String(courante() + 1).padStart(2, '0');
    if (barre) barre.style.transform = `scaleX(${Math.max(1 / n, p).toFixed(4)})`;
    if (prec) prec.disabled = piste.scrollLeft <= 2;
    if (suiv) suiv.disabled = piste.scrollLeft >= course - 2;
  };
  piste.addEventListener('scroll', () => (image ||= requestAnimationFrame(maj)), { passive: true });
  window.addEventListener('resize', maj);
  const aller = (i: number) => {
    const cible = pieces[Math.max(0, Math.min(n - 1, i))];
    piste.scrollTo({ left: cible.offsetLeft - (piste.clientWidth - cible.offsetWidth) / 2, behavior: reduit() ? 'auto' : 'smooth' });
  };
  prec?.addEventListener('click', () => aller(courante() - 1));
  suiv?.addEventListener('click', () => aller(courante() + 1));
  [prec, suiv].forEach((b) => b && (b.hidden = false));
  maj();
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
  inclinaisons();
  entete();
}
