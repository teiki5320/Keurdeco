// Test de bout en bout dans Chromium (écran de téléphone).
// Usage : npm run test:e2e   (CHROMIUM_PATH=/chemin/vers/chrome pour un Chromium déjà installé)
//
// Construit une version de démonstration du site dans dist-e2e/ : tous les articles programmés
// sont publiés (DATE_PUBLICATION lointaine) et les produits sont remplacés par des copies « actives »
// avec des ASIN fictifs (DEMO000001…), écrites dans un fichier temporaire : ces données ne sont
// jamais publiées. Puis pilote le site construit (vite preview) pour vérifier pages, points cliquables,
// liens Amazon, repli sans JavaScript, épingles et fichiers de référencement.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const RACINE = resolve(import.meta.dirname, '..');
const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const SORTIE = 'dist-e2e';

// Produits de démonstration (fichier temporaire, jamais publié).
const temp = mkdtempSync(join(tmpdir(), 'keurdeco-e2e-'));
const produitsDemo = JSON.parse(readFileSync(resolve(RACINE, 'src/data/produits.json'), 'utf8')).map((p, i) => ({
  ...p,
  asin: `DEMO${String(i + 1).padStart(6, '0')}`,
  statut: 'actif',
  verifie_le: '2026-01-01',
}));
const fichierProduits = join(temp, 'produits.json');
writeFileSync(fichierProduits, JSON.stringify(produitsDemo));
const envDemo = { ...process.env, DATE_PUBLICATION: '2099-12-31', KEURDECO_PRODUITS: fichierProduits, DOSSIER_SORTIE: SORTIE, PINTEREST_VERIFY: 'code-de-test' };

console.log('Construction de la version de démonstration…');
execFileSync('node', ['scripts/epingles.ts'], { cwd: RACINE, env: envDemo, stdio: 'ignore' });
execFileSync('npx', ['vite', 'build', '--logLevel', 'error'], { cwd: RACINE, env: envDemo, stdio: 'ignore' });

const serveur = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--outDir', SORTIE], { cwd: RACINE, stdio: 'ignore' });

let echecs = 0;
const verifier = (condition, message) => {
  console.log(`${condition ? '✓' : '✗'} ${message}`);
  if (!condition) echecs++;
};

