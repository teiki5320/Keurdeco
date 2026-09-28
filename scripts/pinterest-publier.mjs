// Publication automatique des épingles sur Pinterest (API v5).
// Usage : npm run pinterest:publier [-- --a-blanc] [-- --local]
//
// 1. Lit le manifeste publié (https://teiki5320.github.io/Keurdeco/epingles.json, ou public/epingles.json avec --local)
//    et le fichier d'état data/pinterest-etat.json (épingles déjà publiées, avec leur id Pinterest).
// 2. Choisit au plus N épingles (config/pinterest.json, 5 par défaut), jamais deux du même article le même jour.
// 3. Publie chacune par POST /v5/pins (media_source image_url, lien vers l'article) dans le tableau
//    de sa rubrique (config/tableaux-pinterest.json), puis met à jour le fichier d'état.
//
// Secrets : PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN (jeton d'accès renouvelé
// automatiquement), ou directement PINTEREST_ACCESS_TOKEN. PINTEREST_SANDBOX=1 : API de test
// (api-sandbox.pinterest.com), état séparé dans data/pinterest-etat-sandbox.json.
// Sans secrets (ou avec --a-blanc) : mode « à blanc », qui affiche ce qui serait publié sans rien envoyer.
import { appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { api, aujourdhuiParis, chargerEnv, choisirEpingles, corpsEpingle, hoteApi, lireJson, RACINE, renouvelerJeton, tableauPour } from './pinterest-lib.mjs';

chargerEnv();
const env = process.env;
const args = process.argv.slice(2);
const SITE_URL = (env.SITE_URL ?? 'https://teiki5320.github.io/Keurdeco/').replace(/\/?$/, '/');
const SANDBOX = env.PINTEREST_SANDBOX === '1';
const FICHIER_ETAT = resolve(RACINE, SANDBOX ? 'data/pinterest-etat-sandbox.json' : 'data/pinterest-etat.json');
const config = lireJson(resolve(RACINE, 'config/pinterest.json'), {});
const tableaux = lireJson(resolve(RACINE, 'config/tableaux-pinterest.json'), { tableaux: {} });
const MAX = Number(env.PINTEREST_MAX ?? config.max_par_execution ?? 5);

async function lireManifeste() {
  const local = resolve(RACINE, 'public', config.manifeste ?? 'epingles.json');
  if (!args.includes('--local')) {
    const url = env.MANIFESTE_URL ?? `${SITE_URL}${config.manifeste ?? 'epingles.json'}`;
    try {
      const rep = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
      if (rep.ok) {
        console.log(`Manifeste : ${url}`);
        return rep.json();
      }
      console.warn(`Manifeste en ligne indisponible (${rep.status}) : ${url}`);
    } catch (e) {
      console.warn(`Manifeste en ligne injoignable : ${e.message}`);
    }
  }
  console.log(`Manifeste local : ${local}`);
  return lireJson(local, { epingles: [] });
}

async function jetonAcces() {
  if (env.PINTEREST_ACCESS_TOKEN) return env.PINTEREST_ACCESS_TOKEN;
  const { PINTEREST_APP_ID: appId, PINTEREST_APP_SECRET: secret, PINTEREST_REFRESH_TOKEN: refreshToken } = env;
  if (!appId || !secret || !refreshToken) return null;
  const r = await renouvelerJeton({ appId, secret, refreshToken });
  if (r.refresh_token && r.refresh_token !== refreshToken) {
    // Signal pour le workflow, qui ouvre une alerte (issue) sur GitHub. Le jeton lui-même n'est jamais écrit.
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, 'nouveau_refresh_token=1\n');
    console.warn('ℹ Pinterest a fourni un nouveau refresh token : mettez à jour le secret PINTEREST_REFRESH_TOKEN (voir docs/pinterest.md).');
  }
  if (r.refresh_token_expires_in) {
    const jours = Math.round(r.refresh_token_expires_in / 86400);
    if (jours < 30) console.warn(`⚠ Le refresh token expire dans ${jours} jours : relancez npm run pinterest:auth.`);
  }
  return r.access_token;
}

async function principal() {
  const aujourdhui = aujourdhuiParis();
  const manifeste = await lireManifeste();
  const etat = lireJson(FICHIER_ETAT, { publiees: [] });
  const choix = choisirEpingles(manifeste, etat, { max: MAX, aujourdhui });
  const jeton = args.includes('--a-blanc') ? null : await jetonAcces();
  const aBlanc = !jeton;

  console.log(`${aBlanc ? 'Mode à blanc (aucune publication)' : `Publication sur ${hoteApi(env)}`} · ${choix.length} épingle(s) retenue(s) sur ${manifeste.epingles?.length ?? 0}, maximum ${MAX}.`);
  if (aBlanc && !args.includes('--a-blanc')) console.log('Secrets Pinterest absents : définissez PINTEREST_APP_ID, PINTEREST_APP_SECRET et PINTEREST_REFRESH_TOKEN pour publier.');

  let erreurs = 0;
  let sansTableau = 0;
  for (const e of choix) {
    const boardId = tableauPour(e.tableau, tableaux);
    const ligne = `• ${e.id} → tableau « ${e.tableau} »${boardId ? ` (${boardId})` : ''} : ${e.titre}`;
    if (!boardId) {
      sansTableau++;
      console.warn(`${ligne}\n  ⚠ aucun board_id dans config/tableaux-pinterest.json (ni pour « general ») : épingle ignorée.`);
      continue;
    }
    if (aBlanc) {
      console.log(`${ligne}\n  image ${e.image}\n  lien  ${e.lien}`);
      continue;
    }
    try {
      const pin = await api('/pins', { jeton, methode: 'POST', corps: corpsEpingle(e, boardId), env });
      etat.publiees.push({ id: e.id, slug: e.slug, pin_id: pin.id, tableau: e.tableau, board_id: boardId, publie_le: aujourdhui, publie_a: new Date().toISOString() });
      writeFileSync(FICHIER_ETAT, JSON.stringify(etat, null, 2) + '\n');
      console.log(`${ligne}\n  ✓ épingle ${pin.id}`);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      erreurs++;
      console.error(`${ligne}\n  ✗ ${err.message}`);
    }
  }
  if (sansTableau && !aBlanc) {
    console.error(`✗ ${sansTableau} épingle(s) sans tableau Pinterest : renseignez au moins le board_id du tableau « general » dans config/tableaux-pinterest.json (voir docs/pinterest.md, étape 5).`);
    process.exit(1);
  }
  if (erreurs) process.exit(1);
}

if (import.meta.main) {
  principal().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
