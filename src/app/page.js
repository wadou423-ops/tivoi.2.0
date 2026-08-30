"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [connecte, setConnecte] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setConnecte(!!user);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  const ticker = [
    "🎬 À la une : Le Trône d'Abidjan",
    "🔴 EN DIRECT — Konan Live",
    "📺 France 24",
    "🎬 Nouveau : Sarabah",
    "🔴 EN DIRECT — Soirée Zouglou",
    "📺 Al Jazeera English",
  ];

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative px-6 md:px-20 pt-16 pb-12 max-w-4xl overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, rgba(212, 175, 55, 0.18), transparent 45%), radial-gradient(circle at 90% 10%, rgba(242, 202, 80, 0.10), transparent 40%), repeating-linear-gradient(115deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 60px)",
          }}
        />
        <p className="text-xs font-title font-semibold uppercase tracking-[0.05em] text-primary mb-4">
          Premium — Côte d&apos;Ivoire
        </p>
        <h1 className="font-display font-bold text-5xl md:text-7xl leading-[0.95] tracking-[-0.02em] text-on-surface">
          Films, lives et chaînes TV.<br />
          <span className="text-primary">Un seul écran.</span>
        </h1>
        <p className="mt-6 text-lg text-on-surface-variant max-w-xl">
          La plateforme de streaming pensée pour la Côte d&apos;Ivoire — séries et
          films à la demande, lives de créateurs et chaînes en direct, réunis
          au même endroit.
        </p>
        <div className="mt-8 flex gap-4">
          {!connecte && (
            <Link
              href="/inscription"
              className="rounded-lg bg-primary-container text-on-primary px-6 py-3 text-sm font-title font-semibold hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(212,175,55,0.2)] transition-all"
            >
              Créer un compte
            </Link>
          )}
          <Link
            href="/catalogue"
            className="rounded-lg border border-primary-container px-6 py-3 text-sm text-on-surface hover:border-primary hover:text-primary transition-colors"
          >
            Voir le catalogue
          </Link>
        </div>
      </section>

      {/* Ticker style guide TV */}
      <div className="border-y border-outline-variant/10 overflow-hidden py-3 bg-surface-lowest">
        <div className="flex whitespace-nowrap ticker-track">
          {[...ticker, ...ticker].map((item, i) => (
            <span key={i} className="mx-6 text-sm text-on-surface-variant">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="px-6 md:px-20 py-20 grid gap-10 md:grid-cols-3">
        <div className="rounded-xl border border-primary-container/10 bg-surface-low p-8 card-hover">
          <p className="text-xs font-title font-semibold uppercase tracking-[0.05em] text-primary">
            Catalogue
          </p>
          <h2 className="font-display font-semibold text-2xl mt-2 text-on-surface">
            Films &amp; séries
          </h2>
          <p className="mt-3 text-sm text-on-surface-variant">
            Paiement à la séance ou abonnement — accès immédiat, sans détour.
          </p>
        </div>
        <div className="rounded-xl border border-primary-container/10 bg-surface-low p-8 card-hover">
          <p className="text-xs font-title font-semibold uppercase tracking-[0.05em] text-primary">
            Communauté
          </p>
          <h2 className="font-display font-semibold text-2xl mt-2 text-on-surface">
            Lives de créateurs
          </h2>
          <p className="mt-3 text-sm text-on-surface-variant">
            Chat en direct, cadeaux virtuels, et des créateurs à soutenir en temps réel.
          </p>
        </div>
        <div className="rounded-xl border border-primary-container/10 bg-surface-low p-8 card-hover">
          <p className="text-xs font-title font-semibold uppercase tracking-[0.05em] text-primary">
            En continu
          </p>
          <h2 className="font-display font-semibold text-2xl mt-2 text-on-surface">
            Chaînes TV
          </h2>
          <p className="mt-3 text-sm text-on-surface-variant">
            France 24, Al Jazeera et bien d&apos;autres, diffusées en direct 24h/24.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-20 py-8 border-t border-outline-variant/10 text-xs text-outline">
        © {new Date().getFullYear()} TiVoi — Tous droits réservés.
      </footer>
    </main>
  );
}
