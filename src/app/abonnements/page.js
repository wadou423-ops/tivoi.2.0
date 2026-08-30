"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Abonnements() {
  const [paliers, setPaliers] = useState([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("abonnements_paliers")
        .select("*")
        .order("ordre", { ascending: true });
      setPaliers(data || []);
    }
    load();
  }, []);

  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20">
      <header className="text-center mb-12">
        <h1 className="display-lg text-on-surface">Formules d&apos;abonnement</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {paliers.map((p) => (
          <div
            key={p.code}
            className={`relative rounded-xl border p-8 flex flex-col items-center text-center transition-all duration-300 ${
              p.code === "premium"
                ? "border-primary bg-surface-container shadow-[0_0_25px_rgba(212,175,55,0.15)]"
                : "border-outline-variant/30 bg-surface-container hover:border-primary/50"
            }`}
          >
            {p.code === "premium" && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary caption font-bold px-4 py-1 rounded uppercase tracking-widest">
                Populaire
              </span>
            )}
            <h2 className="title-lg text-on-surface mb-4">{p.nom}</h2>
            <p className="display-lg text-primary mb-6">
              {p.prix_fcfa.toLocaleString("fr-FR")}
              <span className="body-md text-on-surface-variant ml-1">FCFA/mois</span>
            </p>
            <ul className="flex flex-col gap-3 mb-8 w-full text-left">
              {(p.avantages || "").split(",").map((a, i) => (
                <li key={i} className="flex items-start gap-2 body-md text-on-surface-variant">
                  <Check size={16} className="text-primary mt-1 shrink-0" /> {a.trim()}
                </li>
              ))}
            </ul>
            <Link
              href={`/paiement/abo/${p.code}`}
              className={`w-full text-center label-md py-4 rounded-lg transition-colors ${
                p.code === "premium"
                  ? "bg-primary text-on-primary-fixed hover:bg-primary-container shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                  : "border border-primary text-primary hover:bg-primary hover:text-on-primary-fixed"
              }`}
            >
              Choisir {p.nom}
            </Link>
          </div>
        ))}
        {paliers.length === 0 && (
          <p className="text-on-surface-variant col-span-3 text-center">
            Les formules arrivent bientôt.
          </p>
        )}
      </div>
    </main>
  );
}
