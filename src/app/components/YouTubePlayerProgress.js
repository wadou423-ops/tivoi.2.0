"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

let apiPromise = null;

function chargerAPI() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => resolve();
    });
  }
  return apiPromise;
}

// Lecteur YouTube avec reprise + enregistrement de progression
export default function YouTubePlayerProgress({ videoId, contenuId, onEnded }) {
  const conteneurRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const [pret, setPret] = useState(false);

  async function sauver(position, duree) {
    if (!position || position < 3) return;
    await supabase.rpc("enregistrer_progression", {
      p_contenu_id: contenuId,
      p_position: Math.floor(position),
      p_duree: Math.floor(duree || 0),
    });
  }

  useEffect(() => {
    let annule = false;
    let positionDepart = 0;

    async function init() {
      // 1. Récupérer la progression existante
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: prog } = await supabase
          .from("progressions")
          .select("position_secondes, termine")
          .eq("contenu_id", contenuId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (prog && !prog.termine && prog.position_secondes > 5) {
          positionDepart = prog.position_secondes;
        }
      }

      // 2. Charger l'API YouTube et créer le lecteur
      await chargerAPI();
      if (annule || !conteneurRef.current) return;

      playerRef.current = new window.YT.Player(conteneurRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            setPret(true);
            if (positionDepart > 5) {
              e.target.seekTo(positionDepart, true);
            }
          },
          onStateChange: (e) => {
            // 1 = LECTURE, 0 = TERMINÉ
            if (e.data === 1) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                const p = playerRef.current;
                if (p && p.getCurrentTime) {
                  sauver(p.getCurrentTime(), p.getDuration());
                }
              }, 5000);
            } else {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              const p = playerRef.current;
              if (p && p.getCurrentTime) {
                sauver(p.getCurrentTime(), p.getDuration());
              }
            }
            if (e.data === 0 && onEnded) {
              onEnded();
            }
          },
        },
      });
    }

    init();

    return () => {
      annule = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, contenuId]);

  return (
    <div className="relative w-full h-full bg-black">
      <div ref={conteneurRef} className="w-full h-full" />
    </div>
  );
}
