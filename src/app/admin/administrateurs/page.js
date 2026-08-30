"use client";

import { useEffect, useState } from "react";
import { Plus, ShieldOff, Shield, KeyRound, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import LoaderCentered from "../../components/LoaderCentered";
import Spinner from "../../components/Spinner";

const ATTRIBUTIONS = [
  { code: "utilisateurs", label: "Utilisateurs" },
  { code: "createurs", label: "Validation créateurs" },
  { code: "catalogue", label: "Catalogue VOD" },
  { code: "a_une", label: "Contenus à la une" },
  { code: "chaines", label: "Chaînes TV" },
  { code: "bannieres", label: "Bannières & pubs" },
  { code: "retraits", label: "Demandes de retrait" },
  { code: "vtc", label: "Playlist VTC" },
  { code: "administrateurs", label: "Gestion des administrateurs" },
];

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
    permissions: ["utilisateurs", "catalogue"],
  });
  const [identifiants, setIdentifiants] = useState(null);
  const [creation, setCreation] = useState(false);
  const [erreur, setErreur] = useState("");

  // Édition des attributions
  const [editPerms, setEditPerms] = useState(null); // id de l'admin en cours d'édition
  const [permsTemp, setPermsTemp] = useState([]);
  const [savingPerms, setSavingPerms] = useState(false);

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
        supabase.from("profiles").select("id, pseudo, nom, prenom, role, permissions").eq("role", "admin"),
        supabase.auth.getUser(),
      ]);
      setAdmins(liste || []);
      setMoi(user?.id || null);
      setChargement(false);
    }
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  function togglePermTemp(code) {
    setPermsTemp((p) => (p.includes(code) ? p.filter((x) => x !== code) : [...p, code]));
  }

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
          "La création nécessite le déploiement de la fonction Edge 'admin-create-user'. En attendant : créez le compte via la connexion cliente puis exécutez update profiles set role='admin' where pseudo='...'"
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

  async function enregistrerPerms(adminId) {
    setSavingPerms(true);
    const { error } = await supabase.rpc("definir_permissions", {
      p_user_id: adminId,
      p_permissions: permsTemp,
    });
    setSavingPerms(false);
    if (error) {
      setErreur(`Erreur : ${error.message} — exécutez d'abord le SQL des permissions.`);
    } else {
      setEditPerms(null);
      load();
    }
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

      {/* Créer un admin */}
      <form onSubmit={creerAdmin} className="glass-panel rounded-xl p-6 mb-8 flex flex-col gap-4">
        <h2 className="title-lg text-primary flex items-center gap-2">
          <Plus size={18} /> Inviter un administrateur
        </h2>
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

        <div>
          <p className="caption text-on-surface-variant mb-2">Attributions du nouvel admin</p>
          <div className="flex flex-wrap gap-2">
            {ATTRIBUTIONS.map((a) => (
              <button
                key={a.code}
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    permissions: f.permissions.includes(a.code)
                      ? f.permissions.filter((x) => x !== a.code)
                      : [...f.permissions, a.code],
                  }))
                }
                className={`caption px-3 py-1.5 rounded-lg border transition-colors ${
                  form.permissions.includes(a.code)
                    ? "border-primary text-primary bg-primary/10"
                    : "border-outline-variant text-on-surface-variant"
                }`}
              >
                {a.label}
              </button>
            ))}
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
          </div>
        )}
        {erreur && <p className="caption text-on-surface-variant">{erreur}</p>}
      </form>

      {/* Liste des admins */}
      <div className="space-y-3 mb-8">
        {admins.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-outline-variant/20 bg-surface-low px-4 py-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center">
                <Shield size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="body-md text-on-surface">
                  @{a.pseudo || "—"}
                  {a.id === moi && <span className="caption text-primary ml-2">(vous)</span>}
                </p>
                <p className="caption text-on-surface-variant">
                  {(a.permissions || []).length} attribution(s)
                </p>
              </div>
              <button
                onClick={() => {
                  setEditPerms(editPerms === a.id ? null : a.id);
                  setPermsTemp(a.permissions || []);
                  setErreur("");
                }}
                className="flex items-center gap-1 caption border border-outline-variant text-on-surface-variant px-4 py-2 rounded hover:border-primary hover:text-primary transition-colors"
              >
                <SlidersHorizontal size={14} /> Attributions
              </button>
              {a.id !== moi && (
                <button
                  onClick={() => retirerAdmin(a.id)}
                  className="flex items-center gap-1 caption border border-outline-variant text-on-surface-variant px-4 py-2 rounded hover:border-error hover:text-error transition-colors"
                >
                  <ShieldOff size={14} /> Retirer
                </button>
              )}
            </div>

            {editPerms === a.id && (
              <div className="mt-4 pt-4 border-t border-outline-variant/20">
                <div className="flex flex-wrap gap-2 mb-3">
                  {ATTRIBUTIONS.map((at) => (
                    <button
                      key={at.code}
                      type="button"
                      onClick={() => togglePermTemp(at.code)}
                      className={`caption px-3 py-1.5 rounded-lg border transition-colors ${
                        permsTemp.includes(at.code)
                          ? "border-primary text-primary bg-primary/10"
                          : "border-outline-variant text-on-surface-variant"
                      }`}
                    >
                      {at.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => enregistrerPerms(a.id)}
                  disabled={savingPerms}
                  className="flex items-center gap-2 caption bg-primary text-on-primary-fixed px-5 py-2 rounded hover:bg-primary-container transition-colors disabled:opacity-60"
                >
                  {savingPerms && <Spinner size={14} />}
                  {savingPerms ? "Enregistrement..." : "Enregistrer les attributions"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mon mot de passe */}
      <form onSubmit={changerMotDePasse} className="glass-panel rounded-xl p-6 flex flex-col gap-4">
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
    </main>
  );
}
