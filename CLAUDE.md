# Consignes du projet Keur Déco

Site éditorial de décoration africaine (www.keurdeco.fr), rémunéré par les liens Partenaires Amazon.fr, trafic attendu depuis Pinterest et Google. Objectif prioritaire : **automatiser la chaîne, de l'article à l'épingle Pinterest publiée**.

## Règles de travail

- Travailler **uniquement sur la branche `main`** : pas d'autre branche, pas de pull request. Commits réguliers et push sur `main`.
- **Tout en français** : interface, contenus, commentaires du code, README, documentation, messages de commit.
- Vérifications avant chaque envoi : `npm test`, `npm run build`, et `npm run test:e2e` quand le rendu change (en local : `CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e`).
- Le circuit hebdomadaire d'un article est décrit dans `docs/workflow.md`.

## Amazon : règles absolues

- **Ne JAMAIS inventer d'ASIN, de note, d'avis ou de prix Amazon.** Un produit sans ASIN vérifié reste en statut `a_selectionner` (`asin: null`).
- **Ne JAMAIS télécharger, modifier ou réutiliser les photos des produits Amazon** (interdit par le programme Partenaires). Comme sur OptiLED, les produits sont relevés à la main (pas d'API Amazon). Les cartes montrent une vignette découpée dans NOS images d'ambiance créées par IA (`npm run vignettes`, mention « Illustration IA »), ou à défaut une icône du type d'objet ; jamais une photo Amazon (les images SiteStripe n'existent plus depuis décembre 2023). Sur Pinterest, uniquement nos propres visuels.
- **Aucun prix affiché.**
- L'identifiant de suivi est défini à un seul endroit : `AMAZON_TAG` dans `src/amazon.ts`.
- La mention « En tant que Partenaire Amazon, Keur Déco réalise un bénéfice sur les achats remplissant les conditions requises. » figure près des liens, dans le pied de page et dans les mentions légales.

## Génération d'images

- Utiliser **OpenArt** pour les images d'ambiance, lorsqu'il est connecté à la session.
- **Annoncer le coût en crédits et attendre l'accord** avant chaque génération ; **une seule variante** par défaut.
- Si OpenArt n'est pas disponible : le dire et demander l'accord avant d'utiliser un autre service.
- Une image créée par IA porte `image_ia: true` dans l'article (mention affichée sous l'image).

## Repères

- Articles : `contenu/articles/<slug>.md` (Markdown + en-tête YAML, voir `build/articles.ts`).
- Produits : `src/data/produits.json` ; rubriques : `src/taxonomie.ts` ; glossaire : `src/data/glossaire.json`.
- Thème (couleurs, polices) : `src/theme.css`, palette « Terre de Dakar » ; animations dans `src/animations.ts` (porte en arche, visite de la maison, coupons, coutures, rideau de kente), nuancier dans `src/nuancier.ts`.
- Conseils : `contenu/conseils/<slug>.md`, pages générées par `build/conseils.ts`.
- Service worker : modèle `build/sw.js` (version ajoutée au build).
- Pinterest : `docs/pinterest.md` ; Amazon : section Produits du README.
