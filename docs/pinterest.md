# Pinterest : ce qu'il faut faire à la main

La génération des épingles et leur publication sont automatiques. Il reste des étapes à faire une seule fois, dans cet ordre. Compter une à trois semaines au total, à cause de la validation de l'accès standard par Pinterest.

## Ce qui est déjà en place

- **Sur le site** : Open Graph complet et données structurées `Article` (Rich Pins), bouton « Épingler » sur les images d'article (sans script externe), balise de revendication du domaine lue dans la variable `PINTEREST_VERIFY`.
- **Au build** (`scripts/epingles.ts`) : pour chaque article publié, une épingle 1000 × 1500 px par titre de la liste `epingles`, dans 4 gabarits qui alternent (bandeau haut, bandeau bas, cadre, split), et le manifeste `https://www.keurdeco.com/epingles.json`.
- **Chaque jour à 7 h 17 UTC** (`.github/workflows/pinterest.yml`) : `scripts/pinterest-publier.mjs` publie au plus 5 épingles (réglage `config/pinterest.json`), jamais deux du même article le même jour, dans le tableau de la rubrique (`config/tableaux-pinterest.json`), puis enregistre `data/pinterest-etat.json` sur `main`.
- Sans secrets, le script tourne en **mode à blanc** : il affiche ce qu'il publierait.

## 1. Compte professionnel

1. Créer un compte sur https://www.pinterest.fr/ avec une adresse dédiée (par exemple keurdeco@toakeur.com), ou convertir un compte existant.
2. *Paramètres* › *Paramètres du compte* › *Convertir en compte professionnel*. Nom : **Keur Déco**, site : `https://www.keurdeco.com/`, catégorie : Maison et décoration.
3. Photo de profil : `assets/marque/profil-pinterest.png` (emblème seul, lisible dans le petit rond). Bio courte, par exemple : « La déco africaine, chez soi : wax, bogolan, indigo, paniers tressés. Idées d'aménagement pour chaque pièce. »

## 2. Revendiquer le domaine www.keurdeco.com

Cette étape n'empêche pas de publier des épingles ; elle sert à afficher votre site sur votre profil et à attribuer les statistiques.

1. *Paramètres* › *Comptes revendiqués* › *Sites web* › *Revendiquer* : saisir `www.keurdeco.com`, choisir la méthode **balise HTML**.
2. Copier uniquement la valeur de `content` de la balise `<meta name="p:domain_verify" content="XXXX"/>`.
3. Sur GitHub : *Settings* › *Secrets and variables* › *Actions* › onglet **Variables** › *New repository variable* : `PINTEREST_VERIFY` = `XXXX`.
4. Relancer la publication du site (*Actions* › « Publier sur GitHub Pages » › *Run workflow*), attendre la fin, puis cliquer sur *Vérifier* dans Pinterest.

