"use client";

import { useState } from "react";

// Image avec flou élégant pendant le chargement
export default function ImgBlur({ src, alt = "", className = "" }) {
  const [loaded, setLoaded] = useState(false);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      className={`${className} ${loaded ? "img-loaded" : "img-blur"}`}
    />
  );
}
