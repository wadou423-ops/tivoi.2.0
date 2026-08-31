"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function SpinnerKiosque() {
  return (
    <svg className="animate-spin" width={44} height={44} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(212,175,55,0.18)" strokeWidth="2.5" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="#f2ca50" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function extraireIdYoutube(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function VTC() {
  const [playlist, setPlaylist] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [appareil, setAppareil] = useState(null);
  const [montreCode, setMontreCode] = useState(true);

  // Enrôlement : chaque tablette s'enregistre une seule fois (base du futur DOOH)
  useEffect(() => {
    async function enroler() {
      let id = localStorage.getItem("tivoi-appareil-id");
      if (id) {
        const { data } = await supabase
          .from("appareils")
          .select("id, code_activation")
          .eq("id", id)
          .maybeSingle();
        if (data) {
          setAppareil(data);
          return;
        }
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const { data: nouveau } = await supabase
        .from("appareils")
        .insert({ code_activation: code, type: "vtc", nom: `Écran VTC ${code}` })
        .select("id, code_activation")
        .single();
      if (nouveau) {
        localStorage.setItem("tivoi-appareil-id", nouveau.id);
        setAppareil(nouveau);
        // Le code s'efface seul après 15 s (enrôlement par l'admin entre-temps)
        setTimeout(() => setMontreCode(false), 15000);
      }
    }
    enroler();
  }, []);

  // Wake Lock : l'écran ne se met jamais en veille pendant la diffusion
  useEffect(() => {
    let verrou = null;
    async function garderAllume() {
      try {
        verrou = await navigator.wakeLock?.request("screen");
      } catch {
        /* non supporté ou refusé */
      }
    }
    garderAllume();
    const onVisible = () => {
      if (document.visibilityState === "visible") garderAllume();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      verrou?.release?.();
    };
  }, []);

  // Chargement de la playlist (rafraîchi toutes les 2 minutes)
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
        <SpinnerKiosque />
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

      {/* Code d'enrôlement (15 premières secondes) */}
      {appareil && montreCode && (
        <div className="absolute bottom-6 left-6 z-20 glass-panel rounded-lg px-5 py-3 pointer-events-none">
          <p className="caption text-on-surface-variant uppercase tracking-widest">Écran enregistré — Code</p>
          <p className="font-mono text-xl text-primary font-bold">{appareil.code_activation}</p>
        </div>
      )}

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
