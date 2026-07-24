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
      <main className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-[#9AA0AC]">Chargement...</p>
      </main>
    );
  }

  if (playlist.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-[#9AA0AC]">Aucun contenu programmé pour l&apos;instant.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
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

      {current.type === "publicite" && (
        <span className="absolute top-4 left-4 rounded-full bg-[#E8A33D] px-3 py-1 text-xs font-semibold text-[#0B0E14]">
          Publicité
        </span>
      )}

      <span className="absolute bottom-4 right-4 font-display text-lg text-white/60">TiVoi</span>
    </main>
  );
}