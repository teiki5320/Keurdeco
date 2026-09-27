/**
 * Formes du nuage de particules (reprises du nuage d'Alohash pour la carte de l'Afrique).
 * Chaque fonction renvoie un point (x, y, z) d'une forme d'environ 3,5 unités de haut, centrée.
 *   0 : carte de l'Afrique · 1 : maison (« keur ») · 2 : jarre en terre cuite · 3 : assiette tressée
 */
/** Contour simplifié de l'Afrique (longitude, latitude), dans le sens horaire depuis Tanger. */
const AFRICA: Array<[number, number]> = [
  [-5.9, 35.8], [-1.9, 35.1], [3.0, 36.8], [9.8, 37.3], [11.1, 36.9], [10.2, 34.3], [11.5, 33.1], [15.2, 32.3],
  [19.0, 30.3], [20.1, 32.1], [23.0, 32.6], [25.1, 31.6], [29.9, 31.2], [32.3, 31.3], [32.5, 29.9], [33.6, 27.2],
  [35.5, 23.9], [37.2, 19.6], [38.6, 18.0], [39.5, 15.6], [41.2, 13.9], [42.7, 13.0], [43.2, 11.6], [44.9, 10.4],
  [47.5, 11.1], [51.3, 11.8], [51.0, 10.4], [49.8, 7.5], [47.8, 4.5], [45.3, 2.0], [42.5, -0.4], [40.9, -2.3],
  [39.7, -4.1], [39.3, -6.8], [39.7, -10.0], [40.5, -10.5], [40.6, -14.5], [39.0, -17.0], [34.9, -19.8], [35.5, -22.0],
  [35.5, -24.0], [32.6, -25.9], [31.0, -29.9], [28.0, -32.7], [25.6, -34.0], [20.0, -34.8], [18.4, -34.0], [17.9, -31.5],
  [15.2, -26.7], [14.5, -22.9], [11.8, -17.3], [13.4, -12.6], [13.2, -8.8], [12.3, -6.0], [11.9, -4.8], [8.7, -0.7],
  [9.4, 0.4], [9.8, 3.0], [9.7, 4.0], [8.5, 4.5], [6.0, 4.3], [3.4, 6.4], [-0.2, 5.5], [-2.1, 4.7],
  [-4.0, 5.3], [-7.7, 4.4], [-10.8, 6.3], [-13.2, 8.5], [-13.7, 9.5], [-15.6, 11.9], [-17.5, 14.7], [-16.0, 18.1],
  [-17.0, 20.8], [-16.0, 23.7], [-14.5, 26.1], [-12.9, 27.9], [-9.6, 30.4], [-9.8, 31.5], [-7.6, 33.6], [-6.8, 34.0],
];
const MADAGASCAR: Array<[number, number]> = [
  [49.3, -12.0], [50.5, -15.5], [49.4, -17.8], [47.1, -24.9], [45.2, -25.6], [43.7, -22.5], [43.3, -21.5], [44.4, -16.2], [47.2, -15.0], [48.0, -13.5],
];

/** Passage (longitude, latitude) → coordonnées du nuage : la carte fait 3,5 unités de haut, centrée. */
const MAP_SCALE = 3.5 / 72.1;
const MAP_CENTER: [number, number] = [16.9, 1.25];
const projectMap = (lon: number, lat: number): [number, number] => [(lon - MAP_CENTER[0]) * MAP_SCALE, (lat - MAP_CENTER[1]) * MAP_SCALE];

