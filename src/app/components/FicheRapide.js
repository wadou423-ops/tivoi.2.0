"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Play, Lock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { prefetchFiche } from "@/lib/cache";

// Fiche rapide en modale — ouverte au clic sur une carte
export default function FicheRapide({ filmId, onClose }) {
  const [film, setFilm] = useState(null);
  const [acces, setAcces] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await prefetchFiche(filmId);
      setFilm(data);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && data?.type_acces !== "gratuit") {
        const { data: a } = await supabase
          .from("acces_contenus")
          .select("id")
          .eq("contenu_id", filmId)
          .eq("user_id", user.id)
          .maybeSingle();
        setAcces(!!a);
      } else if (data?.type_acces !== "gratuit") {
        setAcces(false);
      }
    }
    load();

    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filmId]);

  if (!film) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-xl max-w-2xl w-full overflow-hidden max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bandeau */}
        <div className="relative h-56">
          {film.image_url && (
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url('${film.image_url}')` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full glass-panel flex items-center justify-center text-on-surface hover:text-primary transition-colors"
          >
            <X size={18} />
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <h2 className="display-lg text-on-surface !text-2xl">{film.titre}</h2>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap gap-3 mb-4">
            {film.badge && (
              <span className="caption px-2.5 py-1 rounded border border-primary/30 bg-primary/5 text-primary">
                {film.badge}
              </span>
            )}
            {film.categorie && <span className="caption text-on-surface-variant py-1">{film.categorie}</span>}
            {film.duree_minutes && <span className="caption text-on-surface-variant py-1">{film.duree_minutes} min</span>}
            {film.annee && <span className="caption text-on-surface-variant py-1">{film.annee}</span>}
          </div>

          <p className="body-md text-on-surface-variant mb-6">
            {film.description || "Aucune description disponible."}
          </p>

          <div className="flex flex-wrap gap-3">
            {film.type_acces === "gratuit" || acces ? (
              <Link
                href={`/lecteur/${film.id}`}
                className="bg-primary text-on-primary-fixed label-md px-6 py-3 rounded hover:bg-primary-container transition-colors flex items-center gap-2"
              >
                <Play size={16} fill="currentColor" /> Regarder
              </Link>
            ) : (
              <Link
                href={`/paiement/achat/${film.id}`}
                className="bg-primary text-on-primary-fixed label-md px-6 py-3 rounded hover:bg-primary-container transition-colors flex items-center gap-2"
              >
                <Lock size={15} />
                {film.type_acces === "abonnement"
                  ? "S'abonner"
                  : `${(film.prix_fcfa || 0).toLocaleString("fr-FR")} FCFA`}
              </Link>
            )}
            <Link
              href={`/catalogue/${film.id}`}
              className="border border-outline-variant text-on-surface label-md px-6 py-3 rounded hover:border-primary hover:text-primary transition-colors"
            >
              Fiche complète
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
