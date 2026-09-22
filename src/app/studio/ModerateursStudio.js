"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Modérateurs de mes directs : le créateur choisit les personnes habilitées
// à modérer le chat de ses lives (supprimer des messages, gérer l'antenne).
export default function ModerateursStudio({ surMessage }) {
  const [moderateurs, setModerateurs] = useState([]);
  const [pseudo, setPseudo] = useState("");

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("moderateurs_live")
      .select("id, utilisateur_id, profiles!moderateurs_live_utilisateur_id_fkey(pseudo)")
      .eq("createur_id", user.id)
      .order("created_at", { ascending: false });
    setModerateurs(data || []);
  }

  async function ajouter(e) {
    e.preventDefault();
    if (!pseudo.trim()) return;
    const { data: cible } = await supabase
      .from("profiles")
      .select("id")
      .ilike("pseudo", pseudo.trim())
      .maybeSingle();
    if (!cible) {
      surMessage(`Pseudo « ${pseudo.trim()} » introuvable.`);
      return;
    }
    const { error } = await supabase.from("moderateurs_live").insert({
      createur_id: (await supabase.auth.getUser()).data.user.id,
      utilisateur_id: cible.id,
    });
    if (error) {
      surMessage(error.message);
    } else {
      surMessage(`@${pseudo.trim()} est maintenant modérateur de tes directs.`);
      setPseudo("");
      charger();
    }
  }

  async function retirer(moderateurId) {
    await supabase.from("moderateurs_live").delete().eq("id", moderateurId);
    charger();
  }

  return (
    <div className="bg-surface-low border border-outline-variant rounded-xl p-6 mt-6">
      <h2 className="title-lg text-primary mb-2 flex items-center gap-2">
        <i className="ph-duotone ph-shield-star" style={{ fontSize: 20 }} aria-hidden="true" /> Modérateurs de mes directs
      </h2>
      <p className="caption text-on-surface-variant mb-4">
        Les personnes choisies peuvent supprimer les messages du chat et t&apos;aider à gérer l&apos;antenne pendant tes lives.
      </p>

      <form onSubmit={ajouter} className="flex gap-3 mb-4 max-w-md">
        <input
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="Pseudo à promouvoir modérateur..."
          className="flex-1 bg-surface-lowest/50 border border-outline-variant/40 rounded-lg text-on-surface px-4 py-2.5 text-sm outline-none focus:border-outline transition-colors"
        />
        <button
          type="submit"
          className="bg-primary-container text-on-primary label-md px-5 rounded-lg hover:bg-primary transition-colors"
        >
          Ajouter
        </button>
      </form>

      {moderateurs.length === 0 ? (
        <p className="caption text-on-surface-variant">Aucun modérateur pour le moment.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {moderateurs.map((m) => (
            <span
              key={m.id}
              className="flex items-center gap-2 caption px-3 py-1.5 rounded-lg border border-outline-variant/30 bg-surface-container"
            >
              @{m.profiles?.pseudo || "?"}
              <button onClick={() => retirer(m.id)} className="text-outline hover:text-error" title="Retirer">
                <i className="ph-duotone ph-x" style={{ fontSize: 12 }} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}