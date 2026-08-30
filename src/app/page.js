"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Film, Tv, Clapperboard, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Banniere from "./components/Banniere";

const PILIERS = [
  {
    icon: Film,
    titre: "VOD Premium",
    texte: "Films et séries exclusifs, sélectionnés pour une expérience cinématographique ultime.",
    href: "/catalogue",
    decalage: "",
  },
  {
    icon: Clapperboard,
    titre: "Lives en Direct",
    texte: "Connectez-vous avec les créateurs et icônes culturelles en temps réel.",
    href: "/lives",
    decalage: "md:mt-8",
  },
  {
    icon: Tv,
    titre: "Chaînes TV",
    texte: "Accès ininterrompu à vos chaînes de télévision premium favorites.",
    href: "/guide-tv",
    decalage: "md:mt-16",
  },
];

export default function Home() {
  const router = useRouter();
  const [tendances, setTendances] = useState([]);
  const [slides, setSlides] = useState([]);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    async function checkOnboarding() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_vu")
          .eq("id", user.id)
          .single();
        if (profile && !profile.onboarding_vu) {
          router.replace("/bienvenue");
        }
      } else if (!localStorage.getItem("tivoi_onboarding_vu")) {
        router.replace("/bienvenue");
      }
    }
    checkOnboarding();
  }, [router]);

  useEffect(() => {
    async function loadTendances() {
      const { data } = await supabase
        .from("catalogue")
        .select("id, titre, image_url, categorie, note, badge, prix_fcfa, type_acces")
        .eq("actif", true)
        .order("note", { ascending: false, nullsFirst: false })
        .limit(10);
      setTendances(data || []);
    }
    async function loadSlides() {
      const { data } = await supabase
        .from("a_une")
        .select("id, contenu_id, titre, accroche, image_url")
        .eq("actif", true)
        .order("ordre", { ascending: true });
      setSlides(data || []);
    }
    loadTendances();
    loadSlides();
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <main className="flex-grow min-h-screen flex flex-col pt-20">
      {/* Hero */}
      <section className="relative w-full h-[819px] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div
            className="bg-cover bg-center w-full h-full opacity-60"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA_kaIwBSBirYg1jWkjEriT9nEdkXbI3YE4GT-CGdwbplu4c_m-8BKOjg1Kf1avBtFLdEYj9GJL8aamaVHOSxyxYkbQ8rDcxTPgw5DyU6p4mCWW4hI3Wb_aPUnFa12zHcbphrxq8USx9qrjIdSAGvBI-TzI7oikIJgoDoWVDaNzZKDWk5X4xti5U0ZquWu3GdyJrPXWkAQGPLbMEEE_W1lE0lvFWFo1RlaSaVZajlnFoHp8wUsBYRf_')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
        <div className="relative z-10 text-center px-5 md:px-20 max-w-4xl mx-auto flex flex-col items-center gap-12">
          <h1 className="display-lg text-on-surface drop-shadow-2xl">
            Le cinéma premium ouest-africain.
          </h1>
          <p className="body-lg text-on-surface-variant max-w-2xl">
            Découvrez le sommet de la narration : sélection VOD exclusive, directs
            des meilleurs créateurs et chaînes TV en continu.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            <Link
              href="/catalogue"
              className="bg-primary text-on-primary-fixed label-md px-8 py-3 rounded hover:bg-primary-container transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)]"
            >
              Explorer la VOD
            </Link>
            <Link
              href="/guide-tv"
              className="border border-primary text-on-surface label-md px-8 py-3 rounded hover:bg-surface-high transition-colors"
            >
              Voir les chaînes TV
            </Link>
          </div>
        </div>
      </section>

      {/* Carrousel À la une */}
      {slides.length > 0 && (
        <section className="relative w-full h-[420px] md:h-[480px] overflow-hidden">
          {slides.map((s, i) => (
            <div
              key={s.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? "opacity-100 z-10" : "opacity-0 z-0"}`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${s.image_url || ""}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute bottom-0 left-0 w-full px-5 md:px-20 pb-10">
                <h2 className="display-lg text-on-surface mb-2">{s.titre}</h2>
                <p className="body-lg text-on-surface-variant max-w-xl mb-4">{s.accroche}</p>
                <Link
                  href={`/catalogue/${s.contenu_id}`}
                  className="inline-block bg-primary text-on-primary-fixed label-md uppercase px-8 py-3 rounded hover:bg-primary-container transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                >
                  Regarder
                </Link>
              </div>
            </div>
          ))}
          {/* Flèches */}
          <button
            onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass-panel flex items-center justify-center text-on-surface hover:text-primary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setSlide((s) => (s + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass-panel flex items-center justify-center text-on-surface hover:text-primary transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          {/* Points */}
          <div className="absolute bottom-4 right-5 md:right-20 z-20 flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === slide ? "bg-primary w-8" : "bg-surface-variant w-2"}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Bannière 1 */}
      <section className="px-5 md:px-20 py-6">
        <Banniere emplacement="accueil_h1" className="h-24 md:h-32" />
      </section>

      {/* Bento 3 piliers */}
      <section className="px-5 md:px-20 py-12">
        <h2 className="headline-md text-on-surface mb-6">Découvrir TiVoi</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILIERS.map((p) => (
            <Link
              key={p.titre}
              href={p.href}
              className={`bg-surface-container border border-outline-variant/30 rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group hover:border-primary/50 transition-colors ${p.decalage}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all" />
              <p.icon size={36} className="text-primary" />
              <h3 className="title-lg text-on-surface z-10">{p.titre}</h3>
              <p className="body-md text-on-surface-variant z-10">{p.texte}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Shelf Tendances */}
      <section className="px-5 md:px-20 py-12 border-t border-surface-high">
        <div className="flex justify-between items-end mb-6">
          <h2 className="headline-md text-on-surface">Tendances actuelles</h2>
          <Link href="/catalogue" className="label-md text-primary hover:text-primary-container transition-colors flex items-center gap-1">
            Voir tout →
          </Link>
        </div>
        {tendances.length === 0 ? (
          <p className="text-on-surface-variant body-md">
            Le catalogue arrive bientôt — connectez Supabase et ajoutez du contenu depuis l&apos;admin.
          </p>
        ) : (
          <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory hide-scrollbar">
            {tendances.map((film) => (
              <Link
                key={film.id}
                href={`/catalogue/${film.id}`}
                className="flex-none w-[200px] md:w-[240px] snap-start flex flex-col gap-2"
              >
                <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border border-outline-variant/10 movie-card cursor-pointer bg-surface-high">
                  <img src={film.image_url} alt={film.titre} className="w-full h-full object-cover" />
                  {film.note && (
                    <div className="absolute top-2 right-2 bg-surface-lowest/80 backdrop-blur-md px-2 py-1 rounded caption text-primary border border-primary/20 flex items-center gap-1">
                      <Star size={14} fill="currentColor" /> {film.note}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end p-4 opacity-0 hover:opacity-100 transition-opacity">
                    <span className="bg-primary text-on-primary-fixed w-full py-2 rounded label-md text-center flex items-center justify-center gap-2">
                      ▶ Regarder
                    </span>
                  </div>
                </div>
                <h3 className="title-lg text-on-surface truncate">{film.titre}</h3>
                <div className="flex justify-between items-center">
                  <span className="caption text-on-surface-variant">{film.categorie}</span>
                  <span className={`label-md ${film.type_acces === "gratuit" ? "text-secondary" : "text-primary"}`}>
                    {film.type_acces === "gratuit"
                      ? "Gratuit"
                      : film.type_acces === "abonnement"
                        ? "Abonnement"
                        : `${(film.prix_fcfa || 0).toLocaleString("fr-FR")} FCFA`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Bannière 2 */}
      <section className="px-5 md:px-20 py-6">
        <Banniere emplacement="accueil_h2" className="h-24 md:h-32" />
      </section>

      {/* Footer */}
      <footer className="mt-auto px-5 md:px-20 py-8 border-t border-outline-variant/10 text-xs text-outline flex flex-wrap gap-4 justify-between">
        <span>© {new Date().getFullYear()} TiVoi — Tous droits réservés.</span>
        <Link href="/legales" className="hover:text-primary transition-colors">
          Mentions légales · Confidentialité
        </Link>
      </footer>
    </main>
  );
}
