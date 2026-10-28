# Améliorations techniques de Keur Déco

Domaine : www.keurdeco.com · Technologie : site statique généré par Vite 8 et TypeScript (sans framework), hébergé sur GitHub Pages, mis en ligne par GitHub Actions (`.github/workflows/pages.yml`), domaine chez Cloudflare (DNS seulement) · 28 octobre 2026

## Par où commencer

1. **Le test de bout en bout avant chaque mise en ligne (point 36).** C'est lui qui empêche de publier une page cassée, un script externe inattendu ou une photo Amazon par erreur. Tous les autres points s'appuient dessus.
2. **Le plan du site avec images et le flux RSS (points 4 et 5).** Une heure de travail, et Google et Bing découvrent les nouvelles pages et les images plus vite. Aucun risque.
3. **Les contrôles automatiques des données Amazon (point 25).** Format des ASIN, pas de doublon, date de vérification, aucune photo Amazon : ils évitent les erreurs qui coûtent le compte Partenaires.

---

## A. Mise en ligne

### 1. Publication automatique à chaque envoi sur `main`
- Ce qui est fait : chaque envoi sur `main` lance les tests, la construction du site, le test de bout en bout, puis la mise en ligne sur GitHub Pages. Si une étape échoue, rien n'est publié.
- À quoi ça sert : évite de mettre en ligne un site cassé ; plus besoin de publier à la main.
- Comment savoir si un autre site en a besoin : ouvrir l'onglet Actions du dépôt ; s'il n'y a pas d'étape de test avant le déploiement, il en a besoin.
- Où regarder : `.github/workflows/pages.yml`
- État : fait et vérifié

### 2. Articles programmés publiés tout seuls
- Ce qui est fait : chaque article porte une date ; le site est reconstruit automatiquement les lundis, mercredis et vendredis à 5 h UTC, et les articles dont la date est arrivée apparaissent.
- À quoi ça sert : écrire d'avance et publier régulièrement sans y penser.
- Comment savoir si un autre site en a besoin : regarder si un article daté de demain apparaît déjà en ligne (pas de programmation) ou s'il faut un envoi manuel pour publier.
- Où regarder : `.github/workflows/pages.yml` (bloc `schedule`), `build/articles.ts` (articles publiés selon la date)
- État : fait et vérifié

### 3. Rapport de construction
- Ce qui est fait : à chaque construction, un rapport liste les articles à venir et les produits à revérifier (vérification de plus de 60 jours).
- À quoi ça sert : voir d'un coup d'œil l'avance d'articles et les produits à contrôler, sans ouvrir les fichiers.
- Comment savoir si un autre site en a besoin : lancer `npm run build` ; si rien n'indique ce qui est programmé ou à vérifier, il en a besoin.
- Où regarder : `build/rapport.ts`
- État : fait et vérifié

## B. Google et référencement

### 4. Plan du site avec dates et images
- Ce qui est fait : `sitemap.xml` est créé à la construction, sans la page 404. Chaque page a sa date de dernière modification, tirée de l'historique git. Les images d'ambiance de chaque page y figurent, en version 1600 px.
- À quoi ça sert : Google et Bing trouvent toutes les pages et leurs images, et savent lesquelles ont changé.
- Comment savoir si un autre site en a besoin : ouvrir `https://<domaine>/sitemap.xml` ; vérifier qu'il existe, qu'il a des `<lastmod>` et des balises `<image:image>`.
- Où regarder : `build/site.ts` (fonctions `sitemap`, `datesSitemap`, `imagesDePage`)
- État : fait et vérifié (lu par Google le 28/10/2026)

### 5. Flux RSS
- Ce qui est fait : `feed.xml` contient les 30 dernières publications (articles et conseils), avec leur image. Chaque page le signale dans son en-tête. Il est déclaré comme second plan du site dans Search Console et Bing.
- À quoi ça sert : les moteurs repèrent plus vite les nouveautés ; les lecteurs peuvent s'abonner.
- Comment savoir si un autre site en a besoin : ouvrir `https://<domaine>/feed.xml` ; s'il n'existe pas, il en a besoin.
- Où regarder : `build/site.ts` (fonction `fluxRss`, lien `alternate` dans `head`)
- État : fait et vérifié (Google y a trouvé 31 adresses le 28/10/2026)

