// Parcours OAuth Pinterest complet, sur un petit serveur local.
// Usage : npm run pinterest:auth   puis ouvrir http://localhost:8085/
//
// Prérequis : PINTEREST_APP_ID et PINTEREST_APP_SECRET (variables d'environnement ou fichier .env),
// et l'adresse de redirection http://localhost:8085/callback déclarée dans l'application Pinterest.
// Le parcours : autorisation sur Pinterest → échange du code → affichage du refresh token (à copier
// dans les secrets GitHub), du compte, des tableaux (avec leurs identifiants) et un formulaire pour
// publier une épingle de démonstration. C'est aussi la page à filmer pour la vidéo de démonstration
// exigée par Pinterest pour l'accès standard (voir docs/pinterest.md).
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { api, chargerEnv, corpsEpingle, demanderJeton, hoteApi, lireJson, PORTEES, RACINE, URL_AUTORISATION } from './pinterest-lib.mjs';

chargerEnv();
const PORT = Number(process.env.PINTEREST_AUTH_PORT ?? 8085);
const REDIRECTION = `http://localhost:${PORT}/callback`;
const APP_ID = process.env.PINTEREST_APP_ID;
const SECRET = process.env.PINTEREST_APP_SECRET;
const etatOAuth = randomBytes(16).toString('hex');
let session = null; // { access_token, refresh_token, ... } après l'échange du code

