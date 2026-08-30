"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function DevenirCreateur() {
  const router = useRouter();
  const [statut, setStatut] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [pieceUrl, setPieceUrl] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connexion");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("statut_createur, role")
        .eq("id", user.id)
        .single();
      setStatut(profile);
      setChargement(false);
    }
    load();
  }, [router]);

  async function soumettre(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({ statut_createur: "en_attente" })
      .eq("id", (await supabase.auth.getUser()).data.user.id);

    setSaving(false);
    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      setStatut((s) => ({ ...s, statut_createur: "en_attente" }));
    }
  }

  if (chargement) {
    return (
      <main className="pt-28 pb-20 px-5 md:px-20 flex items-center justify-center">
        <p className="text-on-surface-variant">Chargement...</p>
      </main>
    );
  }

  // Statut de la demande
  if (statut?.statut_createur === "en_attente") {
    return (
      <main className="pt-28 pb-20 px-5 md:px-20">
        <div className="glass-panel rounded-xl p-10 max-w-xl mx-auto text-center">
          <Clock size={64} className="text-primary mx-auto mb-6" />
          <h1 className="display-lg text-on-surface mb-3">Demande en cours d&apos;examen</h1>
          <p className="body-lg text-on-surface-variant mb-6">
            Votre demande de compte créateur est en attente de validation par notre équipe.
            Vous recevrez une notification dès qu&apos;elle sera traitée.
          </p>
          <p className="caption text-outline">Délai habituel : 24 à 48 heures.</p>
        </div>
      </main>
    );
  }

  if (statut?.statut_createur === "valide" || statut?.role === "createur" || statut?.role === "admin") {
    return (
      <main className="pt-28 pb-20 px-5 md:px-20">
        <div className="glass-panel rounded-xl p-10 max-w-xl mx-auto text-center">
          <CheckCircle2 size={64} className="text-primary mx-auto mb-6" />
          <h1 className="display-lg text-on-surface mb-3">Compte créateur actif</h1>
          <p className="body-lg text-on-surface-variant mb-8">
            Vous pouvez programmer des lives et recevoir des cadeaux de votre communauté.
          </p>
          <a href="/studio" className="bg-primary text-on-primary-fixed label-md px-8 py-3 rounded hover:bg-primary-container transition-colors">
            Ouvrir le Studio
          </a>
        </div>
      </main>
    );
  }

  if (statut?.statut_createur === "rejete") {
    return (
      <main className="pt-28 pb-20 px-5 md:px-20">
        <div className="glass-panel rounded-xl p-10 max-w-xl mx-auto text-center">
          <XCircle size={64} className="text-error mx-auto mb-6" />
          <h1 className="display-lg text-on-surface mb-3">Demande refusée</h1>
          <p className="body-lg text-on-surface-variant mb-8">
            Votre demande n&apos;a pas été retenue. Vous pouvez la soumettre à nouveau après avoir
            complété votre profil.
          </p>
          <button onClick={soumettre} className="border border-primary text-primary label-md px-8 py-3 rounded hover:bg-primary hover:text-on-primary-fixed transition-colors">
            Soumettre une nouvelle demande
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-28 pb-20 px-5 md:px-20">
      <div className="max-w-2xl mx-auto">
        <h1 className="display-lg text-on-surface mb-3">Devenir créateur</h1>
        <p className="body-lg text-on-surface-variant mb-10">
          Rejoignez les créateurs TiVoi : diffusez vos lives, recevez des cadeaux virtuels
          et touchez 70 % des revenus générés.
        </p>

        <form onSubmit={soumettre} className="glass-panel rounded-xl p-8 flex flex-col gap-6">
          <div>
            <label className="label-md text-on-surface mb-2 block">Pièce d&apos;identité (URL)</label>
            <input
              type="url"
              value={pieceUrl}
              onChange={(e) => setPieceUrl(e.target.value)}
              placeholder="https://... (CNI, passeport)"
              className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors"
            />
            <p className="caption text-on-surface-variant mt-2 opacity-70">
              La vérification documentaire sera active avec le stockage Supabase.
            </p>
          </div>
          <div>
            <label className="label-md text-on-surface mb-2 block">Présentation</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Parlez de votre contenu, votre audience, votre projet..."
              className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-on-primary-fixed label-md py-4 rounded-lg hover:bg-primary-container transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50"
          >
            {saving ? "Envoi..." : "Soumettre ma demande"}
          </button>
          {message && <p className="body-md text-on-surface-variant text-center">{message}</p>}
        </form>
      </div>
    </main>
  );
}
