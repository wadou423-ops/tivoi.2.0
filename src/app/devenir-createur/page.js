"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, XCircle, User, CreditCard, Clapperboard } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Spinner from "../components/Spinner";

const TYPES_CONTENU = [
  "Musique",
  "Comédie",
  "Cuisine",
  "Sport",
  "Gaming",
  "Mode & Beauté",
  "Éducation",
  "Débat & Actualité",
  "Religion",
  "Voyage",
  "Danse",
  "Autre",
];

const inputClass =
  "w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors";

export default function DevenirCreateur() {
  const router = useRouter();
  const [chargement, setChargement] = useState(true);
  const [demande, setDemande] = useState(null);
  const [form, setForm] = useState({
    nom: "",
    prenoms: "",
    numero_cni: "",
    type_contenu: "",
    presentation: "",
  });
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

      const [prof, demandeRes] = await Promise.all([
        supabase.from("profiles").select("nom, prenom, statut_createur, role").eq("id", user.id).single(),
        supabase
          .from("demandes_createur")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setDemande(demandeRes.data || null);
      setForm((f) => ({
        ...f,
        nom: prof.data?.nom || "",
        prenoms: prof.data?.prenom || "",
      }));
      setChargement(false);
    }
    load();
  }, [router]);

  async function soumettre(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: nouvelle, error } = await supabase
      .from("demandes_createur")
      .insert({
        user_id: user.id,
        nom: form.nom,
        prenoms: form.prenoms,
        numero_cni: form.numero_cni,
        type_contenu: form.type_contenu,
        presentation: form.presentation || null,
      })
      .select()
      .single();

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      setSaving(false);
      return;
    }

    // Mettre à jour le nom sur le profil + signaler la demande en cours
    await Promise.all([
      supabase.from("profiles").update({ nom: form.nom, prenom: form.prenoms }).eq("id", user.id),
      supabase.from("profiles").update({ statut_createur: "en_attente" }).eq("id", user.id),
    ]);

    setDemande(nouvelle);
    setSaving(false);
  }

  if (chargement) {
    return (
      <main className="flex-grow pt-28 pb-20 px-5 md:px-20 flex items-center justify-center min-h-[60vh]">
        <Spinner size={36} />
      </main>
    );
  }

  // Écrans de statut
  if (demande?.statut === "en_attente") {
    return (
      <main className="flex-grow pt-28 pb-20 px-5 md:px-20">
        <div className="glass-panel rounded-xl p-10 max-w-xl mx-auto text-center">
          <Clock size={64} className="text-primary mx-auto mb-6" />
          <h1 className="display-lg text-on-surface mb-3">Demande en cours d&apos;examen</h1>
          <p className="body-lg text-on-surface-variant mb-4">
            Votre demande de compte créateur est en attente de validation par notre équipe.
            Vous recevrez une notification dès qu&apos;elle sera traitée.
          </p>
          <p className="caption text-outline">Délai habituel : 24 à 48 heures.</p>
        </div>
      </main>
    );
  }

  if (demande?.statut === "valide") {
    return (
      <main className="flex-grow pt-28 pb-20 px-5 md:px-20">
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

  if (demande?.statut === "rejete") {
    return (
      <main className="flex-grow pt-28 pb-20 px-5 md:px-20">
        <div className="glass-panel rounded-xl p-10 max-w-xl mx-auto text-center">
          <XCircle size={64} className="text-error mx-auto mb-6" />
          <h1 className="display-lg text-on-surface mb-3">Demande refusée</h1>
          <p className="body-lg text-on-surface-variant mb-8">
            Votre demande n&apos;a pas été retenue. Vous pouvez la soumettre à nouveau
            avec des informations complètes.
          </p>
          <button
            onClick={() => setDemande(null)}
            className="border border-primary text-primary label-md px-8 py-3 rounded hover:bg-primary hover:text-on-primary-fixed transition-colors"
          >
            Nouvelle demande
          </button>
        </div>
      </main>
    );
  }

  // Formulaire
  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20">
      <div className="max-w-2xl mx-auto">
        <h1 className="display-lg text-on-surface mb-3">Devenir créateur</h1>
        <p className="body-lg text-on-surface-variant mb-10">
          Rejoignez les créateurs TiVoi : diffusez vos lives, recevez des cadeaux virtuels
          et touchez 70 % des revenus générés.
        </p>

        <form onSubmit={soumettre} className="glass-panel rounded-xl p-8 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label-md text-on-surface mb-2 block">Nom *</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Votre nom"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>
            <div>
              <label className="label-md text-on-surface mb-2 block">Prénoms *</label>
              <input
                required
                value={form.prenoms}
                onChange={(e) => setForm({ ...form, prenoms: e.target.value })}
                placeholder="Vos prénoms"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="label-md text-on-surface mb-2 block">Numéro de CNI *</label>
            <div className="relative">
              <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                required
                value={form.numero_cni}
                onChange={(e) => setForm({ ...form, numero_cni: e.target.value.replace(/\D/g, "") })}
                placeholder="Numéro figurant sur votre CNI"
                inputMode="numeric"
                pattern="[0-9]{8,12}"
                title="Entre 8 et 12 chiffres"
                className={`${inputClass} pl-9 font-mono`}
              />
            </div>
          </div>

          <div>
            <label className="label-md text-on-surface mb-2 block">Type de contenu *</label>
            <div className="relative">
              <Clapperboard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              <select
                required
                value={form.type_contenu}
                onChange={(e) => setForm({ ...form, type_contenu: e.target.value })}
                className={`${inputClass} pl-9 appearance-none cursor-pointer`}
              >
                <option value="" disabled>
                  — Choisir votre type de contenu —
                </option>
                {TYPES_CONTENU.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-xs">▼</span>
            </div>
          </div>

          <div>
            <label className="label-md text-on-surface mb-2 block">Présentation</label>
            <textarea
              value={form.presentation}
              onChange={(e) => setForm({ ...form, presentation: e.target.value })}
              rows={4}
              placeholder="Parlez de votre contenu, votre audience, votre projet..."
              className={`${inputClass} resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-on-primary-fixed label-md py-4 rounded-lg hover:bg-primary-container transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Spinner size={16} />}
            {saving ? "Envoi en cours..." : "Soumettre ma demande"}
          </button>
          {message && <p className="body-md text-error text-center">{message}</p>}
        </form>
      </div>
    </main>
  );
}
