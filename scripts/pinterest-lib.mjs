// Fonctions communes aux scripts Pinterest (publication automatique et parcours OAuth).
// Documentation : docs/pinterest.md.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const RACINE = resolve(import.meta.dirname, '..');

/** Hôte de l'API : bac à sable (accès d'essai) si PINTEREST_SANDBOX=1. */
export function hoteApi(env = process.env) {
  return env.PINTEREST_SANDBOX === '1' ? 'https://api-sandbox.pinterest.com' : 'https://api.pinterest.com';
}

/** Point d'accès OAuth (échange de code et renouvellement) : toujours l'API de production. */
export const URL_JETON = 'https://api.pinterest.com/v5/oauth/token';

/** Page d'autorisation Pinterest. */
export const URL_AUTORISATION = 'https://www.pinterest.com/oauth/';

/** Droits demandés : lire le compte et les tableaux, créer des épingles. */
export const PORTEES = ['user_accounts:read', 'boards:read', 'boards:write', 'pins:read', 'pins:write'];

/** Charge un fichier .env simple (CLE=valeur) sans écraser les variables déjà définies. */
export function chargerEnv(fichier = resolve(RACINE, '.env')) {
  if (!existsSync(fichier)) return;
  for (const ligne of readFileSync(fichier, 'utf8').split('\n')) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export function lireJson(chemin, defaut) {
  return existsSync(chemin) ? JSON.parse(readFileSync(chemin, 'utf8')) : defaut;
}

/** Date du jour à Paris (AAAA-MM-JJ). */
export function aujourdhuiParis(date = new Date()) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(date);
}

function basique(appId, secret) {
  return `Basic ${Buffer.from(`${appId}:${secret}`).toString('base64')}`;
}

/** Appel au point d'accès de jeton (code d'autorisation ou renouvellement). */
export async function demanderJeton(parametres, { appId, secret }) {
  const rep = await fetch(URL_JETON, {
    method: 'POST',
    headers: { Authorization: basique(appId, secret), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(parametres).toString(),
  });
  const corps = await rep.json().catch(() => ({}));
  if (!rep.ok) throw new Error(`Jeton Pinterest refusé (${rep.status}) : ${JSON.stringify(corps)}`);
  return corps;
}

/** Nouveau jeton d'accès à partir du refresh token. */
export function renouvelerJeton({ appId, secret, refreshToken }) {
  return demanderJeton({ grant_type: 'refresh_token', refresh_token: refreshToken }, { appId, secret });
}

/** Appel à l'API v5 (JSON). */
export async function api(chemin, { jeton, methode = 'GET', corps, env = process.env } = {}) {
  const rep = await fetch(`${hoteApi(env)}/v5${chemin}`, {
    method: methode,
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const texte = await rep.text();
  let donnees;
  try {
    donnees = texte ? JSON.parse(texte) : {};
  } catch {
    donnees = { brut: texte };
  }
  if (!rep.ok) throw new Error(`API Pinterest ${methode} ${chemin} : ${rep.status} ${JSON.stringify(donnees)}`);
  return donnees;
}

/** Corps de la requête POST /v5/pins pour une entrée du manifeste. */
export function corpsEpingle(entree, boardId) {
  return {
    board_id: boardId,
    title: entree.titre,
    description: entree.description,
    link: entree.lien,
    alt_text: entree.alt,
    media_source: { source_type: 'image_url', url: entree.image },
  };
}

/** Identifiant de tableau d'une rubrique (config/tableaux-pinterest.json), ou celui du tableau « general ». */
export function tableauPour(rubrique, config) {
  const t = config?.tableaux ?? {};
  return t[rubrique]?.board_id || t.general?.board_id || null;
}

/**
 * Choisit les épingles à publier :
 * - pas encore publiées (d'après le fichier d'état) ;
 * - au plus `max` par exécution ;
 * - jamais deux épingles du même article le même jour (ni dans l'exécution, ni avec une publication déjà faite aujourd'hui) ;
 * - d'abord la 1re épingle de chaque article (les articles les plus récents en premier), puis la 2e, etc.
 */
export function choisirEpingles(manifeste, etat, { max = 5, aujourdhui = aujourdhuiParis() } = {}) {
  const publiees = new Set((etat.publiees ?? []).map((p) => p.id));
  const slugsDuJour = new Set((etat.publiees ?? []).filter((p) => p.publie_le === aujourdhui).map((p) => p.slug));
  const candidates = (manifeste.epingles ?? [])
    .filter((e) => !publiees.has(e.id) && e.publie_le <= aujourdhui)
    .sort((a, b) => a.numero - b.numero || b.publie_le.localeCompare(a.publie_le) || a.id.localeCompare(b.id));
  const choix = [];
  for (const e of candidates) {
    if (choix.length >= max) break;
    if (slugsDuJour.has(e.slug)) continue;
    slugsDuJour.add(e.slug);
    choix.push(e);
  }
  return choix;
}
