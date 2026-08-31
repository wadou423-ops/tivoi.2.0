"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  PictureInPicture2,
  Gauge,
  SkipForward,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const VITESSES = [0.5, 1, 1.25, 1.5, 2];

export default function CustomVideoPlayer({ src, contenuId, onEnded }) {
  const router = useRouter();
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [montre, setMontre] = useState(true);
  const cacheTimer = useRef(null);
  const [suivant, setSuivant] = useState(null);
  const cacheTimerHide = useRef(null);

  // Reprise de visionnage
  useEffect(() => {
    async function reprise() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !videoRef.current) return;
      const { data } = await supabase
        .from("progressions")
        .select("position_secondes, termine")
        .eq("contenu_id", contenuId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data && !data.termine && data.position_secondes > 5) {
        videoRef.current.currentTime = data.position_secondes;
      }
    }
    reprise();
  }, [contenuId]);

  // Contenu suivant (même catégorie)
  useEffect(() => {
    async function next() {
      if (!contenuId) return;
      const { data: film } = await supabase
        .from("catalogue")
        .select("id, categorie")
        .eq("id", contenuId)
        .single();
      if (!film?.categorie) return;
      const { data: candidats } = await supabase
        .from("catalogue")
        .select("id, titre")
        .eq("actif", true)
        .eq("categorie", film.categorie)
        .neq("id", contenuId)
        .order("ordre", { ascending: true })
        .limit(1);
      setSuivant(candidats?.[0] || null);
    }
    next();
  }, [contenuId]);

  function formater(s) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function basculerLecture() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }

  async function sauverProgression() {
    const v = videoRef.current;
    if (!v || !v.duration || isNaN(v.duration)) return;
    await supabase.rpc("enregistrer_progression", {
      p_contenu_id: contenuId,
      p_position: Math.floor(v.currentTime),
      p_duree: Math.floor(v.duration),
    });
  }

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
    if (!cacheTimer.current || Date.now() - cacheTimer.current > 5000) {
      cacheTimer.current = Date.now();
      sauverProgression();
    }
  }

  function onEnded() {
    setPlaying(false);
    sauverProgression();
    if (onEnded) onEnded();
  }

  function seek(e) {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
    setCurrent(v.currentTime);
  }

  function changerVitesse(s) {
    const v = videoRef.current;
    if (v) v.playbackRate = s;
    setSpeed(s);
    setSpeedOpen(false);
  }

  async function pip() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* non supporté */
    }
  }

  function pleinEcran() {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else v.parentElement.requestFullscreen();
  }

  function montrerControles() {
    setMontre(true);
    if (cacheTimerHide.current) clearTimeout(cacheTimerHide.current);
    cacheTimerHide.current = setTimeout(() => {
      if (playing) setMontre(false);
    }, 3000);
  }

  return (
    <div
      className="relative w-full h-full group"
      onMouseMove={montrerControles}
      onMouseLeave={() => playing && setMontre(false)}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        onClick={basculerLecture}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          setMontre(true);
        }}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={onEnded}
        className="w-full h-full object-contain bg-black"
      />

      {/* Bouton Suivant en fin de vidéo */}
      {!playing && duration > 0 && current >= duration - 1 && suivant && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70">
          <button
            onClick={() => router.push(`/lecteur/${suivant.id}`)}
            className="flex items-center gap-3 bg-primary text-on-primary-fixed label-md px-8 py-4 rounded-lg hover:bg-primary-container transition-colors"
          >
            <SkipForward size={18} /> Suivant : {suivant.titre}
          </button>
        </div>
      )}

      {/* Contrôles — toujours visibles en pause */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 px-5 pb-4 pt-10 bg-gradient-to-t from-background/90 to-transparent transition-opacity duration-300 ${
          montre || !playing ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Barre de progression */}
        <div
          onClick={seek}
          className="relative h-1.5 rounded-full bg-white/20 cursor-pointer mb-3 hover:h-2.5 transition-all"
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary"
            style={{ width: `${duration ? (current / duration) * 100 : 0}%` }}
          />
        </div>

        <div className="flex items-center gap-4">
          <button onClick={basculerLecture} className="text-on-surface hover:text-primary transition-colors">
            {playing ? <Pause size={22} /> : <Play size={22} fill="currentColor" />}
          </button>
          <button
            onClick={() => {
              const v = videoRef.current;
              if (v) {
                v.muted = !v.muted;
                setMuted(v.muted);
              }
            }}
            className="text-on-surface hover:text-primary transition-colors"
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <span className="text-xs text-on-surface-variant font-mono">
            {formater(current)} / {formater(duration)}
          </span>

          <div className="ml-auto flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setSpeedOpen((o) => !o)}
                className="flex items-center gap-1 text-xs text-on-surface hover:text-primary transition-colors font-mono"
              >
                <Gauge size={18} /> {speed}x
              </button>
              {speedOpen && (
                <div className="absolute bottom-8 right-0 glass-panel rounded-lg py-1 w-20">
                  {VITESSES.map((v) => (
                    <button
                      key={v}
                      onClick={() => changerVitesse(v)}
                      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                        speed === v ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {v}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={pip} className="text-on-surface hover:text-primary transition-colors">
              <PictureInPicture2 size={20} />
            </button>
            <button onClick={pleinEcran} className="text-on-surface hover:text-primary transition-colors">
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
