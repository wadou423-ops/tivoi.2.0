"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Parametres() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [codeTv, setCodeTv] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push("/connexion");
      const { data: p } = await supabase
        .from("profiles")
        .select("pseudo, nom, prenom")
        .eq("id", user.id)
        .single();
      setProfile(p);
    }
    load();
  }, [router]);

  async function sauvegarder(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
    setSaving(false);
    setMessage(error ? `Erreur : ${error.message}` : "Paramètres enregistrés.");
  }

  async function appairerTv(e) {
    e.preventDefault();
    setMessage("");
    const { data } = await supabase
      .from("appareils")
      .select("id, appaire")
      .eq("code_activation", codeTv.trim())
      .maybeSingle();
    if (!data) {
      setMessage("Code invalide.");
      return;
    }
    if (data.appaire) {
      setMessage("Cet appareil est déjà appairé.");
      return;
    }
    const { error } = await supabase
      .from("appareils")
      .update({ appaire: true })
      .eq("id", data.id);
    setMessage(
      error ? `Erreur : ${error.message}` : "TV appairée avec succès ! Revenez sur l'écran TV."
    );
  }

  if (!profile) {
    return (
      <main className="pt-28 pb-20 px-5 md:px-20 flex items-center justify-center min-h-screen">
        <p className="text-on-surface-variant">Chargement...</p>
      </main>
    );
  }

  const inputClass =
    "w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors";

  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20 max-w-2xl mx-auto w-full">
      <h1 className="display-lg text-on-surface mb-10">Paramètres du compte</h1>

      <form onSubmit={sauvegarder} className="glass-panel rounded-xl p-8 mb-8 flex flex-col gap-5">
        <h2 className="title-lg text-primary">Informations personnelles</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-md text-on-surface mb-2 block">Prénom</label>
            <input
              type="text"
              value={profile.prenom || ""}
              onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="label-md text-on-surface mb-2 block">Nom</label>
            <input
              type="text"
              value={profile.nom || ""}
              onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="label-md text-on-surface mb-2 block">Pseudo</label>
          <input
            type="text"
            value={profile.pseudo || ""}
            onChange={(e) => setProfile({ ...profile, pseudo: e.target.value })}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="self-start bg-primary-container text-on-primary label-md px-8 py-3 rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>

      <form onSubmit={appairerTv} className="glass-panel rounded-xl p-8 mb-8">
        <h2 className="title-lg text-primary mb-2">Appareils — Smart TV</h2>
        <p className="caption text-on-surface-variant mb-4">
          Saisissez le code à 6 chiffres affiché sur votre TV pour la connecter à votre compte.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={codeTv}
            onChange={(e) => setCodeTv(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className={`${inputClass} flex-1 font-mono text-2xl tracking-[0.5em] text-center`}
          />
          <button
            type="submit"
            className="bg-primary text-on-primary-fixed label-md px-8 rounded-lg hover:bg-primary-container transition-colors"
          >
            Appairer
          </button>
        </div>
      </form>

      <div className="glass-panel rounded-xl p-8">
        <h2 className="title-lg text-primary mb-2">Sécurité</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="body-md text-on-surface">Double authentification (2FA)</p>
            <p className="caption text-on-surface-variant">Protection supplémentaire par TOTP</p>
          </div>
          <span className="caption px-3 py-1.5 rounded border border-outline-variant text-on-surface-variant cursor-not-allowed">
            Bientôt
          </span>
        </div>
      </div>

      {message && (
        <p className="mt-6 text-center body-md text-on-surface-variant">{message}</p>
      )}
    </main>
  );
}
