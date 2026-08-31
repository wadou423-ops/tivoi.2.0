"use client";

import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";

// Filtre à entonnoir partagé (accueil, catalogue, TV)
// labels : textes personnalisables (FR/EN), data-tv pour la navigation télécommande
export default function FiltreCategories({ categories, filtre, setFiltre, labels, dataTv = false }) {
  const [menuFiltre, setMenuFiltre] = useState(false);
  const menuRef = useRef(null);
  const t = labels || { tous: "Tous", filtres: "Filtres", filtrerPar: "Filtrer par catégorie" };

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuFiltre(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setFiltre(t.tous)}
        data-tv={dataTv ? "" : undefined}
        className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm font-title font-semibold ${
          filtre === t.tous
            ? "bg-primary-container/20 border border-primary text-primary"
            : "bg-transparent border border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
        }`}
      >
        {t.tous}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuFiltre((o) => !o)}
          data-tv={dataTv ? "" : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-title font-semibold transition-colors ${
            filtre !== t.tous
              ? "bg-primary-container/20 border border-primary text-primary"
              : "bg-transparent border border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
          }`}
        >
          <Filter size={15} />
          {filtre !== t.tous ? filtre : t.filtres}
        </button>

        {menuFiltre && (
          <div className="absolute left-0 mt-2 w-56 rounded-xl bg-surface-low border border-outline-variant shadow-lg py-2 z-40">
            <p className="caption text-on-surface-variant uppercase tracking-widest px-4 py-1.5">
              {t.filtrerPar}
            </p>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setFiltre(c);
                  setMenuFiltre(false);
                }}
                data-tv={dataTv ? "" : undefined}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                  filtre === c
                    ? "text-primary bg-primary/10"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
                }`}
              >
                {c}
                {filtre === c && <span className="text-primary">●</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
