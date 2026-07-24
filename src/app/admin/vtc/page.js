"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminVTC() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");

  const [type, setType] = useState("publicite");
  const [titre, setTitre] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [duree, setDuree] = useState(8);
  const [ordre, setOrdre] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const { data } = await supabase
      .from("playlist_vtc")
      .select("*")
      .order("ordre", { ascending: true });
    setItems(data || []);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("playlist_vtc").insert({
      type,
      titre,
      media_url: mediaUrl,
      duree_secondes: Number(duree),
      ordre: Number(ordre),
    });

    setSaving(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      setTitre("");
      setMediaUrl("");
      setDuree(8);
      setOrdre(0);
      loadItems();
    }
  }

  async function toggleActif(item) {
    await supabase
      .from("playlist_vtc")
      .update({ actif: !item.actif })
      .eq("id", item.id);
    loadItems();
  }

  async function handleDelete(id) {
    await supabase.from("playlist_vtc").delete().eq("id", id);
    loadItems();
  }

  return (
    <main className="px-6 md:px-12 py-12 max-w-3xl">
      <h1 className="font-display text-3xl text-[#E8A33D] mb-8">
        Gestion de la playlist VTC
      </h1>

      <form
        onSubmit={handleAdd}
        className="bg-[#0F131B] border border-[#1C2029] rounded-2xl p-6 mb-10"
      >
        <h2 className="font-display text-xl text-[#F4F1EA] mb-4">Ajouter un élément</h2>

        <label className="block text-sm text-[#9AA0AC] mb-2">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full mb-4 rounded-lg bg-[#0B0E14] border border-[#2A2E38] px-4 py-2 text-[#F4F1EA]"
        >
          <option value="publicite">Publicité</option>
          <option value="contenu">Contenu</option>
        </select>

        <label className="block text-sm text-[#9AA0AC] mb-2">Titre</label>
        <input
          type="text"
          required
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          className="w-full mb-4 rounded-lg bg-[#0B0E14] border border-[#2A2E38] px-4 py-2 text-[#F4F1EA]"
        />

        <label className="block text-sm text-[#9AA0AC] mb-2">URL de l&apos;image/vidéo</label>
        <input
          type="url"
          required
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          className="w-full mb-4 rounded-lg bg-[#0B0E14] border border-[#2A2E38] px-4 py-2 text-[#F4F1EA]"
        />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-[#9AA0AC] mb-2">Durée (secondes)</label>
            <input
              type="number"
              min="1"
              value={duree}
              onChange={(e) => setDuree(e.target.value)}
              className="w-full rounded-lg bg-[#0B0E14] border border-[#2A2E38] px-4 py-2 text-[#F4F1EA]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#9AA0AC] mb-2">Ordre</label>
            <input
              type="number"
              value={ordre}
              onChange={(e) => setOrdre(e.target.value)}
              className="w-full rounded-lg bg-[#0B0E14] border border-[#2A2E38] px-4 py-2 text-[#F4F1EA]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#E8A33D] px-6 py-3 text-sm font-semibold text-[#0B0E14] hover:brightness-110 transition disabled:opacity-50"
        >
          {saving ? "Ajout..." : "Ajouter"}
        </button>

        {message && <p className="mt-4 text-sm text-[#9AA0AC]">{message}</p>}
      </form>

      <h2 className="font-display text-xl text-[#F4F1EA] mb-4">Éléments actuels</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between bg-[#0F131B] border border-[#1C2029] rounded-xl px-4 py-3"
          >
            <div>
              <p className="text-sm text-[#F4F1EA]">
                {item.titre}{" "}
                <span className="text-xs text-[#E8A33D] ml-2">
                  {item.type === "publicite" ? "Publicité" : "Contenu"}
                </span>
              </p>
              <p className="text-xs text-[#9AA0AC]">
                {item.duree_secondes}s — ordre {item.ordre}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleActif(item)}
                className={`text-xs px-3 py-1 rounded-full border transition ${
                  item.actif
                    ? "border-[#E8A33D] text-[#E8A33D]"
                    : "border-[#2A2E38] text-[#9AA0AC]"
                }`}
              >
                {item.actif ? "Actif" : "Désactivé"}
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-xs px-3 py-1 rounded-full border border-[#2A2E38] text-[#9AA0AC] hover:border-red-400 hover:text-red-400 transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}