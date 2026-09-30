/**
 * Nuancier de l'accueil (« Essayez le tissu », HTML généré par build/essayage.ts) :
 * - la matière choisie se propage en cercle sur l'objet et le disque ; elle est mémorisée
 *   (localStorage) et exposée au site par --matiere et --matiere-teinte ;
 * - changer d'objet le fait rebondir et brouille son nom lettre par lettre ;
 * - l'objet s'incline légèrement sous la souris.
 * « Réduire les animations » garde les changements, sans mouvement.
 */
import './nuancier.css';

interface Donnees {
  motifs: string;
  dessins: Record<string, string>;
  objets: { id: string; nom: string; sous: string; matieres: string[] }[];
  tissus: {
    nom: string;
    remplissage: string;
    contour: string;
    teinte: string;
    titre: string;
    phrase: string;
    lien: string;
    id: string;
    /** Objets habillés de cette matière en photo réaliste (sinon, dessin rempli du motif). */
    images: Record<string, string>;
  }[];
}

const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MEMOIRE = 'kd-matiere';
const LETTRES = 'ABCDEFGHIJKLMNOPRSTUVWXYZÉ';

export function nuancier(): void {
  const section = document.querySelector<HTMLElement>('[data-nuancier]');
  if (!section) return;
  const d = JSON.parse(section.querySelector('[data-nuancier-donnees]')?.textContent ?? '{}') as Donnees;
  if (!d.tissus?.length) return;
  const $ = <T extends Element>(sel: string) => section.querySelector<T>(sel)!;
  const vignettes = [...section.querySelectorAll<HTMLButtonElement>('[data-objet]')];
  const pastilles = [...section.querySelectorAll<HTMLButtonElement>('[data-tissu]')];
  const disques = [...section.querySelectorAll<HTMLElement>('.nuancier__disque')];
  const calques = [...section.querySelectorAll<HTMLElement>('.nuancier__calque')];
  const images = calques.map((c) => c.querySelector('img')!);
  const nom = $<HTMLElement>('[data-nuancier-nom]');
  // Le nom défile lettre par lettre à l'écran (caché aux lecteurs d'écran) ; le nom final est annoncé une seule fois.
  const annonce = section.querySelector<HTMLElement>('[data-nuancier-annonce]');
  const sous = $<HTMLElement>('[data-nuancier-sous]');
  const titre = $<HTMLElement>('[data-nuancier-titre]');
  const phrase = $<HTMLElement>('[data-nuancier-phrase]');
  const lien = $<HTMLAnchorElement>('[data-nuancier-lien]');
  const zone = $<HTMLElement>('[data-nuancier-zone]');
  const pose = $<HTMLElement>('[data-nuancier-pose]');
  const depart = Number(section.dataset.depart ?? 0);

  const dessin = (objet: string, remplissage: string) =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><defs>${d.motifs}</defs><g fill="${remplissage}">${d.dessins[objet]}</g></svg>`)}`;

  const visuel = (o: string, t: Donnees['tissus'][number]) => t.images?.[o] ?? dessin(o, t.remplissage);
  // Un objet n'accepte que certaines matières (les tissus pour les meubles, sa matière pour un objet).
  const convient = (o: number, t: number) => d.objets[o].matieres.includes(d.tissus[t].id);
  const vignetteDe = (o: number, t: number) => visuel(d.objets[o].id, d.tissus[convient(o, t) ? t : d.tissus.findIndex((x) => x.id === d.objets[o].matieres[0])]);

  let objet = 0;
  let tissu = depart;
  let precedent = -1;
  let brouillage = 0;
  let nettoyage = 0;

  const poserTissu = (i: number) => {
    if (i !== tissu) precedent = tissu;
    tissu = i;
    for (const liste of [disques, calques]) {
      liste.forEach((el, k) => {
        el.classList.toggle('est-actif', k === i);
        el.classList.toggle('est-precedent', k === precedent && k !== i);
      });
    }
    pastilles.forEach((p, k) => p.setAttribute('aria-pressed', String(k === i)));
    // Une fois le cercle déployé, l'ancien calque disparaît : sinon il se voit autour d'une silhouette
    // différente (un panier à la place d'un canapé).
    clearTimeout(nettoyage);
    nettoyage = window.setTimeout(
      () =>
        calques.forEach((c) => {
          if (!c.classList.contains('est-precedent')) return;
          c.style.transition = 'none'; // disparition immédiate, sans refermer le cercle
          c.classList.remove('est-precedent');
          void c.offsetWidth;
          c.style.transition = '';
        }),
      reduit() ? 0 : 1300,
    );
    const t = d.tissus[i];
    titre.textContent = t.titre;
    phrase.textContent = t.phrase;
    lien.href = t.lien;
    lien.dataset.libelle = t.nom;
    images.forEach((im, k) => (im.alt = k === i ? `${d.objets[objet].sous}, ${t.nom.toLowerCase()}` : ''));
    vignettes.forEach((v, k) => (v.querySelector('img')!.src = vignetteDe(k, i)));
    document.documentElement.style.setProperty('--matiere', t.contour);
    document.documentElement.style.setProperty('--matiere-teinte', t.teinte);
    try {
      localStorage.setItem(MEMOIRE, String(i));
    } catch {
      /* navigation privée : pas de mémoire, sans gravité */
    }
  };

  const brouiller = (cible: string) => {
    if (annonce) annonce.textContent = cible.charAt(0) + cible.slice(1).toLowerCase();
    clearInterval(brouillage);
    if (reduit()) {
      nom.textContent = cible;
      return;
    }
    let pas = 0;
    brouillage = window.setInterval(() => {
      pas++;
      nom.textContent = [...cible].map((c, k) => (k < pas / 2 ? c : LETTRES[Math.floor(Math.random() * LETTRES.length)])).join('');
      if (pas / 2 >= cible.length) {
        clearInterval(brouillage);
        nom.textContent = cible;
      }
    }, 35);
  };

  const poserObjet = (i: number) => {
    if (i === objet) return;
    objet = i;
    const o = d.objets[i];
    vignettes.forEach((v, k) => v.setAttribute('aria-pressed', String(k === i)));
    images.forEach((im, k) => {
      im.src = visuel(o.id, d.tissus[k]);
      im.alt = k === tissu ? `${o.sous} habillé en ${d.tissus[tissu].nom.toLowerCase()}` : '';
    });
    sous.textContent = o.sous;
    brouiller(o.nom.toUpperCase());
    pastilles.forEach((p, k) => (p.hidden = !convient(i, k)));
    if (!convient(i, tissu)) poserTissu(d.tissus.findIndex((x) => x.id === o.matieres[0]));
    if (!reduit())
      zone.animate(
        [
          { transform: 'translateY(-70px) scale(.9,1.08)', opacity: 0 },
          { transform: 'translateY(0) scale(1.08,.9)', opacity: 1, offset: 0.55 },
          { transform: 'translateY(-10px) scale(.97,1.03)', offset: 0.75 },
          { transform: 'none' },
        ],
        { duration: 750, easing: 'cubic-bezier(.3,0,.3,1)' },
      );
  };

  vignettes.forEach((v, i) => v.addEventListener('click', () => poserObjet(i)));
  pastilles.forEach((p, i) => p.addEventListener('click', () => i !== tissu && poserTissu(i)));

  // Légère inclinaison sous la souris.
  const carte = section.querySelector<HTMLElement>('.nuancier__carte');
  if (carte && !reduit() && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    carte.addEventListener('pointermove', (e) => {
      const r = carte.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      pose.style.transform = `perspective(900px) rotateY(${(x * 8).toFixed(2)}deg) rotateX(${(-y * 5).toFixed(2)}deg) translate(${(x * 10).toFixed(1)}px, ${(y * 6).toFixed(1)}px)`;
    });
    carte.addEventListener('pointerleave', () => (pose.style.transform = ''));
  }

  // Matière mémorisée d'une visite à l'autre.
  let memoire = NaN;
  try {
    memoire = Number(localStorage.getItem(MEMOIRE));
  } catch {
    /* rien */
  }
  if (Number.isInteger(memoire) && memoire >= 0 && memoire < d.tissus.length && memoire !== depart) {
    calques.forEach((c) => (c.style.transition = 'none'));
    disques.forEach((c) => (c.style.transition = 'none'));
    if (!convient(objet, memoire)) poserObjet(d.objets.findIndex((o) => o.matieres.includes(d.tissus[memoire].id)));
    poserTissu(memoire);
    precedent = -1;
    requestAnimationFrame(() => {
      calques.forEach((c) => (c.style.transition = ''));
      disques.forEach((c) => (c.style.transition = ''));
    });
  }
}
