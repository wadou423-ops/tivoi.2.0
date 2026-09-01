"use client";

import { useEffect, useRef } from "react";

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

// Lecteur du direct YouTube : comme la TV.
// - Pause volontaire OK
// - En revenant (lecture, onglet, focus) : rattrapage automatique vers « la suite du live »
export default function YoutubeDirect({ videoId, onEnded }) {
  const conteneurRef = useRef(null);
  const playerRef = useRef(null);
  const heurePauseRef = useRef(null);
  const tickRef = useRef(null);

  function rattraper() {
    const p = playerRef.current;
    if (!p?.getCurrentTime || !heurePauseRef.current) return;
    const ecart = (Date.now() - heurePauseRef.current) / 1000;
    heurePauseRef.current = null;
    if (ecart > 3) {
      try {
        p.seekTo(p.getCurrentTime() + ecart, true);
        p.playVideo();
      } catch {}
    }
  }

  useEffect(() => {
    let annule = false;

    async function init() {
      await chargerAPI();
      if (annule || !conteneurRef.current) return;

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
            try {
              e.target.playVideo();
            } catch {}
            tickRef.current = setInterval(rattraper, 5000);
          },
          onStateChange: (e) => {
            // 2 = pause → on mémorise l'heure réelle de la pause
            if (e.data === 2) heurePauseRef.current = Date.now();
            // 1 = lecture → on rattrape le temps perdu (on saute vers « la suite »)
            if (e.data === 1) {
              rattraper();
              if (tickRef.current) clearInterval(tickRef.current);
              tickRef.current = setInterval(rattraper, 5000);
            }
            // 0 = la vidéo du live est finie
            if (e.data === 0 && onEnded) onEnded();
          },
        },
      });
    }

    function onVisible() {
      if (document.visibilityState === "visible") rattraper();
      else {
        // En quittant l'onglet : le direct s'arrête (le son aussi)
        try {
          playerRef.current?.pauseVideo?.();
          heurePauseRef.current = Date.now();
        } catch {}
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    init();

    return () => {
      annule = true;
      if (tickRef.current) clearInterval(tickRef.current);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return <div ref={conteneurRef} className="w-full h-full" />;
}
