// Vérification mensuelle des produits Amazon (à lancer sur un ordinateur, pas sur GitHub :
// Amazon bloque souvent les serveurs). Pour chaque produit actif, la fiche amazon.fr/dp/<ASIN>
// est ouverte dans Chrome : si le bouton d'achat est présent, verifie_le passe à la date du jour ;
// sinon le produit passe en « indisponible » (il n'est plus affiché, son ASIN est conservé).
// Rien n'est inventé : seul l'état lu sur la fiche est enregistré.
//
// Usage : npm run verifier-produits              (rapport seul)
//         npm run verifier-produits -- --ecrire  (met à jour src/data/produits.json)
// Chrome : CHROMIUM_PATH=/chemin/vers/chrome (par défaut, Google Chrome sur macOS).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const RACINE = resolve(import.meta.dirname, '..');
const FICHIER = resolve(RACINE, 'src/data/produits.json');
const ecrire = process.argv.includes('--ecrire');
const aujourdhui = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());
const chrome = process.env.CHROMIUM_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const produits = JSON.parse(readFileSync(FICHIER, 'utf8'));
const actifs = produits.filter((p) => p.statut === 'actif' && p.asin);

const navigateur = await chromium.launch({ executablePath: chrome, headless: true });
const page = await (await navigateur.newContext({ locale: 'fr-FR' })).newPage();
const disponibles = [];
const indisponibles = [];
let bloque = false;

for (const p of actifs) {
  let etat;
  try {
    const reponse = await page.goto(`https://www.amazon.fr/dp/${p.asin}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    etat = await page.evaluate(() => ({
      captcha: !!document.querySelector('form[action*="validateCaptcha"]'),
      achat: !!document.querySelector('#add-to-cart-button, #buy-now-button'),
      titre: (document.querySelector('#productTitle')?.textContent || '').trim(),
    }));
    etat.statut = reponse?.status() ?? 0;
  } catch (e) {
    console.log(`? ${p.id} (${p.asin}) : erreur de chargement, non modifié (${e.message.split('\n')[0]})`);
    continue;
  }
  if (etat.captcha) {
    bloque = true;
    console.log(`Amazon demande une vérification (captcha) : arrêt, aucun produit modifié après ${p.id}.`);
    break;
  }
  if (etat.achat) disponibles.push(p);
  else {
    indisponibles.push(p);
    console.log(`✗ ${p.id} (${p.asin}) : plus achetable (HTTP ${etat.statut})${etat.titre ? ` · ${etat.titre.slice(0, 60)}` : ''}`);
  }
  await page.waitForTimeout(1200 + Math.random() * 1500); // rythme humain, pour ne pas surcharger Amazon
}
await navigateur.close();

console.log(`\n${disponibles.length} produit(s) disponible(s), ${indisponibles.length} indisponible(s), ${actifs.length - disponibles.length - indisponibles.length} non vérifié(s).`);
if (ecrire) {
  for (const p of disponibles) p.verifie_le = aujourdhui;
  for (const p of indisponibles) p.statut = 'indisponible';
  writeFileSync(FICHIER, JSON.stringify(produits, null, 2) + '\n');
  console.log(`src/data/produits.json mis à jour (${aujourdhui}).`);
}
if (indisponibles.length) console.log('À remplacer : ' + indisponibles.map((p) => p.id).join(', '));
process.exit(bloque ? 2 : 0);
