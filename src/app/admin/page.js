"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Clapperboard, Radio, TrendingUp, Wallet, Film } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminOverview() {
  const [kpis, setKpis] = useState({
    utilisateurs: 0,
    createurs: 0,
    livesDirect: 0,
    revenus: 0,
    retraits: 0,
    contenus: 0,
  });

  useEffect(() => {
    async function load() {
      const [{ count: u }, { count: c }, { count: l }, { count: r }, { count: ct }] =
        await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .or("role.eq.createur,statut_createur.eq.valide"),
          supabase.from("lives").select("id", { count: "exact", head: true }).eq("statut", "en_direct"),
          supabase
            .from("retraits")
            .select("id", { count: "exact", head: true })
            .eq("statut", "en_attente"),
          supabase.from("catalogue").select("id", { count: "exact", head: true }).eq("actif", true),
        ]);

      const { data: paiements } = await supabase
        .from("paiements")
        .select("montant_fcfa")
        .eq("statut", "confirme");

      setKpis({
        utilisateurs: u || 0,
        createurs: c || 0,
        livesDirect: l || 0,
        retraits: r || 0,
        contenus: ct || 0,
        revenus: (paiements || []).reduce((s, p) => s + p.montant_fcfa, 0),
      });
    }
    load();
  }, []);

  const CARDS = [
    { label: "Utilisateurs", valeur: kpis.utilisateurs, icone: Users, href: "/admin/utilisateurs" },
    { label: "Créateurs validés", valeur: kpis.createurs, icone: Clapperboard, href: "/admin/createurs" },
    { label: "Lives en direct", valeur: kpis.livesDirect, icone: Radio, href: "/lives" },
    { label: "Revenus plateforme", valeur: `${kpis.revenus.toLocaleString("fr-FR")} FCFA`, icone: TrendingUp, href: null },
    { label: "Retraits en attente", valeur: kpis.retraits, icone: Wallet, href: "/admin/retraits" },
    { label: "Contenus actifs", valeur: kpis.contenus, icone: Film, href: "/admin/catalogue" },
  ];

  return (
    <main className="px-6 md:px-12 py-12">
      <h1 className="font-display font-bold text-3xl text-primary mb-10">Vue d&apos;ensemble</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {CARDS.map((c) => {
          const inner = (
            <>
              <c.icone size={22} className="text-primary mb-4" />
              <p className="font-display font-bold text-3xl text-on-surface">{c.valeur}</p>
              <p className="caption text-on-surface-variant mt-2">{c.label}</p>
            </>
          );
          return c.href ? (
            <Link
              key={c.label}
              href={c.href}
              className="block rounded-xl border border-primary-container/10 bg-surface-low p-8 card-hover"
            >
              {inner}
            </Link>
          ) : (
            <div key={c.label} className="rounded-xl border border-primary-container/10 bg-surface-low p-8">
              {inner}
            </div>
          );
        })}
      </div>

      <h2 className="title-lg text-on-surface mb-4">Actions rapides</h2>
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/catalogue" className="bg-primary text-on-primary-fixed label-md px-6 py-2.5 rounded hover:bg-primary-container transition-colors">
          + Ajouter un contenu
        </Link>
        <Link href="/admin/a-une" className="border border-outline-variant text-on-surface label-md px-6 py-2.5 rounded hover:border-primary transition-colors">
          Gérer la mise en avant
        </Link>
        <Link href="/admin/chaines" className="border border-outline-variant text-on-surface label-md px-6 py-2.5 rounded hover:border-primary transition-colors">
          Programmer les coupures pubs
        </Link>
      </div>
    </main>
  );
}
