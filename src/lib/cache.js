import { supabase } from "./supabaseClient";

const cache = new Map();

// Précharge une fiche contenu (appelée au survol des cartes)
export async function prefetchFiche(id) {
  if (cache.has(id)) return cache.get(id);
  const { data } = await supabase.from("catalogue").select("*").eq("id", id).single();
  if (data) cache.set(id, data);
  return data;
}

export function getCachedFiche(id) {
  return cache.get(id);
}
