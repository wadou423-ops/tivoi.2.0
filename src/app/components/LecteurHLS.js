"use client";

import { useEffect, useRef, useState } from "react";

// Lecteur HLS (hls.js) pour le direct en mode "caméra" (ingestion RTMP
// sur le serveur de diffusion). Safari lit le HLS nativement.
export default function LecteurHLS({ src }) {
  const ref = useRef(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    if (!src || !ref.current) return;
    let hls = null;
    let detruit = false;

    async function lancer() {
      const Hls = (await import("hls.js")).default;
      if (detruit) return;
      if (!Hls.isSupported()) {
        // Safari / iOS : lecture native
        ref.current.src = src;
        return;
      }
      hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
      hls.loadSource(src);
      hls.attachMedia(ref.current);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setErreur(true);
      });
    }
    lancer();

    return () => {
      detruit = true;
      if (hls) hls.destroy();
    };
  }, [src]);

  if (!src) return null;

  if (erreur) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <i className="ph-duotone ph-broadcast text-primary/40" style={{ fontSize: 52 }} aria-hidden="true" />
        <p className="body-md">Flux momentanément indisponible.</p>
      </div>
    );
  }

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      controls
      className="w-full h-full object-contain bg-black"
    />
  );
}