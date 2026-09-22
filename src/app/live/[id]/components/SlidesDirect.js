"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Slides synchronisées : le créateur projette une photo de présentation,
// poussée en temps réel à tous les spectateurs du direct.
export default function SlidesDirect({ liveId, estCreateur, surToast }) {
  const [slides, setSlides] = useState([]);
  const [slideAffichee, setSlideAffichee] = useState(0);
  const [uploadEnCours, setUploadEnCours] = useState(false);

  // Charge les slides + suit la slide projetée en temps réel
  useEffect(() => {
    charger();
    const channel = supabase
      .channel(`slides-${liveId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lives", filter: `id=eq.${liveId}` },
        ({ new: maj }) => {
          if (maj.slide_courante !== undefined && maj.slide_courante > 0) {
            setSlideAffichee(maj.slide_courante);
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [liveId]);

  async function charger() {
    const { data } = await supabase
      .from("slides_live")
      .select("id, titre, image_url, ordre")
      .eq("live_id", liveId)
      .order("ordre", { ascending: true });
    setSlides(data || []);
  }

  async function televerser(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setUploadEnCours(true);
    const ext = (fichier.name.split(".").pop() || "jpg").toLowerCase();
    const chemin = `slides/${liveId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from("media")
      .upload(chemin, fichier, { upsert: false });
    if (error) {
      surToast(`Erreur d'envoi : ${error.message}`);
      setUploadEnCours(false);
      return;
    }
    const { data: pub } = supabase.storage.from("media").getPublicUrl(chemin);
    await supabase.from("slides_live").insert({
      live_id: liveId,
      titre: fichier.name,
      image_url: pub.publicUrl,
      ordre: slides.length,
    });
    surToast("Slide ajoutée.");
    setUploadEnCours(false);
    charger();
  }

  async function projeter(slideId) {
    await supabase.from("lives").update({ slide_courante: slideId }).eq("id", liveId);
    surToast("Slide projetée au public.");
  }

  async function retirer(slideId) {
    await supabase.from("slides_live").delete().eq("id", slideId);
    charger();
  }

  const slideActive = slides.find((s) => s.id === slideAffichee);

  return (
    <div className="bg-surface-low border border-outline-variant rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="label-md text-primary uppercase flex items-center gap-2">
          <i className="ph-duotone ph-presentation" style={{ fontSize: 18 }} aria-hidden="true" /> Slides de présentation
        </h2>
        <label className="caption cursor-pointer flex items-center gap-2 border border-outline-variant rounded-lg px-3 py-1.5 text-on-surface-variant hover:border-primary hover:text-primary transition-colors">
          {uploadEnCours ? "Envoi..." : "Ajouter une photo"}
          <input type="file" accept="image/*" className="hidden" onChange={televerser} disabled={uploadEnCours} />
        </label>
      </div>

      {slides.length === 0 ? (
        <p className="caption text-on-surface-variant">
          Ajoutez vos slides (photos de présentation) puis projetez-les au public pendant le direct.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
          {slides.map((s) => (
            <div key={s.id} className="flex-none w-40">
              <img
                src={s.image_url}
                alt={s.titre || "Slide"}
                className="w-40 h-24 object-cover rounded-lg border border-outline-variant/30"
              />
              <div className="flex items-center justify-between mt-1">
                <button onClick={() => projeter(s.id)} className="caption text-primary hover:underline">
                  Projeter
                </button>
                {estCreateur && (
                  <button onClick={() => retirer(s.id)} className="caption text-outline hover:text-error" title="Supprimer">
                    <i className="ph-duotone ph-trash" style={{ fontSize: 12 }} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide projetée : visible par tous, superposée au direct */}
      {slideAffichee !== 0 && slideActive && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setSlideAffichee(0)}
        >
          <img
            src={slideActive.image_url}
            alt={slideActive.titre || "Slide"}
            className="max-h-full max-w-full object-contain"
          />
          <p className="absolute bottom-6 caption text-on-surface-variant">
            Slide projetée par le créateur — cliquez pour revenir au direct
          </p>
        </div>
      )}
    </div>
  );
}