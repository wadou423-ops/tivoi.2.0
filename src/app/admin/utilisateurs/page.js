"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LoaderCentered from "../../components/LoaderCentered";
import { useRealtimeReload } from "@/lib/useRealtime";

export default function AdminUtilisateurs() {
  const [profils, setProfils] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [message, setMessage] = useState("");

  async function loadProfils() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("pseudo", { ascending: true });
    setProfils(data || []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(loadProfils, 0);
    return () => clearTimeout(t);
  }, []);

  useRealtimeReload(["profiles"], loadProfils, []);

  const profilsAffiches = profils.filter(
    (p) =>
      (p.pseudo || "").toLowerCase().includes(recherche.toLowerCase()) ||
      (p.nom || "").toLowerCase().includes(recherche.toLowerCase()) ||
      (p.prenom || "").toLowerCase().includes(recherche.toLowerCase())
  );

  async function toggleSuspendre(p) {
    const { error } = await supabase
      .from("profiles")
      .update({ suspendu: !p.suspendu })
      .eq("id", p.id);
    if (error) setMessage(error.message);
    else setProfils((ps) => ps.map((x) => (x.id === p.id ? { ...x, suspendu: !p.suspendu } : x)));
  }

  if (loading) {
    return (
      <main className="px-6 md:px-12 py-12 flex items-center justify-center min-h-[60vh]">
        <LoaderCentered />
      </main>
    );
  }

  return (
    <main className="px-6 md:px-12 py-12">
      <h1 className="font-display font-bold text-3xl text-primary mb-8">Utilisateurs</h1>

      <div className="mb-6 max-w-xs">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher..."
          className="w-full rounded-lg bg-surface-variant/50 border-0 border-b-2 border-outline-variant text-on-surface px-4 py-2 outline-none focus:border-primary-container transition-colors"
        />
      </div>

      {message && <p className="caption text-error mb-4">{message}</p>}

      <div className="rounded-xl border border-outline-variant/20 bg-surface-low overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/20 text-left">
              <th className="px-4 py-3 label-md text-primary uppercase text-xs">Pseudo</th>
              <th className="px-4 py-3 label-md text-primary uppercase text-xs">Nom</th>
              <th className="px-4 py-3 label-md text-primary uppercase text-xs">Jetons</th>
              <th className="px-4 py-3 label-md text-primary uppercase text-xs">Rôle</th>
              <th className="px-4 py-3 label-md text-primary uppercase text-xs">Statut</th>
            </tr>
          </thead>
          <tbody>
            {profilsAffiches.map((p) => (
              <tr
                key={p.id}
                className="border-t border-outline-variant/10 hover:bg-surface-variant/30 transition-colors"
              >
                <td className="px-4 py-3 text-on-surface">@{p.pseudo || "—"}</td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {[p.prenom, p.nom].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="px-4 py-3 text-on-surface">
                  {(p.solde_tokens || 0).toLocaleString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded border ${
                      p.role === "admin"
                        ? "border-primary text-primary bg-primary/10"
                        : "border-outline-variant text-on-surface-variant"
                    }`}
                  >
                    {p.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleSuspendre(p)}
                    className={`text-xs px-2 py-1 rounded border transition ${
                      p.suspendu
                        ? "border-error text-error bg-error/10"
                        : "border-primary text-primary bg-primary/10"
                    }`}
                  >
                    {p.suspendu ? "Suspendu" : "Actif"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
