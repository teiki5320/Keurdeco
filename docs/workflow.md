# Circuit hebdomadaire d'un article

Un article par semaine, publié le lundi. Tout ce qui suit l'étape 5 est automatique.

```
idée ─► produits ─► image ─► points cliquables ─► commit sur main
                                                      │
        lundi 5 h UTC : reconstruction du site ◄──────┘
                │   (l'article dont la date est passée est publié,
                │    ses épingles sont générées)
                ▼
        chaque jour 7 h 17 UTC : publication Pinterest (5 épingles max,
        une seule par article et par jour) ─► fichier d'état commité sur main
```

## 1. Je choisis une idée

Dans `docs/idees-articles.md` (classées par type et par saison). Penser au calendrier : une idée de saison se publie 4 à 8 semaines avant l'événement, le temps que Pinterest diffuse les épingles.

Créer le fichier : `npm run nouvel-article -- <ambiance|top|guide> <slug>`. La date proposée est le premier lundi libre.

## 2. Claude sélectionne les produits sur Amazon.fr et remplit produits.json

- Chercher sur Amazon.fr des produits réels, cohérents avec l'ambiance, bien notés et disponibles.
- Pour chacun : `id` (slug), `asin` **relevé sur la fiche produit** (jamais inventé), `nom` court et en français, `type_objet`, `matieres`, `couleurs`, `pieces`, `statut: "actif"`, `verifie_le` (date du jour).
- Tant qu'un ASIN n'est pas vérifié : `statut: "a_selectionner"`, `asin: null` (le produit n'est pas affiché ; le build le signale).
- Aucune note, aucun avis, aucun prix, aucune photo reprise d'Amazon.

## 3. Image d'ambiance (OpenArt)

- Claude propose une consigne (prompt) et **annonce le coût en crédits**, puis **attend l'accord**. Une seule variante.
- Format conseillé : paysage 3:2, grande définition (les épingles sont recadrées en portrait 2:3 dans l'image : garder le sujet au centre).
- Conversion : placer le fichier dans un dossier puis `npm run images -- <dossier>`. Le nom du fichier devient le champ `image` de l'article.
- Dans l'article : `image_ia: true` et un `image_alt` précis.

## 4. Points cliquables (articles « ambiance »)

`npm run hotspots -- <slug>`, puis ouvrir http://localhost:5174/ : cliquer sur chaque objet, choisir le produit, puis « Enregistrer dans l'article » (ou copier le bloc YAML).

## 5. Commit sur main

`npm test && npm run build` (le rapport de build liste les articles programmés, les produits à sélectionner et ceux à revérifier), puis commit et push sur `main`.

Ensuite, sans rien faire :

- **le lundi suivant la date de publication** (5 h UTC), le site est reconstruit : l'article est publié, ses épingles (une par titre de la liste `epingles`) sont générées et le manifeste `epingles.json` est mis en ligne ;
- **chaque jour à 7 h 17 UTC**, le workflow Pinterest publie jusqu'à 5 épingles (jamais deux du même article le même jour), puis enregistre l'état sur `main` ;
- **chaque mois**, comme sur OptiLED, on revérifie à la main que les produits sont toujours vendus (le rapport de build liste ceux non vérifiés depuis plus de 60 jours) ; un produit qui n'est plus vendu passe en `indisponible`.

Pour publier un article tout de suite sans attendre le lundi : Actions › « Publier sur GitHub Pages » › *Run workflow* (après la date prévue).
