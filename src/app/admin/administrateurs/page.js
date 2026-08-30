"use client";

import { useEffect, useState } from "react";
import { Plus, ShieldOff, Shield } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import LoaderCentered from "../../components/LoaderCentered";
import Spinner from "../../components/Spinner";

export default function AdminAdministrateurs() {
  const [admins, setAdmins] = useState([]);
  const [moi, setMoi] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [form, setForm] = useState({ email: "", password: "", nom: "", prenom: "" });
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [creation, setCreation] = useState(false);

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
    setMessage("");

    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: form,
    });

    setCreation(false);

    if (error || data?.error) {
      setErreur(
        data?.error ||
          "La création nécessite le déploiement de la fonction Edge 'admin-create-user'. En attendant, créez le compte puis exécutez : update profiles set role='admin' where pseudo='...'"
      );
      return;
    }

    setMessage(`Administrateur ${form.email} créé avec succès.`);
    setForm({ email: "", password: "", nom: "", prenom: "" });
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

  if (chargement) {
    return <LoaderCentered />;
  }

  return (
    <main className="px-6 md:px-12 py-12 max-w-3xl">
      <h1 className="font-display font-bold text-3xl text-primary mb-2">Administrateurs</h1>
      <p className="text-sm text-on-surface-variant mb-10">
        Gestion des accès au portail d&apos;administration.
      </p>

      {/* Créer un admin */}
      <form onSubmit={creerAdmin} className="glass-panel rounded-xl p-6 mb-10 flex flex-col gap-4">
        <h2 className="title-lg text-primary flex items-center gap-2">
          <Plus size={18} /> Ajouter un administrateur
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="caption text-on-surface-variant block mb-1">Email *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-2.5 outline-none focus:border-primary-container transition-colors text-sm"
            />
          </div>
          <div>
            <label className="caption text-on-surface-variant block mb-1">Mot de passe *</label>
            <input
              required
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-2.5 outline-none focus:border-primary-container transition-colors text-sm"
            />
          </div>
          <div>
            <label className="caption text-on-surface-variant block mb-1">Prénom</label>
            <input
              value={form.prenom}
              onChange={(e) => setForm({ ...form, prenom: e.target.value })}
              className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-2.5 outline-none focus:border-primary-container transition-colors text-sm"
            />
          </div>
          <div>
            <label className="caption text-on-surface-variant block mb-1">Nom</label>
            <input
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-2.5 outline-none focus:border-primary-container transition-colors text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creation}
          className="self-start flex items-center gap-2 bg-primary-container text-on-primary label-md px-6 py-3 rounded-lg hover:bg-primary transition-colors disabled:opacity-60"
        >
          {creation && <Spinner size={16} />}
          {creation ? "Création..." : "Créer l'administrateur"}
        </button>
        {message && <p className="caption text-primary">{message}</p>}
        {erreur && <p className="caption text-on-surface-variant">{erreur}</p>}
      </form>

      {/* Liste */}
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
