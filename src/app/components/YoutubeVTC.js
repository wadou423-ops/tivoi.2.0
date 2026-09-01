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

// Lecteur YouTube pour la VTC : expose position, pause, reprise
// et notifie la fin du film (via onTermine)
export default function YoutubeVTC({ videoId, restartAt = 0, pubOverlay = null, intervalSec, pubs, onPubFin, onTermine }) {
  const conteneurRef = useRef(null);
  const playerRef = useRef(null);
  const pubIndexRef = useRef(0);
  const prochainSeuilRef = useRef(intervalSec);
  const pubOverlayRef = useRef(null);

  useEffect(() => {
    pubOverlayRef.current = pubOverlay;
  }, [pubOverlay]);

  useEffect(() => {
    let annule = false;
    let tick = null;

    async function init() {
      await chargerAPI();
      if (annule || !conteneurRef.current) return;

      function verifierPub() {
        const p = playerRef.current;
        if (!p?.getCurrentTime) return;
        const pos = p.getCurrentTime();
        if (pubOverlayRef.current === null && pos >= prochainSeuilRef.current && pubs.length > 0) {
          p.pauseVideo();
          const pub = pubs[pubIndexRef.current % pubs.length];
          pubIndexRef.current += 1;
          prochainSeuilRef.current = pos + intervalSec;
          onPubFin?.({ pub }); // le parent affiche l'overlay pub
          // La reprise (seekTo) est déclenchée par le parent via la fin de pub
        }
      }

      playerRef.current = new window.YT.Player(conteneurRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            if (restartAt > 5) e.target.seekTo(restartAt, true);
            e.target.playVideo();
            tick = setInterval(verifierPub, 2000);
          },
          onStateChange: (e) => {
            // 0 = film terminé
            if (e.data === 0 && onTermine) onTermine();
          },
        },
      });
    }

    init();

    return () => {
      annule = true;
      if (tick) clearInterval(tick);
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Reprendre après la pub
  useEffect(() => {
    if (pubOverlay === null && playerRef.current?.seekTo) {
      try {
        playerRef.current.seekTo(prochainSeuilRef.current - intervalSec, true);
        playerRef.current.playVideo();
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pubOverlay]);

  return <div ref={conteneurRef} className="w-full h-full" />;
}
