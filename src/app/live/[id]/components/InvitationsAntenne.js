"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Invitations sur l'antenne : le créateur (ou ses modérateurs) invite des
// utilisateurs à rejoindre le direct. L'invité accepte → marqué "acceptee".
// (Phase 5 — la vraie co-antenne vidéo arrive avec le serveur LiveKit.)
export default function InvitationsAntenne({ liveId, surToast }) {
  const [pseudo, setPseudo] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    charger();
  }, [liveId]);

  async function charger() {
    const { data } = await supabase
      .from("invitations_live")
      .select("id, statut, invite_id, profiles!invitations_live_invite_id_fkey(pseudo)")
      .eq("live_id", liveId)
      .order("created_at", { ascending: false })
      .limit(20);
    setInvitations(data || []);
    setChargement(false);
  }

  async function inviter(e) {
    e.preventDefault();
    if (!pseudo.trim()) return;
    // Recherche du compte par pseudo
    const { data: cible } = await supabase
      .from("profiles")
      .select("id")
      .ilike("pseudo", pseudo.trim())
      .maybeSingle();
    if (!cible) {
      surToast(`Pseudo « ${pseudo.trim()} » introuvable.`);
      return;
    }
    const { error } = await supabase.from("invitations_live").insert({
      live_id: liveId,
      invite_id: cible.id,
    });
    if (error) {
      surToast(error.message);
    } else {
      surToast(`Invitation envoyée à @${pseudo.trim()}.`);
      setPseudo("");
      charger();
    }
  }

  async function annuler(inviteId) {
    await supabase
      .from("invitations_live")
      .delete()
      .eq("id", inviteId);
    charger();
  }

  return (
    <div className="bg-surface-low border border-outline-variant rounded-xl p-5">
      <h2 className="label-md text-primary uppercase mb-3 flex items-center gap-2">
        <i className="ph-duotone ph-users" style={{ fontSize: 18 }} aria-hidden="true" /> Invités sur l&apos;antenne
      </h2>
      <form onSubmit={inviter} className="flex gap-2 mb-3">
        <input
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="Pseudo de la personne à inviter..."
          className="flex-1 bg-surface-lowest/50 border border-outline-variant/40 rounded-lg text-on-surface px-3 py-2 text-sm outline-none focus:border-outline transition-colors"
        />
        <button
          type="submit"
          className="border border-outline-variant text-on-surface-variant caption px-4 rounded-lg hover:border-primary hover:text-primary transition-colors"
        >
          Inviter
        </button>
      </form>

      {chargement ? (
        <p className="caption text-on-surface-variant">Chargement...</p>
      ) : invitations.length === 0 ? (
        <p className="caption text-on-surface-variant">
          Aucune invitation — invitez des personnes à discuter en direct avec vous.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {invitations.map((i) => (
            <span
              key={i.id}
              className="flex items-center gap-2 caption px-3 py-1.5 rounded-lg border border-outline-variant/30 bg-surface-container"
            >
              @{i.profiles?.pseudo || "?"}
              <span
                className={
                  i.statut === "acceptee"
                    ? "text-primary font-bold"
                    : i.statut === "refusee"
                      ? "text-error"
                      : "text-on-surface-variant"
                }
              >
                {i.statut === "acceptee" ? "✓ a accepté" : i.statut === "refusee" ? "✕ refusé" : "en attente"}
              </span>
              {i.statut === "envoyee" && (
                <button onClick={() => annuler(i.id)} className="text-outline hover:text-error" title="Annuler">
                  <i className="ph-duotone ph-x" style={{ fontSize: 12 }} aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}