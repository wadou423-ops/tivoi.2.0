"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, TrendingUp, ShoppingCart } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Banniere from "../components/Banniere";
import LoaderCentered from "../components/LoaderCentered";

export default function Portefeuille() {
  const [solde, setSolde] = useState(null);
  const [revenus, setRevenus] = useState(0);
  const [paiements, setPaiements] = useState([]);
  const [cadeauxEnvoyes, setCadeauxEnvoyes] = useState(0);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setChargement(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("solde_tokens, solde_revenus")
        .eq("id", user.id)
        .single();
      setSolde(profile?.solde_tokens ?? 0);
      setRevenus(profile?.solde_revenus ?? 0);

      const { data: p } = await supabase
        .from("paiements")
        .select("reference, montant_fcfa, statut, objet_type, fournisseur, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setPaiements(p || []);

      const { data: c } = await supabase
        .from("cadeaux_envoyes")
        .select("id")
        .eq("expediteur_id", user.id);
      setCadeauxEnvoyes(c?.length || 0);

      setChargement(false);
    }
    load();
  }, []);

  if (chargement) {
    return <LoaderCentered />;
  }

  if (!chargement && solde === null) {
    return (
      <main className="pt-28 pb-20 px-5 md:px-20 text-center">
        <p className="body-lg text-on-surface-variant mb-6">Connectez-vous pour accéder à votre portefeuille.</p>
        <Link href="/connexion" className="bg-primary text-on-primary-fixed label-md px-8 py-3 rounded">
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <main className="pt-28 pb-20 px-5 md:px-20 max-w-7xl mx-auto">
      <header className="mb-12">
        <h1 className="headline-md text-on-surface">Mon Portefeuille</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne gauche */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-high rounded-xl p-8 border border-primary/10 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-[50px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Wallet size={18} className="text-primary" />
                <span className="label-md text-on-surface-variant uppercase">Solde Actuel</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="display-lg text-primary">
                  {solde === null ? "—" : solde.toLocaleString("fr-FR")}
                </span>
                <span className="title-lg text-primary">Jetons</span>
              </div>
              <p className="caption text-on-surface-variant">
                ≈ {(((solde || 0) * 5)).toLocaleString("fr-FR")} XOF
              </p>
              <Link
                href="/jetons"
                className="w-full mt-8 bg-primary text-on-primary-fixed label-md py-4 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container transition-all"
              >
                <ShoppingCart size={16} /> Acheter des Jetons
              </Link>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-6 border border-surface-bright flex justify-between items-center">
            <div>
              <span className="caption text-on-surface-variant block mb-1">Revenus créateur</span>
              <span className="title-lg text-on-surface flex items-center gap-1">
                <TrendingUp size={16} className="text-secondary" />
                {revenus.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
            <div className="h-10 w-px bg-surface-bright" />
            <div>
              <span className="caption text-on-surface-variant block mb-1">Cadeaux envoyés</span>
              <span className="title-lg text-on-surface">{cadeauxEnvoyes}</span>
            </div>
          </div>

          <Banniere emplacement="portefeuille_h" className="h-28" />
        </div>

        {/* Historique */}
        <div className="lg:col-span-8 bg-surface-high rounded-xl border border-primary/5 p-6">
          <h2 className="title-lg text-on-surface mb-6">Historique des transactions</h2>
          {paiements.length === 0 ? (
            <p className="body-md text-on-surface-variant">Aucune transaction pour l&apos;instant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/20 text-left">
                    <th className="px-3 py-2 label-md text-primary uppercase text-xs">Référence</th>
                    <th className="px-3 py-2 label-md text-primary uppercase text-xs">Type</th>
                    <th className="px-3 py-2 label-md text-primary uppercase text-xs">Fournisseur</th>
                    <th className="px-3 py-2 label-md text-primary uppercase text-xs">Montant</th>
                    <th className="px-3 py-2 label-md text-primary uppercase text-xs">Statut</th>
                    <th className="px-3 py-2 label-md text-primary uppercase text-xs">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paiements.map((t) => (
                    <tr key={t.reference} className="border-t border-outline-variant/10">
                      <td className="px-3 py-3 font-mono text-xs text-on-surface">{t.reference}</td>
                      <td className="px-3 py-3 text-on-surface-variant capitalize">{t.objet_type}</td>
                      <td className="px-3 py-3 text-on-surface-variant capitalize">{t.fournisseur}</td>
                      <td className="px-3 py-3 text-on-surface">{t.montant_fcfa.toLocaleString("fr-FR")} FCFA</td>
                      <td className="px-3 py-3">
                        <span
                          className={`caption px-2 py-1 rounded border ${
                            t.statut === "confirme"
                              ? "text-primary border-primary/30 bg-primary/5"
                              : t.statut === "echoue"
                                ? "text-error border-error/30"
                                : "text-on-surface-variant border-outline-variant/30"
                          }`}
                        >
                          {t.statut}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-on-surface-variant">
                        {new Date(t.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
