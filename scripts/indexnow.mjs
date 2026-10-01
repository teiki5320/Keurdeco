// Signale les pages du site à Bing (et aux autres moteurs IndexNow) pour qu'elles soient explorées vite.
// Usage : node scripts/indexnow.mjs (lancé chaque lundi après la publication, voir .github/workflows/pages.yml).
// La clé est publique par conception : elle est servie à la racine du site (public/<clé>.txt).
const SITE = (process.env.SITE_URL ?? 'https://www.keurdeco.com/').replace(/\/?$/, '/');
const CLE = 'c221134c9925a6a68046cfffb8269dcf';
const plan = await (await fetch(`${SITE}sitemap.xml`)).text();
const urls = [...plan.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const rep = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: CLE, keyLocation: `${SITE}${CLE}.txt`, urlList: urls }),
});
console.log(`IndexNow : ${urls.length} page(s) signalée(s), réponse ${rep.status}`);
if (rep.status >= 400) process.exit(1);
