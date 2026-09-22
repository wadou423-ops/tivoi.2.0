"use client";

import { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { invaliderPrefixe } from "./cache";

// Recharge automatiquement les données quand les tables listées changent.
// - Abonnement filtré par table (et non plus sur tout le schéma public)
// - Invalide le mini-cache des listes concernées avant de recharger
// - Rechargements regroupés (max 1 par 600 ms) et un seul point d'entrée
//   pour focus/visibilité, pour éviter les doubles fetch qui font clignoter.
export function useRealtimeReload(tables, reload, deps = []) {
  const dernierRef = useRef(0);

  useEffect(() => {
    function planifier() {
      const maintenant = Date.now();
      if (maintenant - dernierRef.current < 600) return;
      dernierRef.current = maintenant;
      reload();
    }

    const surChangement = (payload) => {
      invaliderPrefixe(payload.table);
      planifier();
    };

    const channel = supabase.channel(`rt-${tables.join("-")}-${Math.random().toString(36).slice(2, 8)}`);
    tables.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, surChangement);
    });
    channel.subscribe();

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