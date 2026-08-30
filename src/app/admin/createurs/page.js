"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminCreateurs() {
  const [demandes, setDemandes] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("profiles")
      .select("id, pseudo, nom, prenom, role, statut_createur")
      .in("statut_createur", ["en_attente", "valide", "rejete"])
      .order("statut_createur", { ascending: false });
    setDemandes(data || []);
  }

  async function valider(id) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "createur", statut_createur: "valide" })
      .eq("id", id);
    if (error) setMessage(error.message);
    else {
      await supabase.from("notifications").insert({
        user_id: id,
        titre: "Compte créateur validé",
        corps: "Félicitations ! Votre compte créateur est actif. Ouvrez le Studio pour programmer vos lives.",
      });
      load();
    }
  }

  async function rejeter(id) {
    const { error } = await supabase
      .from("profiles")
      .update({ statut_createur: "rejete" })
      .eq("id", id);
    if (error) setMessage(error.message);
    else {
      await supabase.from("notifications").insert({
        user_id: id,
        titre: "Demande créateur refusée",
        corps: "Votre demande n'a pas été retenue. Vous pouvez la soumettre à nouveau.",
      });
      load();
    }
  }

  return (
    <main className="px-6 md:px-12 py-12">
      <h1 className="font-display font-bold text-3xl text-primary mb-2">Validation des créateurs</h1>
      <p className="text-sm text-on-surface-variant mb-8">
        Examen des demandes de compte créateur (KYC).
      </p>

      {message && <p className="caption text-error mb-4">{message}</p>}

      <div className="space-y-2">
        {demandes.map((d) => (
          <div key={d.id} className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-low px-4 py-4">
            <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center font-display font-bold text-primary">
              {(d.pseudo || "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="body-md text-on-surface">@{d.pseudo || "—"}</p>
              <p className="caption text-on-surface-variant">
                {[d.prenom, d.nom].filter(Boolean).join(" ") || "—"}
                {" · "}
                <span className={
                  d.statut_createur === "en_attente"
                    ? "text-primary"
                    : d.statut_createur === "valide"
                      ? "text-on-surface"
                      : "text-error"
                }>
                  {d.statut_createur === "en_attente"
                    ? "En attente de validation"
                    : d.statut_createur === "valide"
                      ? "Validé"
                      : "Rejeté"}
                </span>
              </p>
            </div>
            {d.statut_createur === "en_attente" && (
              <div className="flex gap-2">
                <button
                  onClick={() => valider(d.id)}
                  className="flex items-center gap-1 caption bg-primary text-on-primary-fixed px-4 py-2 rounded hover:bg-primary-container transition-colors"
                >
                  <Check size={14} /> Valider
                </button>
                <button
                  onClick={() => rejeter(d.id)}
                  className="flex items-center gap-1 caption border border-outline-variant text-on-surface-variant px-4 py-2 rounded hover:border-error hover:text-error transition-colors"
                >
                  <X size={14} /> Rejeter
                </button>
              </div>
            )}
          </div>
        ))}
        {demandes.length === 0 && (
          <p className="text-on-surface-variant">Aucune demande de créateur.</p>
        )}
      </div>
    </main>
  );
}
