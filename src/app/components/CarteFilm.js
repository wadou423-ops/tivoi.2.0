"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Star, Play } from "lucide-react";
import ImgBlur from "./ImgBlur";
import { prefetchFiche } from "@/lib/cache";

// Carte film vivante : aperçu vidéo au survol, flou de chargement,
// barre de progression du visionnage, ouverture en fiche rapide.
export default function CarteFilm({ film, progressionPct = 0, onOpen }) {
  const timerRef = useRef(null);
  const [preview, setPreview] = useState(false);

  const idYoutube = film.bande_annonce_url
    ? film.bande_annonce_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/)
    : null;

  function onMouseEnter() {
    prefetchFiche(film.id);
    timerRef.current = setTimeout(() => {
      if (idYoutube) setPreview(true);
    }, 1000);
  }

  function onMouseLeave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPreview(false);
  }

  function handleClick(e) {
    if (onOpen) {
      e.preventDefault();
      onOpen(film);
    }
  }

  return (
    <Link
      href={`/catalogue/${film.id}`}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="flex-none w-[200px] md:w-[240px] snap-start flex flex-col gap-2"
    >
      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border border-outline-variant/10 movie-card cursor-pointer bg-surface-high">
        {preview && idYoutube ? (
          <iframe
            src={`https://www.youtube.com/embed/${idYoutube[1]}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${idYoutube[1]}`}
            className="w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media"
          />
        ) : (
          film.image_url && (
            <ImgBlur src={film.image_url} alt={film.titre} className="w-full h-full object-cover" />
          )
        )}

        {film.note && (
          <div className="absolute top-2 right-2 bg-surface-lowest/80 backdrop-blur-md px-2 py-1 rounded caption text-primary border border-primary/20 flex items-center gap-1">
            <Star size={14} fill="currentColor" /> {film.note}
          </div>
        )}

        {/* Progression de visionnage */}
        {progressionPct > 0 && (
          <div className="watch-progress">
            <span style={{ width: `${Math.min(progressionPct, 100)}%` }} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end p-4 opacity-0 hover:opacity-100 transition-opacity">
          <span className="bg-primary text-on-primary-fixed w-full py-2 rounded label-md text-center flex items-center justify-center gap-2">
            <Play size={14} fill="currentColor" /> Regarder
          </span>
        </div>
      </div>
      <h3 className="title-lg text-on-surface truncate">{film.titre}</h3>
      <div className="flex justify-between items-center">
        <span className="caption text-on-surface-variant">{film.categorie}</span>
        <span className={`label-md ${film.type_acces === "gratuit" ? "text-secondary" : "text-primary"}`}>
          {film.type_acces === "gratuit"
            ? "Gratuit"
            : film.type_acces === "abonnement"
              ? "Abonnement"
              : `${(film.prix_fcfa || 0).toLocaleString("fr-FR")} FCFA`}
        </span>
      </div>
    </Link>
  );
}
