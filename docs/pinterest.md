# Pinterest : ce qu'il faut faire à la main

La génération des épingles et leur publication sont automatiques. Il reste des étapes à faire une seule fois, dans cet ordre. Compter une à trois semaines au total, à cause de la validation de l'accès standard par Pinterest.

## Ce qui est déjà en place

- **Sur le site** : Open Graph complet et données structurées `Article` (Rich Pins), bouton « Épingler » sur les images d'article (sans script externe), balise de revendication du domaine lue dans la variable `PINTEREST_VERIFY`.
- **Au build** (`scripts/epingles.ts`) : pour chaque article publié, une épingle 1000 × 1500 px par titre de la liste `epingles`, dans 4 gabarits qui alternent (bandeau haut, bandeau bas, cadre, split), et le manifeste `https://www.keurdeco.fr/epingles.json`.
- **Chaque jour à 7 h 17 UTC** (`.github/workflows/pinterest.yml`) : `scripts/pinterest-publier.mjs` publie au plus 5 épingles (réglage `config/pinterest.json`), jamais deux du même article le même jour, dans le tableau de la rubrique (`config/tableaux-pinterest.json`), puis enregistre `data/pinterest-etat.json` sur `main`.
- Sans secrets, le script tourne en **mode à blanc** : il affiche ce qu'il publierait.

## 1. Compte professionnel

1. Créer un compte sur https://www.pinterest.fr/ avec une adresse dédiée (par exemple contact@…), ou convertir un compte existant.
2. *Paramètres* › *Paramètres du compte* › *Convertir en compte professionnel*. Nom : **Keur Déco**, site : `https://www.keurdeco.fr`, catégorie : Maison et décoration.
3. Photo de profil : `public/icones/icone-512.png`. Bio courte, par exemple : « La déco africaine, chez soi : wax, bogolan, indigo, paniers tressés. Idées d'aménagement pour chaque pièce. »

## 2. Revendiquer le domaine

1. *Paramètres* › *Comptes revendiqués* › *Sites web* › *Revendiquer* : saisir `www.keurdeco.fr`, choisir la méthode **balise HTML**.
2. Copier uniquement la valeur de `content` de la balise `<meta name="p:domain_verify" content="XXXX"/>`.
3. Sur GitHub : *Settings* › *Secrets and variables* › *Actions* › onglet **Variables** › *New repository variable* : `PINTEREST_VERIFY` = `XXXX`.
4. Relancer la publication du site (*Actions* › « Publier sur GitHub Pages » › *Run workflow*), attendre la fin, puis cliquer sur *Vérifier* dans Pinterest.

