// Synchronisation des produits avec l'Amazon Creators API (remplaçante de la Product Advertising API).
// Usage : npm run amazon:sync [-- --a-blanc]
//
// Pour chaque produit actif (et chaque produit indisponible qui a un ASIN, pour le réactiver s'il revient) :
// vérifie la disponibilité, met à jour nom, image_url, image_maj_le et verifie_le, et passe en
// « indisponible » ce qui n'est plus vendu. Écrit src/data/produits.json.
//
// Accès : l'API n'est ouverte qu'aux comptes Partenaires ayant au moins 10 ventes qualifiées sur les
// 30 derniers jours (et se referme après 30 jours sans vente). Identifiants créés dans le Partenaires
// Central › Outils › Creators API (région Europe, version 3.2, valable pour Amazon.fr).
// Secrets : AMAZON_CREATORS_CREDENTIAL_ID, AMAZON_CREATORS_SECRET, AMAZON_CREATORS_VERSION (3.2 par défaut).
// Sans eux, le script s'arrête proprement.
//
// Règles Amazon (licence Partenaires, documentation Creators API) :
// - les images ne sont jamais téléchargées : seule leur adresse est gardée, au plus 24 h ;
//   le build n'affiche une image que si image_maj_le date de moins de 24 h ;
// - les autres contenus (titre…) sont rafraîchis au moins toutes les 24 h : d'où une
//   synchronisation quotidienne (.github/workflows/amazon-sync.yml) suivie d'une reconstruction du site ;
// - les ASIN peuvent être conservés sans limite ; aucun prix n'est stocké ni affiché.
// Documentation : https://affiliate-program.amazon.com/creatorsapi/docs/en-us/
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AMAZON_TAG } from '../src/amazon.ts';

const RACINE = resolve(import.meta.dirname, '..');
const FICHIER = resolve(RACINE, 'src/data/produits.json');
const HOTE_API = 'https://creatorsapi.amazon';
const MARKETPLACE = 'www.amazon.fr';

/** Point d'accès de jeton selon la version des identifiants (EU = 3.2, qui couvre Amazon.fr). */
const URL_JETON = {
  '3.2': 'https://api.amazon.co.uk/auth/o2/token',
  // TODO : points d'accès des régions NA (3.1) et FE (3.3) non vérifiés ; inutiles pour Amazon.fr.
};

/** Ressources demandées : titre, image principale, disponibilité (pas de prix). */
export const RESSOURCES = ['itemInfo.title', 'images.primary.large', 'offersV2.listings.availability'];

/**
 * Types de disponibilité considérés comme « plus vendu ».
 * TODO : liste à confirmer sur la documentation offersV2 (valeurs vues : IN_STOCK, OUT_OF_STOCK, UNAVAILABLE, PREORDER…).
 */
const INDISPONIBLE = new Set(['OUT_OF_STOCK', 'UNAVAILABLE']);

/** Codes d'erreur signifiant que l'article n'existe plus ou n'est pas accessible. */
const ARTICLE_PERDU = new Set(['ItemNotAccessible', 'InvalidParameterValue']);

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const aujourdhui = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());

async function jeton({ credentialId, secret, version }) {
  const url = URL_JETON[version];
  if (!url) throw new Error(`Version d'identifiants « ${version} » non prise en charge (Amazon.fr : 3.2).`);
  // D'après la documentation (get-started/using-curl), le corps est en JSON.
  const rep = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: credentialId, client_secret: secret, scope: 'creatorsapi::default' }),
  });
  const corps = await rep.json().catch(() => ({}));
  if (!rep.ok || !corps.access_token) throw new Error(`Jeton Creators API refusé (${rep.status}) : ${JSON.stringify(corps)}`);
  return corps.access_token; // valable 1 h
}

