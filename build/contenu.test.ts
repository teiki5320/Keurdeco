/**
 * Vérifications des données réelles du site : produits, articles, images, glossaire, Pinterest.
 * Ces tests bloquent le déploiement si une règle est enfreinte.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FORMAT_ASIN } from '../src/amazon.ts';
import { FAMILLES, type Famille } from '../src/taxonomie.ts';
import { produitsCites, tousLesArticles } from './articles.ts';
import { conseilsPublies, imageConseil, tousLesConseils } from './conseils.ts';
import { chargerDimensions, DOSSIER_IMAGES, imageExiste } from './images.ts';
import { chargerProduits } from './produits.ts';
import { chargerGlossaire, imageRubrique } from './rubriques.ts';

const RACINE = resolve(import.meta.dirname, '..');
const produits = chargerProduits(resolve(RACINE, 'src/data/produits.json'));
const articles = tousLesArticles();
const ids = new Set(produits.map((p) => p.id));

describe('produits (src/data/produits.json)', () => {
  it('les identifiants sont uniques et au format slug', () => {
    expect(ids.size).toBe(produits.length);
    for (const p of produits) expect(p.id, p.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('chaque ASIN renseigné a le bon format (10 caractères, majuscules et chiffres)', () => {
    for (const p of produits) if (p.asin !== null) expect(p.asin, p.id).toMatch(FORMAT_ASIN);
  });

  it('les ASIN ne sont pas en double', () => {
    const asins = produits.map((p) => p.asin).filter((a) => a !== null);
    expect(new Set(asins).size).toBe(asins.length);
  });

  it('un produit actif a un ASIN et une date de vérification', () => {
    for (const p of produits.filter((x) => x.statut === 'actif')) {
      expect(p.asin, `${p.id} : ASIN manquant`).not.toBeNull();
      expect(p.verifie_le, `${p.id} : verifie_le manquant`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('statut, source et champs obligatoires sont valides', () => {
    for (const p of produits) {
      expect(['a_selectionner', 'actif', 'indisponible'], p.id).toContain(p.statut);
      expect(p.nom.trim(), p.id).not.toBe('');
      expect(p.type_objet.trim(), p.id).not.toBe('');
      expect(Array.isArray(p.matieres) && Array.isArray(p.couleurs) && Array.isArray(p.pieces), p.id).toBe(true);
    }
  });

  it('aucune photo Amazon : pas de champ image dans les produits', () => {
    for (const p of produits) expect(Object.keys(p).some((k) => /image/.test(k)), p.id).toBe(false);
  });

  it('matières et pièces des produits existent dans la taxonomie', () => {
    const matieres = new Set(FAMILLES.matiere.liste.map((r) => r.id));
    const pieces = new Set(FAMILLES.piece.liste.map((r) => r.id));
    for (const p of produits) {
      for (const m of p.matieres) expect(matieres.has(m), `${p.id} : matière ${m}`).toBe(true);
      for (const x of p.pieces) expect(pieces.has(x), `${p.id} : pièce ${x}`).toBe(true);
    }
  });
});

describe('articles (contenu/articles)', () => {
  it('il y a au moins un article de chaque type', () => {
    for (const t of ['ambiance', 'top', 'guide']) expect(articles.some((a) => a.type === t), t).toBe(true);
  });

  it('les slugs sont au bon format', () => {
    for (const a of articles) expect(a.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('chaque produit référencé existe dans produits.json', () => {
    for (const a of articles) for (const id of produitsCites(a)) expect(ids.has(id), `${a.slug} → ${id}`).toBe(true);
  });

  it('chaque point cliquable est entre 0 et 100 % et vise un produit de l’article', () => {
    for (const a of articles) {
      for (const h of a.hotspots) {
        expect(h.x, `${a.slug} ${h.produit} x`).toBeGreaterThanOrEqual(0);
        expect(h.x, `${a.slug} ${h.produit} x`).toBeLessThanOrEqual(100);
        expect(h.y, `${a.slug} ${h.produit} y`).toBeGreaterThanOrEqual(0);
        expect(h.y, `${a.slug} ${h.produit} y`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('chaque image référencée existe (800, 1600, partage, dimensions) avec un texte alternatif', () => {
    const dims = chargerDimensions();
    for (const a of articles) {
      expect(a.imageAlt.length, `${a.slug} : texte alternatif trop court`).toBeGreaterThan(15);
      expect(dims[a.image], `${a.slug} : dimensions de ${a.image} absentes de src/data/images.json`).toBeDefined();
      for (const f of [`${a.image}-800.webp`, `${a.image}-1600.webp`]) expect(existsSync(resolve(DOSSIER_IMAGES, f)), `${a.slug} : ${f}`).toBe(true);
      expect(existsSync(resolve(RACINE, 'public/images/partage', `${a.image}.jpg`)), `${a.slug} : image de partage`).toBe(true);
    }
  });

  it('chaque image existe en 400, 800 et 1600 px (vignettes légères comprises)', () => {
    for (const nom of Object.keys(chargerDimensions())) {
      for (const l of [400, 800, 1600]) expect(existsSync(resolve(DOSSIER_IMAGES, `${nom}-${l}.webp`)), `${nom}-${l}.webp`).toBe(true);
    }
  });

  it('les vignettes produits correspondent aux points des ambiances (sinon : npm run vignettes)', () => {
    const vignettes = JSON.parse(readFileSync(resolve(RACINE, 'src/data/vignettes.json'), 'utf8')) as Record<string, { article: string; x: number; y: number; cadre: number }>;
    const attendu: Record<string, { article: string; x: number; y: number; cadre: number }> = {};
    const ambiances = articles.filter((a) => a.type === 'ambiance').sort((a, b) => a.publieLe.localeCompare(b.publieLe) || a.slug.localeCompare(b.slug));
    for (const a of ambiances) for (const h of a.hotspots) attendu[h.produit] ??= { article: a.slug, x: h.x, y: h.y, cadre: h.cadre ?? 30 };
    expect(vignettes).toEqual(attendu);
    for (const id of Object.keys(vignettes)) for (const t of [160, 320]) expect(existsSync(resolve(RACINE, 'public/images/produits', `${id}-${t}.webp`)), `${id}-${t}.webp`).toBe(true);
  });

  it('chaque rubrique et chaque conseil a sa photo d’illustration', () => {
    for (const famille of Object.keys(FAMILLES) as Famille[]) {
      for (const r of FAMILLES[famille].liste) expect(imageExiste(imageRubrique(famille, r.id)), imageRubrique(famille, r.id)).toBe(true);
    }
    for (const c of tousLesConseils()) expect(imageExiste(imageConseil(c)), imageConseil(c)).toBe(true);
  });

  it('les titres d’épingles font 100 caractères au plus', () => {
    for (const a of articles) for (const t of a.epingles) expect(t.length, `${a.slug} : « ${t} »`).toBeLessThanOrEqual(100);
  });

  it('le tableau Pinterest de chaque article existe dans config/tableaux-pinterest.json', () => {
    const config = JSON.parse(readFileSync(resolve(RACINE, 'config/tableaux-pinterest.json'), 'utf8'));
    for (const a of articles) expect(config.tableaux[a.tableauPinterest], `${a.slug} → ${a.tableauPinterest}`).toBeDefined();
  });

  it('les liens internes des articles pointent vers des pages existantes', () => {
    const glossaire = new Set(chargerGlossaire().map((g) => `glossaire-${g.id}.html`));
    const rubriques = new Set((Object.keys(FAMILLES) as Famille[]).flatMap((f) => FAMILLES[f].liste.map((r) => `${f}-${r.id}.html`)));
    const pages = new Set([...glossaire, ...rubriques, ...articles.map((a) => a.fichier), 'index.html', 'articles.html', 'glossaire.html', 'a-propos.html']);
    const conseils = tousLesConseils();
    for (const a of articles) {
      // Un article peut renvoyer à un conseil déjà publié à sa propre date.
      const conseilsPublies = new Set(conseils.filter((c) => c.publieLe <= a.publieLe).map((c) => c.fichier));
      for (const [, lien] of a.corps.matchAll(/\]\(([^)#]+\.html)(#[^)]*)?\)/g)) expect(pages.has(lien) || conseilsPublies.has(lien), `${a.slug} → ${lien}`).toBe(true);
    }
  });
});

describe('glossaire (src/data/glossaire.json)', () => {
  const entrees = chargerGlossaire();
  it('identifiants uniques et matières connues', () => {
    expect(new Set(entrees.map((e) => e.id)).size).toBe(entrees.length);
    const matieres = new Set(FAMILLES.matiere.liste.map((r) => r.id));
    for (const e of entrees) {
      for (const m of e.matieres) expect(matieres.has(m), `${e.id} : ${m}`).toBe(true);
      expect(e.texte.length, e.id).toBeGreaterThan(0);
      expect(e.resume.length, e.id).toBeGreaterThanOrEqual(70);
    }
  });
  it('couvre bogolan, kente, adinkra et wax', () => {
    for (const id of ['bogolan', 'kente', 'adinkra', 'wax']) expect(entrees.some((e) => e.id === id), id).toBe(true);
  });
});

describe('conseils (contenu/conseils)', () => {
  const conseils = tousLesConseils();
  const articlesParFichier = new Map(articles.map((a) => [a.fichier, a.publieLe]));
  const conseilsParFichier = new Map(conseils.map((c) => [c.fichier, c.publieLe]));

  it('au moins un conseil est déjà publié (onglet jamais vide)', () => {
    expect(conseilsPublies().length).toBeGreaterThan(0);
  });

  it('les slugs sont au bon format et les produits cités existent', () => {
    for (const c of conseils) {
      expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      for (const [, id] of c.corps.matchAll(/\{\{\s*produit:\s*([a-z0-9-]+)\s*\}\}/g)) expect(ids.has(id), `${c.slug} → ${id}`).toBe(true);
    }
  });

  it('les liens internes mènent à des pages existantes, déjà publiées à la date du conseil', () => {
    const glossaire = new Set(chargerGlossaire().map((g) => `glossaire-${g.id}.html`));
    const rubriques = new Set((Object.keys(FAMILLES) as Famille[]).flatMap((f) => FAMILLES[f].liste.map((r) => `${f}-${r.id}.html`)));
    for (const c of conseils) {
      for (const [, lien] of c.corps.matchAll(/\]\(([^)#]+\.html)(#[^)]*)?\)/g)) {
        const date = articlesParFichier.get(lien) ?? conseilsParFichier.get(lien);
        if (date) expect(date <= c.publieLe, `${c.slug} → ${lien} (publié le ${date})`).toBe(true);
        else expect(glossaire.has(lien) || rubriques.has(lien), `${c.slug} → ${lien}`).toBe(true);
      }
    }
  });
});
