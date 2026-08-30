"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Film, Tv, Clapperboard, Star } from "lucide-react";
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

function CarteFilm({ film }) {
  return (
    <Link href={`/catalogue/${film.id}`} className="flex-none w-[200px] md:w-[240px] snap-start flex flex-col gap-2">
      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border border-outline-variant/10 movie-card cursor-pointer bg-surface-high">
        {film.image_url && (
          <img src={film.image_url} alt={film.titre || "Contenu"} className="w-full h-full object-cover" />
        )}
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
  );
}

export default function Home() {
  const router = useRouter();
  const [catalogue, setCatalogue] = useState([]);
  const [aLaUne, setALaUne] = useState([]);
  const [connecte, setConnecte] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState("Tous");

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setConnecte(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_vu")
          .eq("id", user.id)
          .single();
        if (profile && !profile.onboarding_vu) {
          router.replace("/bienvenue");
          return;
        }
      } else if (!localStorage.getItem("tivoi_onboarding_vu")) {
        router.replace("/bienvenue");
        return;
      }
      setChargement(false);
    }
    check();
  }, [router]);

  useEffect(() => {
    async function loadCatalogue() {
      const { data } = await supabase
        .from("catalogue")
        .select("id, titre, image_url, categorie, note, badge, prix_fcfa, type_acces")
        .eq("actif", true)
        .order("ordre", { ascending: true });
      setCatalogue(data || []);
    }
    async function loadALaUne() {
      const { data } = await supabase
        .from("a_une")
        .select("id, contenu_id, ordre, catalogue(id, titre, image_url, categorie, note, badge, prix_fcfa, type_acces)")
        .eq("actif", true)
        .order("ordre", { ascending: true });
      // Transformer chaque entrée en carte comme celles du catalogue
      setALaUne(
        (data || [])
          .filter((s) => s.catalogue)
          .map((s) => ({ ...s.catalogue }))
      );
    }
    loadCatalogue();
    loadALaUne();
  }, []);

  const tendances = [...catalogue]
    .sort((a, b) => (b.note || 0) - (a.note || 0))
    .slice(0, 10);

  const categories = [...new Set(catalogue.map((f) => f.categorie).filter(Boolean))];

  function Etagere({ titre, films, lien }) {
    if (!films || films.length === 0) return null;
    return (
      <section className="px-5 md:px-20 py-6">
        <div className="flex justify-between items-end mb-4">
          <h2 className="headline-md text-on-surface">{titre}</h2>
          <Link href={lien || "/catalogue"} className="caption text-primary hover:text-primary-container transition-colors">
            Tout voir →
          </Link>
        </div>
        <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory hide-scrollbar">
          {films.map((film) => (
            <CarteFilm key={film.id} film={film} />
          ))}
        </div>
      </section>
    );
  }

  // ---------- Mode connecté : expérience Netflix ----------
  if (connecte && !chargement) {
    const catsAffichees = filtre === "Tous" ? categories : categories.filter((c) => c === filtre);

    return (
      <main className="flex-grow min-h-screen flex flex-col pt-20">
        {/* Filtres par catégorie */}
        <section className="px-5 md:px-20 pt-10 pb-2">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {["Tous", ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setFiltre(c)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm font-title font-semibold ${
                  filtre === c
                    ? "bg-primary-container/20 border border-primary text-primary"
                    : "bg-transparent border border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        <Etagere titre="À la une" films={aLaUne} />

        <Etagere titre="Tendances actuelles" films={tendances} />

        {catsAffichees.map((cat) => (
          <Etagere key={cat} titre={cat} films={catalogue.filter((f) => f.categorie === cat)} />
        ))}

        {catsAffichees.length === 0 && (
          <p className="px-5 md:px-20 py-10 body-md text-on-surface-variant">
            Aucun contenu dans cette catégorie pour le moment.
          </p>
        )}

        <Banniere emplacement="accueil_h2" className="mx-5 md:mx-20 my-6 h-24 md:h-32" />

        <footer className="mt-auto px-5 md:px-20 py-8 border-t border-outline-variant/10 text-xs text-outline flex flex-wrap gap-4 justify-between">
          <span>© {new Date().getFullYear()} TiVoi — Tous droits réservés.</span>
          <Link href="/legales" className="hover:text-primary transition-colors">
            Mentions légales · Confidentialité
          </Link>
        </footer>
      </main>
    );
  }

  // ---------- Mode visiteur : page marketing ----------
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

      <Etagere titre="À la une" films={aLaUne} />

      <Etagere titre="Tendances actuelles" films={tendances} />

      {/* Bannière */}
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
