"use client";

import { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

// Recharge automatiquement les données quand les tables changent en base
// ou au retour sur l'onglet — rafraîchissements regroupés (max 1 par 600 ms)
// pour éviter les rechargements en rafale qui font clignoter le contenu.
export function useRealtimeReload(tables, reload, deps = []) {
  const dernierRef = useRef(0);

  useEffect(() => {
    function planifier() {
      const maintenant = Date.now();
      if (maintenant - dernierRef.current < 600) return;
      dernierRef.current = maintenant;
      reload();
    }

    const channel = supabase
      .channel(`rt-${tables.join("-")}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        if (tables.includes(payload.table)) planifier();
      })
      .subscribe();

    // Un seul point d'entrée : focus et visibilitychange déclenchaient
    // chacun un rechargement (double fetch au retour d'onglet)
    const onVisible = () => {
      if (document.visibilityState === "visible") planifier();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
