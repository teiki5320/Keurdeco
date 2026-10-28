// Envoie la clé Pinterest de Keur Déco dans les secrets GitHub du dépôt, sans jamais l'afficher.
// Usage : npm run pinterest:secrets   (après npm run pinterest:auth ; nécessite gh connecté : gh auth status)
// Même méthode que Keur Kado (docs/pinterest.md, étape 7).
//
// Lit PINTEREST_APP_ID, PINTEREST_APP_SECRET et PINTEREST_REFRESH_TOKEN dans le fichier .env de ce dossier
// et les transmet à « gh secret set » par l'entrée standard (jamais en argument, jamais à l'écran).
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { chargerEnv, lireJson, RACINE } from './pinterest-lib.mjs';

chargerEnv();
const config = lireJson(resolve(RACINE, 'config/pinterest.json'), {});
const depot = config.depot ?? 'teiki5320/Keurdeco';
const NOMS = ['PINTEREST_APP_ID', 'PINTEREST_APP_SECRET', 'PINTEREST_REFRESH_TOKEN'];
const manquants = NOMS.filter((n) => !process.env[n]);
if (manquants.length) {
  console.error(`✗ Absent du fichier .env : ${manquants.join(', ')}. Lancez d'abord npm run pinterest:auth (voir docs/pinterest.md).`);
  process.exit(1);
}
let erreurs = 0;
for (const nom of NOMS) {
  const r = spawnSync('gh', ['secret', 'set', nom, '--repo', depot], { input: process.env[nom], stdio: ['pipe', 'ignore', 'pipe'], encoding: 'utf8' });
  if (r.status === 0) console.log(`✓ ${nom} enregistré dans les secrets GitHub de ${depot}`);
  else {
    erreurs++;
    console.error(`✗ ${nom} : ${(r.stderr || r.error?.message || 'échec').trim()}`);
  }
}
if (erreurs) process.exit(1);
console.log(`\nC'est fait : la publication automatique de ${config.site ?? 'Keur Déco'} utilisera cette clé dès le prochain passage (chaque matin, lancement prévu à 4 h 17 UTC).`);
console.log('Pensez à fermer le ticket GitHub « Pinterest : refaire la clé du compte avant son échéance » s’il est ouvert.');
