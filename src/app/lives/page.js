"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Banniere from "../components/Banniere";

export default function Lives() {
  const [lives, setLives] = useState([]);
  const [role, setRole] = useState(null);
  const [statutCreateur, setStatutCreateur] = useState(null);
  const [demarrage, setDemarrage] = useState(false);
  const [toast, setToast] = useState("");

  const estCreateurApprouve = role === "admin" || (role === "createur" && statutCreateur === "valide");

  // Passer en direct maintenant : crée le live immédiatement
  // (mode YouTube tant que le serveur de diffusion n'est pas activé)
  async function demarrerDirect() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/connexion");
    setDemarrage(true);
    const { data: prof } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", user.id)
      .single();
    const { data: l, error } = await supabase
      .from("lives")
      .insert({
        createur_id: user.id,
        titre: `Direct de @${prof?.pseudo || "créateur"}`,
        statut: "en_direct",
        mode: "youtube",
        programme_a: new Date().toISOString(),
      })
      .select("id")
      .single();
    setDemarrage(false);
    if (error) {
      setToast(error.message);
      setTimeout(() => setToast(""), 3000);
      return;
    }
    router.push(`/live/${l.id}`);
  }

  useEffect(() => {
    async function verifierRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("role, statut_createur")
        .eq("id", user.id)
        .single();
      setRole(prof?.role || null);
      setStatutCreateur(prof?.statut_createur || null);
    }
    verifierRole();
    async function load() {
      const { data } = await supabase
        .from("lives")
        .select("id, titre, description, statut, programme_a, created_at, rediffusion_url, profiles(pseudo)")
        .neq("statut", "annule")
        .order("created_at", { ascending: false });
      // En direct en premier, puis programmés (par date de programmation),
      // puis terminés ; les lives annulés ne sont pas listés
      const ordre = { en_direct: 0, programme: 1, termine: 2 };
      const parStatut = (a, b) => {
        const diff = (ordre[a.statut] ?? 3) - (ordre[b.statut] ?? 3);
        if (diff !== 0) return diff;
        if (a.statut === "programme" && b.statut === "programme") {
          return new Date(a.programme_a || "9999") - new Date(b.programme_a || "9999");
        }
        return new Date(b.created_at) - new Date(a.created_at);
      };
      setLives((data || []).sort(parStatut));
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

      <div className="flex flex-wrap gap-3 mb-8 items-center">
        {(estCreateurApprouve) && (
          <button
            onClick={demarrerDirect}
            disabled={demarrage}
            className="flex items-center gap-2 bg-primary text-on-primary-fixed label-md px-6 py-2.5 rounded hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            <i className="ph-duotone ph-broadcast" style={{ fontSize: 16 }} />
            {demarrage ? "Ouverture..." : "Passer en direct"}
          </button>
        )}
        <Link href="/live/programmer" className="border border-primary text-primary label-md px-6 py-2.5 rounded hover:bg-primary hover:text-on-primary-fixed transition-colors">
          Programmer un live
        </Link>
      </div>

      {toast && (
        <p className="caption text-error mb-4">{toast}</p>
      )}

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
                    <i className="ph-duotone ph-television text-primary/40" style={{ fontSize: 52 }} aria-hidden="true" />
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
                {l.statut === "termine" && l.rediffusion_url && (
                  <span className="absolute top-3 left-3 bg-primary text-on-primary-fixed caption font-bold px-2 py-1 rounded flex items-center gap-1">
                    <i className="ph-duotone ph-play" style={{ fontSize: 12 }} aria-hidden="true" /> VOD
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
