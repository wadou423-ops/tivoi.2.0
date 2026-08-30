"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AcheterJetons() {
  const [packs, setPacks] = useState([]);
  const [solde, setSolde] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase
        .from("packs_tokens")
        .select("*")
        .eq("actif", true)
        .order("tokens", { ascending: true });
      setPacks(p || []);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("solde_tokens")
          .eq("id", user.id)
          .single();
        setSolde(profile?.solde_tokens ?? 0);
      }
    }
    load();
  }, []);

  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20">
      <header className="text-center mb-12">
        <h1 className="display-lg text-on-surface mb-3">Acheter des Jetons</h1>
        <p className="body-lg text-on-surface-variant max-w-2xl mx-auto">
          Les jetons servent à offrir des cadeaux pendant les lives. 100 jetons = 500 FCFA.
        </p>
        {solde !== null && (
          <p className="label-md text-primary mt-4">
            Solde actuel : {solde.toLocaleString("fr-FR")} jetons
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {packs.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-outline-variant/30 bg-surface-container p-8 flex flex-col items-center text-center card-hover"
          >
            <span className="text-4xl mb-4">🪙</span>
            <h2 className="title-lg text-on-surface mb-2">{p.nom}</h2>
            <p className="display-lg text-primary mb-1">{p.tokens.toLocaleString("fr-FR")}</p>
            <p className="caption text-on-surface-variant mb-6">jetons</p>
            <p className="title-lg text-on-surface mb-6">{p.prix_fcfa.toLocaleString("fr-FR")} FCFA</p>
            <Link
              href={`/paiement/tokens/${p.id}`}
              className="w-full text-center bg-primary text-on-primary-fixed label-md py-3 rounded-lg hover:bg-primary-container transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)]"
            >
              Acheter
            </Link>
          </div>
        ))}
        {packs.length === 0 && (
          <p className="text-on-surface-variant col-span-3 text-center">Aucun pack disponible.</p>
        )}
      </div>

      <p className="text-center caption text-on-surface-variant mt-10 opacity-70">
        Les jetons ne sont pas remboursables. Crédités automatiquement après confirmation du paiement.
      </p>
    </main>
  );
}
