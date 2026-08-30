"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Banniere from "../components/Banniere";

export default function GuideTV() {
  const [chaines, setChaines] = useState([]);
  const [active, setActive] = useState(null);
  const [epg, setEpg] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase
        .from("chaines")
        .select("*")
        .eq("actif", true)
        .order("nom", { ascending: true });
      setChaines(c || []);
      if (c && c.length > 0) setActive(c[0]);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadEpg() {
      if (!active) return;
      const { data } = await supabase
        .from("epg")
        .select("*")
        .eq("chaine_id", active.id)
        .order("debut", { ascending: true });
      setEpg(data || []);
    }
    loadEpg();
  }, [active]);

  if (!active && chaines.length === 0) {
    return (
      <main className="pt-28 pb-20 px-5 md:px-20">
        <h1 className="display-lg text-on-surface mb-3">Guide TV</h1>
        <p className="body-lg text-on-surface-variant">Aucune chaîne disponible pour le moment.</p>
      </main>
    );
  }

  const idYoutube = active?.url
    ? active.url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/)
    : null;

  const maintenant = new Date();

  return (
    <main className="flex-grow pt-24 pb-20 px-5 md:px-20">
      <header className="mb-8">
        <h1 className="display-lg text-on-surface mb-3">Chaînes TV</h1>
        <p className="body-lg text-on-surface-variant">
          Le direct 24h/24 — actualités, sport et divertissement en continu.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lecteur + EPG */}
        <div className="lg:col-span-8">
          <div className="relative aspect-video rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-lowest">
            {idYoutube ? (
              <iframe
                key={active.id}
                src={`https://www.youtube.com/embed/${idYoutube[1]}?autoplay=1&rel=0`}
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
                className="w-full h-full"
              />
            ) : active?.type === "hls" ? (
              <video key={active.id} src={active.url} controls autoPlay className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                Lecteur indisponible pour cette chaîne.
              </div>
            )}
          </div>
          <h2 className="headline-md text-on-surface mt-4">{active?.nom}</h2>

          {/* Guide des programmes */}
          <div className="glass-panel rounded-xl mt-6 p-6">
            <h3 className="title-lg text-primary mb-4">Guide des programmes</h3>
            {epg.length === 0 ? (
              <p className="body-md text-on-surface-variant">
                Aucun programme programmé dans le guide pour cette chaîne.
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {epg.map((p) => {
                  const enCours = new Date(p.debut) <= maintenant && new Date(p.fin) >= maintenant;
                  return (
                    <div
                      key={p.id}
                      className={`flex gap-4 items-start rounded-lg p-3 ${enCours ? "bg-primary/10 border border-primary/30" : ""}`}
                    >
                      <div className="flex-none text-right">
                        <p className="label-md text-on-surface">
                          {new Date(p.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="caption text-on-surface-variant">
                          {new Date(p.fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div>
                        <p className={`body-md font-semibold ${enCours ? "text-primary" : "text-on-surface"}`}>
                          {p.titre} {enCours && <span className="caption ml-1">● En cours</span>}
                        </p>
                        {p.description && <p className="caption text-on-surface-variant">{p.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Liste des chaînes + bannière */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel rounded-xl p-4">
            <h3 className="label-md text-primary uppercase mb-3">Toutes les chaînes</h3>
            <div className="flex flex-col gap-1">
              {chaines.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    active?.id === c.id
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-on-surface-variant hover:bg-surface-variant/50"
                  }`}
                >
                  <span className="w-8 h-8 rounded bg-surface-variant flex items-center justify-center caption font-bold">
                    {c.nom.charAt(0)}
                  </span>
                  <span className="body-md">{c.nom}</span>
                </button>
              ))}
            </div>
          </div>

          <Banniere emplacement="chaines_v" className="h-64" />
        </div>
      </div>
    </main>
  );
}
