/**
 * Rubriques du site : pièces, matières et styles, occasions.
 * Les identifiants servent dans l'en-tête des articles (pieces[], matieres[], occasions[])
 * et dans les adresses des pages (piece-<id>.html, matiere-<id>.html, occasion-<id>.html).
 */

export interface Rubrique {
  id: string;
  nom: string;
  /** Phrase d'accroche de la page de rubrique (70 à 180 caractères, sert aussi de description). */
  accroche: string;
}

export const PIECES: Rubrique[] = [
  { id: 'salon', nom: 'Salon', accroche: 'Idées pour un salon aux couleurs de l’Afrique : coussins en wax, paniers, tapis et bois sculpté, sans surcharger la pièce.' },
  { id: 'chambre', nom: 'Chambre', accroche: 'Une chambre douce et chaleureuse : linge de lit imprimé, tête de lit tressée, indigo et bogolan pour bien dormir.' },
  { id: 'cuisine-salle-a-manger', nom: 'Cuisine et salle à manger', accroche: 'Nappes en wax, vaisselle en terre cuite, paniers et sets de table tressés pour une table généreuse et colorée.' },
  { id: 'entree', nom: 'Entrée', accroche: 'Soigner la première impression : miroir encadré de raphia, banc sculpté, paniers de rangement et tapis d’accueil.' },
  { id: 'salle-de-bain', nom: 'Salle de bain', accroche: 'Une salle de bain qui respire : paniers à linge tressés, serviettes tissées, poteries et matières naturelles.' },
  { id: 'balcon-exterieur', nom: 'Balcon et extérieur', accroche: 'Balcon, terrasse ou jardin : poufs, lanternes, jarres en terre cuite et textiles qui supportent le grand air.' },
  { id: 'chambre-enfant', nom: 'Chambre d’enfant', accroche: 'Une chambre d’enfant gaie et rassurante : paniers à jouets, imprimés joyeux, mobiles et tapis doux.' },
];

export const MATIERES: Rubrique[] = [
  { id: 'wax', nom: 'Wax', accroche: 'Le wax, tissu imprimé star des marchés d’Afrique de l’Ouest : coussins, rideaux, nappes et idées pour l’adopter chez soi.' },
  { id: 'bogolan', nom: 'Bogolan', accroche: 'Le bogolan, toile du Mali teinte à la boue : motifs graphiques, tons bruns et crème, et idées pour l’intégrer à la déco.' },
  { id: 'kente', nom: 'Kente', accroche: 'Le kente, tissu tissé du Ghana aux bandes colorées : signification, usages et façons de l’apporter dans la maison.' },
  { id: 'indigo', nom: 'Indigo', accroche: 'Le bleu indigo d’Afrique de l’Ouest, de l’adire yoruba aux teintures maliennes : textiles profonds et apaisants.' },
  { id: 'raphia-paniers', nom: 'Raphia et paniers tressés', accroche: 'Raphia, osier, herbes tressées : paniers, suspensions et assiettes murales, la vannerie africaine dans toute la maison.' },
  { id: 'terre-cuite', nom: 'Terre cuite et poterie', accroche: 'Jarres, vases et vaisselle en terre cuite : la poterie africaine pour une déco chaleureuse et naturelle.' },
  { id: 'bois-sculpte', nom: 'Bois sculpté', accroche: 'Tabourets, masques, bols et statuettes : le bois sculpté africain, à choisir et à mettre en valeur sans effet musée.' },
  { id: 'perles', nom: 'Perles', accroche: 'Perles de verre, de terre ou de graines : objets perlés, colliers muraux et accessoires pour une touche précieuse.' },
];

export const OCCASIONS: Rubrique[] = [
  { id: 'mariage', nom: 'Mariage', accroche: 'Décoration de mariage aux couleurs de l’Afrique : tables en wax, centres de table, paniers et idées pour la dot.' },
  { id: 'bapteme', nom: 'Baptême', accroche: 'Baptême et accueil d’un bébé : décoration douce, tissus, paniers et table de fête pour recevoir la famille.' },
  { id: 'tabaski', nom: 'Tabaski', accroche: 'Préparer la maison pour la Tabaski : table de fête, nappes, plateaux, vaisselle et accueil des invités.' },
  { id: 'fetes-fin-annee', nom: 'Fêtes de fin d’année', accroche: 'Noël et réveillon avec une touche africaine : sapin en wax, table de fête, couronnes tressées et idées cadeaux.' },
];

export type Famille = 'piece' | 'matiere' | 'occasion';

export const FAMILLES: Record<Famille, { liste: Rubrique[]; titre: string; hub: string; champ: 'pieces' | 'matieres' | 'occasions' }> = {
  piece: { liste: PIECES, titre: 'Par pièce', hub: 'pieces.html', champ: 'pieces' },
  matiere: { liste: MATIERES, titre: 'Matières et styles', hub: 'matieres.html', champ: 'matieres' },
  occasion: { liste: OCCASIONS, titre: 'Occasions', hub: 'occasions.html', champ: 'occasions' },
};

export function fichierRubrique(famille: Famille, id: string): string {
  return `${famille}-${id}.html`;
}

export function trouverRubrique(famille: Famille, id: string): Rubrique | undefined {
  return FAMILLES[famille].liste.find((r) => r.id === id);
}
