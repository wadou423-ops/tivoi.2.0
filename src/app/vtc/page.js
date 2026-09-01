"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import YoutubeKiosque from "../components/YoutubeKiosque";
import YoutubeVTC from "../components/YoutubeVTC";

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

const INTERVAL_PUB = 600; // secondes entre deux interruptions publicitaires (10 min)

export default function VTC() {
  const [appareil, setAppareil] = useState(null);
  const [enroleCharge, setEnroleCharge] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [vue, setVue] = useState("playlist"); // playlist | catalogue | lecture
  const [filmsVTC, setFilmsVTC] = useState([]);
  const [filmActif, setFilmActif] = useState(null);
  const [pubEnCours, setPubEnCours] = useState(null); // {type, url|id, titre}
  const positionAvantPub = useRef(0);
  const pubIndexRef = useRef(0);
  const prochainSeuilRef = useRef(INTERVAL_PUB);
  const videoRef = useRef(null);
  const timerInactivite = useRef(null);

  // 1. Enrôlement de la tablette
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

  // 2. Attente de l'activation par l'admin
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

  // 3. Playlist + catalogue VTC (chargés après activation)
  useEffect(() => {
    if (!appareil?.appaire) return;

    async function load() {
      const [{ data: pl }, { data: cat }] = await Promise.all([
        supabase
          .from("playlist_vtc")
          .select("*")
          .eq("actif", true)
          .order("ordre", { ascending: true }),
        supabase
          .from("catalogue")
          .select("id, titre, image_url, categorie, note, badge, type_acces, bande_annonce_url")
          .eq("actif", true)
          .eq("dispo_vtc", true)
          .order("ordre", { ascending: true }),
      ]);
      setPlaylist(pl || []);
      setFilmsVTC(cat || []);
      setLoading(false);
    }

    load();
    const refreshInterval = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [appareil?.appaire]);

  // 4. Wake Lock
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

  // ── Écran d'enrôlement ──
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
      </main>
    );
  }

  // ── Vue catalogue : le passager choisit son film ──
  if (vue === "catalogue") {
    return (
      <main
        className="min-h-screen bg-surface-lowest p-8"
        onClick={() => {
          if (timerInactivite.current) clearTimeout(timerInactivite.current);
          timerInactivite.current = setTimeout(() => setVue("playlist"), 90000);
        }}
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display font-bold text-3xl text-primary">Choisissez votre film</h1>
          <button
            onClick={() => {
              if (timerInactivite.current) clearTimeout(timerInactivite.current);
              setVue("playlist");
            }}
            className="glass-panel rounded-lg px-5 py-2.5 text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            ← Écran d&apos;accueil
          </button>
        </div>

        {filmsVTC.length === 0 ? (
          <p className="text-on-surface-variant body-lg">Aucun film disponible pour le moment.</p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filmsVTC.map((film) => (
              <button
                key={film.id}
                onClick={() => {
                  if (timerInactivite.current) clearTimeout(timerInactivite.current);
                  prochainSeuilRef.current = INTERVAL_PUB;
                  pubIndexRef.current = 0;
                  setFilmActif(film);
                  setVue("lecture");
                }}
                className="text-left rounded-xl overflow-hidden bg-surface-container border border-outline-variant/20 hover:border-primary active:scale-95 transition-all"
              >
                <div className="relative aspect-[2/3] bg-surface-high">
                  {film.image_url && (
                    <img src={film.image_url} alt={film.titre} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="body-md text-on-surface truncate">{film.titre}</h3>
                  <span className="caption text-on-surface-variant">{film.categorie}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ── Vue lecture : film choisi, interrompu par des pubs ──
  if (vue === "lecture" && filmActif) {
    const filmIdYoutube = extraireIdYoutube(filmActif.bande_annonce_url || "");
    const pub = pubEnCours !== null ? playlist[pubEnCours % Math.max(playlist.length, 1)] : null;

    function verifierPubMP4() {
      const v = videoRef.current;
      if (!v || pubEnCours !== null) return;
      if (v.currentTime >= prochainSeuilRef.current && playlist.length > 0) {
        positionAvantPub.current = v.currentTime;
        v.pause();
        setPubEnCours(pubIndexRef.current % playlist.length);
        pubIndexRef.current += 1;
        prochainSeuilRef.current = v.currentTime + INTERVAL_PUB;
      }
    }

    function finPub() {
      const v = videoRef.current;
      if (v) {
        v.currentTime = positionAvantPub.current;
        v.play();
      }
      setPubEnCours(null);
    }

    return (
      <main className="min-h-screen bg-black relative select-none">
        {filmIdYoutube ? (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0">
              <YoutubeVTC
                videoId={filmIdYoutube}
                restartAt={0}
                intervalSec={INTERVAL_PUB}
                pubs={playlist}
                pubOverlay={pubEnCours}
                onPubFin={() => setPubEnCours(null)}
              />
            </div>
          </div>
        ) : (
          <video
            key={filmActif.id}
            ref={videoRef}
            src={filmActif.bande_annonce_url}
            autoPlay
            playsInline
            onTimeUpdate={verifierPubMP4}
            onEnded={() => setVue("catalogue")}
            className="w-full h-screen object-cover"
          />
        )}

        {/* Overlay pub : vidéo ou image de la playlist */}
        {pub && (
          <div className="absolute inset-0 z-40 bg-black">
            {extraireIdYoutube(pub.media_url) ? (
              <YoutubeKiosque
                videoId={extraireIdYoutube(pub.media_url)}
                onEnded={filmIdYoutube ? () => setPubEnCours(null) : finPub}
              />
            ) : /\.(mp4|webm|mov)(\?|#|$)/i.test(pub.media_url) ? (
              <video
                src={pub.media_url}
                autoPlay
                muted={false}
                playsInline
                onEnded={filmIdYoutube ? () => setPubEnCours(null) : finPub}
                className="w-full h-screen object-cover"
              />
            ) : (
              <img
                src={pub.media_url}
                alt="Publicité"
                className="w-full h-screen object-cover"
                style={{ animationDuration: `${pub.duree_secondes || 8}s` }}
                onLoad={() => {
                  setTimeout(filmIdYoutube ? () => setPubEnCours(null) : finPub, (pub.duree_secondes || 8) * 1000);
                }}
              />
            )}
            <div className="absolute top-6 right-6 bg-primary/90 px-4 py-2 rounded-lg">
              <span className="text-xs font-title font-bold uppercase tracking-widest text-on-primary">
                Publicité
              </span>
            </div>
          </div>
        )}

        {/* Filigrane + retour catalogue */}
        <h1 className="absolute top-6 left-6 z-20 pointer-events-none font-display font-bold text-2xl text-primary opacity-50 tracking-tight">
          TiVoi
        </h1>
        <button
          onClick={() => {
            setFilmActif(null);
            setVue("catalogue");
          }}
          className="absolute bottom-6 right-6 z-30 glass-panel rounded-lg px-5 py-3 text-sm text-on-surface hover:text-primary transition-colors"
        >
          ← Choisir un autre film
        </button>
      </main>
    );
  }

  // ── Diffusion : playlist automatique ──
  function passerAuSuivant() {
    setIndex((i) => (i + 1) % playlist.length);
  }

  const current = playlist[index];
  const idYoutube = current ? extraireIdYoutube(current.media_url) : null;
  const estVideo = current && !idYoutube && /\.(mp4|webm|mov)(\?|#|$)/i.test(current.media_url);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-lowest">
        <SpinnerKiosque />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-lowest flex items-center justify-center relative overflow-hidden select-none">
      {current && (idYoutube ? (
        <YoutubeKiosque key={current.id} videoId={idYoutube} onEnded={passerAuSuivant} />
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
      ))}

      {/* Vignette pour la profondeur */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ boxShadow: "inset 0 0 100px rgba(10, 10, 10, 0.8)" }}
      />

      {/* Filigrane TiVoi */}
      <h1 className="absolute top-6 left-6 z-20 pointer-events-none font-display font-bold text-2xl text-primary opacity-50 tracking-tight [text-shadow:0_4px_12px_rgba(10,10,10,0.5)]">
        TiVoi
      </h1>

      {current?.type === "publicite" && (
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

      {/* Bouton tactile : le passager choisit son film */}
      <button
        onClick={() => setVue("catalogue")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 bg-primary text-on-primary-fixed font-title font-bold text-lg px-10 py-4 rounded-full shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95 transition-transform"
      >
        🎬 Choisir un film
      </button>
    </main>
  );
}
