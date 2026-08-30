"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ShieldOff, Shield, KeyRound, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import LoaderCentered from "../../components/LoaderCentered";
import Spinner from "../../components/Spinner";

export default function AdminAdministrateurs() {
  const [admins, setAdmins] = useState([]);
  const [moi, setMoi] = useState(null);
  const [chargement, setChargement] = useState(true);

  // Création
  const [form, setForm] = useState({
    email: "",
    password: "TiVoi@2026!",
    nom: "",
    prenom: "",
  });
  const [identifiants, setIdentifiants] = useState(null);
  const [creation, setCreation] = useState(false);
  const [erreur, setErreur] = useState("");

  // Changement de mot de passe personnel
  const [mdp, setMdp] = useState({ nouveau: "", confirm: "" });
  const [mdpMessage, setMdpMessage] = useState("");
  const [mdpSaving, setMdpSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [
        { data: liste },
        {
          data: { user },
        },
      ] = await Promise.all([
        supabase.from("profiles").select("id, pseudo, nom, prenom, role").eq("role", "admin"),
        supabase.auth.getUser(),
      ]);
      setAdmins(liste || []);
      setMoi(user?.id || null);
      setChargement(false);
    }
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  async function creerAdmin(e) {
    e.preventDefault();
    setCreation(true);
    setErreur("");
    setIdentifiants(null);

    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: form,
    });

    setCreation(false);

    if (error || data?.error) {
      setErreur(
        data?.error ||
          "La création nécessite le déploiement de la fonction Edge 'admin-create-user' (supabase functions deploy admin-create-user). En attendant : créez le compte via la connexion cliente puis exécutez update profiles set role='admin' where pseudo='...'"
      );
      return;
    }

    setIdentifiants({ email: form.email, password: form.password });
    setForm({ ...form, email: "", nom: "", prenom: "", password: "TiVoi@2026!" });
    load();
  }

  async function retirerAdmin(id) {
    if (id === moi) {
      setErreur("Vous ne pouvez pas retirer votre propre accès.");
      return;
    }
    await supabase.from("profiles").update({ role: "utilisateur" }).eq("id", id);
    load();
  }

  async function changerMotDePasse(e) {
    e.preventDefault();
    setMdpMessage("");

    if (mdp.nouveau.length < 6) {
      setMdpMessage("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (mdp.nouveau !== mdp.confirm) {
      setMdpMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setMdpSaving(true);
    const { error } = await supabase.auth.updateUser({ password: mdp.nouveau });
    setMdpSaving(false);

    if (error) {
      setMdpMessage(`Erreur : ${error.message}`);
    } else {
      setMdpMessage("Mot de passe modifié avec succès. Utilisez-le à votre prochaine connexion.");
      setMdp({ nouveau: "", confirm: "" });
    }
  }

  if (chargement) {
    return <LoaderCentered />;
  }

  const inputClass =
    "w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-2.5 outline-none focus:border-primary-container transition-colors text-sm";

  return (
    <main className="px-6 md:px-12 py-12 max-w-3xl">
      <h1 className="font-display font-bold text-3xl text-primary mb-10">Administrateurs</h1>

      {/* Créer un admin avec identifiants par défaut */}
      <form onSubmit={creerAdmin} className="glass-panel rounded-xl p-6 mb-8 flex flex-col gap-4">
        <h2 className="title-lg text-primary flex items-center gap-2">
          <Plus size={18} /> Inviter un administrateur
        </h2>
        <p className="caption text-on-surface-variant">
          Le compte est créé immédiatement avec le mot de passe par défaut. Communiquez les
          identifiants au nouvel administrateur — il pourra les modifier dans « Mon mot de passe ».
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="caption text-on-surface-variant block mb-1">Email (login) *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="caption text-on-surface-variant block mb-1">Mot de passe par défaut *</label>
            <input
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="caption text-on-surface-variant block mb-1">Prénom</label>
            <input
              value={form.prenom}
              onChange={(e) => setForm({ ...form, prenom: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="caption text-on-surface-variant block mb-1">Nom</label>
            <input
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creation}
          className="self-start flex items-center gap-2 bg-primary-container text-on-primary label-md px-6 py-3 rounded-lg hover:bg-primary transition-colors disabled:opacity-60"
        >
          {creation && <Spinner size={16} />}
          {creation ? "Création..." : "Créer l'accès admin"}
        </button>

        {identifiants && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="label-md text-primary mb-2 flex items-center gap-2">
              <KeyRound size={14} /> Identifiants à transmettre
            </p>
            <p className="body-md text-on-surface font-mono">Login : {identifiants.email}</p>
            <p className="body-md text-on-surface font-mono">Mot de passe : {identifiants.password}</p>
            <p className="caption text-on-surface-variant mt-2">
              Le nouvel admin se connecte sur le portail administrateur, puis modifie son mot de passe ci-dessous.
            </p>
          </div>
        )}
        {erreur && <p className="caption text-on-surface-variant">{erreur}</p>}
      </form>

      {/* Mon mot de passe */}
      <form onSubmit={changerMotDePasse} className="glass-panel rounded-xl p-6 mb-8 flex flex-col gap-4">
        <h2 className="title-lg text-primary flex items-center gap-2">
          <KeyRound size={18} /> Mon mot de passe
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="caption text-on-surface-variant block mb-1">Nouveau mot de passe</label>
            <input
              required
              type="password"
              minLength={6}
              value={mdp.nouveau}
              onChange={(e) => setMdp({ ...mdp, nouveau: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="caption text-on-surface-variant block mb-1">Confirmer</label>
            <input
              required
              type="password"
              minLength={6}
              value={mdp.confirm}
              onChange={(e) => setMdp({ ...mdp, confirm: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={mdpSaving}
          className="self-start flex items-center gap-2 bg-primary-container text-on-primary label-md px-6 py-3 rounded-lg hover:bg-primary transition-colors disabled:opacity-60"
        >
          {mdpSaving && <Spinner size={16} />}
          {mdpSaving ? "Modification..." : "Modifier mon mot de passe"}
        </button>
        {mdpMessage && <p className="caption text-on-surface-variant">{mdpMessage}</p>}
      </form>

      {/* Liste des admins */}
      <div className="space-y-2">
        {admins.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-low px-4 py-3"
          >
            <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center">
              <Shield size={18} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="body-md text-on-surface">
                @{a.pseudo || "—"}
                {a.id === moi && <span className="caption text-primary ml-2">(vous)</span>}
              </p>
              <p className="caption text-on-surface-variant">
                {[a.prenom, a.nom].filter(Boolean).join(" ") || "Administrateur TiVoi"}
              </p>
            </div>
            {a.id !== moi && (
              <button
                onClick={() => retirerAdmin(a.id)}
                className="flex items-center gap-1 caption border border-outline-variant text-on-surface-variant px-4 py-2 rounded hover:border-error hover:text-error transition-colors"
              >
                <ShieldOff size={14} /> Retirer
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
