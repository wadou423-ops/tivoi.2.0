"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminUtilisateurs() {
  const [profils, setProfils] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    async function loadProfils() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("pseudo", { ascending: true });
      setProfils(data || []);
      setLoading(false);
    }

    loadProfils();
  }, []);

  const profilsAffiches = profils.filter((p) =>
    (p.pseudo || "").toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <main className="px-6 md:px-12 py-12">
      <h1 className="font-display font-bold text-3xl text-primary mb-2">Utilisateurs</h1>
      <p className="text-sm text-on-surface-variant mb-8">
        Comptes inscrits sur la plateforme.
      </p>

      <div className="mb-6 max-w-xs">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un pseudo..."
          className="w-full rounded-lg bg-surface-variant/50 border-0 border-b-2 border-outline-variant text-on-surface px-4 py-2 outline-none focus:border-primary-container transition-colors"
        />
      </div>

      <div className="rounded-xl border border-outline-variant/20 bg-surface-low overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/20 text-left">
              <th className="px-4 py-3 font-title font-semibold text-primary uppercase tracking-[0.05em] text-xs">
                Pseudo
              </th>
              <th className="px-4 py-3 font-title font-semibold text-primary uppercase tracking-[0.05em] text-xs">
                Rôle
              </th>
            </tr>
          </thead>
          <tbody>
            {profilsAffiches.map((p) => (
              <tr key={p.id} className="border-t border-outline-variant/10 hover:bg-surface-variant/30 transition-colors">
                <td className="px-4 py-3 text-on-surface">@{p.pseudo || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded border ${
                      p.role === "admin"
                        ? "border-primary text-primary bg-primary/10"
                        : "border-outline-variant text-on-surface-variant"
                    }`}
                  >
                    {p.role || "utilisateur"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
