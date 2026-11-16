/**
 * Anciennes pages de Tops (racine du site) remplacées par les pages Top 10 (top-10/<sujet>).
 *
 * GitHub Pages ne sait pas faire de redirection 301 : chaque ancienne adresse reste en ligne comme une petite
 * page de renvoi (adresse canonique + redirection immédiate + lien visible). Ces articles ne sont plus publiés
 * comme des articles : ni listes, ni flux RSS, ni plan du site, ni épingles ; seul le renvoi demeure.
 * Valeur : adresse de destination, relative à la racine du site ; « top-10/ » quand aucun onglet ne traite le même sujet.
 */
import { NOM_SITE, SITE_URL } from './config.ts';

export const RENVOIS_TOPS: Record<string, string> = {
  'top-coussins-wax': 'top-10/coussins-imprimes-africains',
  'top-luminaires-tresses': 'top-10/luminaires-fibres-naturelles',
  'top-nappes-wax': 'top-10/nappes-sets-de-table',
  'top-paniers-tresses-africains': 'top-10/paniers-tresses-africains',
  'top-rangements-tresses-rentree': 'top-10/paniers-tresses-africains',
  'top-cadeaux-deco-africaine': 'top-10/',
  'top-terre-cuite-deco': 'top-10/',
};

/** Page de renvoi (sans marqueurs : ni en-tête du site, ni annonce). Pas de noindex, pour que Google transfère bien la page. */
export function sourcePageRenvoi(destination: string, url = SITE_URL): string {
  const adresse = `${url}${destination}`;
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cette page a déménagé · ${NOM_SITE}</title>
    <meta name="adresse-canonique" content="${destination}" />
    <link rel="canonical" href="${adresse}" />
    <meta http-equiv="refresh" content="0; url=${adresse}" />
  </head>
  <body>
    <main id="contenu"><h1>Cette page a déménagé</h1><p><a href="${adresse}">Voir le Top 10 à sa nouvelle adresse</a></p></main>
  </body>
</html>
`;
}

/** Pages de renvoi : nom de fichier → contenu. */
export function pagesRenvois(url = SITE_URL): Map<string, string> {
  return new Map(Object.entries(RENVOIS_TOPS).map(([slug, dest]) => [`${slug}.html`, sourcePageRenvoi(dest, url)]));
}
