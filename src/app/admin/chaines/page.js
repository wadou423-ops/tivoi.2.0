"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminChaines() {
  const [chaines, setChaines] = useState([]);
  const [spots, setSpots] = useState([]);
  const [coupures, setCoupures] = useState([]);
  const [tab, setTab] = useState("chaines");
  const [message, setMessage] = useState("");

  // Form chaîne
  const [nom, setNom] = useState("");
  const [type, setType] = useState("youtube");
  const [url, setUrl] = useState("");

  // Form spot
  const [spotTitre, setSpotTitre] = useState("");
  const [spotAnnonceur, setSpotAnnonceur] = useState("");
  const [spotUrl, setSpotUrl] = useState("");

  // Form coupure
  const [coupureChaine, setCoupureChaine] = useState("");
  const [coupureSpot, setCoupureSpot] = useState("");
  const [coupureHeure, setCoupureHeure] = useState("");
  const [coupureRecurrence, setCoupureRecurrence] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [{ data: c }, { data: s }, { data: co }] = await Promise.all([
      supabase.from("chaines").select("*").order("nom"),
      supabase.from("spots").select("*").order("titre"),
      supabase.from("coupures").select("*, chaines(nom), spots(titre)").order("heure"),
    ]);
    setChaines(c || []);
    setSpots(s || []);
    setCoupures(co || []);
  }

  async function ajouterChaine(e) {
    e.preventDefault();
    const { error } = await supabase.from("chaines").insert({ nom, type, url });
    if (error) setMessage(error.message);
    else {
      setNom("");
      setUrl("");
      load();
    }
  }

  async function ajouterSpot(e) {
    e.preventDefault();
    const { error } = await supabase.from("spots").insert({ titre: spotTitre, annonceur: spotAnnonceur, video_url: spotUrl });
    if (error) setMessage(error.message);
    else {
      setSpotTitre("");
      setSpotAnnonceur("");
      setSpotUrl("");
      load();
    }
  }

  async function ajouterCoupure(e) {
    e.preventDefault();
    const { error } = await supabase.from("coupures").insert({
      chaine_id: parseInt(coupureChaine, 10),
      spot_id: coupureSpot ? parseInt(coupureSpot, 10) : null,
      heure: coupureHeure,
      recurrence_minutes: coupureRecurrence ? parseInt(coupureRecurrence, 10) : null,
    });
    if (error) setMessage(error.message);
    else {
      setCoupureHeure("");
      setCoupureRecurrence("");
      load();
    }
  }

  async function supprimer(table, id) {
    await supabase.from(table).delete().eq("id", id);
    load();
  }

  const inputClass =
    "w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-2.5 outline-none focus:border-primary-container transition-colors text-sm";

  return (
    <main className="px-6 md:px-12 py-12">
      <h1 className="font-display font-bold text-3xl text-primary mb-2">Chaînes TV & publicités</h1>
      <p className="text-sm text-on-surface-variant mb-6">
        Chaînes en flux continu, bibliothèque de spots et programmation des coupures publicitaires.
      </p>

      {message && <p className="caption text-error mb-4">{message}</p>}

      <div className="flex gap-2 mb-6">
        {[
          { id: "chaines", label: "Chaînes" },
          { id: "spots", label: "Spots publicitaires" },
          { id: "coupures", label: "Coupures programmées" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`label-md px-5 py-2 rounded transition-colors ${
              tab === t.id ? "bg-primary-container/20 border border-primary text-primary" : "border border-outline-variant text-on-surface-variant hover:border-primary/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "chaines" && (
        <>
          <form onSubmit={ajouterChaine} className="glass-panel rounded-xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <input required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de la chaîne" className={inputClass} />
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
              <option value="youtube">YouTube</option>
              <option value="hls">Flux HLS</option>
            </select>
            <input required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL du flux" className={inputClass} />
            <button type="submit" className="flex items-center justify-center gap-2 bg-primary text-on-primary-fixed label-md px-5 py-2.5 rounded hover:bg-primary-container transition-colors">
              <Plus size={16} /> Ajouter
            </button>
          </form>
          <div className="space-y-2">
            {chaines.map((c) => (
              <div key={c.id} className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-low px-4 py-3">
                <div className="flex-1">
                  <p className="body-md text-on-surface">{c.nom} <span className="caption text-on-surface-variant ml-2">({c.type})</span></p>
                  <p className="caption text-outline truncate">{c.url}</p>
                </div>
                <button onClick={() => supprimer("chaines", c.id)} className="text-on-surface-variant hover:text-error p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "spots" && (
        <>
          <form onSubmit={ajouterSpot} className="glass-panel rounded-xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <input required value={spotTitre} onChange={(e) => setSpotTitre(e.target.value)} placeholder="Titre du spot" className={inputClass} />
            <input value={spotAnnonceur} onChange={(e) => setSpotAnnonceur(e.target.value)} placeholder="Annonceur" className={inputClass} />
            <input required type="url" value={spotUrl} onChange={(e) => setSpotUrl(e.target.value)} placeholder="URL de la vidéo" className={inputClass} />
            <button type="submit" className="flex items-center justify-center gap-2 bg-primary text-on-primary-fixed label-md px-5 py-2.5 rounded hover:bg-primary-container transition-colors">
              <Plus size={16} /> Ajouter
            </button>
          </form>
          <div className="space-y-2">
            {spots.map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-low px-4 py-3">
                <div className="flex-1">
                  <p className="body-md text-on-surface">{s.titre} <span className="caption text-primary ml-2">{s.annonceur}</span></p>
                </div>
                <button onClick={() => supprimer("spots", s.id)} className="text-on-surface-variant hover:text-error p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "coupures" && (
        <>
          <form onSubmit={ajouterCoupure} className="glass-panel rounded-xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
            <select required value={coupureChaine} onChange={(e) => setCoupureChaine(e.target.value)} className={inputClass}>
              <option value="">Chaîne...</option>
              {chaines.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
            <select value={coupureSpot} onChange={(e) => setCoupureSpot(e.target.value)} className={inputClass}>
              <option value="">Spot (optionnel)...</option>
              {spots.map((s) => (
                <option key={s.id} value={s.id}>{s.titre}</option>
              ))}
            </select>
            <input required type="time" value={coupureHeure} onChange={(e) => setCoupureHeure(e.target.value)} className={inputClass} />
            <input type="number" min="1" value={coupureRecurrence} onChange={(e) => setCoupureRecurrence(e.target.value)} placeholder="Toutes les N min" className={inputClass} />
            <button type="submit" className="flex items-center justify-center gap-2 bg-primary text-on-primary-fixed label-md px-5 py-2.5 rounded hover:bg-primary-container transition-colors">
              <Plus size={16} /> Programmer
            </button>
          </form>
          <div className="space-y-2">
            {coupures.map((co) => (
              <div key={co.id} className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-low px-4 py-3">
                <div className="flex-1">
                  <p className="body-md text-on-surface">
                    {co.chaines?.nom} — à {co.heure.slice(0, 5)}
                    {co.recurrence_minutes && <span className="caption text-primary ml-2">toutes les {co.recurrence_minutes} min</span>}
                  </p>
                  {co.spots && <p className="caption text-on-surface-variant">Spot : {co.spots.titre}</p>}
                </div>
                <button onClick={() => supprimer("coupures", co.id)} className="text-on-surface-variant hover:text-error p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {coupures.length === 0 && <p className="text-on-surface-variant">Aucune coupure programmée.</p>}
          </div>
        </>
      )}
    </main>
  );
}
