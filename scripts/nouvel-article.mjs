// Crée un article pré-rempli selon son type.
// Usage : npm run nouvel-article -- <ambiance|top|guide> <slug>
// La date de publication proposée est le premier lundi libre après le dernier article programmé
// (le site est reconstruit chaque lundi à 5 h UTC). Le fichier n'est jamais écrasé.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RACINE = resolve(import.meta.dirname, '..');
const DOSSIER = resolve(RACINE, 'contenu/articles');
const [type, slug] = process.argv.slice(2);

if (!['ambiance', 'top', 'guide'].includes(type) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug ?? '')) {
  console.error('Usage : npm run nouvel-article -- <ambiance|top|guide> <slug-en-minuscules-avec-tirets>');
  process.exit(1);
}
const fichier = resolve(DOSSIER, `${slug}.md`);
if (existsSync(fichier)) {
  console.error(`contenu/articles/${slug}.md existe déjà.`);
  process.exit(1);
}

/** Premier lundi strictement après la plus tardive des dates : aujourd'hui, ou la dernière date programmée. */
function prochainLundi(dates, aujourdhui) {
  const derniere = [aujourdhui, ...dates].sort().at(-1);
  const d = new Date(`${derniere}T12:00:00Z`);
  do d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() !== 1);
  return d.toISOString().slice(0, 10);
}

const dates = readdirSync(DOSSIER)
  .filter((f) => f.endsWith('.md'))
  .map((f) => readFileSync(resolve(DOSSIER, f), 'utf8').match(/^publie_le:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1])
  .filter(Boolean);
const date = prochainLundi(dates, new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date()));

const commun = `titre: "À COMPLÉTER"
# 70 à 180 caractères : c'est aussi le chapô et la description pour Google et Pinterest.
description: "À COMPLÉTER : une phrase qui donne envie de lire l'article, entre soixante-dix et cent quatre-vingts caractères."
publie_le: ${date}
type: ${type}
# Identifiants : voir src/taxonomie.ts
pieces: []
matieres: []
occasions: []
# Nom de l'image après « npm run images -- <dossier> » (public/images/articles/<nom>-1600.webp)
image: ${slug}
image_alt: "À COMPLÉTER : description précise de l'image pour les personnes aveugles."
# true si l'image a été créée par IA (mention affichée sous l'image)
image_ia: true
# Identifiants de src/data/produits.json (statut a_selectionner tant que l'ASIN n'est pas choisi)
produits: []
# 3 à 8 titres d'épingles Pinterest (100 caractères max)
epingles:
  - "À COMPLÉTER"
  - "À COMPLÉTER"
  - "À COMPLÉTER"
# Rubrique de config/tableaux-pinterest.json
tableau_pinterest: general`;

const specifique = {
  ambiance: `# Points cliquables : npm run hotspots -- ${slug}
hotspots:
  - { produit: identifiant-produit, x: 50, y: 50 }`,
  top: `# 5 à 10 produits, du 1er au dernier
classement:
  - produit: identifiant-produit
    pourquoi: "Pourquoi on l'aime, en une ou deux phrases."
    a_savoir: "Ce qu'il faut savoir avant d'acheter (taille, entretien, fabrication)."`,
  guide: '',
};

const corps = {
  ambiance: `Introduction : l'ambiance en deux ou trois phrases.

## 1. Première idée

Texte.

## 2. Deuxième idée

Texte.
`,
  top: `Introduction : pourquoi ce classement, pour qui.

## Comment choisir ?

- Critère 1
- Critère 2

{{classement}}

## Où les mettre ?

Texte.
`,
  guide: `Introduction.

## Première partie

Texte. Pour insérer un encadré produit, écrire seul sur une ligne :

{{produit: identifiant-produit}}

## Deuxième partie

Texte.
`,
};

writeFileSync(fichier, `---\n${commun}\n${specifique[type] ? `${specifique[type]}\n` : ''}---\n\n${corps[type]}`);
console.log(`Créé : contenu/articles/${slug}.md (publication prévue le ${date}).`);
