// Outil de placement des points cliquables d'une image d'ambiance.
// Usage : npm run hotspots -- <slug>   puis ouvrir http://localhost:5174/
//
// La page affiche l'image de l'article : on clique sur chaque objet, on choisit le produit dans la
// liste, et la page donne le bloc « hotspots » YAML prêt à coller dans l'en-tête de l'article
// (ou l'enregistre directement dans contenu/articles/<slug>.md avec le bouton prévu).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const RACINE = resolve(import.meta.dirname, '..');
const PORT = Number(process.env.PORT ?? 5174);
const slug = process.argv[2] ?? '';
const fichierArticle = resolve(RACINE, 'contenu/articles', `${slug}.md`);

const lireArticle = () => {
  const source = readFileSync(fichierArticle, 'utf8');
  const entete = parse(source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '') ?? {};
  return { source, entete };
};

/** Bloc YAML des points, prêt à coller dans l'en-tête. */
export function blocHotspots(points) {
  return `hotspots:\n${points.map((p) => `  - { produit: ${p.produit}, x: ${p.x}, y: ${p.y} }`).join('\n')}`;
}

/** Remplace (ou ajoute) le bloc hotspots dans l'en-tête d'un article. */
export function remplacerHotspots(source, points) {
  const [, entete, corps] = source.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n[\s\S]*)$/) ?? [];
  if (entete === undefined) throw new Error('En-tête YAML introuvable');
  const lignes = entete.split(/\r?\n/);
  const debut = lignes.findIndex((l) => /^hotspots:/.test(l));
  if (debut === -1) lignes.push(blocHotspots(points));
  else {
    // Le bloc s'étend sur les lignes indentées (ou vides) qui suivent « hotspots: ».
    let fin = debut + 1;
    while (fin < lignes.length && (/^[ \t]/.test(lignes[fin]) || lignes[fin].trim() === '')) fin++;
    lignes.splice(debut, fin - debut, blocHotspots(points));
  }
  const nouvelEntete = lignes.join('\n');
  return `---\n${nouvelEntete}\n---${corps}`;
}

