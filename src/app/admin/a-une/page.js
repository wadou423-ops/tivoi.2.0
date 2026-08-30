"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminAUne() {
  const [slides, setSlides] = useState([]);
  const [contenus, setContenus] = useState([]);
  const [choix, setChoix] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from("a_une").select("*, catalogue(titre)").order("ordre", { ascending: true }),
      supabase.from("catalogue").select("id, titre").eq("actif", true).order("titre"),
    ]);
    setSlides(s || []);
    setContenus(c || []);
  }

  async function ajouter(e) {
    e.preventDefault();
    if (!choix) return;
    const contenu = contenus.find((c) => c.id === parseInt(choix, 10));
    await supabase.from("a_une").insert({
      contenu_id: parseInt(choix, 10),
      titre: contenu?.titre,
      image_url: null,
      ordre: slides.length,
      actif: true,
    });
    setChoix("");
    load();
  }

  async function supprimer(id) {
    await supabase.from("a_une").delete().eq("id", id);
    load();
  }

  async function monter(index) {
    if (index === 0) return;
    await echanger(slides[index], slides[index - 1]);
  }

  async function descendre(index) {
    if (index === slides.length - 1) return;
    await echanger(slides[index], slides[index + 1]);
  }

  async function echanger(a, b) {
    await Promise.all([
      supabase.from("a_une").update({ ordre: b.ordre }).eq("id", a.id),
      supabase.from("a_une").update({ ordre: a.ordre }).eq("id", b.id),
    ]);
    load();
  }

  async function toggleActif(s) {
    await supabase.from("a_une").update({ actif: !s.actif }).eq("id", s.id);
    load();
  }

  return (
    <main className="px-6 md:px-12 py-12">
      <h1 className="font-display font-bold text-3xl text-primary mb-2">Contenus à la une</h1>
      <p className="text-sm text-on-surface-variant mb-8">
        Gestion du carrousel de la page d&apos;accueil — ajout, réordonnancement, retrait.
      </p>

      <form onSubmit={ajouter} className="glass-panel rounded-xl p-6 mb-8 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="caption text-on-surface-variant block mb-2">Ajouter un contenu au carrousel</label>
          <select
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-2.5 outline-none focus:border-primary-container transition-colors text-sm"
          >
            <option value="">— Choisir un contenu —</option>
            {contenus.map((c) => (
              <option key={c.id} value={c.id}>{c.titre}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="flex items-center gap-2 bg-primary text-on-primary-fixed label-md px-6 py-2.5 rounded hover:bg-primary-container transition-colors">
          <Plus size={16} /> Ajouter
        </button>
      </form>

      <div className="space-y-2">
        {slides.map((s, i) => (
          <div key={s.id} className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-low px-4 py-3">
            <span className="label-md text-primary w-6">{i + 1}</span>
            <div className="flex-1">
              <p className="body-md text-on-surface">{s.titre || s.catalogue?.titre || `Contenu #${s.contenu_id}`}</p>
              {!s.actif && <span className="caption text-error">(masqué)</span>}
            </div>
            <button onClick={() => toggleActif(s)} className={`caption px-3 py-1 rounded border transition ${s.actif ? "border-primary text-primary" : "border-outline-variant text-on-surface-variant"}`}>
              {s.actif ? "Visible" : "Masqué"}
            </button>
            <button onClick={() => monter(i)} disabled={i === 0} className="text-on-surface-variant hover:text-primary disabled:opacity-30 p-1">
              <ChevronUp size={16} />
            </button>
            <button onClick={() => descendre(i)} disabled={i === slides.length - 1} className="text-on-surface-variant hover:text-primary disabled:opacity-30 p-1">
              <ChevronDown size={16} />
            </button>
            <button onClick={() => supprimer(s.id)} className="text-on-surface-variant hover:text-error p-1">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {slides.length === 0 && (
          <p className="text-on-surface-variant">Carrousel vide — ajoutez des contenus à la une.</p>
        )}
      </div>
    </main>
  );
}
