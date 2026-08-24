"use client";

import { useEffect, useState } from "react";
import { Star, Play } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function CatalogueVOD() {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorie, setCategorie] = useState("Tous les genres");

  useEffect(() => {
    async function loadCatalogue() {
      const { data, error } = await supabase
        .from("catalogue")
        .select("*")
        .eq("actif", true)
        .order("ordre", { ascending: true });

      if (!error && data) {
        setFilms(data);
      }
      setLoading(false);
    }

    loadCatalogue();
  }, []);

  const genres = ["Tous les genres", ...new Set(films.map((f) => f.categorie))];
  const filmsAffiches =
    categorie === "Tous les genres" ? films : films.filter((f) => f.categorie === categorie);

  return (
    <main className="px-6 md:px-12 py-12">
      <div className="mb-12">
        <h1 className="font-heading text-5xl md:text-6xl text-[#E5E2E1] mb-3">Catalogue VOD</h1>
        <p className="font-narrow text-lg text-[#D0C5AF] mb-6 max-w-2xl">
          Découvrez le meilleur du cinéma ouest-africain. Des productions premium, des histoires
          captivantes, en exclusivité sur TiVoi.
        </p>

        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setCategorie(g)}
              className={`px-4 py-2 rounded-lg text-sm font-heading whitespace-nowrap transition-colors ${
                categorie === g
                  ? "bg-[#D4AF37]/20 border border-[#F2CA50] text-[#F2CA50]"
                  : "bg-transparent border border-[#4D4635] text-[#D0C5AF] hover:border-[#F2CA50]/50 hover:text-[#E5E2E1]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-[#D0C5AF] font-narrow">Chargement...</p>
      ) : filmsAffiches.length === 0 ? (
        <p className="text-[#D0C5AF] font-narrow">Aucun contenu pour l&apos;instant dans cette catégorie.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
          {filmsAffiches.map((film) => (
            <div key={film.id} className="group cursor-pointer flex flex-col gap-2">
              <div className="relative aspect-[2/3] w-full bg-[#2A2A2A] rounded-lg overflow-hidden border border-transparent group-hover:border-[#D4AF37] transition-all">
                <img
                  src={film.image_url}
                  alt={film.titre}
                  className="w-full h-full object-cover"
                />
                {film.note && (
                  <div className="absolute top-2 right-2 bg-[#0E0E0E]/80 backdrop-blur-md px-2 py-1 rounded text-xs text-[#F2CA50] border border-[#D4AF37]/20 flex items-center gap-1">
                    <Star size={12} fill="currentColor" /> {film.note}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="w-12 h-12 rounded-full bg-[#F2CA50] flex items-center justify-center text-[#131313] hover:scale-110 transition-transform">
                    <Play size={20} fill="currentColor" />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="font-heading text-[#E5E2E1] truncate">{film.titre}</h3>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-narrow text-xs text-[#D0C5AF]">
                    {film.categorie}
                    {film.annee ? ` • ${film.annee}` : ""}
                  </span>
                  <span
                    className={`text-sm font-heading ${
                      film.badge === "GRATUIT" ? "text-[#C6C7C2]" : "text-[#F2CA50]"
                    }`}
                  >
                    {film.badge === "GRATUIT" ? "Gratuit" : film.badge}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="mt-16 px-0 py-8 border-t border-[#1C2029] text-xs text-[#5C6270]">
        © {new Date().getFullYear()} TiVoi — Tous droits réservés.
      </footer>
    </main>
  );
}