function inside(poly: Array<[number, number]>, x: number, y: number) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Point de la carte : 70 % à l'intérieur du continent, 30 % sur le contour (effet de trait). */
export function africaPoint(): [number, number] {
  if (Math.random() < 0.3) {
    const poly = Math.random() < 0.93 ? AFRICA : MADAGASCAR;
    const k = Math.floor(Math.random() * poly.length);
    const [a, b] = [poly[k], poly[(k + 1) % poly.length]];
    const t = Math.random();
    return projectMap(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
  }
  for (;;) {
    const lon = -18 + Math.random() * 70, lat = -35 + Math.random() * 73;
    if (inside(AFRICA, lon, lat) || inside(MADAGASCAR, lon, lat)) return projectMap(lon, lat);
  }
}


type Point = [number, number, number];
const hasard = (a: number, b: number) => a + Math.random() * (b - a);

/** Carte de l'Afrique, à peine épaisse. */
export function pointAfrique(): Point {
  const [x, y] = africaPoint();
  return [x, y, hasard(-0.06, 0.06)];
}

/** Maison : murs et toit en volume léger, porte en arche évidée (le logo de Keur Déco). */
const MAISON: Array<[number, number]> = [[-1.3, -1.75], [1.3, -1.75], [1.3, 0.35], [0, 1.75], [-1.3, 0.35]];
function dansPorte(x: number, y: number) {
  return Math.abs(x) < 0.38 && y < -0.35 && (y < -0.75 || Math.hypot(x, y + 0.75) < 0.38);
}
export function pointMaison(): Point {
  if (Math.random() < 0.35) {
    // Contours : silhouette, arête du toit et porte.
    const r = Math.random();
    if (r < 0.75) {
      const k = Math.floor(Math.random() * MAISON.length);
      const [a, b] = [MAISON[k], MAISON[(k + 1) % MAISON.length]];
      const t = Math.random();
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, hasard(-0.25, 0.25)];
    }
    if (r < 0.85) return [hasard(-1.3, 1.3), 0.35, hasard(-0.25, 0.25)];
    const ang = hasard(0, Math.PI);
    return Math.random() < 0.5 ? [Math.cos(ang) * 0.38, -0.75 + Math.sin(ang) * 0.38, 0.25] : [Math.random() < 0.5 ? -0.38 : 0.38, hasard(-1.75, -0.75), 0.25];
  }
  for (;;) {
    const x = hasard(-1.3, 1.3), y = hasard(-1.75, 1.75);
    if (inside(MAISON, x, y) && !dansPorte(x, y)) return [x, y, hasard(-0.25, 0.25)];
  }
}

/** Jarre (canari) : surface de révolution, col étroit et panse ronde. */
function rayonJarre(y: number) {
  // y de -1.7 (pied) à 1.7 (col)
  const t = (y + 1.7) / 3.4;
  if (t > 0.86) return 0.42 + (t - 0.86) * 1.2; // lèvre évasée
  if (t > 0.72) return 0.42 + (0.86 - t) * 2.2; // col
  return 0.35 + Math.sin(t * Math.PI * 1.25) * 1.05; // panse
}
export function pointJarre(): Point {
  const y = hasard(-1.7, 1.7);
  const ang = hasard(0, Math.PI * 2);
  const r = rayonJarre(y) * (Math.random() < 0.9 ? 1 : Math.sqrt(Math.random()));
  // Deux bandes décoratives un peu plus denses et saillantes.
  const bande = Math.abs(y - 0.35) < 0.05 || Math.abs(y + 0.2) < 0.05 ? 1.04 : 1;
  return [Math.cos(ang) * r * bande, y, Math.sin(ang) * r * bande];
}

/** Assiette tressée : spirale de vannerie avec motif en étoile, légèrement bombée. */
export function pointAssiette(): Point {
  const spires = 11;
  const u = Math.random();
  const ang = u * spires * Math.PI * 2;
  const rad = 0.12 + u * 1.75;
  const jitter = hasard(-0.03, 0.03);
  const x = Math.cos(ang) * (rad + jitter), y = Math.sin(ang) * (rad + jitter);
  // Motif : six branches plus hautes (fibre teinte).
  const branche = Math.cos(Math.atan2(y, x) * 6) > 0.8 ? 0.08 : 0;
  return [x, y, -0.25 * (rad / 1.87) ** 2 + branche + hasard(-0.02, 0.02)];
}

export const FORMES = [pointAfrique, pointMaison, pointJarre, pointAssiette];
