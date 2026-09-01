"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Banniere from "../components/Banniere";

export default function Lives() {
  const [lives, setLives] = useState([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("lives")
        .select("id, titre, description, statut, programme_a, created_at, profiles(pseudo)")
        .order("created_at", { ascending: false });
      // En direct en premier, puis programmés, puis terminés
      const ordre = { en_direct: 0, programme: 1, termine: 2 };
      setLives(
        (data || []).sort((a, b) => (ordre[a.statut] ?? 3) - (ordre[b.statut] ?? 3))
      );
    }
    load();

    const channel = supabase
      .channel("lives-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "lives" }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20">
      <header className="mb-12">
        <h1 className="display-lg text-on-surface">Lives en Direct</h1>
      </header>

      <div className="flex gap-2 mb-8">
        <Link href="/live/programmer" className="bg-primary text-on-primary-fixed label-md px-6 py-2.5 rounded hover:bg-primary-container transition-colors">
          Programmer un live
        </Link>
      </div>

      {lives.length === 0 ? (
        <p className="body-lg text-on-surface-variant">
          Aucun live pour le moment — soyez le premier à en lancer un !
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lives.map((l) => (
            <Link key={l.id} href={`/live/${l.id}`} className="group">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container movie-card mb-3">
                {l.profiles?.avatar_url ? (
                  <img src={l.profiles.avatar_url} alt={l.titre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-high to-surface-container">
                    <Radio size={48} className="text-primary/40" />
                  </div>
                )}
                {l.statut === "en_direct" && (
                  <span className="absolute top-3 left-3 bg-error text-on-error caption font-bold px-2 py-1 rounded flex items-center gap-1">
                    ● EN DIRECT
                  </span>
                )}
                {l.statut === "programme" && (
                  <span className="absolute top-3 left-3 bg-surface-variant text-on-surface-variant caption px-2 py-1 rounded">
                    Programmé — {l.programme_a ? new Date(l.programme_a).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "date à venir"}
                  </span>
                )}
              </div>
              <h3 className="title-lg text-on-surface group-hover:text-primary transition-colors">{l.titre}</h3>
              <p className="caption text-on-surface-variant mt-1">
                par @{l.profiles?.pseudo || "créateur"}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12">
        <Banniere emplacement="live_v" className="w-48 h-[400px] mx-auto" />
      </div>
    </main>
  );
}
