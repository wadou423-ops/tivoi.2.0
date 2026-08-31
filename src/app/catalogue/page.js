"use client";

import { useEffect, useState } from "react";
import { Star, Play } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import LoaderCentered from "../components/LoaderCentered";
import FiltreCategories from "../components/FiltreCategories";

export default function CatalogueVOD() {
  const [films, setFilms] = useState([]);
  const [aLaUne, setALaUne] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorie, setCategorie] = useState("Tous les genres");
  const [connecte, setConnecte] = useState(false);

  useEffect(() => {
    async function loadCatalogue() {
      const [{ data }, { data: une }, { data: { user } }] = await Promise.all([
        supabase
          .from("catalogue")
          .select("*")
          .eq("actif", true)
          .order("ordre", { ascending: true }),
        supabase
          .from("a_une")
          .select("ordre, catalogue(id, titre, image_url, categorie, note, badge, prix_fcfa, type_acces)")
          .eq("actif", true)
          .order("ordre", { ascending: true }),
        supabase.auth.getUser(),
      ]);

      if (data) setFilms(data);
      if (une) setALaUne(une.filter((s) => s.catalogue).map((s) => ({ ...s.catalogue })));
      setConnecte(!!user);
      setLoading(false);
    }

    const t = setTimeout(loadCatalogue, 0);
    return () => clearTimeout(t);
  }, []);

  const genres = ["Tous les genres", ...new Set(films.map((f) => f.categorie))];
  const filmsAffiches =
    categorie === "Tous les genres" ? films : films.filter((f) => f.categorie === categorie);

  // Pas de rendu tant que la session et les données ne sont pas chargées (évite le flash visiteur)
  if (loading) {
    return (
      <main className="px-6 md:px-20 pt-28 pb-12">
        <LoaderCentered />
      </main>
    );
  }

  return (
    <main className="px-6 md:px-20 pt-28 pb-12">
      {!connecte && (
        <div className="mb-10">
          <h1 className="font-display font-bold text-5xl md:text-6xl text-on-surface tracking-[-0.02em] mb-3">
            Catalogue VOD
          </h1>
          <p className="text-lg text-on-surface-variant mb-6 max-w-2xl">
            Découvrez le meilleur du cinéma ouest-africain. Des productions premium, des histoires
            captivantes, en exclusivité sur TiVoi.
          </p>
        </div>
      )}

      <div className="mb-10">
        {connecte ? (
          <FiltreCategories
            categories={genres.filter((g) => g !== "Tous les genres")}
            filtre={categorie}
            setFiltre={setCategorie}
          />
        ) : (
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setCategorie(g)}
                className={`px-4 py-2 rounded-lg text-sm font-title font-semibold whitespace-nowrap transition-colors ${
                  categorie === g
                    ? "bg-primary-container/20 border border-primary text-primary"
                    : "bg-transparent border border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* À la une (connecté uniquement) */}
      {connecte && aLaUne.length > 0 && (
        <section className="mb-10">
          <div className="flex justify-between items-end mb-4">
            <h2 className="headline-md text-on-surface">À la une</h2>
          </div>
          <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory hide-scrollbar">
            {aLaUne.map((film) => (
              <a key={film.id} href={`/catalogue/${film.id}`} className="flex-none w-[200px] md:w-[240px] snap-start flex flex-col gap-2">
                <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border border-outline-variant/10 movie-card bg-surface-high">
                  {film.image_url && (
                    <img src={film.image_url} alt={film.titre} className="w-full h-full object-cover" />
                  )}
                  {film.note && (
                    <div className="absolute top-2 right-2 bg-surface-lowest/80 backdrop-blur-md px-2 py-1 rounded text-xs text-primary border border-primary/20 flex items-center gap-1">
                      <Star size={14} fill="currentColor" /> {film.note}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary">
                      <Play size={20} fill="currentColor" />
                    </span>
                  </div>
                </div>
                <h3 className="font-title font-semibold text-on-surface truncate">{film.titre}</h3>
                <span className="text-xs text-on-surface-variant">{film.categorie}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <LoaderCentered />
      ) : filmsAffiches.length === 0 ? (
        <p className="text-on-surface-variant">
          Aucun contenu pour l&apos;instant dans cette catégorie.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
          {filmsAffiches.map((film) => (
            <div key={film.id} className="group cursor-pointer flex flex-col gap-2">
              <div className="relative aspect-[2/3] w-full bg-surface-high rounded-lg overflow-hidden border border-transparent group-hover:border-primary-container transition-all">
                {film.image_url && (
                  <img
                    src={film.image_url}
                    alt={film.titre}
                    className="w-full h-full object-cover"
                  />
                )}
                {film.note && (
                  <div className="absolute top-2 right-2 bg-surface-lowest/80 backdrop-blur-md px-2 py-1 rounded text-xs text-primary border border-primary-container/20 flex items-center gap-1">
                    <Star size={12} fill="currentColor" /> {film.note}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary hover:scale-110 transition-transform">
                    <Play size={20} fill="currentColor" />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="font-title font-semibold text-on-surface truncate">{film.titre}</h3>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-on-surface-variant">
                    {film.categorie}
                    {film.annee ? ` • ${film.annee}` : ""}
                  </span>
                  <span
                    className={`text-sm font-title font-semibold ${
                      film.badge === "GRATUIT" ? "text-secondary" : "text-primary"
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

      <footer className="mt-16 py-8 border-t border-outline-variant/10 text-xs text-outline">
        © {new Date().getFullYear()} TiVoi — Tous droits réservés. · v2.2
      </footer>
    </main>
  );
}
