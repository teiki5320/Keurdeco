// Lot d'épingles à importer à la main dans Pinterest (« Créer des épingles en masse » avec un fichier .csv),
// en attendant que l'application soit validée pour la publication automatique.
// Usage : npm run pinterest:lot [-- --jours 30] [-- --par-jour 2] [-- --local]
//         npm run pinterest:lot -- --confirmer   (une fois le fichier importé dans Pinterest)
//
// 1. Lit le manifeste publié (https://www.keurdeco.com/epingles.json, ou public/epingles.json avec --local)
//    et le fichier d'état data/pinterest-etat.json (épingles déjà publiées ou déjà importées).
// 2. Programme les épingles suivantes sur N jours (30 par défaut : Pinterest refuse les dates trop lointaines),
//    2 par jour au plus, jamais deux du même article le même jour, jamais avant la parution de l'article.
// 3. Écrit le fichier dans ~/Downloads (keurdeco-epingles-<du>-au-<au>.csv) et le lot dans data/pinterest-lot.json.
// 4. Avec --confirmer : ces épingles sont notées dans l'état (pin_id vide, mode « import-csv ») ; le lot suivant
//    et la publication automatique ne les reprendront pas.
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { aujourdhuiParis, choisirEpingles, lireJson, RACINE } from './pinterest-lib.mjs';

const args = process.argv.slice(2);
const option = (nom, defaut) => {
  const i = args.indexOf(`--${nom}`);
  return i >= 0 ? Number(args[i + 1]) : defaut;
};
const JOURS = option('jours', 30);
const PAR_JOUR = option('par-jour', 2);
/** Heures de publication (UTC) : 12 h et 19 h à Paris en hiver, 13 h et 20 h en été. */
const HEURES = ['11:00:00', '18:00:00'];
const FICHIER_ETAT = resolve(RACINE, 'data/pinterest-etat.json');
const FICHIER_LOT = resolve(RACINE, 'data/pinterest-lot.json');

if (args.includes('--confirmer')) {
  const enAttente = lireJson(FICHIER_LOT, null);
  if (!enAttente?.epingles?.length) {
    console.log('Aucun lot en attente de confirmation.');
    process.exit(0);
  }
  const etat = lireJson(FICHIER_ETAT, { publiees: [] });
  const deja = new Set(etat.publiees.map((p) => p.id));
  for (const p of enAttente.epingles) if (!deja.has(p.id)) etat.publiees.push({ ...p, confirme_le: new Date().toISOString() });
  writeFileSync(FICHIER_ETAT, JSON.stringify(etat, null, 2) + '\n');
  writeFileSync(FICHIER_LOT, JSON.stringify({ epingles: [] }, null, 2) + '\n');
  console.log(`${enAttente.epingles.length} épingle(s) notées comme importées dans Pinterest.`);
  process.exit(0);
}
const config = lireJson(resolve(RACINE, 'config/pinterest.json'), {});
const tableaux = lireJson(resolve(RACINE, 'config/tableaux-pinterest.json'), { tableaux: {} });

async function lireManifeste() {
  if (args.includes('--local')) return lireJson(resolve(RACINE, 'public', config.manifeste ?? 'epingles.json'), { epingles: [] });
  const rep = await fetch(`https://www.keurdeco.com/${config.manifeste ?? 'epingles.json'}`);
  if (!rep.ok) throw new Error(`Manifeste introuvable (${rep.status})`);
  return rep.json();
}

const plusJours = (jour, n) => {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const manifeste = await lireManifeste();
const etat = lireJson(FICHIER_ETAT, { publiees: [] });
const simulation = { publiees: [...etat.publiees] };
const lot = [];
const premier = plusJours(aujourdhuiParis(), 1);
for (let j = 0; j < JOURS; j++) {
  const jour = plusJours(premier, j);
  // Les épingles déjà programmées ce jour-là (lots précédents) comptent dans le maximum quotidien.
  const deja = simulation.publiees.filter((p) => p.publie_le === jour).length;
  if (deja >= PAR_JOUR) continue;
  const choix = choisirEpingles(manifeste, simulation, { max: PAR_JOUR - deja, aujourdhui: jour });
  choix.forEach((e, k) => {
    simulation.publiees.push({ id: e.id, slug: e.slug, publie_le: jour });
    lot.push({ e, date: `${jour}T${HEURES[(deja + k) % HEURES.length]}` });
  });
}
if (!lot.length) {
  console.log('Aucune épingle à importer : tout est déjà publié ou importé.');
  process.exit(0);
}

const cellule = (v) => `"${String(v).replace(/"/g, '""')}"`;
const lignes = [['Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords'].join(',')];
for (const { e, date } of lot) {
  const tableau = tableaux.tableaux[e.tableau]?.nom ?? tableaux.tableaux.general?.nom ?? 'Déco africaine · Keur Déco';
  lignes.push([e.titre, e.image, tableau, '', e.description, e.lien, date, 'déco africaine, décoration africaine'].map(cellule).join(','));
}
const du = lot[0].date.slice(0, 10);
const au = lot.at(-1).date.slice(0, 10);
const dossier = resolve(homedir(), 'Downloads');
const fichier = resolve(dossier, `keurdeco-epingles-${du}-au-${au}.csv`);
const tableauxUtilises = [...new Set(lot.map(({ e }) => tableaux.tableaux[e.tableau]?.nom ?? tableaux.tableaux.general?.nom))].sort();

mkdirSync(dossier, { recursive: true });
writeFileSync(fichier, lignes.join('\n') + '\n');
const epingles = lot.map(({ e, date }) => ({ id: e.id, slug: e.slug, pin_id: null, tableau: e.tableau, mode: 'import-csv', publie_le: date.slice(0, 10) }));
writeFileSync(FICHIER_LOT, JSON.stringify({ fichier: fichier.split("/").pop(), epingles }, null, 2) + '\n');
console.log(`${lot.length} épingle(s) du ${du} au ${au} → ${fichier}`);
console.log('Une fois le fichier importé dans Pinterest : npm run pinterest:lot -- --confirmer');
console.log(`Tableaux à avoir sur Pinterest (noms exacts) :\n  ${tableauxUtilises.join('\n  ')}`);
console.log(`Restent ensuite : ${manifeste.epingles.length - simulation.publiees.length} épingle(s) pour les lots suivants.`);
