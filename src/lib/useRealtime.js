"use client";

import { useEffect } from "react";
import { supabase } from "./supabaseClient";

// Recharge automatiquement les données quand les tables changent en base
// + au retour sur l'onglet (visibilitychange)
export function useRealtimeReload(tables, reload, deps = []) {
  useEffect(() => {
    const channel = supabase
      .channel(`rt-${tables.join("-")}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        if (tables.includes(payload.table)) reload();
      })
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
