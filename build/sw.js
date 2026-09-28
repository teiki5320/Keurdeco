/* Service worker Keur Déco : le site s'installe et reste consultable hors ligne.
 * - Pages HTML : réseau d'abord (toujours la dernière version), cache en secours hors ligne.
 * - Fichiers du build (assets/, noms à empreinte), images, icônes : cache d'abord.
 * - Les requêtes vers d'autres domaines (images Amazon, Plausible) ne sont jamais mises en cache.
 * VERSION change à chaque publication du site (remplacée au build par build/site.ts) : les anciens
 * caches, images comprises, sont alors supprimés. Ce fichier est un modèle, publié sous dist/sw.js. */
const VERSION = 'keurdeco-__VERSION__';
const PRECHARGE = ['./', './index.html', './articles.html', './pieces.html', './matieres.html', './glossaire.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECHARGE)).then(() => self.skipWaiting()));
});

/** Retire du cache les fichiers du build (assets/) qu'aucune page ni feuille de style en cache n'utilise plus. */
/** Le nettoyage relit tout le HTML en cache : on ne le fait qu'une fois toutes les 10 minutes au plus. */
let dernierNettoyage = 0;

async function nettoyerAssets() {
  if (Date.now() - dernierNettoyage < 10 * 60 * 1000) return;
  dernierNettoyage = Date.now();
  const cache = await caches.open(VERSION);
  const requetes = await cache.keys();
  const estAsset = (r) => new URL(r.url).pathname.includes('/assets/');
  const textes = await Promise.all(
    requetes
      .filter((r) => !estAsset(r) || r.url.endsWith('.css'))
      .map((r) => cache.match(r).then((rep) => (rep && /text\/(html|css)/.test(rep.headers.get('content-type') || '') ? rep.text() : ''))),
  );
  const references = textes.join('\n');
  await Promise.all(requetes.filter((r) => estAsset(r) && !references.includes(new URL(r.url).pathname.split('/').pop())).map((r) => cache.delete(r)));
}

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

/** Page affichée hors ligne quand la page demandée n'a jamais été consultée. */
function pageHorsLigne() {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hors ligne · Keur Déco</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F7F0E6;color:#2A1D15;font-family:Georgia,serif;text-align:center;padding:24px}a{color:#A3472A}</style></head>
<body><main><h1>Vous êtes hors ligne</h1><p>Cette page n’a pas encore été enregistrée sur votre appareil.</p><p><a href="./">Revenir à l’accueil</a> (les pages déjà lues restent consultables).</p></main></body></html>`;
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Les épingles et leur manifeste changent à chaque build : jamais de cache.
  if (new URL(req.url).pathname.includes('/epingles')) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((rep) => {
          if (rep.ok) {
            const copie = rep.clone();
            caches.open(VERSION).then((c) => c.put(req, copie)).then(nettoyerAssets);
          }
          return rep;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || pageHorsLigne())),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (r) =>
        r ||
        fetch(req).then((rep) => {
          if (rep.ok) {
            const copie = rep.clone();
            caches.open(VERSION).then((c) => c.put(req, copie));
          }
          return rep;
        }),
    ),
  );
});
