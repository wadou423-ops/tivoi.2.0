"use client";

import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";

// Filtre à entonnoir partagé (accueil + catalogue)
export default function FiltreCategories({ categories, filtre, setFiltre }) {
  const [menuFiltre, setMenuFiltre] = useState(false);
  const menuRef = useRef(null);

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
        onClick={() => setFiltre("Tous")}
        className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm font-title font-semibold ${
          filtre === "Tous"
            ? "bg-primary-container/20 border border-primary text-primary"
            : "bg-transparent border border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
        }`}
      >
        Tous
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuFiltre((o) => !o)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-title font-semibold transition-colors ${
            filtre !== "Tous"
              ? "bg-primary-container/20 border border-primary text-primary"
              : "bg-transparent border border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
          }`}
        >
          <Filter size={15} />
          {filtre !== "Tous" ? filtre : "Filtres"}
        </button>

        {menuFiltre && (
          <div className="absolute left-0 mt-2 w-56 rounded-xl bg-surface-low border border-outline-variant shadow-lg py-2 z-40">
            <p className="caption text-on-surface-variant uppercase tracking-widest px-4 py-1.5">
              Filtrer par catégorie
            </p>
            {["Tous", ...categories].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setFiltre(c);
                  setMenuFiltre(false);
                }}
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
