/**
 * Nuage de particules 3D en fond de toutes les pages (adapté du nuage d'Alohash).
 *
 * Il se place sur l'élément [data-nuage] le plus proche du centre de l'écran et prend la forme
 * indiquée par son attribut data-forme : 0 = carte de l'Afrique, 1 = maison, 2 = jarre,
 * 3 = assiette tressée. Les particules fuient le curseur (ou le doigt) et se dispersent pendant
 * les transitions de page (événement window « nuage:explosion », detail 0 ou 1).
 * Sans WebGL ou avec « réduire les animations », le nuage est ralenti ou absent : la page reste complète.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Clock, PerspectiveCamera, Points, Scene, ShaderMaterial, Vector3, WebGLRenderer } from 'three';
import { FORMES } from './formes.ts';

const VERT = /* glsl */ `
attribute vec3 t0; attribute vec3 t1; attribute vec3 t2; attribute vec3 t3; attribute float aRand;
uniform float uMix, uTime, uExplode, uPR, uForce; uniform vec3 uMouse; varying vec3 vCol; varying float vA;
void main(){
  float m = uMix; float d = aRand * .35;
  vec3 p = mix(t0, t1, smoothstep(0. + d, .65 + d, m));
  p = mix(p, t2, smoothstep(1. + d, 1.65 + d, m));
  p = mix(p, t3, smoothstep(2. + d, 2.65 + d, m));
  p += .035 * sin(uTime * 1.4 + aRand * 6.283 + p.yzx * 3.);
  p += normalize(p + vec3(.001)) * uExplode * (0.6 + aRand * 3.5);
  vec3 dm = p - uMouse; float f = smoothstep(1.3, 0., length(dm.xy)); p += normalize(dm + vec3(.001)) * f * .55 * uForce;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.4 + aRand * 2.2) * uPR * (9. / -mv.z);
  vec3 terracotta = vec3(.9, .38, .22), safran = vec3(1., .74, .28), ivoire = vec3(1., .96, .9), indigo = vec3(.45, .55, 1.);
  vCol = mix(terracotta, safran, smoothstep(-1.6, 1.8, p.y + sin(p.x * 1.5) * .4));
  vCol = mix(vCol, ivoire, step(.95, aRand) * .8);
  vCol = mix(vCol, indigo, step(aRand, .06) * .7);
  vA = .55 + .45 * aRand;
}`;

const FRAG = /* glsl */ `
uniform float uAlpha; varying vec3 vCol; varying float vA;
void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d); gl_FragColor = vec4(vCol, a * vA * uAlpha * .85); }`;

