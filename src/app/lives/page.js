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
  const [confirmation, setConfirmation] = useState(null);

  const estCreateurApprouve = role === "admin" || (role === "createur" && statutCreateur === "valide");

  // Passer en direct maintenant : confirmation, puis création du live
  // (mode YouTube tant que le serveur de diffusion n'est pas activé)
  async function demarrerDirect() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/connexion");
    setDemarrage(true);
    // Un seul direct à la fois par compte
    const { data: enCours } = await supabase
      .from("lives")
      .select("id")
      .eq("createur_id", user.id)
      .eq("statut", "en_direct")
      .maybeSingle();
    if (enCours) {
      setDemarrage(false);
      setConfirmation({
        titre: "Un direct est déjà en cours",
        texte: "Tu ne peux lancer qu'un seul direct à la fois. Veux-tu rejoindre celui en cours ?",
        action: () => window.location.assign(`/live/${enCours.id}`),
        cta: "Rejoindre mon direct",
      });
      return;
    }
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
    // Navigation dure : arrive immédiatement dans la salle du direct
    window.location.assign(`/live/${l.id}`);
  }

  function demanderConfirmation() {
    setConfirmation({
      titre: "Passer en direct ?",
      texte: "Ton direct démarre immédiatement et sera visible par tous.",
      cta: "Oui, passer en direct",
      action: () => demarrerDirect(),
    });
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
      // Vitrine « en ce moment » : uniquement les directs en cours.
      // Les lives passés sont gérés par chaque créateur dans son studio.
      const { data } = await supabase
        .from("lives")
        .select("id, titre, description, statut, programme_a, created_at, profiles(pseudo)")
        .eq("statut", "en_direct")
        .order("programme_a", { ascending: false });
      setLives(data || []);
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
        <h1 className="display-lg text-on-surface">Lives</h1>
      </header>

      <div className="flex flex-wrap gap-3 mb-8 items-center">
        {(estCreateurApprouve) && (
          <button
            onClick={demanderConfirmation}
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

      {/* Modale de confirmation (lancement + live déjà en cours) */}
      {confirmation && (
        <div
          className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
          onClick={() => setConfirmation(null)}
        >
          <div
            className="bg-surface-low border border-outline-variant rounded-xl max-w-md w-full p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <i className="ph-duotone ph-broadcast text-primary mb-4 inline-block" style={{ fontSize: 48 }} aria-hidden="true" />
            <h2 className="title-lg text-on-surface mb-2">{confirmation.titre}</h2>
            <p className="body-md text-on-surface-variant mb-8">{confirmation.texte}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { const a = confirmation.action; setConfirmation(null); a(); }}
                className="bg-primary text-on-primary-fixed label-md px-6 py-3 rounded-lg hover:bg-primary-container transition-colors"
              >
                {confirmation.cta}
              </button>
              <button
                onClick={() => setConfirmation(null)}
                className="border border-outline-variant text-on-surface-variant label-md px-6 py-3 rounded-lg hover:text-on-surface transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {lives.length === 0 ? (
        <div className="bg-surface-low border border-outline-variant rounded-xl p-10 text-center">
          <i className="ph-duotone ph-broadcast text-outline mx-auto mb-4" style={{ fontSize: 44 }} aria-hidden="true" />
          <p className="body-lg text-on-surface-variant">Aucun direct en cours pour le moment.</p>
          <p className="caption text-on-surface-variant mt-2">
            Reviens plus tard — ou lance le tien avec le bouton ci-dessus.
          </p>
        </div>
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
                <span className="absolute top-3 left-3 bg-error text-on-error caption font-bold px-2 py-1 rounded flex items-center gap-1">
                  ● EN DIRECT
                </span>
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
