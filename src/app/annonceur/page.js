"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function EspaceAnnonceur() {
  const [bannieres, setBannieres] = useState([]);
  const [spots, setSpots] = useState([]);

  useEffect(() => {
    async function load() {
      const [{ data: b }, { data: s }] = await Promise.all([
        supabase.from("bannieres").select("*").order("impressions", { ascending: false }),
        supabase.from("spots").select("*").order("titre"),
      ]);
      setBannieres(b || []);
      setSpots(s || []);
    }
    load();
  }, []);

  const totalImpressions = bannieres.reduce((s, b) => s + b.impressions, 0);
  const totalClics = bannieres.reduce((s, b) => s + b.clics, 0);
  const ctr = totalImpressions > 0 ? ((totalClics / totalImpressions) * 100).toFixed(2) : "0.00";

  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20">
      <header className="mb-10 flex items-center gap-4">
        <Megaphone size={32} className="text-primary" />
        <div>
          <h1 className="display-lg text-on-surface">Espace Annonceur</h1>
          <p className="body-lg text-on-surface-variant">
            Performances de vos campagnes sur les écrans TiVoi — web, lives et DOOH embarqué.
          </p>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl">
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 text-center">
          <p className="display-lg text-primary">{totalImpressions.toLocaleString("fr-FR")}</p>
          <p className="caption text-on-surface-variant mt-1">Impressions totales</p>
        </div>
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 text-center">
          <p className="display-lg text-primary">{totalClics.toLocaleString("fr-FR")}</p>
          <p className="caption text-on-surface-variant mt-1">Clics</p>
        </div>
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 text-center">
          <p className="display-lg text-primary">{ctr} %</p>
          <p className="caption text-on-surface-variant mt-1">Taux de clic (CTR)</p>
        </div>
      </div>

      {/* Par bannière */}
      <h2 className="headline-md text-on-surface mb-4">Détail par emplacement</h2>
      <div className="rounded-xl border border-outline-variant/20 bg-surface-low overflow-hidden mb-12">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/20 text-left">
              <th className="px-4 py-3 label-md text-primary uppercase text-xs">Emplacement</th>
              <th className="px-4 py-3 label-md text-primary uppercase text-xs">Annonceur</th>
              <th className="px-4 py-3 label-md text-primary uppercase text-xs">Impressions</th>
              <th className="px-4 py-3 label-md text-primary uppercase text-xs">Clics</th>
            </tr>
          </thead>
          <tbody>
            {bannieres.map((b) => (
              <tr key={b.id} className="border-t border-outline-variant/10">
                <td className="px-4 py-3 text-on-surface">{b.emplacement}</td>
                <td className="px-4 py-3 text-on-surface-variant">{b.annonceur || "—"}</td>
                <td className="px-4 py-3 text-on-surface">{b.impressions.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3 text-on-surface">{b.clics.toLocaleString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="headline-md text-on-surface mb-4">Spots vidéo en diffusion</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
        {spots.map((s) => (
          <div key={s.id} className="bg-surface-container rounded-xl border border-outline-variant/30 p-5">
            <p className="label-md text-on-surface">{s.titre}</p>
            <p className="caption text-primary mt-1">{s.annonceur || "Annonceur interne"}</p>
            <p className="caption text-on-surface-variant mt-2">{s.duree_secondes}s</p>
          </div>
        ))}
        {spots.length === 0 && <p className="text-on-surface-variant body-md">Aucun spot actif.</p>}
      </div>
    </main>
  );
}