export function demarrerNuage(hote: HTMLElement): void {
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rendu: WebGLRenderer;
  try {
    rendu = new WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return; // sans WebGL, on se passe du nuage
  }
  const PR = Math.min(2, window.devicePixelRatio);
  rendu.setPixelRatio(PR);
  rendu.setSize(window.innerWidth, window.innerHeight);
  rendu.domElement.style.cssText = 'width:100%;height:100%;display:block';
  hote.appendChild(rendu.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 9;

  const N = window.innerWidth < 700 ? 8000 : 15000;
  const cibles = FORMES.map(() => new Float32Array(N * 3));
  const hasard = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    hasard[i] = Math.random();
    FORMES.forEach((f, k) => cibles[k].set(f(), i * 3));
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(cibles[0].slice(), 3));
  cibles.forEach((c, k) => geo.setAttribute(`t${k}`, new BufferAttribute(c, 3)));
  geo.setAttribute('aRand', new BufferAttribute(hasard, 1));
  const uni = {
    uMix: { value: 0 },
    uTime: { value: 0 },
    uExplode: { value: 1 },
    uMouse: { value: new Vector3(99, 99, 0) },
    uForce: { value: 1 },
    uPR: { value: PR },
    uAlpha: { value: 1 },
  };
  const mat = new ShaderMaterial({ uniforms: uni, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending });
  const nuage = new Points(geo, mat);
  scene.add(nuage);

  let mx = 0, my = 0, explosion = 0;
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    rendu.setSize(window.innerWidth, window.innerHeight);
  });
  window.addEventListener('nuage:explosion', (e) => (explosion = Number((e as CustomEvent<number>).detail) || 0));

  // Souris : les particules fuient le curseur. Tactile : seulement pendant que le doigt touche.
  const pointeurFin = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let touche = false, tx = 0, ty = 0, force = pointeurFin ? 1 : 0;
  if (pointeurFin) {
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    });
  } else {
    const auToucher = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      if (e.type === 'pointerup' || e.type === 'pointercancel') return void (touche = false);
      touche = true;
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) window.addEventListener(t, auToucher as EventListener, { passive: true });
  }

  const horloge = new Clock();
  const cur = { x: 2, y: 0, s: 1, mix: 0, ex: 1, al: 1 };
  const lisse = { x: 0, y: 0 };
  let rotation = 0, precedent = 0;

  const boucle = () => {
    requestAnimationFrame(boucle);
    if (document.hidden) return;
    const t = horloge.getElapsedTime() * (reduit ? 0.3 : 1);
    const W = window.innerWidth, H = window.innerHeight;
    const hh = Math.tan((35 * Math.PI) / 360) * 9, hw = hh * camera.aspect;

    // Ancre la plus proche du centre de l'écran.
    let meilleur: DOMRect | null = null, ancre: HTMLElement | null = null, distance = 1e9;
    document.querySelectorAll<HTMLElement>('[data-nuage]').forEach((a) => {
      const r = a.getBoundingClientRect();
      if (r.width < 10) return;
      const d = Math.hypot(r.left + r.width / 2 - W / 2, r.top + r.height / 2 - H / 2);
      if (d < distance) {
        distance = d;
        meilleur = r;
        ancre = a;
      }
    });
    const cible = { x: hw * 0.55, y: 0, s: 1, mix: 0, ex: explosion, al: 0.25 };
    if (meilleur && ancre) {
      const r = meilleur as DOMRect, a = ancre as HTMLElement;
      cible.x = (((r.left + r.width / 2) / W) * 2 - 1) * hw;
      cible.y = -(((r.top + r.height / 2) / H) * 2 - 1) * hh;
      cible.s = ((r.height / H) * 2 * hh) / 3.7;
      cible.mix = parseFloat(a.dataset.forme ?? '0') || 0;
      // Sur les pages de lecture, le nuage reste discret derrière le texte.
      const discret = a.dataset.discret !== undefined;
      cible.al = distance < H * 0.9 ? (discret ? 0.35 : 1) : 0.15;
    }
    (Object.keys(cible) as (keyof typeof cible)[]).forEach((k) => {
      const vitesse = k === 'ex' ? 0.06 : k === 'mix' ? 0.05 : k === 'al' ? 0.08 : 0.1;
      cur[k] += (cible[k] - cur[k]) * vitesse;
    });
    lisse.x += (mx - lisse.x) * 0.08;
    lisse.y += (my - lisse.y) * 0.08;

    const dt = Math.min(0.1, t - precedent);
    precedent = t;
    rotation += dt * 0.14;
    // Seule la jarre (forme 2) tourne sur elle-même ; les formes plates (carte, maison, assiette)
    // restent face à l'écran et se balancent doucement, sinon on les verrait de profil.
    const tour = Math.max(0, 1 - Math.abs(cur.mix - 2) * 1.5);
    const balancement = Math.sin(t * 0.35) * 0.45;
    const aPlat = cur.mix > 2.5 ? 0.55 : 0; // l'assiette se présente un peu inclinée
    nuage.position.set(cur.x, cur.y + Math.sin(t * 0.8) * 0.05, 0);
    nuage.scale.setScalar(Math.max(0.2, cur.s));
    nuage.rotation.set(lisse.y * 0.35 + aPlat, rotation * tour + balancement * (1 - tour) + lisse.x * 0.6, 0);
    if (pointeurFin) uni.uMouse.value.set((lisse.x * 2 * hw - cur.x) / cur.s, (-lisse.y * 2 * hh - cur.y) / cur.s, 0);
    else {
      if (touche) uni.uMouse.value.set((tx * 2 * hw - cur.x) / cur.s, (-ty * 2 * hh - cur.y) / cur.s, 0);
      force += ((touche ? 1 : 0) - force) * (touche ? 0.25 : 0.06);
    }
    uni.uForce.value = force;
    uni.uMix.value = cur.mix;
    uni.uTime.value = t;
    uni.uExplode.value = cur.ex;
    uni.uAlpha.value = cur.al;
    rendu.render(scene, camera);
  };
  boucle();
}
