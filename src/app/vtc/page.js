"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import YoutubeKiosque from "../components/YoutubeKiosque";

function SpinnerKiosque() {
  return (
    <svg className="animate-spin" width={44} height={44} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(212,175,55,0.18)" strokeWidth="2.5" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="#f2ca50" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function extraireIdYoutube(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function VTC() {
  const [appareil, setAppareil] = useState(null);
  const [enroleCharge, setEnroleCharge] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // 1. Enrôlement : la tablette s'enregistre et attend l'activation de l'admin
  useEffect(() => {
    async function enroler() {
      let id = localStorage.getItem("tivoi-appareil-id");
      if (id) {
        const { data } = await supabase
          .from("appareils")
          .select("id, code_activation, appaire")
          .eq("id", id)
          .maybeSingle();
        if (data) {
          setAppareil(data);
          setEnroleCharge(true);
          return;
        }
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const { data: nouveau } = await supabase
        .from("appareils")
        .insert({ code_activation: code, type: "vtc", nom: `Écran VTC ${code}` })
        .select("id, code_activation, appaire")
        .single();
      if (nouveau) {
        localStorage.setItem("tivoi-appareil-id", nouveau.id);
        setAppareil(nouveau);
      }
      setEnroleCharge(true);
    }
    enroler();
  }, []);

  // 2. Si l'écran n'est pas encore activé : vérifier toutes les 3 secondes
  useEffect(() => {
    if (!appareil || appareil.appaire) return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("appareils")
        .select("appaire")
        .eq("id", appareil.id)
        .maybeSingle();
      if (data?.appaire) {
        setAppareil((a) => ({ ...a, appaire: true }));
      }
    }, 3000);
    return () => clearInterval(t);
  }, [appareil]);

  // 3. La playlist ne se charge qu'une fois l'écran activé
  useEffect(() => {
    if (!appareil?.appaire) return;

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
  }, [appareil?.appaire]);

  // 4. Wake Lock : l'écran ne se met jamais en veille pendant la diffusion
  useEffect(() => {
    if (!appareil?.appaire) return;
    let verrou = null;
    async function garderAllume() {
      try {
        verrou = await navigator.wakeLock?.request("screen");
      } catch {
        /* non supporté */
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
  }, [appareil?.appaire]);

  function passerAuSuivant() {
    setIndex((i) => (i + 1) % playlist.length);
  }

  const current = playlist[index];
  const idYoutube = current ? extraireIdYoutube(current.media_url) : null;
  const estVideo = current && !idYoutube && /\.(mp4|webm|mov)(\?|#|$)/i.test(current.media_url);

  // Rotation automatique des images
  useEffect(() => {
    if (playlist.length === 0 || estVideo || idYoutube) return;
    const timer = setTimeout(passerAuSuivant, (current.duree_secondes || 8) * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, playlist, estVideo]);

  // ── Écran d'enrôlement : avant toute lecture ──
  if (!enroleCharge || !appareil) {
    return (
      <main className="min-h-screen bg-surface-lowest flex items-center justify-center">
        <SpinnerKiosque />
      </main>
    );
  }

  if (!appareil.appaire) {
    return (
      <main className="min-h-screen bg-surface-lowest flex flex-col items-center justify-center select-none">
        <h1 className="font-display font-bold text-4xl text-primary mb-10 tracking-tight">TiVoi</h1>
        <p className="label-md text-on-surface-variant uppercase tracking-widest mb-8">
          Enregistrez cet écran
        </p>
        <div className="flex gap-3 mb-10">
          {appareil.code_activation.split("").map((c, i) => (
            <span
              key={i}
              className="w-16 h-20 md:w-20 md:h-24 rounded-xl glass-panel flex items-center justify-center text-4xl font-mono font-bold text-primary"
            >
              {c}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <SpinnerKiosque />
          <p className="body-lg text-on-surface-variant">
            En attente d&apos;activation par l&apos;administrateur...
          </p>
        </div>
        <p className="caption text-outline mt-8">
          La diffusion démarre automatiquement dès l&apos;activation.
        </p>
      </main>
    );
  }

  // ── Diffusion active ──
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
        <YoutubeKiosque
          key={current.id}
          videoId={idYoutube}
          onEnded={passerAuSuivant}
        />
      ) : estVideo ? (
        <video
          key={current.id}
          src={current.media_url}
          autoPlay
          muted
          playsInline
          onEnded={passerAuSuivant}
          className="w-full h-screen object-cover"
        />
      ) : (
        <img src={current.media_url} alt={current.titre} className="w-full h-screen object-cover" />
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