### 6. robots.txt
- Ce qui est fait : `robots.txt` est créé à la construction, autorise tout et indique l'adresse du plan du site.
- À quoi ça sert : les robots trouvent le plan du site sans qu'on le leur signale.
- Comment savoir si un autre site en a besoin : ouvrir `https://<domaine>/robots.txt` et chercher la ligne `Sitemap:`.
- Où regarder : `build/site.ts` (recherche « robots.txt »)
- État : fait et vérifié

### 7. Balise canonique, Open Graph et image de partage sur chaque page
- Ce qui est fait : chaque page reçoit son adresse officielle (canonique), ses balises Open Graph et Twitter et une image de partage de 1 200 × 630 px. Une page peut désigner une autre adresse canonique ; par exemple, l'entrée du Top 10 renvoie à son premier onglet.
- À quoi ça sert : évite les doublons aux yeux de Google ; donne de beaux aperçus quand on partage un lien.
- Comment savoir si un autre site en a besoin : afficher le code source d'une page et chercher `rel="canonical"` et `og:image`.
- Où regarder : `build/site.ts` (fonction `referencement`), `public/images/partage/`
- État : fait et vérifié

### 8. Données structurées
- Ce qui est fait : selon la page, les données suivantes sont ajoutées :
  - WebSite et Organization pour l'accueil ;
  - Article et fil d'Ariane (BreadcrumbList) pour les articles et les conseils ;
  - ItemList pour les classements ;
  - FAQPage pour les conseils.
  Les conseils ont aussi une image dans leurs données Article.