try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {
      /* serveur pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));

  const pages = ['index.html', 'articles.html', 'pieces.html', 'matiere-bogolan.html', 'occasion-mariage.html', 'glossaire.html', 'glossaire-bogolan.html', 'conseils.html', 'conseil-laver-coussin-wax.html', 'conseil-rideau-perles.html', 'a-propos.html', 'mentions-legales.html', 'confidentialite.html', 'salon-terracotta-wax.html', 'top-paniers-tresses-africains.html', 'bogolan-histoire-idees.html'];
  for (const p of pages) {
    const rep = await page.goto(BASE + p, { waitUntil: 'networkidle' });
    verifier(rep?.ok() && (await page.locator('h1').count()) === 1, `${p} s'affiche avec un seul h1`);
  }
  // GitHub Pages sert 404.html pour toute adresse inconnue (vite preview ne le fait pas : on l'ouvre directement).
  await page.goto(`${BASE}404.html`, { waitUntil: 'networkidle' });
  verifier(/n’existe pas/.test((await page.textContent('h1')) ?? '') && (await page.getAttribute('meta[name="robots"]', 'content')) === 'noindex', 'page 404 (non indexée)');

  // Accueil
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // À la une : l'ambiance la plus récente (tous les articles sont publiés dans la version de démonstration).
  const ambiances = readdirSync(resolve(RACINE, 'contenu/articles'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => { const t = readFileSync(resolve(RACINE, 'contenu/articles', f), 'utf8'); return { fichier: f.replace(/\.md$/, '.html'), type: t.match(/^type: (\S+)/m)?.[1], date: t.match(/^publie_le: (\S+)/m)?.[1] ?? '', titre: t.match(/^titre: "?(.*?)"?$/m)?.[1] ?? '' }; })
    .filter((x) => x.type === 'ambiance')
    .sort((x, y) => y.date.localeCompare(x.date) || x.titre.localeCompare(y.titre, 'fr'));
  verifier((await page.locator('.une').count()) === 1 && (await page.getAttribute('.une', 'href')) === ambiances[0].fichier, `accueil : ambiance à la une (${ambiances[0].fichier})`);
  verifier((await page.locator('.visite__piece').count()) === 7 && (await page.locator('.tuiles--matiere .tuile').count()) === 8, 'accueil : visite des 7 pièces et 8 coupons de matières');
  verifier((await page.textContent('.site-pied'))?.includes('En tant que Partenaire Amazon, Keur Déco réalise un bénéfice'), 'pied de page : mention Partenaires Amazon');
  verifier((await page.getAttribute('meta[name="p:domain_verify"]', 'content')) === 'code-de-test', 'balise de revendication Pinterest (PINTEREST_VERIFY)');

  // Ambiance : points cliquables
  await page.goto(`${BASE}salon-terracotta-wax.html`, { waitUntil: 'networkidle' });
  const points = page.locator('.hotspot');
  verifier((await points.count()) === 10 && (await points.first().isVisible()), 'ambiance : 10 points cliquables visibles');
  verifier((await points.first().getAttribute('aria-label'))?.startsWith('Objet 1 : '), 'point accessible (aria-label numéroté)');
  await points.first().click();
  const carte = page.locator('#carte-salon-terracotta-wax-1');
  verifier((await carte.isVisible()) && (await points.first().getAttribute('aria-expanded')) === 'true', 'un clic ouvre la carte du produit');
  const lien = carte.locator('a.bouton--amazon');
  verifier(
    /^https:\/\/www\.amazon\.fr\/dp\/DEMO\d{6}\?tag=keurdeco-21$/.test((await lien.getAttribute('href')) ?? '') &&
      (await lien.getAttribute('rel')) === 'sponsored nofollow noopener' &&
      (await lien.getAttribute('target')) === '_blank' &&
      (await lien.textContent())?.includes('Voir sur Amazon'),
    'carte : lien « Voir sur Amazon » avec identifiant de suivi, rel sponsored nofollow noopener, nouvel onglet',
  );
  await points.nth(1).click();
  verifier(!(await carte.isVisible()) && (await page.locator('#carte-salon-terracotta-wax-2').isVisible()), 'une seule carte ouverte à la fois');
  await page.keyboard.press('Escape');
  verifier(!(await page.locator('#carte-salon-terracotta-wax-2').isVisible()), 'Échap referme la carte');
  verifier((await page.locator('.meme-esprit .produit').count()) === 10, 'liste « Dans le même esprit » : 10 produits');
  verifier((await page.textContent('.meme-esprit'))?.includes('En tant que Partenaire Amazon'), 'mention Partenaires près des liens');
  verifier(/^https:\/\/www\.pinterest\.com\/pin\/create\/button\/\?url=/.test((await page.getAttribute('.epingler', 'href')) ?? ''), 'bouton « Épingler » sans script externe');
  verifier((await page.getAttribute('meta[property="og:type"]', 'content')) === 'article' && (await page.locator('script[type="application/ld+json"]').allTextContents()).some((t) => t.includes('"@type":"Article"')), 'Open Graph article et données structurées Article (Rich Pins)');
  verifier((await page.locator('.produit__visuel .icone--objet').count()) === 10, 'cartes produits : icône par type d’objet, sans photo Amazon');

  // Repli sans JavaScript
  const contexteSansJs = await navigateur.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const sansJs = await contexteSansJs.newPage();
  await sansJs.goto(`${BASE}salon-terracotta-wax.html`);
  verifier((await sansJs.locator('.hotspot').first().isHidden()) && (await sansJs.locator('.meme-esprit .produit').count()) === 10, 'sans JavaScript : points masqués, liste complète affichée');
  await contexteSansJs.close();

  // Top et guide
  await page.goto(`${BASE}top-paniers-tresses-africains.html`, { waitUntil: 'networkidle' });
  verifier((await page.locator('.classement__entree').count()) === 10, 'top : 10 produits classés');
  verifier((await page.locator('script[type="application/ld+json"]').allTextContents()).some((t) => t.includes('"@type":"ItemList"') && t.includes('"numberOfItems":10')), 'top : données structurées ItemList');
  await page.goto(`${BASE}bogolan-histoire-idees.html`, { waitUntil: 'networkidle' });
  verifier((await page.locator('.encadre-produit').count()) === 5 && (await page.locator('.sommaire').count()) === 1, 'guide : 5 encadrés produits et un sommaire');

  // Conseils : onglet, réponse courte, données FAQ
  await page.goto(`${BASE}conseil-laver-coussin-wax.html`, { waitUntil: 'networkidle' });
  verifier((await page.locator('.reponse-courte').count()) === 1 && (await page.locator('.site-nav a[href="conseils.html"][aria-current="page"]').count()) === 1, 'conseil : réponse courte et onglet Conseils actif');
  verifier((await page.locator('script[type="application/ld+json"]').allTextContents()).some((t) => t.includes('"@type":"FAQPage"')), 'conseil : données structurées FAQ');

  // Animations : pas de boucle permanente, liens de contenu immédiats, mémoire bloquée sans plantage
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  const images = await page.evaluate(
    () =>
      new Promise((ok) => {
        let n = 0;
        const origine = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (f) => (n++, origine(f));
        setTimeout(() => ok(n), 1500);
      }),
  );
  verifier(images < 5, `accueil immobile : pas de boucle d'animation permanente (${images} images demandées en 1,5 s)`);
  verifier((await page.evaluate(() => [...document.querySelectorAll('[id]')].map((e) => e.id).filter((id, i, t) => t.indexOf(id) !== i).length)) === 0, 'accueil : aucun identifiant en double');
  await page.goto(`${BASE}conseils.html`, { waitUntil: 'networkidle' });
  const debutClic = Date.now();
  await Promise.all([page.waitForURL(/conseil-/), page.locator('.carte-conseil').first().click()]);
  verifier(Date.now() - debutClic < 1500, `lien de contenu : ouverture sans rideau (${Date.now() - debutClic} ms)`);
  const contexteBloque = await navigateur.newContext({ viewport: { width: 390, height: 844 } });
  await contexteBloque.addInitScript(() => {
    for (const nom of ['sessionStorage', 'localStorage']) Object.defineProperty(window, nom, { get: () => { throw new Error('bloqué'); } });
  });
  const pageBloquee = await contexteBloque.newPage();
  const erreursBloquees = [];
  pageBloquee.on('pageerror', (e) => erreursBloquees.push(e.message));
  await pageBloquee.goto(BASE, { waitUntil: 'networkidle' });
  verifier(erreursBloquees.length === 0 && (await pageBloquee.locator('.porte--active').count()) === 1, `cookies et mémoire bloqués : aucune erreur, animations actives${erreursBloquees.length ? ' : ' + erreursBloquees.join(' | ') : ''}`);
  await contexteBloque.close();
  const sw = await (await fetch(`${BASE}sw.js`)).text();
  verifier(/keurdeco-[a-z0-9]+'/.test(sw) && !sw.includes('__VERSION__'), 'service worker : version renouvelée à chaque publication');

  // Menu mobile
  await page.click('.menu-mobile summary');
  verifier(await page.locator('.menu-mobile nav').isVisible(), 'menu mobile');

  // Fichiers générés
  const sitemap = await (await fetch(`${BASE}sitemap.xml`)).text();
  verifier(sitemap.includes('https://teiki5320.github.io/Keurdeco/salon-terracotta-wax.html') && !sitemap.includes('404'), 'sitemap.xml');
  verifier((await (await fetch(`${BASE}robots.txt`)).text()).includes('Sitemap: https://teiki5320.github.io/Keurdeco/sitemap.xml'), 'robots.txt');
  verifier((await fetch(`${BASE}manifest.webmanifest`)).ok && (await fetch(`${BASE}sw.js`)).ok, 'manifeste et service worker');
  const manifeste = await (await fetch(`${BASE}epingles.json`)).json();
  const epArticles = manifeste.epingles.filter((e) => e.gabarit !== 'question');
  const epConseils = manifeste.epingles.filter((e) => e.gabarit === 'question');
  // Une épingle par titre de la liste « epingles » de chaque article (tous publiés dans la version de démonstration).
  const dossierArticles = resolve(RACINE, 'contenu/articles');
  const attendues = readdirSync(dossierArticles)
    .filter((f) => f.endsWith('.md'))
    .reduce((n, f) => n + (readFileSync(join(dossierArticles, f), 'utf8').match(/^epingles:\r?\n((?: {2}- .*\r?\n)+)/m)?.[1].trim().split('\n').length ?? 0), 0);
  verifier(epArticles.length === attendues && epConseils.length >= 12 && manifeste.epingles.every((e) => e.lien.includes('utm_source=pinterest')), `manifeste des épingles : ${epArticles.length}/${attendues} d'articles, ${epConseils.length} de conseils, liens avec utm_source=pinterest`);
  const epingle = await page.goto(`${BASE}epingles/salon-terracotta-wax-1.jpg`);
  verifier(epingle?.ok() && epingle.headers()['content-type'] === 'image/jpeg', 'épingle 1000 × 1500 servie');

  const scripts = await page.goto(BASE).then(() => page.$$eval('script[src]', (els) => els.map((e) => e.src)));
  verifier(scripts.every((s) => s.startsWith(BASE)), 'aucun script externe chargé');
  verifier(erreurs.length === 0, `aucune erreur JavaScript${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);
  await navigateur.close();
} catch (e) {
  console.error(e);
  echecs++;
} finally {
  serveur.kill();
  rmSync(temp, { recursive: true, force: true });
  // Remet les épingles de public/ dans leur état réel (articles publiés à ce jour).
  execFileSync('node', ['scripts/epingles.ts'], { cwd: RACINE, stdio: 'ignore' });
}
console.log(echecs ? `\n${echecs} vérification(s) en échec.` : '\nTout est bon.');
process.exit(echecs ? 1 : 0);
