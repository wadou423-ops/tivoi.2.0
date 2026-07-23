"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

  useEffect(() => {
    if (playlist.length === 0) return;

    const current = playlist[index];
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1) % playlist.length);
    }, (current.duree_secondes || 8) * 1000);

    return () => clearTimeout(timer);
  }, [index, playlist]);

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

  const current = playlist[index];

  return (
    <main className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      <img src={current.media_url} alt={current.titre} className="max-w-full max-h-screen object-contain" />

      {current.type === "publicite" && (
        <span className="absolute top-4 left-4 rounded-full bg-[#E8A33D] px-3 py-1 text-xs font-semibold text-[#0B0E14]">
          Publicité
        </span>
      )}

      <span className="absolute bottom-4 right-4 font-display text-lg text-white/60">TiVoi</span>
    </main>
  );
}