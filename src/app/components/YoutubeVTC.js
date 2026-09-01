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

// Lecteur YouTube VTC : le film est interrompu par des pubs (overlay géré
// à l'intérieur du composant) toutes les `intervalSec` secondes.
export default function YoutubeVTC({ videoId, restartAt = 0, intervalSec, pubs, onTermine }) {
  const conteneurRef = useRef(null);
  const playerRef = useRef(null);
  const pubIndexRef = useRef(0);
  const seuilRef = useRef(intervalSec);
  const posAvantPubRef = useRef(0);
  const [pubActive, setPubActive] = useState(null); // élément pub affiché

  function verifierPub() {
    const p = playerRef.current;
    if (!p?.getCurrentTime || pubActive !== null || pubs.length === 0) return;
    const pos = p.getCurrentTime();
    if (pos >= seuilRef.current) {
      posAvantPubRef.current = pos;
      p.pauseVideo();
      setPubActive(pubs[pubIndexRef.current % pubs.length]);
      pubIndexRef.current += 1;
      seuilRef.current = pos + intervalSec;
    }
  }

  function finPub() {
    const p = playerRef.current;
    setPubActive(null);
    if (p?.seekTo) {
      try {
        p.seekTo(posAvantPubRef.current, true);
        p.playVideo();
      } catch {}
    }
  }

  useEffect(() => {
    let annule = false;
    let tick = null;

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

  // Rendu : le film + l'overlay pub par-dessus
  return (
    <div className="absolute inset-0">
      <div ref={conteneurRef} className="w-full h-full" />

      {pubActive && (
        <div className="absolute inset-0 z-40 bg-black">
          {(() => {
            const idPub = extraireId(pubActive.media_url);
            if (idPub) {
              return <YoutubeOverlay videoId={idPub} onEnded={finPub} />;
            }
            if (/\.(mp4|webm|mov)(\?|#|$)/i.test(pubActive.media_url)) {
              return (
                <video
                  src={pubActive.media_url}
                  autoPlay
                  playsInline
                  onEnded={finPub}
                  className="w-full h-full object-cover"
                />
              );
            }
            return (
              <img
                src={pubActive.media_url}
                alt="Publicité"
                className="w-full h-full object-cover"
                onLoad={() => setTimeout(finPub, (pubActive.duree_secondes || 8) * 1000)}
              />
            );
          })()}
          <div className="absolute top-6 right-6 bg-primary/90 px-4 py-2 rounded-lg">
            <span className="text-xs font-title font-bold uppercase tracking-widest text-on-primary">
              Publicité
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function extraireId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function YoutubeOverlay({ videoId, onEnded }) {
  const conteneurRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    let annule = false;
    chargerAPI().then(() => {
      if (annule || !conteneurRef.current) return;
      playerRef.current = new window.YT.Player(conteneurRef.current, {
        videoId,
        playerVars: { autoplay: 1, controls: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (e) => {
            try {
              e.target.playVideo();
            } catch {}
          },
          onStateChange: (e) => {
            if (e.data === 0 && onEnded) onEnded();
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

  return <div ref={conteneurRef} className="w-full h-full" />;
}
