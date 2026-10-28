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
// Veille actus : fichier JSON simulé (22 actus, dont une carte générée et deux sur le wax), images servies en local.
const URL_VEILLE = 'https://teiki5320.github.io/veille/actus/keurdeco.json';
const imageDemo = readFileSync(resolve(RACINE, 'public/images/marque/embleme-clair-192.webp'));
const actusDemo = {
  version: 3,
  site: 'keurdeco',
  genere_le: '2026-10-27T08:00:00.000Z',
  actus: Array.from({ length: 22 }, (_, i) => ({
    id: String(i).padStart(40, '0'),
    titre: `Actu de démonstration numéro ${i + 1}`,
    resume: 'Un résumé de démonstration, réécrit en français, en deux phrases. Il ne vient d’aucune source réelle.',
    theme: 'deco',
    pays: ['SN'],
    tags: i < 2 ? ['matiere:wax'] : [],
    source_nom: `Source ${i + 1}`,
    source_url: `https://exemple.org/article-${i + 1}`,
    publie_le: new Date(Date.UTC(2026, 9, 27, 7) - i * 3600000).toISOString(),
    image:
      i === 1
        ? { url: 'https://teiki5320.github.io/veille/cartes/keurdeco/demo.svg', source: 'carte', credit: 'Illustration : Keur Déco', licence: null, page: null, alt: 'Illustration Keur Déco', largeur: 1600, hauteur: 900 }
        : { url: `https://teiki5320.github.io/veille/images/keurdeco/demo-${i}.webp`, source: 'wikimedia', credit: `Auteur ${i + 1}`, licence: 'CC BY 4.0', page: `https://commons.wikimedia.org/wiki/File:Demo_${i + 1}.jpg`, alt: `Photo de démonstration ${i + 1}`, largeur: 1600, hauteur: 900 },
  })),
};
// Articles complets de la veille : l'actu 1 a une page construite, l'actu 3 seulement un article (page de secours).
const ID_CONSTRUIT = actusDemo.actus[0].id;
const ID_SECOURS = actusDemo.actus[2].id;
Object.assign(actusDemo.actus[0], { slug: 'actu-demo-construite', article_url: `https://teiki5320.github.io/veille/articles/keurdeco/${ID_CONSTRUIT}.json`, lecture_min: 2 });
Object.assign(actusDemo.actus[2], { slug: 'actu-demo-secours', article_url: `https://teiki5320.github.io/veille/articles/keurdeco/${ID_SECOURS}.json`, lecture_min: 2 });
const articleDemo = (a, titre) => ({
  version: 1,
  site: 'keurdeco',
  id: a.id,
  slug: a.slug,
  titre,
  chapo: 'Un chapô de démonstration, rédigé pour le test, qui résume l’article en une phrase.',
  blocs: [
    { intertitre: null, paragraphes: ['Premier paragraphe de démonstration, écrit pour le test de bout en bout. '.repeat(6)] },
    { intertitre: 'Un intertitre de démonstration', paragraphes: ['Deuxième paragraphe de démonstration, écrit pour le test de bout en bout. '.repeat(6)] },
    { intertitre: 'Un second intertitre', paragraphes: ['Troisième paragraphe de démonstration, écrit pour le test de bout en bout. '.repeat(6)] },
  ],
  mots: 330,
  lecture_min: 2,
  tags: ['matiere:wax', 'personne:inconnue'],
  source_nom: a.source_nom,
  source_url: a.source_url,
  autres_sources: ['https://exemple.net/autre-source'],
  publie_le: a.publie_le,
  redige_le: a.publie_le,
  image: a.image,
});
const articlesDemo = { [ID_CONSTRUIT]: articleDemo(actusDemo.actus[0], 'Article de démonstration construit'), [ID_SECOURS]: articleDemo(actusDemo.actus[2], 'Article de démonstration de secours') };
const fichierVeille = join(temp, 'veille-articles.json');
writeFileSync(fichierVeille, JSON.stringify({ actus: actusDemo.actus, articles: [articlesDemo[ID_CONSTRUIT]] }));
const envDemo = { ...process.env, DATE_PUBLICATION: '2099-12-31', KEURDECO_PRODUITS: fichierProduits, DOSSIER_SORTIE: SORTIE, VEILLE_ARTICLES_FICHIER: fichierVeille, PINTEREST_VERIFY: 'code-de-test', CLOUDFLARE_WEB_ANALYTICS: '', PLAUSIBLE_DOMAIN: '' };

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

  const simulerVeille = async (cible, { panne = false } = {}) => {
    await cible.route('https://teiki5320.github.io/veille/**', (route) => {
      const u = route.request().url();
      if (u === URL_VEILLE) return panne ? route.fulfill({ status: 500, body: 'panne' }) : route.fulfill({ contentType: 'application/json', body: JSON.stringify(actusDemo) });
      const article = u.match(/\/articles\/keurdeco\/([0-9a-f]{40})\.json$/);
      if (article) return articlesDemo[article[1]] ? route.fulfill({ contentType: 'application/json', body: JSON.stringify(articlesDemo[article[1]]) }) : route.fulfill({ status: 404, body: 'introuvable' });
      if (u.endsWith('.svg')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#a3472a"/></svg>' });
      return route.fulfill({ contentType: 'image/webp', body: imageDemo });
    });
  };
  await simulerVeille(page);

  const pages = ['index.html', 'actus.html', 'tops.html', 'guides.html', 'pieces.html', 'matiere-bogolan.html', 'occasion-mariage.html', 'glossaire.html', 'glossaire-bogolan.html', 'conseils.html', 'conseil-laver-coussin-wax.html', 'conseil-rideau-perles.html', 'a-propos.html', 'mentions-legales.html', 'confidentialite.html', 'salon-terracotta-wax.html', 'top-paniers-tresses-africains.html', 'bogolan-histoire-idees.html'];
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
  verifier((await page.locator('[data-visite="pieces"] .visite__piece').count()) === 7 && (await page.locator('[data-visite="tops"] .visite__piece').count()) >= 1 && (await page.locator('.nuancier__pastille:not([hidden])').count()) === 4 && (await page.locator('.nuancier__vignette').count()) === 8, 'accueil : carrousel des 7 pièces et nuancier (8 objets, 4 tissus pour le canapé)');
  const pageHub = await navigateur.newPage();
  await pageHub.goto(`${BASE}pieces.html`);
  verifier((await pageHub.locator('.visite__piece').count()) === 7, 'page Pièces : carrousel des 7 pièces');
  await pageHub.goto(`${BASE}matieres.html`);
  verifier((await pageHub.locator('.nuancier__pastille:not([hidden])').count()) === 4 && (await pageHub.locator('.tuiles--matiere .tuile').count()) === 8, 'page Matières : nuancier et 8 matières');
  await pageHub.close();
  verifier((await page.textContent('.site-pied'))?.includes('En tant que Partenaire Amazon, Keur Déco réalise un bénéfice'), 'pied de page : mention Partenaires Amazon');
  verifier((await page.getAttribute('meta[name="p:domain_verify"]', 'content')) === 'code-de-test', 'balise de revendication Pinterest (PINTEREST_VERIFY)');

  // Ambiance : points cliquables (nombres attendus lus dans l'article : tous les produits sont actifs dans la démonstration)
  const salon = readFileSync(resolve(RACINE, 'contenu/articles/salon-terracotta-wax.md'), 'utf8');
  const idsPoints = [...salon.matchAll(/^ {2}- \{ produit: ([a-z0-9-]+)/gm)].map((m) => m[1]);
  const idsListe = salon.match(/^produits:\r?\n((?: {2}- .*\r?\n)+)/m)?.[1].split('\n').map((l) => l.replace(/^ {2}- /, '').trim()).filter(Boolean) ?? [];
  const nbPoints = idsPoints.length;
  const nbListe = new Set([...idsPoints, ...idsListe]).size;
  await page.goto(`${BASE}salon-terracotta-wax.html`, { waitUntil: 'networkidle' });
  const points = page.locator('.hotspot');
  verifier((await points.count()) === nbPoints && (await points.first().isVisible()), `ambiance : ${nbPoints} points cliquables visibles`);
  verifier((await points.first().getAttribute('aria-label'))?.startsWith('Objet 1 : '), 'point accessible (aria-label numéroté)');
  await points.first().click();
  const carte = page.locator('#carte-salon-terracotta-wax-1');
  verifier((await carte.isVisible()) && (await points.first().getAttribute('aria-expanded')) === 'true', 'un clic ouvre la carte du produit');
  const lien = carte.locator('a.bouton--amazon');
  verifier(
    /^https:\/\/www\.amazon\.fr\/dp\/DEMO\d{6}\?tag=keurdecofr-21$/.test((await lien.getAttribute('href')) ?? '') &&
      (await lien.getAttribute('rel')) === 'sponsored nofollow noopener' &&
      (await lien.getAttribute('target')) === '_blank' &&
      (await lien.textContent())?.includes('Voir sur Amazon'),
    'carte : lien « Voir sur Amazon » avec identifiant de suivi, rel sponsored nofollow noopener, nouvel onglet',
  );
  await points.nth(1).click();
  verifier(!(await carte.isVisible()) && (await page.locator('#carte-salon-terracotta-wax-2').isVisible()), 'une seule carte ouverte à la fois');
  await page.keyboard.press('Escape');
  verifier(!(await page.locator('#carte-salon-terracotta-wax-2').isVisible()), 'Échap referme la carte');
  verifier((await page.locator('.meme-esprit .produit').count()) === nbListe, `liste « Dans le même esprit » : ${nbListe} produits`);
  verifier((await page.textContent('.meme-esprit'))?.includes('En tant que Partenaire Amazon'), 'mention Partenaires près des liens');
  verifier(/^https:\/\/www\.pinterest\.com\/pin\/create\/button\/\?url=/.test((await page.getAttribute('.epingler', 'href')) ?? ''), 'bouton « Épingler » sans script externe');
  verifier((await page.getAttribute('meta[property="og:type"]', 'content')) === 'article' && (await page.locator('script[type="application/ld+json"]').allTextContents()).some((t) => t.includes('"@type":"Article"')), 'Open Graph article et données structurées Article (Rich Pins)');
  const sourcesImages = await page.locator('img').evaluateAll((imgs) => imgs.map((i) => i.currentSrc || i.src));
  verifier(
    (await page.locator('.produit__visuel .produit__vignette, .produit__visuel .icone--objet').count()) === nbListe &&
      (await page.locator('.produit__visuel--photo .produit__ia').count()) === (await page.locator('.produit__vignette').count()) &&
      !sourcesImages.some((u) => /amazon|media-amazon|ssl-images/i.test(u)),
    'cartes produits : vignette tirée de nos images (mention IA) ou icône, aucune photo Amazon',
  );

  // Repli sans JavaScript
  const contexteSansJs = await navigateur.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const sansJs = await contexteSansJs.newPage();
  await sansJs.goto(`${BASE}salon-terracotta-wax.html`);
  verifier((await sansJs.locator('.hotspot').first().isHidden()) && (await sansJs.locator('.meme-esprit .produit').count()) === nbListe, 'sans JavaScript : points masqués, liste complète affichée');
  await contexteSansJs.close();

  // Top et guide
  await page.goto(`${BASE}top-paniers-tresses-africains.html`, { waitUntil: 'networkidle' });
  const nbClasses = [...readFileSync(resolve(RACINE, 'contenu/articles/top-paniers-tresses-africains.md'), 'utf8').matchAll(/^ {2}- produit: /gm)].length;
  verifier((await page.locator('.classement__entree').count()) === nbClasses, `top : ${nbClasses} produits classés`);
  verifier((await page.locator('script[type="application/ld+json"]').allTextContents()).some((t) => t.includes('"@type":"ItemList"') && t.includes(`"numberOfItems":${nbClasses}`)), 'top : données structurées ItemList');
  await page.goto(`${BASE}bogolan-histoire-idees.html`, { waitUntil: 'networkidle' });
  const nbEncadres = [...readFileSync(resolve(RACINE, 'contenu/articles/bogolan-histoire-idees.md'), 'utf8').matchAll(/\{\{produit: /g)].length;
  verifier((await page.locator('.encadre-produit').count()) === nbEncadres && (await page.locator('.sommaire').count()) === 1, `guide : ${nbEncadres} encadrés produits et un sommaire`);

  // Conseils : onglet, réponse courte, données FAQ
  await page.goto(`${BASE}conseil-laver-coussin-wax.html`, { waitUntil: 'networkidle' });
  verifier((await page.locator('.reponse-courte').count()) === 1 && (await page.locator('.site-nav a[href="conseils.html"][aria-current="page"]').count()) === 1, 'conseil : réponse courte et onglet Conseils actif');
  verifier((await page.locator('script[type="application/ld+json"]').allTextContents()).some((t) => t.includes('"@type":"FAQPage"')), 'conseil : données structurées FAQ');

  // Veille actus : accueil (4), actus.html (20), page matière avec et sans actus, panne du fichier, sans JavaScript
  await page.goto(BASE, { waitUntil: 'networkidle' });
  verifier((await page.locator('.actus--accueil:not([hidden]) .actu').count()) === 4 && (await page.locator('.actus--accueil .actu--bandeau').count()) === 1 && (await page.getAttribute('.actus--accueil .actu--bandeau img', 'loading')) === null, 'accueil : 4 actus (1 bandeau chargé tout de suite, 3 vignettes)');
  await page.goto(`${BASE}actus.html`, { waitUntil: 'networkidle' });
  const liensCartes = page.locator('.actu .actu__lien');
  verifier(
    (await page.locator('.actu').count()) === 20 && (await page.locator('[data-actus-maj]').isVisible()) && (await page.locator('h1').count()) === 1,
    'actus.html : 20 actus et date de mise à jour',
  );
  verifier(
    (await liensCartes.nth(0).getAttribute('href')) === 'actus/actu-demo-construite/' &&
      (await liensCartes.nth(0).getAttribute('target')) === null &&
      (await liensCartes.nth(2).getAttribute('href')) === `actus/article/?id=${ID_SECOURS}` &&
      (await liensCartes.nth(1).getAttribute('href')) === 'https://exemple.org/article-2' &&
      (await liensCartes.nth(1).getAttribute('target')) === '_blank' &&
      (await liensCartes.nth(1).getAttribute('rel')) === 'noopener nofollow' &&
      (await page.locator('.actu__source a').count()) === 0 &&
      (await page.locator('.actu__source').first().textContent()) === 'Source : Source 1',
    'actus.html : chaque carte mène à sa page d’article, à la page de secours ou (sans article) à la source ; nom de la source en texte',
  );
  const credits = await page.locator('.actu__credit').allTextContents();
  verifier(credits[0] === 'Photo : Auteur 1 · CC BY 4.0' && credits[1] === 'Illustration : Keur Déco' && (await page.locator('.actu img[alt=""]').count()) === 0, 'actus.html : crédits (photo et carte générée) et textes alternatifs');
  verifier(!/amazon|epingler/i.test(await page.locator('.actus').innerHTML()), 'actus.html : aucun lien Amazon ni bouton Épingler dans les actus');
  verifier((await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)), 'actus.html : pas de défilement horizontal');
  // Toucher l'image d'une carte (et pas son titre) ouvre l'article sur le site.
  const boite = await page.locator('.actu--bandeau .actu__image').boundingBox();
  await page.mouse.click(boite.x + boite.width / 2, boite.y + boite.height / 2);
  await page.waitForURL('**/actus/actu-demo-construite/');
  await page.waitForLoadState('networkidle');
  const ldArticle = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)).flatMap((d) => d['@graph'] ?? [d]);
  const news = ldArticle.find((d) => d['@type'] === 'NewsArticle');
  verifier(
    (await page.textContent('h1')) === 'Article de démonstration construit' &&
      (await page.locator('.article-actu__chapo').count()) === 1 &&
      (await page.textContent('.article-actu__meta'))?.includes('2 min de lecture') &&
      (await page.textContent('.article-actu__figure .actu__credit'))?.replace(/\s/g, ' ') === 'Photo : Auteur 1 · CC BY 4.0' &&
      (await page.getAttribute('.article-actu__image img', 'loading')) === null &&
      (await page.locator('.article-actu__corps h2').count()) === 2 &&
      (await page.textContent('.article-actu__sources'))?.includes('Article rédigé par Keur Déco à partir de') &&
      (await page.getAttribute('.article-actu__sources a', 'rel')) === 'noopener nofollow' &&
      (await page.locator('.article-actu__fiches a[href="matiere-wax.html"]').count()) === 1 &&
      (await page.locator('.autres-actus .actu').count()) === 3,
    'page /actus/<slug>/ : titre, chapô, durée, image et crédit, intertitres, sources, fiche liée, 3 autres actus',
  );
  verifier(
    (await page.getAttribute('link[rel="canonical"]', 'href')) === 'https://www.keurdeco.com/actus/actu-demo-construite/' &&
      (await page.getAttribute('meta[property="og:image"]', 'content'))?.startsWith('https://teiki5320.github.io/veille/') &&
      news?.headline === 'Article de démonstration construit' &&
      news?.isBasedOn === 'https://exemple.org/article-1' &&
      (await page.locator('meta[content="noindex"]').count()) === 0,
    'page /actus/<slug>/ : canonical, Open Graph, JSON-LD NewsArticle',
  );
  verifier(!/amazon\.fr|epingler/i.test(await page.locator('main').innerHTML()) && (await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)), 'page /actus/<slug>/ : aucun lien Amazon, pas de défilement horizontal');
  await page.goto(`${BASE}actus/article/?id=${ID_SECOURS}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.article-actu__corps');
  verifier(
    (await page.textContent('h1')) === 'Article de démonstration de secours' &&
      (await page.getAttribute('meta[name="robots"]', 'content')) === 'noindex' &&
      (await page.locator('.article-actu__sources').count()) === 1 &&
      (await page.locator('.article-actu__corps h2').count()) === 2 &&
      (await page.title()).startsWith('Article de démonstration de secours'),
    'page de secours : article sans page construite affiché, noindex',
  );
  await page.goto(`${BASE}actus/article/?id=${'f'.repeat(40)}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.article-actu--introuvable');
  verifier((await page.textContent('h1')) === 'Article introuvable' && (await page.locator('main a[href="actus.html"]').count()) >= 1, 'page de secours : id inconnu, message simple et lien vers les actus');
  await page.goto(`${BASE}actus/article/?id=${ID_CONSTRUIT}`);
  await page.waitForURL('**/actus/actu-demo-construite/');
  verifier(true, 'page de secours : un article déjà construit renvoie vers sa page');
  await page.goto(`${BASE}matiere-wax.html`, { waitUntil: 'networkidle' });
  verifier((await page.locator('.actus--matiere:not([hidden]) .actu').count()) === 2 && (await page.textContent('.actus--matiere h2'))?.includes('L’actu du wax'), 'page matière (wax) : ses 2 actus');
  verifier((await page.getAttribute('.actus--matiere .actu__lien', 'href')) === 'actus/actu-demo-construite/', 'page matière : la carte ouvre l’article sur le site');
  await page.goto(`${BASE}matiere-perles.html`, { waitUntil: 'networkidle' });
  verifier((await page.locator('.actus--matiere').isHidden()) && (await page.locator('.actu').count()) === 0, 'page matière sans actu (perles) : bloc absent');
  const contexteActus = await navigateur.newContext({ viewport: { width: 390, height: 844 } });
  const pagePanne = await contexteActus.newPage();
  const erreursPanne = [];
  pagePanne.on('pageerror', (e) => erreursPanne.push(e.message));
  await simulerVeille(pagePanne, { panne: true });
  await pagePanne.goto(`${BASE}actus.html`, { waitUntil: 'networkidle' });
  verifier((await pagePanne.locator('.actus').isHidden()) && (await pagePanne.locator('[data-actus-maj]').isHidden()) && erreursPanne.length === 0, 'fichier des actus en panne : bloc caché, page intacte, aucune erreur');
  await contexteActus.close();
  const contexteActusSansJs = await navigateur.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const actusSansJs = await contexteActusSansJs.newPage();
  await actusSansJs.goto(BASE);
  verifier((await actusSansJs.locator('.actus').isHidden()) && (await actusSansJs.locator('h1').count()) === 1, 'sans JavaScript : aucun bloc d’actus vide');
  await contexteActusSansJs.close();
  // L'interception des requêtes désactive le cache du navigateur : on la retire pour les mesures de vitesse qui suivent.
  await page.unrouteAll();
  const entites = await (await fetch(`${BASE}veille/entites.json`)).json();
  verifier(Array.isArray(entites) && entites.length === 8 && entites.every((e) => /^matiere:[a-z-]+$/.test(e.tag) && e.nom && Array.isArray(e.autres_noms)), 'veille/entites.json : les 8 matières');

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
  verifier(sitemap.includes('https://www.keurdeco.com/salon-terracotta-wax.html') && !sitemap.includes('404'), 'sitemap.xml');
  verifier(sitemap.includes('<loc>https://www.keurdeco.com/actus/actu-demo-construite/</loc>') && !sitemap.includes('actus/article') && !sitemap.includes('actus/</loc>'), 'sitemap.xml : pages d’articles de la veille (sans la page de secours)');
  verifier((await (await fetch(`${BASE}robots.txt`)).text()).includes('Sitemap: https://www.keurdeco.com/sitemap.xml'), 'robots.txt');
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
  // Seuls scripts externes admis : Google AdSense (build/site.ts, codeAdsense) et ceux qu'il charge lui-même.
  const ADSENSE = 'https://pagead2.googlesyndication.com/';
  verifier(scripts.every((s) => s.startsWith(BASE) || s.startsWith(ADSENSE)), 'aucun script externe chargé, hors AdSense');
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
