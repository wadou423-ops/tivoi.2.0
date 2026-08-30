"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ProgrammerLive() {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [programmeA, setProgrammeA] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push("/connexion");
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, statut_createur")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "createur" && profile?.role !== "admin") {
        setMessage("Seuls les créateurs validés peuvent programmer un live. Faites la demande depuis l'espace créateur.");
      }
    }
    check();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: live, error } = await supabase
      .from("lives")
      .insert({
        createur_id: user.id,
        titre,
        description: description || null,
        programme_a: programmeA || null,
        statut: "programme",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      router.push(`/live/${live.id}`);
    }
  }

  const inputClass =
    "w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors";

  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20">
      <div className="max-w-2xl mx-auto">
        <h1 className="display-lg text-on-surface mb-3">Programmer un live</h1>
        <p className="body-lg text-on-surface-variant mb-10">
          Définissez les informations de votre diffusion. Une clé de stream unique sera générée.
        </p>

        <form onSubmit={handleSubmit} className="glass-panel rounded-xl p-8 flex flex-col gap-6">
          <div>
            <label className="label-md text-on-surface mb-2 block">Titre du live</label>
            <input
              type="text"
              required
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Soirée zouglou en direct d'Abidjan"
              className={inputClass}
            />
          </div>
          <div>
            <label className="label-md text-on-surface mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Parlez de votre live..."
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className="label-md text-on-surface mb-2 block flex items-center gap-2">
              <Calendar size={16} className="text-primary" /> Date et heure (optionnel — vide pour un démarrage manuel)
            </label>
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-on-surface-variant" />
              <input
                type="datetime-local"
                value={programmeA}
                onChange={(e) => setProgrammeA(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-on-primary-fixed label-md py-4 rounded-lg hover:bg-primary-container transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50"
          >
            {saving ? "Création..." : "Créer le live"}
          </button>

          {message && <p className="body-md text-on-surface-variant text-center">{message}</p>}
        </form>
      </div>
    </main>
  );
}
