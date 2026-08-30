"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Recherche() {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState([]);
  const [cherche, setCherche] = useState(false);

  useEffect(() => {
    async function chercher() {
      if (q.trim().length < 2) {
        setResultats([]);
        setCherche(false);
        return;
      }
      const { data } = await supabase
        .from("catalogue")
        .select("id, titre, image_url, categorie, note, type_acces, prix_fcfa")
        .eq("actif", true)
        .or(`titre.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%,categorie.ilike.%${q.trim()}%,acteurs.ilike.%${q.trim()}%`)
        .limit(24);
      setResultats(data || []);
      setCherche(true);
    }
    const t = setTimeout(chercher, 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20 min-h-screen">
      <h1 className="display-lg text-on-surface mb-8">Recherche</h1>

      <div className="glass-panel glow-focus rounded-xl p-4 mb-10 max-w-2xl flex items-center gap-3">
        <Search size={20} className="text-on-surface-variant" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Films, séries, acteurs, catégories..."
          className="flex-1 bg-transparent border-0 outline-none text-on-surface body-lg placeholder:text-on-surface-variant/50"
        />
      </div>

      {cherche && resultats.length === 0 && (
        <p className="body-lg text-on-surface-variant">Aucun résultat pour « {q} ».</p>
      )}

      {resultats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-8">
          {resultats.map((f) => (
            <Link key={f.id} href={`/catalogue/${f.id}`} className="group flex flex-col gap-2">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-surface-high border border-transparent group-hover:border-primary-container movie-card">
                <img src={f.image_url} alt={f.titre} className="w-full h-full object-cover" />
              </div>
              <h3 className="body-md text-on-surface truncate">{f.titre}</h3>
              <span className="caption text-on-surface-variant">{f.categorie}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
