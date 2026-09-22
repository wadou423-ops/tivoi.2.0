import { supabase } from "./supabaseClient";

// Mini-cache client avec durée de vie : la navigation entre les pages
// ne re-télécharge plus les listes à chaque fois (navigation quasi
// instantanée). Le realtime invalide les entrées concernées (useRealtime).

const fiches = new Map(); // id -> { valeur, expire }
const listes = new Map(); // cle -> { valeur, expire }

const DUREE_FICHE = 30_000;

// Précharge une fiche contenu (appelée au survol des cartes)
export async function prefetchFiche(id) {
  const entree = fiches.get(id);
  if (entree && entree.expire > Date.now()) return entree.valeur;
  const { data } = await supabase.from("catalogue").select("*").eq("id", id).single();
  if (data) fiches.set(id, { valeur: data, expire: Date.now() + DUREE_FICHE });
  return data;
}

export function getCachedFiche(id) {
  const entree = fiches.get(id);
  return entree && entree.expire > Date.now() ? entree.valeur : undefined;
}

// Lecture mise en cache d'une liste de référence (catalogue, chaînes, paliers…).
// cle : clé libre ; invaliderPrefixe(table) purge toutes les clés "table:...".
export async function cacheListe(cle, fetcher, dureeMs = 60_000) {
  const entree = listes.get(cle);
  const maintenant = Date.now();
  if (entree && entree.expire > maintenant) return entree.valeur;
  const valeur = await fetcher();
  listes.set(cle, { valeur, expire: maintenant + dureeMs });
  return valeur;
}

// Invalide les entrées du cache liées à une table (appelé par le realtime)
export function invaliderPrefixe(prefixe) {
  for (const cle of listes.keys()) {
    if (cle === prefixe || cle.startsWith(prefixe + ":")) listes.delete(cle);
  }
  for (const id of fiches.keys()) {
    // Les fiches viennent de la table catalogue
    if (prefixe === "catalogue") fiches.delete(id);
  }
}