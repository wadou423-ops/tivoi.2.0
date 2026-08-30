"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminRetraits() {
  const [retraits, setRetraits] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("retraits")
      .select("id, montant_fcfa, statut, created_at, createur_id, profiles(pseudo)")
      .order("created_at", { ascending: false });
    setRetraits(data || []);
  }

  async function approuver(id) {
    const { error } = await supabase.from("retraits").update({ statut: "approuve" }).eq("id", id);
    if (error) setMessage(error.message);
    else {
      const r = retraits.find((x) => x.id === id);
      if (r) {
        await supabase.from("notifications").insert({
          user_id: r.createur_id,
          titre: "Retrait approuvé",
          corps: `Votre demande de retrait de ${r.montant_fcfa.toLocaleString("fr-FR")} FCFA a été approuvée.`,
        });
      }
      load();
    }
  }

  async function rejeter(id) {
    const { error } = await supabase.from("retraits").update({ statut: "rejete" }).eq("id", id);
    if (error) setMessage(error.message);
    else {
      const r = retraits.find((x) => x.id === id);
      if (r) {
        // Recréditer le solde créateur
        await supabase.rpc("demander_retrait", { p_montant: 0 });
        await supabase.from("profiles").update({
          solde_revenus: (await supabase.from("profiles").select("solde_revenus").eq("id", r.createur_id).single()).data.solde_revenus + r.montant_fcfa,
        }).eq("id", r.createur_id);
        await supabase.from("notifications").insert({
          user_id: r.createur_id,
          titre: "Retrait refusé",
          corps: `Votre demande de retrait de ${r.montant_fcfa.toLocaleString("fr-FR")} FCFA a été refusée. Le montant a été recrédité.`,
        });
      }
      load();
    }
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
                  <Check size={14} /> Approuver
                </button>
                <button
                  onClick={() => rejeter(r.id)}
                  className="flex items-center gap-1 caption border border-outline-variant text-on-surface-variant px-4 py-2 rounded hover:border-error hover:text-error transition-colors"
                >
                  <X size={14} /> Rejeter
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