Les Rich Pins (épingles d'article) s'activent ensuite automatiquement grâce aux balises Open Graph ; aucune validation manuelle n'est plus nécessaire.

## 3. Créer les tableaux

Créer au moins le tableau **général**, puis ceux des rubriques utilisées (noms proposés dans `config/tableaux-pinterest.json`, modifiables) : salon, paniers, bogolan, wax… Remplir chaque tableau de quelques épingles d'autres créateurs avant l'arrivée des vôtres : un tableau vide se diffuse mal.

Les identifiants (`board_id`) s'obtiennent à l'étape 5.

## 4. Créer l'application (developers.pinterest.com)

1. https://developers.pinterest.com/ › *My apps* › *Connect app*, connecté avec le compte professionnel.
2. Nom : « Keur Déco publication », description : « Publication automatique des épingles des articles de www.keurdeco.fr dans nos propres tableaux. », site : `https://www.keurdeco.fr`.
3. Dans les réglages de l'application : **Redirect URI** = `http://localhost:8085/callback`.
4. Noter l'**App ID** et l'**App secret key**.
5. L'application démarre en **accès d'essai (Trial)** : l'API ne crée des épingles que dans le **bac à sable** (`api-sandbox.pinterest.com`), visibles de vous seul.

## 5. Lancer le parcours OAuth en local

Sur votre ordinateur, dans le dossier du projet :

```bash
npm install
npm run build                # génère public/epingles.json (épingles des articles déjà publiés)
```

Créer un fichier `.env` à la racine (il est ignoré par git) :

```
PINTEREST_APP_ID=votre_app_id
PINTEREST_APP_SECRET=votre_secret
# Pendant l'accès d'essai :
PINTEREST_SANDBOX=1
```

Puis `npm run pinterest:auth` et ouvrir http://localhost:8085/ :

1. *Se connecter avec Pinterest* → autoriser l'application ;
2. la page affiche le **refresh token**, le nom du compte et **la liste des tableaux avec leur `board_id`** ;
3. un formulaire permet de **publier une épingle de démonstration** dans un tableau.

L'épingle de démonstration utilise une image hébergée sur www.keurdeco.fr : il faut donc que le site soit en ligne avec au moins un article publié (le premier est programmé le 5 octobre 2026), puis relancer `npm run build` en local pour que `public/epingles.json` le contienne.

Reporter les `board_id` dans `config/tableaux-pinterest.json` (au minimum `general`), puis commit sur `main`.

## 6. Accès standard (avec la vidéo de démonstration)

Pinterest demande une vidéo qui montre l'intégration complète avant d'ouvrir l'accès standard (publication réelle).

1. Enregistrer l'écran (QuickTime, OBS, ou l'outil de capture du système), 2 à 4 minutes, sans son obligatoire :
   - la page http://localhost:8085/ et l'explication de ce que fait l'application ;
   - le clic sur *Se connecter avec Pinterest*, **l'écran d'autorisation Pinterest** et le retour sur la page ;
   - la liste des tableaux, puis la **publication d'une épingle de démonstration** ;
   - l'épingle obtenue (dans le bac à sable) et, si possible, l'article du site vers lequel elle mène.
2. Sur developers.pinterest.com › votre application › *Upgrade access* : décrire l'usage (« publication automatique de nos propres visuels, 5 épingles par jour au maximum, dans nos tableaux, avec lien vers nos articles »), joindre la vidéo (lien YouTube non répertorié ou Google Drive).
3. Attendre la réponse (quelques jours à deux semaines).
4. Une fois l'accès standard obtenu : retirer `PINTEREST_SANDBOX=1` du `.env`, relancer `npm run pinterest:auth` pour obtenir un refresh token de production, et reprendre les `board_id` si besoin.

## 7. Secrets GitHub

*Settings* › *Secrets and variables* › *Actions* :

| Onglet | Nom | Valeur |
| --- | --- | --- |
| Secrets | `PINTEREST_APP_ID` | App ID |
| Secrets | `PINTEREST_APP_SECRET` | App secret key |
| Secrets | `PINTEREST_REFRESH_TOKEN` | refresh token affiché à l'étape 5 |
| Variables | `PINTEREST_VERIFY` | code de revendication du domaine (étape 2) |
| Variables (facultatif) | `PINTEREST_SANDBOX` | `1` pendant l'accès d'essai, à supprimer ensuite |
| Variables (facultatif) | `PINTEREST_MAX` | nombre maximum d'épingles par jour (sinon `config/pinterest.json`) |

Le jeton d'accès est renouvelé automatiquement à chaque exécution à partir du refresh token. Le refresh token a lui-même une durée de vie limitée (environ un an) : le journal du workflow prévient 30 jours avant l'échéance ; il suffit alors de relancer `npm run pinterest:auth` et de mettre à jour le secret. Si Pinterest renvoie un nouveau refresh token, le journal le signale aussi.

## Vérifier que tout marche

- *Actions* › « Publier les épingles Pinterest » › *Run workflow* avec « Mode à blanc » coché : le journal liste les épingles qui seraient publiées.
- Puis sans le mode à blanc : les épingles apparaissent dans les tableaux, et `data/pinterest-etat.json` est mis à jour sur `main`.
- En cas d'erreur 401 : refresh token expiré ou révoqué (refaire l'étape 5). Erreur « board » : `board_id` erroné dans `config/tableaux-pinterest.json`.
