"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

// Page appareil TV : génère un code à 6 chiffres, attend l'appairage, puis joue le contenu
export default function TV() {
  const [appareil, setAppareil] = useState(null);
  const [appaire, setAppaire] = useState(false);

  const genererCode = useCallback(async () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { data } = await supabase
      .from("appareils")
      .insert({ code_activation: code, type: "tv", nom: `TV ${code}` })
      .select("id, code_activation")
      .single();
    setAppareil(data);
    setAppaire(false);
  }, []);

  useEffect(() => {
    genererCode();
  }, [genererCode]);

  // Polling de l'appairage
  useEffect(() => {
    if (!appareil || appaire) return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("appareils")
        .select("appaire")
        .eq("id", appareil.id)
        .single();
      if (data?.appaire) setAppaire(true);
    }, 3000);
    return () => clearInterval(t);
  }, [appareil, appaire]);

  if (appaire) {
    return (
      <main className="min-h-screen bg-surface-lowest flex flex-col items-center justify-center gap-6">
        <span className="display-lg text-primary tracking-tighter">TiVoi</span>
        <p className="body-lg text-on-surface-variant">Appareil appairé ! Chargement du catalogue...</p>
        <a href="/catalogue" className="bg-primary text-on-primary-fixed label-md px-8 py-3 rounded">
          Accéder au catalogue
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-lowest flex flex-col items-center justify-center select-none">
      <div className="absolute top-8 left-8 pointer-events-none">
        <span className="display-lg text-primary tracking-tighter opacity-50">TiVoi</span>
      </div>

      <div className="text-center">
        <p className="label-md text-on-surface-variant uppercase mb-8">Connectez votre compte TiVoi</p>
        <h1 className="display-lg text-on-surface mb-10">
          Entrez ce code sur votre téléphone
        </h1>
        <div className="flex gap-4 justify-center mb-12">
          {(appareil?.code_activation || "------").split("").map((c, i) => (
            <span
              key={i}
              className="w-16 h-20 md:w-20 md:h-24 rounded-xl glass-panel flex items-center justify-center display-lg text-primary"
            >
              {c}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 justify-center">
          <div className="w-8 h-1.5 rounded-full bg-primary animate-pulse" />
          <p className="body-lg text-on-surface-variant">En attente d&apos;appairage...</p>
        </div>
        <button
          onClick={genererCode}
          className="mt-8 caption text-on-surface-variant hover:text-primary transition-colors underline"
        >
          Générer un nouveau code
        </button>
      </div>
    </main>
  );
}
