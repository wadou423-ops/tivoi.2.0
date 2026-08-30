"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Wallet, Clapperboard, Settings, LogOut, ChevronRight, Star } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import LoaderCentered from "../components/LoaderCentered";

export default function Profil() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [abonnement, setAbonnement] = useState(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push("/connexion");

      const { data: p } = await supabase
        .from("profiles")
        .select("pseudo, nom, prenom, role, statut_createur, solde_tokens, solde_revenus")
        .eq("id", user.id)
        .single();
      setProfile(p);

      const { data: a } = await supabase
        .from("abonnements_utilisateurs")
        .select("palier, fin, statut")
        .eq("user_id", user.id)
        .eq("statut", "actif")
        .order("fin", { ascending: false })
        .limit(1);
      setAbonnement(a && a.length > 0 ? a[0] : null);
    }
    load();
  }, [router]);

  async function deconnexion() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!profile) {
    return (
      <main className="pt-28 pb-20 px-5 md:px-20 flex items-center justify-center min-h-screen">
        <LoaderCentered />
      </main>
    );
  }

  const MENU = [
    { label: "Portefeuille & Jetons", href: "/portefeuille", icone: Wallet },
    { label: "Espace créateur", href: "/devenir-createur", icone: Clapperboard },
    { label: "Paramètres du compte", href: "/parametres", icone: Settings },
    { label: "Notifications", href: "/notifications", icone: Star },
  ];

  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20 max-w-3xl mx-auto w-full">
      {/* Carte profil */}
      <div className="glass-panel rounded-xl p-8 mb-10 flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-display font-bold text-3xl">
          {(profile.pseudo || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="display-lg text-on-surface">@{profile.pseudo || "—"}</h1>
          <p className="body-md text-on-surface-variant">
            {[profile.prenom, profile.nom].filter(Boolean).join(" ") || "Compte TiVoi"}
            {profile.role === "createur" && " · Créateur"}
            {profile.role === "admin" && " · Administrateur"}
          </p>
          {abonnement && (
            <p className="caption text-primary mt-2">
              Abonnement {abonnement.palier.toUpperCase()} actif jusqu&apos;au{" "}
              {new Date(abonnement.fin).toLocaleDateString("fr-FR")}
            </p>
          )}
        </div>
        <div className="text-right hidden sm:block">
          <p className="display-lg text-primary">{(profile.solde_tokens || 0).toLocaleString("fr-FR")}</p>
          <p className="caption text-on-surface-variant">jetons</p>
        </div>
      </div>

      {!abonnement && (
        <Link
          href="/abonnements"
          className="rounded-xl border border-primary/30 bg-primary/5 p-6 mb-10 flex items-center justify-between hover:border-primary transition-colors group"
        >
          <div>
            <p className="label-md text-on-surface">Aucun abonnement actif</p>
            <p className="caption text-on-surface-variant mt-1">
              Débloquez tout le catalogue dès 2 000 FCFA/mois
            </p>
          </div>
          <span className="bg-primary text-on-primary-fixed label-md px-5 py-2 rounded group-hover:bg-primary-container transition-colors">
            Voir les formules
          </span>
        </Link>
      )}

      {/* Menu */}
      <nav className="rounded-xl border border-outline-variant/20 overflow-hidden">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex items-center gap-4 px-6 py-4 bg-surface-container border-b border-outline-variant/10 last:border-b-0 hover:bg-surface-variant/50 transition-colors"
          >
            <m.icone size={20} className="text-primary" />
            <span className="body-md text-on-surface flex-1">{m.label}</span>
            <ChevronRight size={18} className="text-outline" />
          </Link>
        ))}
        <button
          onClick={deconnexion}
          className="w-full flex items-center gap-4 px-6 py-4 bg-surface-container hover:bg-surface-variant/50 transition-colors text-left"
        >
          <LogOut size={20} className="text-error" />
          <span className="body-md text-error">Se déconnecter</span>
        </button>
      </nav>
    </main>
  );
}
