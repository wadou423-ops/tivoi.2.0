"use client";

import { useEffect } from "react";
import { supabase } from "./supabaseClient";

// Recharge automatiquement les données quand les tables changent en base
export function useRealtimeReload(tables, reload, deps = []) {
  useEffect(() => {
    const channel = supabase
      .channel(`rt-${tables.join("-")}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        if (tables.includes(payload.table)) reload();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
