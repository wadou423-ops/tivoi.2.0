"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Lecteur() {
  const { id } = useParams();
  const [film, setFilm] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: f } = await supabase.from("catalogue").select("*").eq("id", id).single();
      setFilm(f);
      setChargement(false);
    }
    load();
  }, [id]);

  if (chargement) {
    return (
      <main className="min-h-screen bg-surface-lowest flex items-center justify-center">
        <p className="text-on-surface-variant">Chargement...</p>
      </main>
    );
  }

  if (!film) {
    return (
      <main className="min-h-screen bg-surface-lowest flex items-center justify-center">
        <p className="text-on-surface-variant">Contenu introuvable.</p>
      </main>
    );
  }

  const url = film.bande_annonce_url || film.image_url;
  const idYoutube = url
    ? url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/)
    : null;

  return (
    <main className="relative min-h-screen bg-surface-lowest flex items-center justify-center overflow-hidden select-none">
      {idYoutube ? (
        <iframe
          src={`https://www.youtube.com/embed/${idYoutube[1]}?autoplay=1&rel=0`}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          className="w-full h-screen"
        />
      ) : url && /\.(mp4|webm|mov)(\?|#|$)/i.test(url) ? (
        <video src={url} controls autoPlay className="w-full h-screen object-contain" />
      ) : (
        <div className="relative w-full h-screen">
          <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${film.image_url || ""}')` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
          <div className="absolute bottom-16 left-5 md:left-20">
            <h1 className="display-lg text-on-surface">{film.titre}</h1>
            <p className="body-lg text-on-surface-variant mt-2 max-w-xl">
              Le flux vidéo de ce contenu sera disponible dès la connexion du CDN vidéo.
            </p>
          </div>
        </div>
      )}

      {/* Filigrane */}
      <span className="absolute top-6 left-6 z-20 font-display font-bold text-xl text-primary/50 pointer-events-none">
        TiVoi
      </span>
    </main>
  );
}