async function getItems(asins, jetonAcces, partnerTag, essai = 0) {
  const rep = await fetch(`${HOTE_API}/catalog/v1/getItems`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jetonAcces}`, 'Content-Type': 'application/json', 'x-marketplace': MARKETPLACE },
    body: JSON.stringify({ itemIds: asins, itemIdType: 'ASIN', marketplace: MARKETPLACE, partnerTag, resources: RESSOURCES }),
  });
  const corps = await rep.json().catch(() => ({}));
  if (rep.status === 429 && essai < 3) {
    await pause(1000 * Number(corps.retryAfterSeconds ?? 2 ** (essai + 1)));
    return getItems(asins, jetonAcces, partnerTag, essai + 1);
  }
  if (rep.status === 403 && JSON.stringify(corps).includes('AssociateNotEligible')) {
    throw new Error('Compte non éligible à la Creators API (il faut 10 ventes qualifiées sur 30 jours).');
  }
  if (!rep.ok) throw new Error(`getItems ${rep.status} : ${JSON.stringify(corps)}`);
  return corps;
}

/**
 * Applique une réponse getItems aux produits concernés (fonction pure, testée).
 * La documentation nomme le conteneur tantôt itemsResult, tantôt itemResults : les deux sont lus.
 * L'ordre des articles n'est pas garanti : ils sont rapprochés par ASIN.
 */
export function appliquerReponse(produits, reponse, { date, maintenant, majNoms = true }) {
  const resultat = reponse.itemsResult ?? reponse.itemResults ?? {};
  const articles = new Map((resultat.items ?? []).map((i) => [i.asin, i]));
  const perdus = new Set(
    (reponse.errors ?? [])
      .filter((e) => ARTICLE_PERDU.has(e.code))
      .map((e) => (e.message?.match(/\b([A-Z0-9]{10})\b/) ?? [])[1])
      .filter(Boolean),
  );
  const changements = [];
  for (const p of produits) {
    const avant = JSON.stringify(p);
    const article = articles.get(p.asin);
    if (article) {
      const annonces = article.offersV2?.listings ?? [];
      const dispo = annonces.map((l) => l.availability?.type).filter(Boolean);
      const vendu = annonces.length > 0 && dispo.some((t) => !INDISPONIBLE.has(t));
      p.statut = vendu ? 'actif' : 'indisponible';
      p.verifie_le = date;
      p.source = 'creators-api';
      const titre = article.itemInfo?.title?.displayValue;
      if (majNoms && titre) p.nom = titre;
      p.image_url = article.images?.primary?.large?.url ?? null;
      p.image_maj_le = p.image_url ? maintenant : null;
    } else if (perdus.has(p.asin)) {
      p.statut = 'indisponible';
      p.verifie_le = date;
      p.image_url = null;
      p.image_maj_le = null;
    }
    if (JSON.stringify(p) !== avant) changements.push(`${p.id} : ${JSON.parse(avant).statut} → ${p.statut}`);
  }
  return changements;
}

async function principal() {
  const credentialId = process.env.AMAZON_CREATORS_CREDENTIAL_ID;
  const secret = process.env.AMAZON_CREATORS_SECRET;
  const version = process.env.AMAZON_CREATORS_VERSION ?? '3.2';
  if (!credentialId || !secret) {
    console.log('Creators API non configurée (AMAZON_CREATORS_CREDENTIAL_ID et AMAZON_CREATORS_SECRET absents) : rien à faire.');
    console.log('Elle devient accessible après 10 ventes qualifiées sur 30 jours ; voir le README, section Amazon.');
    return;
  }
  const partnerTag = process.env.AMAZON_CREATORS_PARTNER_TAG ?? AMAZON_TAG;
  const produits = JSON.parse(readFileSync(FICHIER, 'utf8'));
  const aVerifier = produits.filter((p) => p.asin && (p.statut === 'actif' || p.statut === 'indisponible'));
  if (aVerifier.length === 0) {
    console.log('Aucun produit avec ASIN à vérifier.');
    return;
  }
  const acces = await jeton({ credentialId, secret, version });
  const date = aujourdhui();
  const changements = [];
  // 10 ASIN au plus par requête, 1 requête par seconde (quota de départ).
  for (let i = 0; i < aVerifier.length; i += 10) {
    const lot = aVerifier.slice(i, i + 10);
    const reponse = await getItems(
      lot.map((p) => p.asin),
      acces,
      partnerTag,
    );
    changements.push(...appliquerReponse(lot, reponse, { date, maintenant: new Date().toISOString(), majNoms: process.env.AMAZON_SYNC_NOMS !== '0' }));
    await pause(1100);
  }
  if (process.argv.includes('--a-blanc')) {
    console.log(`Mode à blanc : ${aVerifier.length} produit(s) vérifié(s), fichier non modifié.`);
  } else {
    writeFileSync(FICHIER, JSON.stringify(produits, null, 2) + '\n');
    console.log(`${aVerifier.length} produit(s) vérifié(s) le ${date}.`);
  }
  for (const c of changements) console.log(`• ${c}`);
}

if (import.meta.main) {
  principal().catch((e) => {
    console.error(`Synchronisation Amazon impossible : ${e.message}`);
    process.exit(1);
  });
}