function page() {
  const { entete } = lireArticle();
  const produits = JSON.parse(readFileSync(resolve(RACINE, 'src/data/produits.json'), 'utf8'));
  const cites = new Set(entete.produits ?? []);
  const tries = [...produits].sort((a, b) => Number(cites.has(b.id)) - Number(cites.has(a.id)) || a.id.localeCompare(b.id));
  const image = `/images/articles/${entete.image}-1600.webp`;
  const donnees = JSON.stringify({ points: entete.hotspots ?? [], produits: tries.map((p) => ({ id: p.id, nom: p.nom, statut: p.statut, cite: cites.has(p.id) })) }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Points cliquables · ${slug}</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;background:#F7F0E6;color:#1C1B22}
header{background:#1E2A47;color:#fff;padding:14px 20px}h1{font-size:1.2rem;margin:0}
main{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:20px;padding:20px}
.image{position:relative;cursor:crosshair;user-select:none}.image img{width:100%;display:block;border-radius:10px}
.point{position:absolute;transform:translate(-50%,-50%);width:32px;height:32px;border-radius:50%;background:#B4532F;color:#fff;border:3px solid #fff;display:grid;place-items:center;font-weight:700;box-shadow:0 2px 8px #0006}
.point.sans{background:#888}
aside{display:grid;gap:14px;align-content:start}
ol{margin:0;padding-left:1.4em}li{margin:6px 0}select{max-width:100%;font-size:.95rem}
textarea{width:100%;min-height:220px;font-family:ui-monospace,monospace;font-size:.85rem}
button{background:#B4532F;color:#fff;border:0;border-radius:999px;padding:9px 16px;font-weight:600;cursor:pointer}
button.secondaire{background:#1E2A47}.aide{font-size:.9rem;color:#555}.suppr{background:none;color:#B4532F;padding:2px 6px}
</style></head><body>
<header><h1>Points cliquables : ${slug}</h1></header>
<main>
  <div class="image" id="image"><img src="${image}" alt="" draggable="false"></div>
  <aside>
    <p class="aide">Cliquez sur un objet de l'image, puis choisissez le produit correspondant. Les produits cités par l'article sont en tête de liste (★). Les coordonnées sont en % de l'image.</p>
    <ol id="liste"></ol>
    <textarea id="yaml" readonly></textarea>
    <div><button id="copier">Copier le bloc YAML</button> <button class="secondaire" id="enregistrer">Enregistrer dans l'article</button></div>
    <p class="aide" id="message"></p>
  </aside>
</main>
<script>
const D = ${donnees};
const points = D.points.map(p => ({ ...p }));
const zone = document.getElementById('image');
const options = (choisi) => '<option value="">— produit —</option>' + D.produits.map(p => '<option value="' + p.id + '"' + (p.id === choisi ? ' selected' : '') + '>' + (p.cite ? '★ ' : '') + p.id + (p.statut !== 'actif' ? ' (' + p.statut + ')' : '') + '</option>').join('');
function dessiner() {
  zone.querySelectorAll('.point').forEach(e => e.remove());
  points.forEach((p, i) => {
    const e = document.createElement('div');
    e.className = 'point' + (p.produit ? '' : ' sans');
    e.style.left = p.x + '%'; e.style.top = p.y + '%'; e.textContent = i + 1;
    zone.appendChild(e);
  });
  document.getElementById('liste').innerHTML = points.map((p, i) => '<li>x ' + p.x + ' %, y ' + p.y + ' % <select data-i="' + i + '">' + options(p.produit) + '</select> <button class="suppr" data-suppr="' + i + '" title="Supprimer">✕</button></li>').join('');
  document.getElementById('yaml').value = 'hotspots:\\n' + points.filter(p => p.produit).map(p => '  - { produit: ' + p.produit + ', x: ' + p.x + ', y: ' + p.y + ' }').join('\\n');
}
zone.addEventListener('click', (e) => {
  const r = zone.querySelector('img').getBoundingClientRect();
  const arrondi = v => Math.round(Math.min(100, Math.max(0, v)) * 2) / 2;
  points.push({ produit: '', x: arrondi((e.clientX - r.left) / r.width * 100), y: arrondi((e.clientY - r.top) / r.height * 100) });
  dessiner();
  document.querySelector('select[data-i="' + (points.length - 1) + '"]').focus();
});
document.getElementById('liste').addEventListener('change', (e) => { if (e.target.dataset.i) { points[e.target.dataset.i].produit = e.target.value; dessiner(); } });
document.getElementById('liste').addEventListener('click', (e) => { if (e.target.dataset.suppr) { points.splice(Number(e.target.dataset.suppr), 1); dessiner(); } });
document.getElementById('copier').onclick = () => navigator.clipboard.writeText(document.getElementById('yaml').value).then(() => message('Bloc copié.'));
document.getElementById('enregistrer').onclick = async () => {
  const rep = await fetch('/enregistrer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(points.filter(p => p.produit)) });
  message(rep.ok ? 'Enregistré dans contenu/articles/${slug}.md.' : 'Erreur : ' + await rep.text());
};
const message = (t) => document.getElementById('message').textContent = t;
dessiner();
</script></body></html>`;
}

if (import.meta.main) {
  if (!/^[a-z0-9-]+$/.test(slug) || !existsSync(fichierArticle)) {
    console.error('Usage : npm run hotspots -- <slug>   (contenu/articles/<slug>.md doit exister)');
    process.exit(1);
  }
  createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(page());
      }
      if (url.pathname.startsWith('/images/articles/')) {
        const f = resolve(RACINE, 'public', `.${url.pathname}`);
        if (!f.startsWith(resolve(RACINE, 'public/images/articles')) || !existsSync(f)) throw new Error('Image introuvable (lancez npm run images -- <dossier>)');
        res.writeHead(200, { 'Content-Type': 'image/webp' });
        return res.end(readFileSync(f));
      }
      if (url.pathname === '/enregistrer' && req.method === 'POST') {
        let corps = '';
        for await (const m of req) corps += m;
        const points = JSON.parse(corps).map((p) => ({ produit: String(p.produit).replace(/[^a-z0-9-]/g, ''), x: Number(p.x), y: Number(p.y) }));
        writeFileSync(fichierArticle, remplacerHotspots(lireArticle().source, points));
        res.writeHead(200);
        return res.end('ok');
      }
      res.writeHead(404);
      res.end();
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(e.message);
    }
  }).listen(PORT, () => console.log(`Points cliquables de « ${slug} » : ouvrez http://localhost:${PORT}/ (Ctrl+C pour arrêter).`));
}
