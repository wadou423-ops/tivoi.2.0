"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeReload } from "@/lib/useRealtime";

export default function AdminRetraits() {
  const [retraits, setRetraits] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  useRealtimeReload(["retraits"], load, []);

  async function load() {
    const { data } = await supabase
      .from("retraits")
      .select("id, montant_fcfa, statut, created_at, createur_id, profiles(pseudo)")
      .order("created_at", { ascending: false });
    setRetraits(data || []);
  }

  async function approuver(id) {
    const { data: erreur } = await supabase.rpc("admin_approuver_retrait", { p_retrait_id: id });
    if (erreur) setMessage(erreur);
    else load();
  }

  async function rejeter(id) {
    // RPC atomique : statut + recrédit du solde créateur + notification
    const { data: erreur } = await supabase.rpc("admin_rejeter_retrait", { p_retrait_id: id });
    if (erreur) setMessage(erreur);
    else load();
  }

  return (
    <main className="px-6 md:px-12 py-12">
      <h1 className="font-display font-bold text-3xl text-primary mb-8">Demandes de retrait</h1>

      {message && <p className="caption text-error mb-4">{message}</p>}

      <div className="space-y-2">
        {retraits.map((r) => (
          <div key={r.id} className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-low px-4 py-4">
            <div className="flex-1">
              <p className="body-md text-on-surface">
                @{r.profiles?.pseudo || "—"} — <span className="text-primary font-semibold">{r.montant_fcfa.toLocaleString("fr-FR")} FCFA</span>
              </p>
              <p className="caption text-on-surface-variant">
                {new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                {" · "}
                {r.statut === "en_attente" ? (
                  <span className="text-primary">En attente</span>
                ) : r.statut === "approuve" ? (
                  <span>Approuvé</span>
                ) : (
                  <span className="text-error">Rejeté</span>
                )}
              </p>
            </div>
            {r.statut === "en_attente" && (
              <div className="flex gap-2">
                <button
                  onClick={() => approuver(r.id)}
                  className="flex items-center gap-1 caption bg-primary text-on-primary-fixed px-4 py-2 rounded hover:bg-primary-container transition-colors"
                >
                  <i className="ph-duotone ph-check" style={{ fontSize: 14 }} /> Approuver
                </button>
                <button
                  onClick={() => rejeter(r.id)}
                  className="flex items-center gap-1 caption border border-outline-variant text-on-surface-variant px-4 py-2 rounded hover:border-error hover:text-error transition-colors"
                >
                  <i className="ph-duotone ph-x" style={{ fontSize: 14 }} /> Rejeter
                </button>
              </div>
            )}
          </div>
        ))}
        {retraits.length === 0 && <p className="text-on-surface-variant">Aucune demande de retrait.</p>}
      </div>
    </main>
  );
}
