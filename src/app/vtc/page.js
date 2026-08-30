"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function extraireIdYoutube(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function VTC() {
  const [playlist, setPlaylist] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlaylist() {
      const { data, error } = await supabase
        .from("playlist_vtc")
        .select("*")
        .eq("actif", true)
        .order("ordre", { ascending: true });

      if (!error && data) {
        setPlaylist(data);
      }
      setLoading(false);
    }

    loadPlaylist();

    const refreshInterval = setInterval(loadPlaylist, 2 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  function passerAuSuivant() {
    setIndex((i) => (i + 1) % playlist.length);
  }

  const current = playlist[index];
  const idYoutube = current ? extraireIdYoutube(current.media_url) : null;
  const estVideo = current && !idYoutube && /\.(mp4|webm|mov)(\?|#|$)/i.test(current.media_url);

  useEffect(() => {
    if (playlist.length === 0 || estVideo || idYoutube) return;

    const timer = setTimeout(passerAuSuivant, (current.duree_secondes || 8) * 1000);
    return () => clearTimeout(timer);
  }, [index, playlist, estVideo]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-lowest">
        <p className="text-on-surface-variant">Chargement...</p>
      </main>
    );
  }

  if (playlist.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-lowest">
        <p className="text-on-surface-variant">Aucun contenu programmé pour l&apos;instant.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-lowest flex items-center justify-center relative overflow-hidden select-none">
      {idYoutube ? (
        <iframe
          key={current.id}
          src={`https://www.youtube.com/embed/${idYoutube}?autoplay=1&mute=1&controls=0`}
          allow="autoplay"
          className="w-full h-screen"
        />
      ) : estVideo ? (
        <video
          key={current.id}
          src={current.media_url}
          autoPlay
          muted
          playsInline
          onEnded={passerAuSuivant}
          className="max-w-full max-h-screen object-contain"
        />
      ) : (
        <img src={current.media_url} alt={current.titre} className="max-w-full max-h-screen object-contain" />
      )}

      {/* Vignette pour la profondeur */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ boxShadow: "inset 0 0 100px rgba(10, 10, 10, 0.8)" }}
      />

      {/* Filigrane TiVoi */}
      <h1 className="absolute top-6 left-6 z-20 pointer-events-none font-display font-bold text-2xl text-primary opacity-50 tracking-tight [text-shadow:0_4px_12px_rgba(10,10,10,0.5)]">
        TiVoi
      </h1>

      {current.type === "publicite" && (
        <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-2">
          <div className="bg-primary/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(212,175,55,0.3)]">
            <span className="text-xs font-title font-bold uppercase tracking-widest text-on-primary">
              Publicité
            </span>
          </div>
          <div className="w-32 h-1 bg-surface-high/50 rounded-full overflow-hidden mt-1 backdrop-blur-sm">
            <div
              className="h-full bg-primary rounded-full progress-bar-animate"
              style={{ animationDuration: `${current.duree_secondes || 8}s` }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
