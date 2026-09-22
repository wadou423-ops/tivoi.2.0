"use client";

import { useEffect, useRef, useState } from "react";

// Image avec flou pendant le chargement — plat, avec lazy loading.
// Garde-fous : image déjà en cache (complete au montage) et erreur de chargement.
export default function ImgBlur({ src, alt = "", className = "" }) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    // Si l'image est déjà chargée (cache navigateur), onLoad ne fire pas :
    // on lève le flou immédiatement, sinon elle resterait floue à jamais.
    if (ref.current?.complete && ref.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  if (!src) return null;

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
      className={`${className} ${loaded ? "img-loaded" : "img-blur"}`}
    />
  );
}