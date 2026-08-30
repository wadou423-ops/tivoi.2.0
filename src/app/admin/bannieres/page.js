"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import UploadFichier from "../../components/UploadFichier";

const EMPLACEMENTS = [
  { id: "accueil_h1", label: "Accueil — horizontale 1" },
  { id: "accueil_h2", label: "Accueil — horizontale 2" },
  { id: "portefeuille_h", label: "Portefeuille — horizontale" },
  { id: "live_v", label: "Page Live — verticale" },
  { id: "chaines_v", label: "Page Chaînes — verticale" },
];

export default function AdminBannieres() {
  const [bannieres, setBannieres] = useState([]);
  const [form, setForm] = useState({
    emplacement: "accueil_h1",
    titre: "",
    annonceur: "",
    image_url: "",
    lien: "",
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("bannieres")
      .select("*")
      .order("emplacement", { ascending: true });
    setBannieres(data || []);
  }

  async function ajouter(e) {
    e.preventDefault();
    const { error } = await supabase.from("bannieres").insert({ ...form, actif: true });
    if (!error) {
      setForm({ ...form, titre: "", annonceur: "", image_url: "", lien: "" });
      load();
    }
  }

  async function toggleActif(b) {
    await supabase.from("bannieres").update({ actif: !b.actif }).eq("id", b.id);
    load();
  }

  async function supprimer(id) {
    await supabase.from("bannieres").delete().eq("id", id);
    load();
  }

  const inputClass =
    "w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-2.5 outline-none focus:border-primary-container transition-colors text-sm";

  return (
    <main className="px-6 md:px-12 py-12">
      <h1 className="font-display font-bold text-3xl text-primary mb-2">Bannières publicitaires</h1>
      <p className="text-sm text-on-surface-variant mb-8">
        Cinq emplacements image cliquables — impressions et clics suivis automatiquement.
      </p>

      <form onSubmit={ajouter} className="glass-panel rounded-xl p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="caption text-on-surface-variant block mb-1">Emplacement</label>
          <select value={form.emplacement} onChange={(e) => setForm({ ...form, emplacement: e.target.value })} className={inputClass}>
            {EMPLACEMENTS.map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="caption text-on-surface-variant block mb-1">Annonceur</label>
          <input value={form.annonceur} onChange={(e) => setForm({ ...form, annonceur: e.target.value })} className={inputClass} />
        </div>
        <UploadFichier
          label="Image bannière"
          url={form.image_url}
          onChange={(u) => setForm({ ...form, image_url: u })}
        />
        <div>
          <label className="caption text-on-surface-variant block mb-1">Lien de destination</label>
          <input type="url" value={form.lien} onChange={(e) => setForm({ ...form, lien: e.target.value })} className={inputClass} />
        </div>
        <button type="submit" className="md:col-span-2 flex items-center justify-center gap-2 bg-primary text-on-primary-fixed label-md px-6 py-3 rounded hover:bg-primary-container transition-colors">
          <Plus size={16} /> Publier la bannière
        </button>
      </form>

      <div className="space-y-2">
        {bannieres.map((b) => (
          <div key={b.id} className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-low px-4 py-3">
            <div className="flex-1">
              <p className="body-md text-on-surface">
                {EMPLACEMENTS.find((e) => e.id === b.emplacement)?.label || b.emplacement}
                {b.annonceur && <span className="caption text-primary ml-2">{b.annonceur}</span>}
              </p>
              <p className="caption text-on-surface-variant">
                {b.impressions.toLocaleString("fr-FR")} impressions · {b.clics.toLocaleString("fr-FR")} clics
                {b.clics > 0 && b.impressions > 0 && ` · CTR ${((b.clics / b.impressions) * 100).toFixed(1)}%`}
              </p>
            </div>
            <button onClick={() => toggleActif(b)} className={`caption px-3 py-1 rounded border transition ${b.actif ? "border-primary text-primary" : "border-outline-variant text-on-surface-variant"}`}>
              {b.actif ? "Active" : "Inactive"}
            </button>
            <button onClick={() => supprimer(b.id)} className="text-on-surface-variant hover:text-error p-1">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
