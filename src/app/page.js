"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Film, Tv, Clapperboard } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeReload } from "@/lib/useRealtime";
import Banniere from "./components/Banniere";
import LoaderCentered from "./components/LoaderCentered";
import CarteFilm from "./components/CarteFilm";
import FicheRapide from "./components/FicheRapide";
import FiltreCategories from "./components/FiltreCategories";
import ModaleConnexion from "./components/ModaleConnexion";

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

function Etagere({ titre, films, progressionMap = {}, onOpen }) {
  if (!films || films.length === 0) return null;
  return (
    <section className="px-5 md:px-20 pt-10 pb-4">
      <div className="flex justify-between items-end mb-5">
        <h2 className="headline-md text-on-surface">{titre}</h2>
        <Link href="/catalogue" className="caption text-primary hover:text-primary-container transition-colors">
          Tout voir →
        </Link>
      </div>
      {/* pt-2 : évite que la bordure du haut des cartes soit rognée par le conteneur scrollable */}
      <div className="flex overflow-x-auto gap-6 pt-2 pb-4 snap-x snap-mandatory hide-scrollbar">
        {films.map((film) => (
          <CarteFilm
            key={film.id}
            film={film}
            progressionPct={progressionMap[film.id] || 0}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

// Top 10 — même format d'étagère
function EtagereTop10({ films, onOpen }) {
  if (!films || films.length === 0) return null;
  return (
    <section className="px-5 md:px-20 pt-10 pb-4">
      <h2 className="headline-md text-on-surface mb-5">Top 10 aujourd&apos;hui</h2>
      <div className="flex overflow-x-auto gap-6 pt-2 pb-4 snap-x snap-mandatory hide-scrollbar">
        {films.map((film) => (
          <CarteFilm key={film.id} film={film} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const router = useRouter();
  const [catalogue, setCatalogue] = useState([]);
  const [aLaUne, setALaUne] = useState([]);
  const [reprendre, setReprendre] = useState([]);
  const [progressionMap, setProgressionMap] = useState({});
  const [connecte, setConnecte] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState("Tous");
  const [menuFiltre, setMenuFiltre] = useState(false);
  const [filmModale, setFilmModale] = useState(null);
  const [catalogueCharge, setCatalogueCharge] = useState(false);
  const [choixReprise, setChoixReprise] = useState(null);
  const [modaleConnexion, setModaleConnexion] = useState(false);

  const loadCatalogue = useCallback(async () => {
    const { data } = await supabase
      .from("catalogue")
      .select("id, titre, image_url, categorie, note, badge, prix_fcfa, type_acces, bande_annonce_url")
      .eq("actif", true)
      .order("ordre", { ascending: true });
    setCatalogue(data || []);
    setCatalogueCharge(true);
  }, []);

  const loadALaUne = useCallback(async () => {
    const { data } = await supabase
      .from("a_une")
      .select(
        "id, contenu_id, ordre, catalogue(id, titre, image_url, categorie, note, badge, prix_fcfa, type_acces, bande_annonce_url)"
      )
      .eq("actif", true)
      .order("ordre", { ascending: true });
    setALaUne(
      (data || [])
        .filter((s) => s.catalogue)
        .map((s) => ({ ...s.catalogue }))
    );
  }, []);

  const loadProgressions = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("[TiVoi] 1. Utilisateur connecté :", user ? user.id : "AUCUN");
    if (!user) {
      setReprendre([]);
      setProgressionMap({});
      return;
    }
    // 1. Récupérer les progressions de l'utilisateur
    const { data: progs, error } = await supabase
      .from("progressions")
      .select("contenu_id, position_secondes, duree_secondes, termine")
      .eq("user_id", user.id)
      .eq("termine", false)
      .gt("position_secondes", 5)
      .order("updated_at", { ascending: false })
      .limit(10);
    if (error) {
      console.error("[TiVoi] Erreur progressions :", error.message);
      return;
    }
    console.log("[TiVoi] 2. Progressions trouvées en base :", progs ? progs.length : "requête vide", JSON.stringify(progs || []));
    if (!progs || progs.length === 0) {
      setReprendre([]);
      return;
    }
    // 2. Récupérer les contenus correspondants
    const ids = progs.map((p) => Number(p.contenu_id));
    const { data: contenus } = await supabase
      .from("catalogue")
      .select("id, titre, image_url, categorie, note, badge, prix_fcfa, type_acces, bande_annonce_url")
      .in("id", ids)
      .eq("actif", true);
    if (!contenus) return;

    const map = {};
    progs.forEach((p) => {
      if (p.duree_secondes > 0) {
        map[Number(p.contenu_id)] = Math.round((p.position_secondes / p.duree_secondes) * 100);
      }
    });
    setProgressionMap((prev) => ({ ...prev, ...map }));

    const items = progs
      .map((p) => contenus.find((c) => c.id === Number(p.contenu_id)))
      .filter(Boolean)
      .map((c) => ({ ...c, pct: map[c.id] || 0 }));
    console.log("[TiVoi] 3. Étagère Reprendre contiendra :", items.length, "film(s)");
    setReprendre(items);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadCatalogue();
      loadALaUne();
      loadProgressions();
    }, 0);
    return () => clearTimeout(t);
  }, [loadCatalogue, loadALaUne, loadProgressions]);

  // Mises à jour automatiques : plus besoin de rafraîchir
  useRealtimeReload(["catalogue", "a_une"], loadCatalogue, [loadCatalogue]);
  useRealtimeReload(["a_une"], loadALaUne, [loadALaUne]);
  useRealtimeReload(["progressions"], loadProgressions, [loadProgressions]);

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, onboarding_vu")
          .eq("id", user.id)
          .single();
        // Un compte admin navigue toujours en mode visiteur sur le site client
        if (profile?.role === "admin") {
          setConnecte(false);
          setChargement(false);
          return;
        }
        setConnecte(true);
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

  const tendances = [...catalogue]
    .sort((a, b) => (b.note || 0) - (a.note || 0))
    .slice(0, 10);

  const categories = [...new Set(catalogue.map((f) => f.categorie).filter(Boolean))];

  function ouvrirFiche(film) {
    setFilmModale(film.id);
  }

  function ouvrirChoixReprise(film) {
    setChoixReprise(film);
  }

  // Tant que la session n'est pas vérifiée : spinner (pas de flash version visiteur)
  if (chargement) {
    return (
      <main className="flex-grow min-h-screen flex items-center justify-center pt-20">
        <LoaderCentered />
      </main>
    );
  }

  // ---------- Mode connecté : expérience Netflix ----------
  if (connecte) {
    const catsAffichees = filtre === "Tous" ? categories : categories.filter((c) => c === filtre);
    const cataloguePret = catalogue.length > 0;

    return (
      <main className="flex-grow min-h-screen flex flex-col pt-24">
        {/* Filtre : Tous + entonnoir */}
        <section className="px-5 md:px-20 pt-6 pb-2">
          <FiltreCategories categories={categories} filtre={filtre} setFiltre={setFiltre} />
        </section>

        {/* Squelettes pendant le chargement du catalogue */}
        {!cataloguePret && (
          <section className="px-5 md:px-20 py-8">
            <div className="h-6 w-56 skeleton mb-6" />
            <div className="flex gap-6 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex-none w-[200px] md:w-[240px]">
                  <div className="aspect-[2/3] skeleton mb-3" />
                  <div className="h-4 skeleton w-3/4 mb-2" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* « Tous » : tout s'affiche. Un filtre précis : uniquement sa catégorie */}
        {cataloguePret && filtre === "Tous" && reprendre.length > 0 && (
          <Etagere titre="Reprendre le visionnage" films={reprendre} progressionMap={progressionMap} onOpen={ouvrirChoixReprise} />
        )}

        {cataloguePret && filtre === "Tous" && <Etagere titre="À la une" films={aLaUne} onOpen={ouvrirFiche} />}

        {cataloguePret && filtre === "Tous" && <EtagereTop10 films={tendances} onOpen={ouvrirFiche} />}

        {catsAffichees.map((cat) => (
          <Etagere
            key={cat}
            titre={cat}
            films={catalogue.filter((f) => f.categorie === cat)}
            progressionMap={progressionMap}
            onOpen={ouvrirFiche}
          />
        ))}

        {catalogueCharge && catsAffichees.length === 0 && (
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

        {filmModale && <FicheRapide filmId={filmModale} onClose={() => setFilmModale(null)} />}

        {/* Choix : reprendre où l'on était, ou recommencer du début */}
        {choixReprise && (
          <div
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
            onClick={() => setChoixReprise(null)}
          >
            <div
              className="glass-panel rounded-xl max-w-md w-full p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {choixReprise.image_url && (
                <div
                  className="w-20 h-28 mx-auto rounded-lg bg-cover bg-center border border-primary/20 mb-4"
                  style={{ backgroundImage: `url('${choixReprise.image_url}')` }}
                />
              )}
              <h2 className="title-lg text-on-surface mb-1">{choixReprise.titre}</h2>
              <p className="caption text-on-surface-variant mb-6">
                Vous aviez regardé {progressionMap[choixReprise.id] || 0} % de ce contenu
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href={`/lecteur/${choixReprise.id}`}
                  className="bg-primary text-on-primary-fixed label-md px-6 py-3.5 rounded-lg hover:bg-primary-container transition-colors"
                >
                  ▶ Reprendre où j&apos;étais
                </Link>
                <Link
                  href={`/lecteur/${choixReprise.id}?restart=1`}
                  className="border border-outline-variant text-on-surface label-md px-6 py-3.5 rounded-lg hover:border-primary hover:text-primary transition-colors"
                >
                  Recommencer du début
                </Link>
                <button
                  onClick={() => setChoixReprise(null)}
                  className="caption text-on-surface-variant hover:text-primary transition-colors py-1"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
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
            <button
              onClick={() => setModaleConnexion(true)}
              className="border border-primary text-on-surface label-md px-8 py-3 rounded hover:bg-surface-high transition-colors"
            >
              Voir les chaînes TV
            </button>
          </div>
        </div>
      </section>

      {/* Bento 3 piliers — visiteur : connexion requise avant d'accéder */}
      <section className="px-5 md:px-20 py-12">
        <h2 className="headline-md text-on-surface mb-6">Découvrir TiVoi</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILIERS.map((p) =>
            connecte ? (
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
            ) : (
              <button
                key={p.titre}
                onClick={() => setModaleConnexion(true)}
                className={`text-left bg-surface-container border border-outline-variant/30 rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group hover:border-primary/50 transition-colors ${p.decalage}`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all" />
                <p.icon size={36} className="text-primary" />
                <h3 className="title-lg text-on-surface z-10">{p.titre}</h3>
                <p className="body-md text-on-surface-variant z-10">{p.texte}</p>
              </button>
            )
          )}
        </div>
      </section>

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

      {modaleConnexion && <ModaleConnexion onClose={() => setModaleConnexion(false)} />}
    </main>
  );
}
