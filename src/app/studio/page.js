"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, TrendingUp, Radio, Gift, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import LoaderCentered from "../components/LoaderCentered";

export default function StudioCreateur() {
  const router = useRouter();
  const [stats, setStats] = useState({ lives: 0, cadeaux: 0, revenus: 0, spectators: 0 });
  const [parCadeau, setParCadeau] = useState([]);
  const [journalier, setJournalier] = useState([]);
  const [classement, setClassement] = useState([]);
  const [montant, setMontant] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push("/connexion");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, solde_revenus, pseudo")
        .eq("id", user.id)
        .single();

      const { count: nbLives } = await supabase
        .from("lives")
        .select("id", { count: "exact", head: true })
        .eq("createur_id", user.id);

      const { data: cadeauxRecus } = await supabase
        .from("cadeaux_envoyes")
        .select("id, cadeau_id, cadeaux(nom, emoji, cout_tokens), created_at")
        .eq("createur_id", user.id);

      const totalCadeaux = cadeauxRecus?.length || 0;
      const revenus = profile?.solde_revenus || 0;

      // Détail par type
      const detail = {};
      (cadeauxRecus || []).forEach((c) => {
        const nom = c.cadeaux?.nom || "—";
        detail[nom] = detail[nom] || { nom, emoji: c.cadeaux?.emoji, count: 0 };
        detail[nom].count++;
      });
      setParCadeau(Object.values(detail));

      // Revenus journaliers (14 derniers jours)
      const jours = {};
      (cadeauxRecus || []).forEach((c) => {
        const d = new Date(c.created_at).toISOString().slice(0, 10);
        jours[d] = (jours[d] || 0) + Math.floor((c.cadeaux?.cout_tokens || 0) * 5 * 0.7);
      });
      const serie = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        serie.push({ date: d, montant: jours[d] || 0 });
      }
      setJournalier(serie);

      // Classement créateurs
      const { data: top } = await supabase
        .from("profiles")
        .select("pseudo, solde_revenus")
        .order("solde_revenus", { ascending: false })
        .limit(10);
      setClassement(top || []);

      setStats({ lives: nbLives || 0, cadeaux: totalCadeaux, revenus });
      setChargement(false);
    }
    load();
  }, [router]);

  function exporterCSV() {
    const lignes = ["date;montant_fcfa"];
    journalier.forEach((j) => lignes.push(`${j.date};${j.montant}`));
    const blob = new Blob([lignes.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tivoi-revenus-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  async function demanderRetrait(e) {
    e.preventDefault();
    const montantNum = parseInt(montant, 10);
    if (!montantNum || montantNum <= 0) return;
    const { error } = await supabase.rpc("demander_retrait", { p_montant: montantNum });
    setMessage(error ? `Erreur : ${error.message}` : "Demande de retrait envoyée ! Un administrateur va la traiter.");
    if (!error) setMontant("");
  }

  const maxJour = Math.max(...journalier.map((j) => j.montant), 1);

  if (chargement) {
    return (
      <main className="pt-28 pb-20 px-5 md:px-20 flex items-center justify-center min-h-[60vh]">
        <LoaderCentered />
      </main>
    );
  }

  return (
    <main className="pt-28 pb-20 px-5 md:px-20">
      <header className="mb-10 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="display-lg text-on-surface mb-2">Studio Créateur</h1>
        </div>
        <button
          onClick={exporterCSV}
          className="flex items-center gap-2 border border-primary text-primary label-md px-5 py-2.5 rounded hover:bg-primary hover:text-on-primary-fixed transition-colors"
        >
          <Download size={16} /> Exporter CSV
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Lives réalisés", valeur: stats.lives, icone: Radio },
          { label: "Cadeaux reçus", valeur: stats.cadeaux, icone: Gift },
          { label: "Solde revenus", valeur: `${stats.revenus.toLocaleString("fr-FR")} FCFA`, icone: TrendingUp },
          { label: "Classement", valeur: classement.findIndex((c) => c) >= 0 ? `Top ${classement.length}` : "—", icone: TrendingUp },
        ].map((k) => (
          <div key={k.label} className="bg-surface-container rounded-xl border border-outline-variant/30 p-6">
            <k.icone size={20} className="text-primary mb-3" />
            <p className="display-lg text-on-surface">{k.valeur}</p>
            <p className="caption text-on-surface-variant mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Graphique journalier */}
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6">
          <h2 className="title-lg text-on-surface mb-6">Revenus des 14 derniers jours</h2>
          <div className="flex items-end gap-1.5 h-40">
            {journalier.map((j) => (
              <div key={j.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <span className="hidden group-hover:block absolute -top-6 caption text-primary whitespace-nowrap">
                  {j.montant} FCFA
                </span>
                <div
                  className="w-full bg-primary/70 rounded-t group-hover:bg-primary transition-colors"
                  style={{ height: `${Math.max((j.montant / maxJour) * 100, 2)}%` }}
                />
                <span className="caption text-on-surface-variant text-[9px]">{j.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cadeaux par type */}
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6">
          <h2 className="title-lg text-on-surface mb-6">Cadeaux reçus par type</h2>
          {parCadeau.length === 0 ? (
            <p className="body-md text-on-surface-variant">Aucun cadeau reçu pour l&apos;instant.</p>
          ) : (
            <div className="space-y-3">
              {parCadeau.map((c) => (
                <div key={c.nom} className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                  <span className="body-md text-on-surface">
                    {c.emoji} {c.nom}
                  </span>
                  <span className="label-md text-primary">×{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retrait */}
        <div className="glass-panel rounded-xl p-6">
          <h2 className="title-lg text-primary mb-4">Demander un retrait</h2>
          <p className="caption text-on-surface-variant mb-4">
            Solde disponible : <span className="text-primary font-bold">{stats.revenus.toLocaleString("fr-FR")} FCFA</span>
          </p>
          <form onSubmit={demanderRetrait} className="flex gap-3">
            <input
              type="number"
              min="1"
              max={stats.revenus}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="Montant en FCFA"
              className="flex-1 bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors"
            />
            <button
              type="submit"
              className="bg-primary-container text-on-primary label-md px-6 rounded-lg hover:bg-primary transition-colors flex items-center gap-2"
            >
              <LogOut size={16} /> Retirer
            </button>
          </form>
          {message && <p className="caption text-on-surface-variant mt-3">{message}</p>}
        </div>

        {/* Classement */}
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6">
          <h2 className="title-lg text-on-surface mb-4">Classement des créateurs</h2>
          <div className="space-y-2">
            {classement.map((c, i) => (
              <div key={c.pseudo || i} className="flex items-center justify-between">
                <span className="body-md text-on-surface-variant">
                  <span className="text-primary font-bold mr-2">#{i + 1}</span>@{c.pseudo || "—"}
                </span>
                <span className="caption text-on-surface">{c.solde_revenus.toLocaleString("fr-FR")} FCFA</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
