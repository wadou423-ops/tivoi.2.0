"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import LoaderCentered from "../../components/LoaderCentered";

export default function AdminCreateurs() {
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] = useState(null);
  const [message, setMessage] = useState("");

  async function load() {
    const { data } = await supabase
      .from("demandes_createur")
      .select("*, profiles(pseudo)")
      .order("statut", { ascending: true })
      .order("created_at", { ascending: false });
    setDemandes(data || []);
    setChargement(false);
  }

  useEffect(() => {
    // Différé d'une frame pour éviter un setState synchrone pendant l'effet
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  async function traiter(demande, nouveauStatut) {
    setActionEnCours(demande.id);
    setMessage("");

    const updates = {
      statut: nouveauStatut,
    };

    const [{ error: errDemande }, { error: errProfile }] = await Promise.all([
      supabase.from("demandes_createur").update(updates).eq("id", demande.id),
      supabase
        .from("profiles")
        .update({
          role: nouveauStatut === "valide" ? "createur" : "utilisateur",
          statut_createur: nouveauStatut,
        })
        .eq("id", demande.user_id),
      supabase.from("notifications").insert({
        user_id: demande.user_id,
        titre:
          nouveauStatut === "valide"
            ? "Compte créateur validé"
            : "Demande créateur refusée",
        corps:
          nouveauStatut === "valide"
            ? "Félicitations ! Votre compte créateur est actif. Ouvrez le Studio pour programmer vos lives."
            : "Votre demande n'a pas été retenue. Vous pouvez la soumettre à nouveau.",
      }),
    ]);

    setActionEnCours(null);
    if (errDemande || errProfile) {
      setMessage(errDemande?.message || errProfile?.message);
    } else {
      load();
    }
  }

  if (chargement) {
    return <LoaderCentered />;
  }

  return (
    <main className="px-6 md:px-12 py-12">
      <h1 className="font-display font-bold text-3xl text-primary mb-8">
        Validation des créateurs
      </h1>

      {message && <p className="caption text-error mb-4">{message}</p>}

      <div className="space-y-3">
        {demandes.map((d) => (
          <div
            key={d.id}
            className="rounded-xl border border-outline-variant/20 bg-surface-low px-5 py-4"
          >
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center font-display font-bold text-primary shrink-0">
                {(d.prenoms || d.profiles?.pseudo || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="body-md text-on-surface">
                  {[d.prenoms, d.nom].filter(Boolean).join(" ")}
                  <span className="caption text-primary ml-2">@{d.profiles?.pseudo || "—"}</span>
                </p>
                <p className="caption text-on-surface-variant mt-0.5">
                  CNI : <span className="font-mono">{d.numero_cni}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="caption px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary">
                  {d.type_contenu}
                </span>
                <span
                  className={`caption px-3 py-1.5 rounded-lg border ${
                    d.statut === "en_attente"
                      ? "border-outline-variant text-on-surface-variant"
                      : d.statut === "valide"
                        ? "border-primary text-primary"
                        : "border-error/50 text-error"
                  }`}
                >
                  {d.statut === "en_attente"
                    ? "En attente"
                    : d.statut === "valide"
                      ? "Validé"
                      : "Rejeté"}
                </span>
                {d.statut === "en_attente" && (
                  <div className="flex gap-2">
                    {actionEnCours === d.id ? (
                      <div className="px-4 py-2">
                        <div className="animate-spin w-5 h-5">
                          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                            <circle cx="12" cy="12" r="10" stroke="rgba(212,175,55,0.18)" strokeWidth="2.5" />
                            <path d="M22 12a10 10 0 0 0-10-10" stroke="#f2ca50" strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => traiter(d, "valide")}
                          className="flex items-center gap-1 caption bg-primary text-on-primary-fixed px-4 py-2 rounded hover:bg-primary-container transition-colors"
                        >
                          <Check size={14} /> Valider
                        </button>
                        <button
                          onClick={() => traiter(d, "rejete")}
                          className="flex items-center gap-1 caption border border-outline-variant text-on-surface-variant px-4 py-2 rounded hover:border-error hover:text-error transition-colors"
                        >
                          <X size={14} /> Rejeter
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            {d.presentation && (
              <p className="body-md text-on-surface-variant mt-3 pt-3 border-t border-outline-variant/10">
                {d.presentation}
              </p>
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