const echapper = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(titre, contenu) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${echapper(titre)} · Keur Déco</title>
<style>
body{font-family:system-ui,sans-serif;background:#F7F0E6;color:#1C1B22;max-width:860px;margin:0 auto;padding:32px 20px;line-height:1.55}
h1{font-family:Georgia,serif;color:#1E2A47}h2{color:#1E2A47;margin-top:2em}
.bouton{display:inline-block;background:#B4532F;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600;border:0;font-size:1rem;cursor:pointer}
.bouton--pinterest{background:#E60023}
code,textarea{font-family:ui-monospace,monospace;font-size:.9rem}
textarea{width:100%;min-height:90px;padding:10px;border-radius:8px;border:1px solid #ccc}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #e2d7c5;padding:8px;text-align:left}
.note{background:#EFE3D0;padding:14px 18px;border-radius:12px}.ok{color:#52693A;font-weight:700}.erreur{color:#B4532F;font-weight:700}
select,input{font-size:1rem;padding:8px;border-radius:8px;border:1px solid #ccc;max-width:100%}
</style></head><body><h1>${echapper(titre)}</h1>${contenu}</body></html>`;
}

function accueil() {
  if (!APP_ID || !SECRET) {
    return page('Connexion Pinterest', `<p class="erreur">PINTEREST_APP_ID et PINTEREST_APP_SECRET sont introuvables.</p><p>Ajoutez-les dans un fichier <code>.env</code> à la racine du projet (il n'est jamais envoyé sur GitHub) :</p><pre>PINTEREST_APP_ID=123456\nPINTEREST_APP_SECRET=xxxxxxxx</pre><p>puis relancez <code>npm run pinterest:auth</code>.</p>`);
  }
  return page(
    'Keur Déco × Pinterest',
    `<p>Cette page connecte le site <strong>Keur Déco</strong> à votre compte professionnel Pinterest, pour publier automatiquement les épingles des nouveaux articles dans vos tableaux.</p>
<div class="note"><p><strong>Ce que l'application demande :</strong> lire votre compte et vos tableaux, créer des tableaux et des épingles (${PORTEES.map((p) => `<code>${p}</code>`).join(', ')}).</p>
<p>Adresse de redirection déclarée : <code>${REDIRECTION}</code> · API : <code>${hoteApi()}</code></p></div>
<p><a class="bouton bouton--pinterest" href="/connexion">Se connecter avec Pinterest</a></p>`,
  );
}

function lienAutorisation() {
  const p = new URLSearchParams({ client_id: APP_ID, redirect_uri: REDIRECTION, response_type: 'code', scope: PORTEES.join(','), state: etatOAuth });
  return `${URL_AUTORISATION}?${p.toString()}`;
}

async function apresConnexion() {
  const [compte, tableaux] = await Promise.all([
    api('/user_account', { jeton: session.access_token }).catch((e) => ({ erreur: e.message })),
    api('/boards?page_size=100', { jeton: session.access_token }).catch((e) => ({ erreur: e.message, items: [] })),
  ]);
  const manifeste = lireJson(resolve(RACINE, 'public/epingles.json'), { epingles: [] });
  const options = (tableaux.items ?? []).map((t) => `<option value="${echapper(t.id)}">${echapper(t.name)}</option>`).join('');
  const epingles = manifeste.epingles.map((e, i) => `<option value="${i}">${echapper(e.titre)}</option>`).join('');
  return page(
    'Connexion réussie',
    `<p class="ok">✓ Keur Déco est autorisé sur le compte ${echapper(compte.username ?? '')}${compte.erreur ? ` (compte illisible : ${echapper(compte.erreur)})` : ''}.</p>
<h2>1. Refresh token</h2>
<p>Copiez cette valeur dans le secret GitHub <code>PINTEREST_REFRESH_TOKEN</code> (Settings › Secrets and variables › Actions). Ne la partagez pas.</p>
<textarea readonly onclick="this.select()">${echapper(session.refresh_token ?? '(aucun refresh token renvoyé)')}</textarea>
<p>Jeton d'accès valable ${Math.round((session.expires_in ?? 0) / 86400)} jours ; refresh token valable ${session.refresh_token_expires_in ? `${Math.round(session.refresh_token_expires_in / 86400)} jours` : 'selon Pinterest'}. Le script de publication renouvelle le jeton d'accès tout seul.</p>
<h2>2. Vos tableaux</h2>
${
  tableaux.erreur
    ? `<p class="erreur">${echapper(tableaux.erreur)}</p>`
    : `<p>Reportez les identifiants dans <code>config/tableaux-pinterest.json</code>.</p><table><tr><th>Tableau</th><th>board_id</th></tr>${(tableaux.items ?? [])
        .map((t) => `<tr><td>${echapper(t.name)}</td><td><code>${echapper(t.id)}</code></td></tr>`)
        .join('')}</table>`
}
<h2>3. Épingle de démonstration</h2>
${
  options && epingles
    ? `<form method="post" action="/epingle-demo"><p><label>Épingle générée<br><select name="epingle">${epingles}</select></label></p><p><label>Tableau<br><select name="tableau">${options}</select></label></p><p><button class="bouton" type="submit">Publier cette épingle</button></p></form>`
    : '<p>Lancez d’abord <code>npm run build</code> (qui génère <code>public/epingles.json</code>) et créez au moins un tableau.</p>'
}`,
  );
}

async function lireCorps(req) {
  let s = '';
  for await (const morceau of req) s += morceau;
  return Object.fromEntries(new URLSearchParams(s));
}

const serveur = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const envoyer = (html, statut = 200) => {
    res.writeHead(statut, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  };
  try {
    if (url.pathname === '/') return envoyer(accueil());
    if (url.pathname === '/connexion') {
      res.writeHead(302, { Location: lienAutorisation() });
      return res.end();
    }
    if (url.pathname === '/callback') {
      if (url.searchParams.get('state') !== etatOAuth) return envoyer(page('Erreur', '<p class="erreur">Paramètre state invalide : recommencez depuis la page d’accueil.</p>'), 400);
      const code = url.searchParams.get('code');
      if (!code) return envoyer(page('Autorisation refusée', `<p class="erreur">${echapper(url.searchParams.get('error_description') ?? 'Aucun code reçu.')}</p>`), 400);
      session = await demanderJeton({ grant_type: 'authorization_code', code, redirect_uri: REDIRECTION }, { appId: APP_ID, secret: SECRET });
      console.log('\nRefresh token (à copier dans le secret PINTEREST_REFRESH_TOKEN) :\n' + session.refresh_token + '\n');
      res.writeHead(302, { Location: '/compte' });
      return res.end();
    }
    if (url.pathname === '/compte') return envoyer(session ? await apresConnexion() : accueil());
    if (url.pathname === '/epingle-demo' && req.method === 'POST' && session) {
      const { epingle, tableau } = await lireCorps(req);
      const manifeste = lireJson(resolve(RACINE, 'public/epingles.json'), { epingles: [] });
      const e = manifeste.epingles[Number(epingle)];
      const pin = await api('/pins', { jeton: session.access_token, methode: 'POST', corps: corpsEpingle(e, tableau) });
      return envoyer(
        page(
          'Épingle publiée',
          `<p class="ok">✓ Épingle créée : <code>${echapper(pin.id)}</code></p><p><img src="${echapper(e.image)}" alt="" style="max-width:300px;border-radius:12px"></p><p>${hoteApi().includes('sandbox') ? 'Publiée dans le bac à sable Pinterest (accès d’essai).' : `<a href="https://www.pinterest.com/pin/${echapper(pin.id)}/">Voir l’épingle sur Pinterest</a>`}</p><p><a href="/compte">Retour</a></p>`,
        ),
      );
    }
    envoyer(page('Introuvable', '<p><a href="/">Accueil</a></p>'), 404);
  } catch (e) {
    envoyer(page('Erreur', `<p class="erreur">${echapper(e.message)}</p><p><a href="/">Recommencer</a></p>`), 500);
  }
});

serveur.listen(PORT, () => {
  console.log(`Parcours OAuth Pinterest : ouvrez http://localhost:${PORT}/ (Ctrl+C pour arrêter).`);
  console.log(`Adresse de redirection à déclarer dans l'application Pinterest : ${REDIRECTION}`);
});
