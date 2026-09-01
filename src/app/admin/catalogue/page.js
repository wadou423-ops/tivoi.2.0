"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import UploadFichier from "../../components/UploadFichier";

const VIDE = {
  titre: "",
  description: "",
  categorie: "",
  acteurs: "",
  duree_minutes: 90,
  annee: 2025,
  image_url: "",
  bande_annonce_url: "",
  type_acces: "gratuit",
  prix_fcfa: 0,
  badge: "",
  actif: true,
  ordre: 0,
  dispo_vtc: false,
};

export default function AdminCatalogue() {
  const [films, setFilms] = useState([]);
  const [edition, setEdition] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("catalogue")
      .select("*")
      .order("ordre", { ascending: true });
    setFilms(data || []);
  }

  async function enregistrer(e) {
    e.preventDefault();
    setMessage("");
    const f = { ...edition, badge: edition.badge || null };
    const { error } = edition.id
      ? await supabase.from("catalogue").update(f).eq("id", edition.id)
      : await supabase.from("catalogue").insert(f);
    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      setEdition(null);
      load();
    }
  }

  async function supprimer(id) {
    await supabase.from("catalogue").delete().eq("id", id);
    load();
  }

  const inputClass =
    "w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-2.5 outline-none focus:border-primary-container transition-colors text-sm";

  return (
    <main className="px-6 md:px-12 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-display font-bold text-3xl text-primary">Catalogue VOD</h1>
        <button
          onClick={() => setEdition({ ...VIDE })}
          className="flex items-center gap-2 bg-primary text-on-primary-fixed label-md px-5 py-2.5 rounded hover:bg-primary-container transition-colors"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {message && <p className="caption text-on-surface-variant mb-4">{message}</p>}

      {/* Formulaire d'édition */}
      {edition && (
        <form onSubmit={enregistrer} className="glass-panel rounded-xl p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="caption text-on-surface-variant block mb-1">Titre *</label>
            <input required value={edition.titre} onChange={(e) => setEdition({ ...edition, titre: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="caption text-on-surface-variant block mb-1">Catégorie</label>
            <input value={edition.categorie || ""} onChange={(e) => setEdition({ ...edition, categorie: e.target.value })} className={inputClass} placeholder="Thriller, Drame..." />
          </div>
          <div className="md:col-span-2">
            <label className="caption text-on-surface-variant block mb-1">Description</label>
            <textarea value={edition.description || ""} onChange={(e) => setEdition({ ...edition, description: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="caption text-on-surface-variant block mb-1">Acteurs</label>
            <input value={edition.acteurs || ""} onChange={(e) => setEdition({ ...edition, acteurs: e.target.value })} className={inputClass} />
          </div>
          <UploadFichier
            label="Image"
            url={edition.image_url || ""}
            onChange={(u) => setEdition({ ...edition, image_url: u })}
          />
          <div>
            <label className="caption text-on-surface-variant block mb-1">Vidéo (URL YouTube/MP4)</label>
            <input value={edition.bande_annonce_url || ""} onChange={(e) => setEdition({ ...edition, bande_annonce_url: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="caption text-on-surface-variant block mb-1">Durée (min)</label>
              <input type="number" value={edition.duree_minutes || ""} onChange={(e) => setEdition({ ...edition, duree_minutes: +e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="caption text-on-surface-variant block mb-1">Année</label>
              <input type="number" value={edition.annee || ""} onChange={(e) => setEdition({ ...edition, annee: +e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="caption text-on-surface-variant block mb-1">Ordre</label>
              <input type="number" value={edition.ordre} onChange={(e) => setEdition({ ...edition, ordre: +e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="caption text-on-surface-variant block mb-1">Type d&apos;accès</label>
              <select value={edition.type_acces} onChange={(e) => setEdition({ ...edition, type_acces: e.target.value })} className={inputClass}>
                <option value="gratuit">Gratuit</option>
                <option value="seance">Paiement à la séance</option>
                <option value="abonnement">Abonnement</option>
              </select>
            </div>
            <div>
              <label className="caption text-on-surface-variant block mb-1">Prix (FCFA)</label>
              <input type="number" value={edition.prix_fcfa} onChange={(e) => setEdition({ ...edition, prix_fcfa: +e.target.value })} className={inputClass} disabled={edition.type_acces === "gratuit"} />
            </div>
            <div>
              <label className="caption text-on-surface-variant block mb-1">Badge</label>
              <input value={edition.badge || ""} onChange={(e) => setEdition({ ...edition, badge: e.target.value })} className={inputClass} placeholder="GRATUIT, VIP..." />
            </div>
          </div>
          <label className="flex items-center gap-2 caption text-on-surface-variant">
            <input type="checkbox" checked={edition.actif} onChange={(e) => setEdition({ ...edition, actif: e.target.checked })} />
            Actif (visible sur le site)
          </label>
          <label className="flex items-center gap-2 caption text-on-surface-variant">
            <input type="checkbox" checked={!!edition.dispo_vtc} onChange={(e) => setEdition({ ...edition, dispo_vtc: e.target.checked })} />
            Disponible sur les écrans VTC
          </label>
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" className="bg-primary-container text-on-primary label-md px-8 py-3 rounded-lg hover:bg-primary transition-colors">
              Enregistrer
            </button>
            <button type="button" onClick={() => setEdition(null)} className="border border-outline-variant text-on-surface-variant label-md px-8 py-3 rounded-lg hover:border-error hover:text-error transition-colors">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste */}
      <div className="space-y-2">
        {films.map((f) => (
          <div key={f.id} className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-low px-4 py-3">
            {f.image_url && (
              <img src={f.image_url} alt={f.titre} className="w-10 h-14 object-cover rounded" />
            )}
            <div className="flex-1 min-w-0">
              <p className="body-md text-on-surface truncate">
                {f.titre}
                {!f.actif && <span className="caption text-error ml-2">(inactif)</span>}
              </p>
              <p className="caption text-on-surface-variant">
                {f.categorie} · {f.type_acces === "gratuit" ? "Gratuit" : f.type_acces === "abonnement" ? "Abonnement" : `${f.prix_fcfa} FCFA`}
              </p>
            </div>
            <button onClick={() => setEdition(f)} className="text-on-surface-variant hover:text-primary transition-colors p-2">
              <Pencil size={16} />
            </button>
            <button onClick={() => supprimer(f.id)} className="text-on-surface-variant hover:text-error transition-colors p-2">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {films.length === 0 && <p className="text-on-surface-variant">Aucun contenu. Cliquez sur Ajouter.</p>}
      </div>
    </main>
  );
}
