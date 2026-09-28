# Keur Déco

Site éditorial en français sur la **décoration africaine** : idées d'aménagement, Top 10 et guides sur les matières et savoir-faire (wax, bogolan, kente, indigo, raphia…), pour la diaspora africaine en France et tous les amateurs de déco. « Keur » veut dire « maison » en wolof.

- Adresse actuelle : https://teiki5320.github.io/Keurdeco/ (GitHub Pages) ; domaine prévu plus tard : www.keurdeco.fr
- Éditeur : ALOHASH (SAS, nom commercial TOA CORP), voir `mentions-legales.html`.
- Revenus : liens Partenaires Amazon.fr. Trafic : Pinterest (publication automatique par l'API) et Google.
- **Priorité : automatiser la chaîne, de l'article à l'épingle Pinterest publiée.**

Site statique multipage (Vite + TypeScript, sans backend), mobile d'abord, installable (manifeste + service worker), lisible sans JavaScript.

## Démarrer

```bash
npm install
npm run dev          # site en local, articles relus à chaque requête
npm test             # tests Vitest (données, rendu, scripts)
npm run build        # épingles Pinterest + site dans dist/ (avec le rapport de build)
npm run test:e2e     # construit une version de démonstration et la teste dans Chromium
```

Node 22.12 ou plus récent (les scripts `.ts` sont exécutés directement par Node). Pour prévisualiser des articles programmés : `DATE_PUBLICATION=2026-12-31 npm run dev`.

## Organisation du code

| Chemin | Rôle |
| --- | --- |
| `index.html`, `a-propos.html`, `mentions-legales.html`, `confidentialite.html`, `404.html` | Pages écrites, avec des marqueurs (`<!--#head-->`, `<!--#header-->`, `<!--#footer-->`, `<!--#une-->`…) |
| `build/site.ts` | Plugin Vite : parties communes, pages générées, typographie française (espaces insécables), canonique, Open Graph, données structurées, `sitemap.xml`, `robots.txt`, Plausible facultatif |
| `build/articles.ts` | Lecture des articles (Markdown + YAML), publication à date, rendu des 3 types, points cliquables, bouton « Épingler » |
| `build/produits.ts` | Produits : filtrage (seuls les actifs sont affichés), cartes, encadrés, mention Partenaires |
| `build/rubriques.ts` | Pages de rubriques (pièces, matières, occasions), liste des articles, glossaire, blocs de l'accueil |
| `build/rapport.ts` | Rapport affiché à chaque build |
| `build/icones.ts` | Icônes (une par type d'objet) et logo SVG |
| `src/amazon.ts` | `AMAZON_TAG` (seul endroit), liens `https://www.amazon.fr/dp/<ASIN>?tag=<TAG>` |
| `src/taxonomie.ts` | Pièces, matières et styles, occasions |
| `src/data/produits.json`, `src/data/glossaire.json`, `src/data/images.json` | Données |
| `src/theme.css` | **Thème** : toutes les couleurs et polices (palette « Nuit d'indigo ») |
| `src/site.css`, `src/site.ts` | Styles et JavaScript (points cliquables, menu, service worker) |
| `contenu/articles/*.md` | Un fichier par article |
| `contenu/images/*.jpg` | Images sources haute définition (pour les épingles) |
| `scripts/` | Outils : images, épingles, Pinterest, hotspots, nouvel article, test e2e |
| `config/` | Tableaux Pinterest, réglages de publication |
| `data/pinterest-etat.json` | Épingles déjà publiées (mis à jour par le workflow) |
| `docs/` | Circuit hebdomadaire, Pinterest, 40 idées d'articles |

## Identité visuelle

Palette « Terre de Dakar » : fond sable clair `#F7F0E6`, terracotta `#B4532F` (couleur principale), ocre `#D49A2A`, indigo `#1E2A47`, vert baobab `#52693A`. Polices hébergées avec le site : **Fraunces** (titres) et **Source Sans 3** (texte), via Fontsource ; les versions TTF de `assets/polices/` servent aux épingles. Logo : `public/logo.svg`. Thème : `src/theme.css`.

Animations propres à Keur Déco (`src/animations.ts`, styles dans `src/site.css`) :

- **porte en arche** (accueil) : l'image d'ambiance apparaît dans la porte du logo, qui s'ouvre au défilement jusqu'à remplir l'écran (« Entrez, vous êtes chez vous ») ; des objets dessinés (jarre, panier, coussin, feuille, perles) flottent et suivent la souris ;
- **visite de la maison** : les pièces défilent de côté pendant qu'on descend, avec compteur « 01 / 07 » et barre de progression ;
- **coupons de tissu** : les matières sont des coupons aux bords crantés, qui se soulèvent et pivotent, motif animé (`build/motifs.ts`), étiquette cousue ;
- **coutures** : lignes de motifs bogolan qui se dessinent trait par trait entre les sections ;
- **rideau de kente** entre les pages : des bandes de tissu tombent l'une après l'autre puis redescendent ;
- **essayez le tissu** (`build/essayage.ts`) : un salon dessiné ; un clic sur une pastille (wax, bogolan, kente, indigo, raphia) propage le nouveau motif en cercle sur le canapé, les coussins et le mur ;
- **cartes qui s'ouvrent en grand** : l'image d'une carte d'article s'agrandit jusqu'à devenir la couverture de l'article (View Transitions entre pages, navigateurs récents ; ailleurs, navigation normale) ;
- titres révélés mot par mot, apparitions au défilement, cartes en arche qui s'inclinent, liens soulignés d'un fil.

« Réduire les animations » (réglage du système) coupe tout ce qui bouge ; sans JavaScript, les pages restent complètes.

## Ajouter un article

Le circuit complet est décrit dans [`docs/workflow.md`](docs/workflow.md).

```bash
npm run nouvel-article -- ambiance salon-indigo-lin    # ou top, ou guide
```

En-tête commun (YAML) :

```yaml
titre: "Salon terracotta et wax : 5 idées"
description: "70 à 180 caractères : chapô, description Google et Pinterest."
publie_le: 2026-10-05          # publié quand la date est passée (heure de Paris)
type: ambiance                 # ambiance | top | guide
pieces: [salon]                # identifiants de src/taxonomie.ts
matieres: [wax]
occasions: []
image: salon-terracotta-wax    # nom après npm run images
image_alt: "Description précise de l'image"
image_ia: true                 # affiche la mention « Image d'ambiance créée par IA… »
produits: [coussin-wax-cercles-safran]
epingles: ["Titre 1", "Titre 2", "Titre 3"]   # 3 à 8 titres d'épingles
tableau_pinterest: salon       # clé de config/tableaux-pinterest.json
```

Selon le type :

- **ambiance** : `hotspots: [{ produit, x, y }]` en % de l'image (`npm run hotspots -- <slug>` pour les placer à la souris). Chaque point est un bouton numéroté accessible qui ouvre une carte (nom, type d'objet, « Voir sur Amazon ») ; la liste « Dans le même esprit » reprend tous les produits sous l'image (repli sans JavaScript).
- **top** : `classement: [{ produit, pourquoi, a_savoir }]` (5 à 10), données structurées `ItemList`. `{{classement}}` dans le texte place le classement.
- **guide** : `{{produit: <id>}}` seul sur une ligne insère un encadré produit ; sommaire automatique.

Les articles sont publiés à leur date : le site est reconstruit à chaque push sur `main` et **chaque lundi à 5 h UTC**.

### Images

```bash
npm run images -- ~/Images/nouvelles     # <nom>.png|jpg → images du site, image de partage, source HD
```

Produit `public/images/articles/<nom>-800.webp` et `-1600.webp` (proportions conservées), `public/images/partage/<nom>.jpg` (1200 × 630) et `contenu/images/<nom>.jpg` (2400 px max, pour les épingles), et enregistre les dimensions dans `src/data/images.json`. Les trois articles de départ utilisent des **illustrations provisoires** dessinées par `scripts/illustrations-provisoires.ts`, à remplacer par les images OpenArt.

### Rapport de build

Chaque build affiche : les articles programmés à venir, les produits `a_selectionner` (avec les articles concernés), les produits actifs non vérifiés depuis plus de 60 jours, et un avertissement pour chaque article qui cite des produits masqués.

## Produits

`src/data/produits.json` : `id`, `asin` (ou `null`), `nom`, `type_objet`, `matieres[]`, `couleurs[]`, `pieces[]`, `statut` (`a_selectionner` | `actif` | `indisponible`), `verifie_le`.

Comme sur OptiLED : les produits sont relevés à la main sur Amazon.fr, sans API ni synchronisation automatique. Vérification mensuelle (disponibilité) : le rapport de build liste les produits non vérifiés depuis plus de 60 jours.

Règles (vérifiées par les tests) :

- **Jamais d'ASIN, de note, d'avis ni de prix inventés** ; aucun prix affiché.
- Un produit `a_selectionner` ou `indisponible` n'est jamais affiché.
- **Aucune photo Amazon** : chaque carte produit montre une icône du type d'objet.
- Liens : `https://www.amazon.fr/dp/<ASIN>?tag=keurdeco-21`, `rel="sponsored nofollow noopener"`, `target="_blank"`.
- La mention Partenaires figure près des liens, dans le pied de page et les mentions légales.

Tests : format d'ASIN (`/^[A-Z0-9]{10}$/`), unicité des identifiants, produits référencés existants, `verifie_le` pour tout produit actif, points entre 0 et 100 %, images existantes avec texte alternatif, tableaux Pinterest existants, liens internes valides.

## Pinterest

Tout est détaillé dans [`docs/pinterest.md`](docs/pinterest.md), y compris les étapes à faire à la main.

- **Sur le site** : Open Graph complet + données structurées `Article` (Rich Pins), balise `p:domain_verify` (variable `PINTEREST_VERIFY`), bouton « Épingler » sans script externe.
- **Au build** (`scripts/epingles.ts`, sharp) : pour chaque article publié, une épingle 1000 × 1500 JPG par titre de `epingles[]`, 4 gabarits qui alternent (bandeau haut, bandeau bas, cadre, split) ; sortie `public/epingles/<slug>-<n>.jpg` et manifeste `epingles.json` (slug, image, titre, description avec mots-clés, lien avec `utm_source=pinterest`, tableau).
- **Publication** (`scripts/pinterest-publier.mjs`, workflow quotidien 7 h 17 UTC) : lit le manifeste publié et `data/pinterest-etat.json`, publie au plus 5 épingles (config) sans deux épingles du même article le même jour, `POST /v5/pins` avec `media_source` `image_url`, tableau choisi via `config/tableaux-pinterest.json`, puis commit de l'état sur `main`. OAuth : `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, `PINTEREST_REFRESH_TOKEN` (jeton d'accès renouvelé automatiquement). `PINTEREST_SANDBOX=1` : `https://api-sandbox.pinterest.com`. Sans secrets : mode à blanc.
- **`npm run pinterest:auth`** : serveur local (http://localhost:8085/) qui mène le parcours OAuth complet et affiche le refresh token, les tableaux et un formulaire d'épingle de démonstration (pour la vidéo exigée par Pinterest).

## Déploiement (GitHub Pages)

`.github/workflows/pages.yml` : à chaque push sur `main`, chaque lundi à 5 h UTC et à la demande : `npm ci`, tests, build (épingles comprises), test de bout en bout Chromium, puis déploiement GitHub Pages.

Réglages facultatifs (*Settings* › *Secrets and variables* › *Actions* › *Variables*) : `SITE_URL` (par défaut `https://teiki5320.github.io/Keurdeco/`), `PLAUSIBLE_DOMAIN` (mesure d'audience sans cookie, par exemple `www.keurdeco.fr`), `PINTEREST_VERIFY`.

Première mise en route : *Settings* › *Pages* › *Source* = **GitHub Actions**.

Autre workflow : `pinterest.yml` (quotidien, 7 h 17 UTC).

## Domaine personnalisé (plus tard : IONOS + GitHub Pages)

Pour l'instant, le site est servi à l'adresse GitHub Pages. Le jour où le domaine `www.keurdeco.fr` est acheté :

- **DNS IONOS** : 4 enregistrements **A** sur `@` vers 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153, et un **CNAME** `www` → `teiki5320.github.io`. Conserver les enregistrements de messagerie existants (MX, SPF, DKIM, DMARC). Attention : en ajoutant un enregistrement A sur `@`, IONOS propose d'en créer aussi un pour `www` ; choisir « Ne pas ajouter l'enregistrement DNS pour www ».
- **GitHub** : *Settings* → *Pages* → *Custom domain* = `www.keurdeco.fr`, puis cocher *Enforce HTTPS* une fois le certificat émis. Créer le fichier `public/CNAME` contenant `www.keurdeco.fr`.
- **Code** : remplacer l'adresse par défaut par `https://www.keurdeco.fr/` dans `build/config.ts`, `scripts/pinterest-publier.mjs` et les deux workflows (ou définir la variable `SITE_URL`), et remettre « keurdeco.fr » dans la signature des épingles (`scripts/epingles.ts`).
- Le renouvellement du domaine se fait dans IONOS.

## Pages légales

`mentions-legales.html` (ALOHASH SAS, hébergeur GitHub Pages, mention Partenaires Amazon, images créées par IA), `confidentialite.html` (aucun cookie, Plausible facultatif), et un paragraphe sur les liens affiliés dans `a-propos.html`. Si la mesure d'audience est activée, rien à changer : la politique la décrit déjà.