Les Rich Pins (épingles d'article) s'activent ensuite automatiquement grâce aux balises Open Graph ; aucune validation manuelle n'est plus nécessaire.

## 3. Créer les tableaux

Créer au moins le tableau **général**, puis ceux des rubriques utilisées (noms proposés dans `config/tableaux-pinterest.json`, modifiables) : salon, paniers, bogolan, wax… Remplir chaque tableau de quelques épingles d'autres créateurs avant l'arrivée des vôtres : un tableau vide se diffuse mal.

Les identifiants (`board_id`) s'obtiennent à l'étape 5.

## 4. Créer l'application (developers.pinterest.com)

1. https://developers.pinterest.com/ › *My apps* › *Connect app*, connecté avec le compte professionnel.
2. Nom : « Keur Déco publication », description : « Publication automatique des épingles des articles de Keur Déco dans nos propres tableaux. », site : `https://www.keurdeco.com/`.
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
# Pendant l'accès d'essai : jeton « Sandbox » généré sur la page de l'application
PINTEREST_JETON_BAC_A_SABLE=pina_...
```

Puis `PINTEREST_SANDBOX=0 npm run pinterest:auth` et ouvrir http://localhost:8085/ :

1. *Se connecter avec Pinterest* → autoriser l'application ;
2. le **refresh token** est enregistré tout seul dans `.env` (`PINTEREST_REFRESH_TOKEN`), **jamais affiché** (ni à l'écran ni dans le terminal) ; la page montre le nom du compte et **la liste des tableaux avec leur `board_id`** ;
3. un formulaire permet de **publier une épingle de démonstration** dans un tableau (seulement les articles déjà en ligne, Pinterest devant télécharger l'image).

Le jeton OAuth ne fonctionne que sur l'API de production (`api.pinterest.com`), d'où `PINTEREST_SANDBOX=0`. Mais en accès d'essai, Pinterest refuse `POST /pins` en production (code 29) : si `PINTEREST_JETON_BAC_A_SABLE` est défini, l'épingle de démonstration part donc dans le bac à sable, dans un tableau « *nom du tableau choisi* (démo) » créé au besoin (le bac à sable refuse un nom déjà pris en production).

Lancer `npm run build` en local pour que `public/epingles.json` soit à jour.

Reporter les `board_id` dans `config/tableaux-pinterest.json` (au minimum `general`), puis commit sur `main`.

## 6. Accès standard (avec la vidéo de démonstration)

Pinterest demande une vidéo qui montre l'intégration complète avant d'ouvrir l'accès standard (publication réelle).

1. Enregistrer l'écran (QuickTime, OBS, ou l'outil de capture du système), 2 à 4 minutes, sans son obligatoire :
   - la page http://localhost:8085/ et l'explication de ce que fait l'application ;
   - le clic sur *Se connecter avec Pinterest*, **l'écran d'autorisation Pinterest** et le retour sur la page ;
   - la liste des tableaux, puis la **publication d'une épingle de démonstration** ;
   - l'épingle obtenue (dans le bac à sable) et, si possible, l'article du site vers lequel elle mène.
   Exigences de Pinterest : fichier .mp4, **20 à 60 images par seconde constantes**, ratio entre 1:2 et 1,91:1. La capture d'écran macOS est à cadence variable et trop large : la ré-encoder, par exemple `ffmpeg -i capture.mov -vf "fps=30,scale=1920:-2,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xF7F0E6" -r 30 -c:v libx264 -pix_fmt yuv420p -an demo.mp4`. Sinon le bouton *Envoyer* ramène au champ vidéo sans message.
2. Sur developers.pinterest.com › votre application › *Mise à niveau de l'accès* : décrire l'usage, joindre la vidéo, cocher « Création et planification d'Épingle » et l'audience « Entreprises ». Demande envoyée le 16 octobre 2026 pour l'application « TOA CORP publication » (Keur Déco, puis Keur Cook et Keurbook).
3. Attendre la réponse (quelques jours à deux semaines).
4. Une fois l'accès standard obtenu : retirer `PINTEREST_SANDBOX=1` du `.env` et des variables GitHub ; le refresh token obtenu à l'étape 5 est déjà un jeton de production et les `board_id` de `config/tableaux-pinterest.json` sont déjà renseignés.

## 7. Secrets GitHub

*Settings* › *Secrets and variables* › *Actions* :

| Onglet | Nom | Valeur |
| --- | --- | --- |
| Secrets | `PINTEREST_APP_ID` | App ID |
| Secrets | `PINTEREST_APP_SECRET` | App secret key |
| Secrets | `PINTEREST_REFRESH_TOKEN` | refresh token enregistré dans `.env` à l'étape 5 |
| Variables | `PINTEREST_VERIFY` | code de revendication du domaine (étape 2) |
| Variables (facultatif) | `PINTEREST_SANDBOX` | `1` pendant l'accès d'essai, à supprimer ensuite |
| Variables (facultatif) | `PINTEREST_MAX` | nombre maximum d'épingles par jour (sinon `config/pinterest.json`) |

Le jeton d'accès est renouvelé automatiquement à chaque exécution à partir du refresh token. Le refresh token a lui-même une durée de vie limitée (environ un an) : le journal du workflow prévient 30 jours avant l'échéance ; il suffit alors de relancer `npm run pinterest:auth` et de mettre à jour le secret. Si Pinterest renvoie un nouveau refresh token, le journal le signale aussi.

## En attendant l'application : import par lots

Tant que l'application n'est pas validée, les épingles s'importent à la main, par lots de 30 jours
(Pinterest refuse les dates de publication trop lointaines) :

1. `npm run pinterest:lot` écrit `~/Downloads/keurdeco-epingles-<du>-au-<au>.csv` (2 épingles par jour au plus,
   jamais deux du même article le même jour) et le lot en attente dans `data/pinterest-lot.json`.
2. Sur Pinterest : **Créer › Créer des épingles en masse › Importer un fichier .csv**. Tous les tableaux nommés
   dans le fichier doivent exister, avec exactement le même nom (le script en affiche la liste).
3. Une fois l'import accepté : `npm run pinterest:lot -- --confirmer` note ces épingles dans `data/pinterest-etat.json` ;
   le lot suivant et la publication automatique ne les reprendront pas.

## Vérifier que tout marche

- *Actions* › « Publier les épingles Pinterest » › *Run workflow* avec « Mode à blanc » coché : le journal liste les épingles qui seraient publiées.
- Puis sans le mode à blanc : les épingles apparaissent dans les tableaux, et `data/pinterest-etat.json` est mis à jour sur `main`.
- En cas d'erreur 401 : refresh token expiré ou révoqué (refaire l'étape 5). Erreur « board » : `board_id` erroné dans `config/tableaux-pinterest.json`.
