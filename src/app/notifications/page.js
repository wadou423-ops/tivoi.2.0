"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifs(data || []);

      // Marquer comme lues
      const nonLues = (data || []).filter((n) => !n.lu).map((n) => n.id);
      if (nonLues.length > 0) {
        await supabase.from("notifications").update({ lu: true }).in("id", nonLues);
      }
    }
    load();
  }, []);

  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20 max-w-3xl mx-auto w-full">
      <h1 className="display-lg text-on-surface mb-3">Notifications</h1>
      <p className="body-lg text-on-surface-variant mb-10">Vos dernières activités sur TiVoi.</p>

      {notifs.length === 0 ? (
        <div className="glass-panel rounded-xl p-10 text-center">
          <Bell size={40} className="text-outline mx-auto mb-4" />
          <p className="body-lg text-on-surface-variant">Aucune notification pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-5 flex gap-4 items-start ${
                n.lu
                  ? "border-outline-variant/20 bg-surface-container"
                  : "border-primary/30 bg-primary/5"
              }`}
            >
              <div className="flex-1">
                <p className="label-md text-on-surface">{n.titre}</p>
                {n.corps && <p className="body-md text-on-surface-variant mt-1">{n.corps}</p>}
                <p className="caption text-outline mt-2">
                  {new Date(n.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              {!n.lu && <Check size={16} className="text-primary mt-1" />}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
