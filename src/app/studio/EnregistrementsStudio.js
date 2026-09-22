"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// Mes enregistrements de directs : chaque enregistrement fait pendant un
// direct EST une rediffusion. Le créateur l'ouvre, la télécharge ou la supprime.
export default function EnregistrementsStudio() {
  const [recs, setRecs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [lecture, setLecture] = useState(null);

  async function charger() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("lives_enregistrements")
      .select("id, live_id, chemin, duree_secondes, taille_octets, created_at, lives(titre, statut)")
      .eq("createur_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setRecs(data || []);
    setChargement(false);
  }

  useEffect(() => {
    queueMicrotask(charger);
  }, []);

  async function ouvrir(rec) {
    // Ouvre la vidéo directement dans un lecteur de la page studio
    setLecture(rec);
  }  async function telecharger(rec, titre) {
    const { data } = await supabase.storage.from("media").download(rec.chemin);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(titre || "rediffusion").replace(/[^a-zA-Z0-9_-]+/g, "_")}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function supprimer(rec) {
    if (!confirm("Supprimer cet enregistrement ? Cette action est définitive.")) return;
    await supabase.storage.from("media").remove([rec.chemin]);
    await supabase.from("lives_enregistrements").delete().eq("id", rec.id);
    setRecs((l) => l.filter((r) => r.id !== rec.id));
    if (lecture?.id === rec.id) setLecture(null);
  }

  return (
    <div className="bg-surface-low border border-outline-variant rounded-xl p-6 mt-6">
      <h2 className="title-lg text-primary mb-2 flex items-center gap-2">
        <i className="ph-duotone ph-film-strip" style={{ fontSize: 20 }} aria-hidden="true" /> Mes enregistrements
      </h2>
      <p className="caption text-on-surface-variant mb-4">
        Les enregistrements de tes directs — tes rediffusions. Ouvre, télécharge ou supprime.
      </p>

      {chargement ? (
        <p className="caption text-on-surface-variant">Chargement...</p>
      ) : recs.length === 0 ? (
        <p className="caption text-on-surface-variant">
          Aucun enregistrement — appuie sur « Enregistrer » pendant ton prochain direct.
        </p>
      ) : (
        <div className="divide-y divide-outline-variant/20">
          {recs.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="body-md text-on-surface truncate">{r.lives?.titre || "Direct"}</p>
                <p className="caption text-outline mt-0.5">
                  {Math.floor(r.duree_secondes / 60)}mn · {(r.taille_octets / (1024 * 1024)).toFixed(1)} Mo ·{" "}
                  {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => ouvrir(r)} className="caption text-primary hover:underline">
                  Ouvrir
                </button>
                <button onClick={() => telecharger(r, r.lives?.titre)} className="caption text-on-surface-variant hover:text-primary">
                  Télécharger
                </button>
                <button
                  onClick={() => supprimer(r)}
                  className="caption text-outline hover:text-error transition-colors flex items-center gap-1"
                  title="Supprimer définitivement"
                >
                  <i className="ph-duotone ph-trash" style={{ fontSize: 14 }} aria-hidden="true" />
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lecteur d'enregistrement (modale) */}
      {lecture && (
        <div
          className="fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-5"
          onClick={() => setLecture(null)}
        >
          <div className="w-full max-w-4xl">
            <video
              src={supabase.storage.from("media").getPublicUrl(lecture.chemin).data.publicUrl}
              controls
              autoPlay
              className="w-full aspect-video rounded-xl bg-black"
            />
            <p className="caption text-on-surface-variant mt-3 text-center">
              {lecture.lives?.titre} — cliquez hors de la vidéo pour fermer
            </p>
          </div>
        </div>
      )}
    </div>
  );
}