- À quoi ça sert : résultats enrichis dans Google, fil d'Ariane affiché, Rich Pins sur Pinterest.
- Comment savoir si un autre site en a besoin : tester une page sur https://search.google.com/test/rich-results.
- Où regarder : `build/site.ts`, `build/articles.ts`, `build/conseils.ts`, `build/articles-veille.ts`
- État : fait et vérifié (le fil d'Ariane est reconnu dans Search Console)

### 9. Titres et descriptions de bonne longueur, vérifiés par un test
- Ce qui est fait : les titres longs sont coupés proprement à 60 caractères, à la fin d'un mot. Un test vérifie que chaque page indexable a un titre de 60 caractères au plus et une description de 70 à 160 caractères.
- À quoi ça sert : Google n'affiche pas de titre tronqué n'importe où ; une erreur de longueur est repérée avant la mise en ligne.
- Comment savoir si un autre site en a besoin : regarder les titres dans Search Console ou mesurer quelques `<title>` ; s'il n'y a pas de test, il en a besoin.
- Où regarder : `build/config.ts` (fonctions `couperTexte`, `titrePage`), `build/site.test.ts`
- État : fait et vérifié

### 10. Liens internes « en boucle »
- Ce qui est fait : les blocs « À lire aussi », « Voir aussi » et « Autres actus » proposent les pages suivantes de la liste et reviennent au début une fois arrivés au bout. Ainsi, chaque page reçoit au moins 3 liens du reste du site.
- À quoi ça sert : aucune page n'est oubliée par Google faute de liens vers elle.
- Comment savoir si un autre site en a besoin : compter les liens qui pointent vers les pages les plus anciennes ; si certaines en ont 0 à 2, il en a besoin.
- Où regarder : `build/config.ts` (fonction `suivantsEnBoucle`), `build/conseils.ts`, `build/rubriques.ts`, `build/articles-veille.ts`
- État : fait et vérifié (audit en ligne du 28/10/2026)

### 11. Signalement à Bing par IndexNow
- Ce qui est fait : après les publications programmées et après chaque reconstruction de la veille, un script envoie les adresses du plan du site à IndexNow. Ce service prévient Bing et d'autres moteurs. La clé publique est servie à la racine du site.
- À quoi ça sert : Bing explore les nouvelles pages en quelques heures au lieu de quelques semaines.
- Comment savoir si un autre site en a besoin : chercher un fichier `<clé>.txt` à la racine du site et un script IndexNow dans le dépôt.
- Où regarder : `scripts/indexnow.mjs`, `public/c221134c9925a6a68046cfffb8269dcf.txt`, `.github/workflows/pages.yml` (tâche `indexnow`)
- État : fait et vérifié

### 12. Page 404 non indexée et pages de service exclues
- Ce qui est fait : la page 404 porte `noindex`, fonctionne depuis n'importe quelle adresse grâce à une balise `<base>`, et n'est pas dans le plan du site. Les pages de renvoi des actus sont aussi en `noindex`.
- À quoi ça sert : Google n'indexe pas de page d'erreur ni de page vide.
- Comment savoir si un autre site en a besoin : ouvrir une adresse qui n'existe pas et regarder si la page propose des liens et porte `noindex`.
- Où regarder : `404.html`, `build/site.ts` (`transformerPage`, `sitemap`), `scripts/e2e.mjs`
- État : fait et vérifié

### 13. Vérifications de propriété réglables sans toucher au code
- Ce qui est fait : les balises de vérification Google et Pinterest viennent de variables du dépôt GitHub (`GOOGLE_VERIFY`, `PINTEREST_VERIFY`).
- À quoi ça sert : changer de compte ou de code sans modifier le site.
- Comment savoir si un autre site en a besoin : chercher si le code de vérification est écrit en dur dans une page.
- Où regarder : `build/site.ts` (fonctions `verificationGoogle`, `verificationPinterest`), `.github/workflows/pages.yml` (`env`)
- État : fait et vérifié

## C. Vitesse

### 14. Images responsives en WebP (400, 800, 1600 px)
- Ce qui est fait : chaque image d'ambiance existe en WebP en trois largeurs. Les pages utilisent `srcset` et `sizes`, la largeur et la hauteur, `loading="lazy"` et `decoding="async"`. Une seule image est chargée en priorité (`fetchpriority="high"`). Un test vérifie que les trois tailles existent.
- À quoi ça sert : un téléphone télécharge une petite image ; aucune image ne fait sauter la page en se chargeant.
- Comment savoir si un autre site en a besoin : regarder dans les outils du navigateur le poids des images d'une page sur téléphone ; chercher `srcset` dans le code.
- Où regarder : `scripts/images.ts` (`npm run images`), `build/images.ts` (fonction `imageArticle`), `src/data/images.json`, `build/contenu.test.ts`
- État : fait et vérifié

### 15. Polices hébergées sur le site et préchargées
- Ce qui est fait : les polices Fraunces et Source Sans 3 sont servies par le site lui-même (paquets fontsource), en sous-ensemble latin, et préchargées dans l'en-tête de chaque page.
- À quoi ça sert : pas d'appel à Google Fonts, et le texte ne « saute » pas quand la police arrive.
- Comment savoir si un autre site en a besoin : chercher `fonts.googleapis.com` dans le code ; chercher `rel="preload"` et `as="font"`.
- Où regarder : `package.json` (`@fontsource-variable/...`), `build/site.ts` (fonction `pluginPrechargePolices`)
- État : fait et vérifié

### 16. Code AdSense chargé après l'affichage
- Ce qui est fait : le script AdSense (environ 300 Ko) n'est chargé que sur les pages qui ont des annonces. Il arrive au premier geste du visiteur (défilement, toucher, clavier, souris) ou au plus tard après 4 secondes.
- À quoi ça sert : la page s'affiche aussi vite que sans publicité ; les annonces, toujours plus bas dans le texte, ont le temps de se charger.
- Comment savoir si un autre site en a besoin : chercher `<script async src="https://pagead2.googlesyndication.com` dans le `<head>` des pages.
- Où regarder : `build/site.ts` (fonctions `codeAdsense`, `pageAvecAdsense`)
- État : fait et vérifié (en ligne depuis le 28/10/2026 ; effet sur l'examen AdSense : à vérifier)

### 17. Site installable et lisible hors ligne (service worker)
- Ce qui est fait :
  - un service worker sert les pages « réseau d'abord » ;
  - il sert les fichiers fixes et les images « cache d'abord » ;
  - son numéro de version change à chaque publication, ce qui vide l'ancien cache ;
  - un manifeste rend le site installable.
- À quoi ça sert : les visites suivantes sont plus rapides ; le site reste consultable sans réseau.
- Comment savoir si un autre site en a besoin : chercher `sw.js` et `manifest.webmanifest` à la racine du site.
- Où regarder : `build/sw.js`, `public/manifest.webmanifest`, `build/site.ts` (remplacement de `__VERSION__`)
- État : fait et vérifié (contrôlé par le test de bout en bout)

### 18. Scripts tiers limités au strict nécessaire
- Ce qui est fait : le seul script externe autorisé est AdSense. Le bouton « Épingler » est un simple lien sans script Pinterest. La mesure d'audience (Plausible ou Cloudflare) est facultative et sans cookie. Le test de bout en bout échoue si un autre script externe se charge.
- À quoi ça sert : page légère, pas de pistage caché, pas de panne venue d'un service extérieur.
- Comment savoir si un autre site en a besoin : dans l'onglet Réseau du navigateur, filtrer sur « JS » et regarder les domaines.
- Où regarder : `scripts/e2e.mjs` (« aucun script externe chargé »), `build/site.ts` (fonction `mesureAudience`)
- État : fait et vérifié

## D. Accessibilité

### 19. Lien « Aller au contenu » et focus visible
- Ce qui est fait : chaque page commence par un lien « Aller au contenu ». Un style de focus visible est appliqué au clavier.
- À quoi ça sert : une personne au clavier ou avec un lecteur d'écran saute le menu.
- Comment savoir si un autre site en a besoin : ouvrir une page et appuyer sur Tab ; le premier élément doit être « Aller au contenu ».
- Où regarder : `build/site.ts` (fonction `header`, classe `evitement`), `src/site.ts` (fonction `lienEvitement`), `src/site.css` (`:focus-visible`)
- État : fait et vérifié

### 20. Animations coupées si le visiteur le demande
- Ce qui est fait : toutes les animations respectent le réglage « Réduire les animations » du système. Le test vérifie aussi que l'accueil n'a pas de boucle d'animation permanente.
- À quoi ça sert : confort des personnes sensibles au mouvement ; moins de batterie consommée.
- Comment savoir si un autre site en a besoin : chercher `prefers-reduced-motion` dans le CSS et le JavaScript.
- Où regarder : `src/animations.ts`, `src/nuancier.ts`, `src/site.css`, `src/nuancier.css`
- État : fait et vérifié

### 21. Survols réservés à la souris
- Ce qui est fait : les effets de survol qui déplacent une carte ne s'appliquent qu'aux appareils avec souris (`@media (hover: hover) and (pointer: fine)`).
- À quoi ça sert : sur téléphone, un seul toucher suffit pour ouvrir un lien ; sinon il en faut deux.
- Comment savoir si un autre site en a besoin : sur un téléphone, toucher une carte ; si le premier toucher ne fait que l'animer, il en a besoin.
- Où regarder : `src/site.css` (recherche « hover: hover »)
- État : fait et vérifié

### 22. Points cliquables accessibles et page lisible sans JavaScript
- Ce qui est fait : les points cliquables sur les images ont une étiquette (« Objet 1 : … ») et un état ouvert ou fermé (`aria-expanded`), et se ferment avec Échap. Sans JavaScript, les points sont masqués et la liste complète des produits s'affiche.
- À quoi ça sert : utilisable au clavier et par lecteur d'écran ; rien ne manque si le JavaScript ne se charge pas.
- Comment savoir si un autre site en a besoin : désactiver JavaScript et ouvrir une page ; vérifier que tout le contenu reste là.
- Où regarder : `src/site.ts` (fonction `pointsCliquables`), `scripts/e2e.mjs` (« sans JavaScript »)
- État : fait et vérifié

### 23. Un seul titre principal, textes alternatifs obligatoires, pas d'identifiant en double
- Ce qui est fait : le test de bout en bout vérifie un seul `h1` par page et aucun identifiant en double sur l'accueil. Un test refuse une image sans texte alternatif.
- À quoi ça sert : une structure claire pour les lecteurs d'écran et pour Google.
- Comment savoir si un autre site en a besoin : compter les `<h1>` d'une page ; chercher des `<img>` sans `alt`.
- Où regarder : `scripts/e2e.mjs`, `build/contenu.test.ts`, `src/data/textes-alternatifs.json`
- État : fait et vérifié

### 24. Espaces insécables de la typographie française
- Ce qui est fait : des espaces insécables sont ajoutées automatiquement devant « ; ? ! : », dans les guillemets et entre un nombre et son unité.
- À quoi ça sert : pas de « ? » ou de « € » seul en début de ligne, surtout sur téléphone.
- Comment savoir si un autre site en a besoin : réduire la fenêtre et chercher un signe de ponctuation rejeté en début de ligne.
- Où regarder : `src/typo.ts`, `build/site.ts` (`insecables`)
- État : fait et vérifié

## E. Monétisation et liens partenaires

### 25. Liens Amazon centralisés et contrôlés
- Ce qui est fait :
  - l'identifiant de suivi est défini à un seul endroit ;
  - chaque lien est construit par une fonction qui refuse un ASIN mal formé ;
  - les liens portent `rel="sponsored nofollow noopener"` et s'ouvrent dans un nouvel onglet ;
  - des tests vérifient le format et l'unicité des ASIN, la date de vérification des produits actifs et l'absence de champ « image ».
- À quoi ça sert : changer d'identifiant en une ligne ; aucun lien cassé ni produit inventé ; liens déclarés comme sponsorisés pour Google.
- Comment savoir si un autre site en a besoin : chercher combien de fois l'identifiant `tag=` est écrit dans le code ; s'il apparaît à plusieurs endroits, il en a besoin.
- Où regarder : `src/amazon.ts`, `src/amazon.test.ts`, `build/contenu.test.ts`, `src/data/produits.json`
- État : fait et vérifié

### 26. Mention Partenaires et notes sous chaque bouton
- Ce qui est fait :
  - la mention officielle du programme figure près des liens, dans le pied de page et dans les mentions légales ;
  - sous chaque bouton, une ligne indique « Lien partenaire Amazon… » et une autre « Illustration IA… » ;
  - le test de bout en bout vérifie la présence de la mention.
- À quoi ça sert : respecter les règles du programme Partenaires (texte exact exigé : à vérifier dans les conditions d'Amazon).
- Comment savoir si un autre site en a besoin : chercher « En tant que Partenaire Amazon » dans le pied de page et à côté des liens.
- Où regarder : `src/amazon.ts` (`MENTION_AMAZON`, `NOTE_LIEN_AMAZON`, `NOTE_ILLUSTRATION_IA`), `build/site.ts` (`footer`), `scripts/e2e.mjs`
- État : fait et vérifié

### 27. Aucune photo Amazon : vignettes découpées dans nos images
- Ce qui est fait : les cartes produits montrent une vignette découpée dans nos images d'ambiance, avec la mention « Illustration IA », ou à défaut une icône du type d'objet. Un test refuse tout champ image dans les produits. Le test de bout en bout refuse toute image venant d'Amazon.
- À quoi ça sert : respecter l'interdiction de réutiliser les photos Amazon (règle du programme, à vérifier dans ses conditions).
- Comment savoir si un autre site en a besoin : dans l'onglet Réseau, filtrer les images sur « amazon » ou « media-amazon ».
- Où regarder : `scripts/vignettes-produits.ts` (`npm run vignettes`), `build/icones.ts`, `build/contenu.test.ts`, `scripts/e2e.mjs`
- État : fait et vérifié

### 28. Vérification des produits Amazon par lots
- Ce qui est fait : un script ouvre chaque fiche Amazon dans Chrome, sur l'ordinateur et non sur GitHub. Si le bouton d'achat est présent, la date de vérification est mise à jour ; sinon, le produit passe « indisponible » et disparaît du site. Il peut travailler par petits lots, en commençant par les produits vérifiés il y a le plus longtemps.
- À quoi ça sert : ne pas envoyer les lecteurs vers des produits épuisés ; rien n'est inventé, seul l'état lu sur la fiche est enregistré.
- Comment savoir si un autre site en a besoin : chercher dans les données une date de dernière vérification par produit.
- Où regarder : `scripts/verifier-produits.mjs` (`npm run verifier-produits`)
- État : fait et vérifié

### 29. Emplacements AdSense choisis à la main
- Ce qui est fait :
  - pas d'annonces automatiques ;
  - 2 emplacements au plus par article et 1 par conseil, placés devant un intertitre, jamais collés à un encadré Amazon et signalés « Annonce » ;
  - aucune annonce sur l'accueil, les Tops, les actus, les pages légales et la 404 ;
  - `ads.txt` est servi à la racine, et une balise `google-adsense-account` figure sur toutes les pages.
- À quoi ça sert : les annonces ne gênent ni la lecture ni les liens Amazon ; le compte est reconnu par Google.
- Comment savoir si un autre site en a besoin : ouvrir `https://<domaine>/ads.txt` ; vérifier si les annonces automatiques sont activées dans AdSense.
- Où regarder : `build/annonces.ts`, `build/annonces.test.ts`, `build/site.ts` (`compteAdsense`, `pageAvecAdsense`), `public/ads.txt`
- État : fait, non vérifié (site encore en examen chez AdSense au 28/10/2026, aucune annonce affichée)

## F. Réseaux sociaux et partage

### 30. Épingles Pinterest générées à la construction
- Ce qui est fait :
  - pour chaque article publié, des images de 1 000 × 1 500 px sont créées à partir de nos images d'ambiance : titre en surimpression, logo, quatre gabarits qui alternent ;
  - un manifeste liste chaque épingle avec son lien, qui porte `utm_source=pinterest` ;
  - des tests limitent les titres à 100 caractères et vérifient que chaque article a son tableau Pinterest.
- À quoi ça sert : des épingles prêtes sans travail manuel, uniquement avec nos visuels ; les visites venues de Pinterest sont mesurables.
- Comment savoir si un autre site en a besoin : chercher un dossier `epingles/` et un manifeste dans le site publié.
- Où regarder : `scripts/epingles.ts` (`npm run epingles`), `public/epingles.json`, `config/tableaux-pinterest.json`, `build/contenu.test.ts`
- État : fait et vérifié

### 31. Publication automatique sur Pinterest par l'API
- Ce qui est fait :
  - une tâche GitHub publie chaque jour 5 épingles par l'API Pinterest ;
  - elle garde la trace des épingles publiées dans un fichier, enregistré sur `main` ;
  - elle propose un mode « à blanc » pour tester sans publier ;
  - elle ouvre un ticket quand Pinterest renvoie une nouvelle clé de connexion (refresh token).
- À quoi ça sert : une présence régulière sur Pinterest sans y penser.
- Comment savoir si un autre site en a besoin : regarder si les épingles sont publiées à la main.
- Où regarder : `.github/workflows/pinterest.yml`, `scripts/pinterest-publier.mjs`, `scripts/pinterest-lib.mjs`, `scripts/pinterest-auth.mjs`, `data/pinterest-etat.json`, `docs/pinterest.md`
- État : fait et vérifié (60 épingles publiées au 28/10/2026)

### 32. Bouton « Épingler » sans script, Rich Pins et images de partage
- Ce qui est fait : le bouton « Épingler » est un simple lien vers Pinterest. Les données Article et les balises Open Graph alimentent les Rich Pins. Chaque article a son image de partage de 1 200 × 630 px.
- À quoi ça sert : partage propre sur Pinterest, Facebook et WhatsApp, sans script tiers.
- Comment savoir si un autre site en a besoin : coller l'adresse d'un article dans une conversation WhatsApp et regarder l'aperçu.
- Où regarder : `build/config.ts` (fonction `lienPinterest`), `build/site.ts` (`referencement`), `public/images/partage/`
- État : fait et vérifié

## G. Sécurité et vie privée

### 33. Consentement aux cookies par le message de Google
- Ce qui est fait : la fenêtre de choix des cookies est celle de Google (Confidentialité et messages, réglée dans AdSense), avec un bouton « Refuser ». Un lien « Gérer mes cookies » la rouvre. Sans JavaScript, ou si Google n'est pas chargé, ce lien mène à la politique de confidentialité.
- À quoi ça sert : respecter le RGPD pour les cookies publicitaires ; aucun cookie déposé par le site lui-même (conformité exacte : à vérifier).
- Comment savoir si un autre site en a besoin : ouvrir le site en navigation privée ; une fenêtre de choix doit apparaître avant toute annonce, et un lien « Gérer mes cookies » doit exister.
- Où regarder : `src/site.ts` (fonction `gererCookies`), `build/site.ts` (`footer`), `confidentialite.html`
- État : fait, non vérifié (le réglage est dans la console AdSense, pas dans le code)

### 34. Site robuste si les cookies ou la mémoire du navigateur sont bloqués
- Ce qui est fait : le test de bout en bout ouvre le site avec cookies et stockage bloqués et vérifie qu'il n'y a aucune erreur.
- À quoi ça sert : le site marche dans les navigateurs stricts et en navigation privée.
- Comment savoir si un autre site en a besoin : bloquer les cookies du site dans le navigateur et regarder la console.
- Où regarder : `scripts/e2e.mjs` (« cookies et mémoire bloqués »)
- État : fait et vérifié

### 35. Aucun secret dans le dépôt
- Ce qui est fait : les clés Pinterest sont dans les secrets GitHub et, en local, dans `.env`, jamais envoyé sur GitHub. Les réglages sans secret sont des variables du dépôt. Seule la clé IndexNow est publique, et c'est voulu.
- À quoi ça sert : un dépôt public ne divulgue aucun accès.
- Comment savoir si un autre site en a besoin : `git ls-files | grep -i env` et chercher « token » ou « secret » dans le code.
- Où regarder : `.github/workflows/pinterest.yml`, `.github/workflows/pages.yml`, `.gitignore`
- État : fait et vérifié

## H. Applications

Rien de particulier : Keur Déco n'a pas d'application iOS ni Android. Le site est seulement installable comme application web (point 17).

## I. Méthode

### 36. Test de bout en bout dans un vrai navigateur
- Ce qui est fait :
  - avant chaque mise en ligne, Playwright ouvre 18 pages au format téléphone et contrôle une soixantaine de points ;
  - il vérifie entre autres un seul `h1`, la 404, les points cliquables, la mention Amazon, l'absence de photo Amazon et le repli sans JavaScript ;
  - il couvre aussi les actus en panne, le service worker, le plan du site, robots.txt, les épingles, les scripts externes et les erreurs JavaScript.
- À quoi ça sert : empêcher de publier une régression visible.
- Comment savoir si un autre site en a besoin : regarder si `npm run test:e2e` existe et s'il est lancé dans la tâche de mise en ligne.
- Où regarder : `scripts/e2e.mjs`, `.github/workflows/pages.yml`
- État : fait et vérifié

### 37. Tests des données et de la construction
- Ce qui est fait :
  - 114 tests Vitest contrôlent les produits, les articles, les images, les liens internes, la taxonomie, le plan du site, le flux RSS, les longueurs de titres et les emplacements d'annonces ;
  - TypeScript vérifie les types à chaque construction (`tsc --noEmit`).
- À quoi ça sert : une donnée fausse (produit inexistant, image manquante, lien vers une page pas encore publiée) bloque la mise en ligne.
- Comment savoir si un autre site en a besoin : lancer `npm test` et regarder ce qui est réellement contrôlé.
- Où regarder : `build/*.test.ts`, `src/*.test.ts`, `scripts/scripts.test.ts`, `package.json`
- État : fait et vérifié

### 38. Blocs extérieurs qui ne cassent pas la page
- Ce qui est fait : les actus viennent d'un dépôt de veille extérieur. Si ce fichier est en panne, le bloc est caché, la page reste intacte et aucune erreur n'apparaît. Sans JavaScript, aucun bloc vide ne s'affiche. Tout cela est testé.
- À quoi ça sert : une panne d'un service extérieur ne se voit pas sur le site.
- Comment savoir si un autre site en a besoin : bloquer dans le navigateur l'adresse d'un contenu extérieur et regarder la page.
- Où regarder : `src/veille.ts`, `build/veille.ts`, `scripts/e2e.mjs` (« fichier des actus en panne »)
- État : fait et vérifié

### 39. Fiches techniques tenues à jour
- Ce qui est fait : `docs/INFRA.md`, `docs/MARKETING.md`, `docs/PUBLICATION.md` et le README décrivent l'état réel du site. Ils sont mis à jour dans le même envoi que chaque changement, et une tâche du matin les compare à la réalité.
- À quoi ça sert : savoir à tout moment ce qui est en ligne, sans fouiller le code.
- Comment savoir si un autre site en a besoin : ouvrir sa fiche INFRA et comparer avec ce qui est en ligne.
- Où regarder : `docs/INFRA.md`, `docs/MARKETING.md`, `docs/PUBLICATION.md`, `README.md`, `CLAUDE.md`
- État : fait et vérifié

### 40. Outils d'aide à la création
- Ce qui est fait : des commandes préparent le travail répétitif :
  - créer un nouvel article : `npm run nouvel-article` ;
  - placer les points cliquables : `npm run hotspots` ;
  - produire les images : `npm run images` ;
  - produire les vignettes : `npm run vignettes` ;
  - produire les visuels de marque : `npm run visuels-marque` ;
  - produire les images du nuancier : `npm run nuancier-images`.
- À quoi ça sert : gagner du temps et éviter les oublis de format.
- Comment savoir si un autre site en a besoin : regarder si les images en plusieurs tailles sont faites à la main.
- Où regarder : `package.json` (`scripts`), dossier `scripts/`
- État : fait et vérifié

---

## Points faibles connus

- **Pas d'en-têtes de sécurité ni de cache long.** GitHub Pages ne permet ni CSP, ni HSTS, ni `X-Content-Type-Options`, et il impose une durée de cache de 10 minutes à tous les fichiers, même ceux qui ne changent jamais. Cela touche tout site hébergé sur GitHub Pages ; Kultiled l'est aussi au 28/10/2026. Solution : Cloudflare Pages avec un fichier `_headers`, comme Keur Cook. Le passage est prévu après la validation d'AdSense.
- **Doubles adresses.** `page` et `page.html` répondent toutes les deux. La balise canonique limite le problème, mais un passage sur Cloudflare Pages obligerait à passer aux adresses sans « .html ».
- **AdSense encore en examen.** Le site est « En préparation » depuis le 16/10/2026, et la console affiche ads.txt « Introuvable » alors que le fichier est bien servi (ancien relevé). Le chargement retardé du code (point 16) est récent : son effet sur l'examen est à vérifier le 4/11/2026.
- **Clé Pinterest à recopier à la main.** Pinterest renvoie une nouvelle clé de connexion à chaque renouvellement. La tâche ouvre alors un ticket, mais il faut recopier la clé dans le secret GitHub ; 12 tickets étaient ouverts au 28/10/2026. Ce point touche tout site qui publie sur Pinterest par l'API.
- **Vérification Amazon impossible sur les serveurs.** Amazon bloque les serveurs de GitHub et présente parfois des captchas : la vérification des produits doit tourner sur l'ordinateur, par petits lots.
- **Indexation incomplète.** Au 28/10/2026, 11 pages étaient « détectées, actuellement non indexées » par Google ; l'indexation a été demandée pour 10 d'entre elles, la 11ᵉ étant déjà indexée. Un contrôle est prévu le 04/11/2026.
- **IndexNow ne part pas après un simple envoi sur `main`.** Il part seulement après les reconstructions programmées ou à la demande. Une page corrigée un mardi n'est donc signalée à Bing que le mercredi.
- **Test de bout en bout parfois instable.** Un échec isolé a été vu le 28/10/2026 ; il est passé aux trois relances. La cause n'est pas identifiée.
- **Consentement non testé automatiquement.** La fenêtre de choix des cookies dépend d'un réglage dans la console AdSense, que les tests ne peuvent pas vérifier.
