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

// Lecteur YouTube kiosque : lecture muette, passage au suivant à la fin
export default function YoutubeKiosque({ videoId, onEnded }) {
  const conteneurRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    let annule = false;

    chargerAPI().then(() => {
      if (annule || !conteneurRef.current) return;
      playerRef.current = new window.YT.Player(conteneurRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            try {
              e.target.playVideo();
            } catch {}
          },
          onStateChange: (e) => {
            // 0 = vidéo terminée → on la rejoue (boucle) et on passe au suivant
            if (e.data === 0) {
              try {
                playerRef.current.seekTo(0, true);
                playerRef.current.playVideo();
              } catch {}
              if (onEnded) onEnded();
            }
          },
        },
      });
    });

    return () => {
      annule = true;
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // YouTube plein écran : l'iframe couvre tout l'écran (cover), clics bloqués
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div ref={conteneurRef} className="yt-cover" />
    </div>
  );
}
