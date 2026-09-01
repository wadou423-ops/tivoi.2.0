"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Play } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeReload } from "@/lib/useRealtime";
import LoaderCentered from "../components/LoaderCentered";
import FiltreCategories from "../components/FiltreCategories";
import CarteFilm from "../components/CarteFilm";

function Etagere({ titre, films, progressionMap = {}, onOpen }) {
  if (!films || films.length === 0) return null;
  return (
    <section className="px-5 md:px-20 pt-10 pb-4">
      <div className="flex justify-between items-end mb-5">
        <h2 className="headline-md text-on-surface">{titre}</h2>
      </div>
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

export default function CatalogueVOD() {
  const router = useRouter();
  const [films, setFilms] = useState([]);
  const [aLaUne, setALaUne] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorie, setCategorie] = useState("Tous les genres");
  const [connecte, setConnecte] = useState(false);
  const [progressionMap, setProgressionMap] = useState({});
  const [reprendre, setReprendre] = useState([]);
  const [choixReprise, setChoixReprise] = useState(null);
  const [connexionModale, setConnexionModale] = useState(false);

  const chargerTout = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setConnecte(!!user);

    const [{ data }, { data: une }] = await Promise.all([
      supabase
        .from("catalogue")
        .select("*")
        .eq("actif", true)
        .order("ordre", { ascending: true }),
      supabase
        .from("a_une")
        .select("ordre, catalogue(id, titre, image_url, categorie, note, badge, prix_fcfa, type_acces, bande_annonce_url)")
        .eq("actif", true)
        .order("ordre", { ascending: true }),
    ]);

    if (data) setFilms(data);
    if (une) setALaUne(une.filter((s) => s.catalogue).map((s) => ({ ...s.catalogue })));

    // Progressions du compte client connecté
    if (user) {
      const { data: progs } = await supabase
        .from("progressions")
        .select("contenu_id, position_secondes, duree_secondes")
        .eq("user_id", user.id)
        .eq("termine", false)
        .gt("position_secondes", 5)
        .order("updated_at", { ascending: false })
        .limit(10);
      const map = {};
      const ids = [];
      (progs || []).forEach((p) => {
        if (p.duree_secondes > 0) {
          map[p.contenu_id] = Math.round((p.position_secondes / p.duree_secondes) * 100);
        }
        ids.push(p.contenu_id);
      });
      setProgressionMap(map);
      if (ids.length > 0) {
        const { data: contenus } = await supabase
          .from("catalogue")
          .select("id, titre, image_url, categorie, note, badge, prix_fcfa, type_acces, bande_annonce_url")
          .in("id", ids)
          .eq("actif", true);
        const items = (progs || [])
          .map((p) => contenus?.find((c) => c.id === Number(p.contenu_id)))
          .filter(Boolean);
        setReprendre(items);
      } else {
        setReprendre([]);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // Différé d'une frame pour éviter un setState synchrone pendant l'effet
    const t = setTimeout(chargerTout, 0);
    return () => clearTimeout(t);
  }, [chargerTout]);

  // Mises à jour automatiques du catalogue
  useRealtimeReload(["catalogue", "a_une"], chargerTout, [chargerTout]);

  const genres = ["Tous les genres", ...new Set(films.map((f) => f.categorie))];
  const categories = [...new Set(films.map((f) => f.categorie).filter(Boolean))];
  const tendances = [...films]
    .sort((a, b) => (b.note || 0) - (a.note || 0))
    .slice(0, 10);

  // Page connectée : identique à l'accueil
  if (connecte && !loading) {
    const catsAffichees = categorie === "Tous les genres" ? categories : [categorie];
    const cataloguePret = films.length > 0;

    return (
      <main className="flex-grow min-h-screen flex flex-col pt-24">
        <section className="px-5 md:px-20 pt-6 pb-2">
          <FiltreCategories
            categories={categories}
            filtre={categorie}
            setFiltre={setCategorie}
          />
        </section>

        {cataloguePret && reprendre.length > 0 && (
          <Etagere titre="Reprendre le visionnage" films={reprendre} progressionMap={progressionMap} onOpen={setChoixReprise} />
        )}

        {cataloguePret && <Etagere titre="À la une" films={aLaUne} />}

        {cataloguePret && <EtagereTop10 films={tendances} />}

        {cataloguePret &&
          catsAffichees.map((cat) => (
            <Etagere
              key={cat}
              titre={cat}
              films={films.filter((f) => f.categorie === cat)}
              progressionMap={progressionMap}
            />
          ))}

        {cataloguePret && catsAffichees.length === 0 && (
          <p className="px-5 md:px-20 py-10 body-md text-on-surface-variant">
            Aucun contenu dans cette catégorie pour le moment.
          </p>
        )}

        <footer className="mt-auto px-5 md:px-20 py-8 border-t border-outline-variant/10 text-xs text-outline">
          © {new Date().getFullYear()} TiVoi — Tous droits réservés. · v2.2
        </footer>

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
                <button
                  onClick={() => router.push(`/lecteur/${choixReprise.id}`)}
                  className="bg-primary text-on-primary-fixed label-md px-6 py-3.5 rounded-lg hover:bg-primary-container transition-colors"
                >
                  ▶ Reprendre où j&apos;étais
                </button>
                <button
                  onClick={() => router.push(`/lecteur/${choixReprise.id}?restart=1`)}
                  className="border border-outline-variant text-on-surface label-md px-6 py-3.5 rounded-lg hover:border-primary hover:text-primary transition-colors"
                >
                  Recommencer du début
                </button>
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

  // Visiteur : page vitrine avec grille
  if (loading) {
    return (
      <main className="px-6 md:px-20 pt-28 pb-12">
        <LoaderCentered />
      </main>
    );
  }

  return (
    <main className="px-6 md:px-20 pt-28 pb-12">
      <div className="mb-10">
        <h1 className="font-display font-bold text-5xl md:text-6xl text-on-surface tracking-[-0.02em] mb-3">
          Catalogue VOD
        </h1>
        <p className="text-lg text-on-surface-variant mb-6 max-w-2xl">
          Découvrez le meilleur du cinéma ouest-africain. Des productions premium, des histoires
          captivantes, en exclusivité sur TiVoi.
        </p>

        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setCategorie(g)}
              className={`px-4 py-2 rounded-lg text-sm font-title font-semibold whitespace-nowrap transition-colors ${
                categorie === g
                  ? "bg-primary-container/20 border border-primary text-primary"
                  : "bg-transparent border border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {filmsAffiches.length === 0 ? (
        <p className="text-on-surface-variant">
          Aucun contenu pour l&apos;instant dans cette catégorie.
        </p>
      ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
              {filmsAffiches.map((film) => (
                <div
                  key={film.id}
                  onClick={() => setConnexionModale(true)}
                  className="group cursor-pointer flex flex-col gap-2"
                >
              <div className="relative aspect-[2/3] w-full bg-surface-high rounded-lg overflow-hidden border border-transparent group-hover:border-primary-container transition-all">
                {film.image_url && (
                  <img src={film.image_url} alt={film.titre} className="w-full h-full object-cover" />
                )}
                {film.note && (
                  <div className="absolute top-2 right-2 bg-surface-lowest/80 backdrop-blur-md px-2 py-1 rounded text-xs text-primary border border-primary-container/20 flex items-center gap-1">
                    <Star size={12} fill="currentColor" /> {film.note}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary hover:scale-110 transition-transform">
                    <Play size={20} fill="currentColor" />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="font-title font-semibold text-on-surface truncate">{film.titre}</h3>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-on-surface-variant">
                    {film.categorie}
                    {film.annee ? ` • ${film.annee}` : ""}
                  </span>
                  <span
                    className={`text-sm font-title font-semibold ${
                      film.badge === "GRATUIT" ? "text-secondary" : "text-primary"
                    }`}
                  >
                    {film.badge === "GRATUIT" ? "Gratuit" : film.badge}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="mt-16 py-8 border-t border-outline-variant/10 text-xs text-outline">
        © {new Date().getFullYear()} TiVoi — Tous droits réservés. · v2.2
      </footer>

      {/* Modale : le visiteur doit se connecter pour explorer le catalogue */}
      {connexionModale && (
        <div
          className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
          onClick={() => setConnexionModale(false)}
        >
          <div
            className="glass-panel rounded-xl max-w-md w-full p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setConnexionModale(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full glass-panel flex items-center justify-center text-on-surface hover:text-primary transition-colors"
            >
              ✕
            </button>
            <h2 className="font-display font-bold text-3xl text-primary tracking-tight mb-3">TiVoi</h2>
            <p className="body-lg text-on-surface mb-8">
              Connectez-vous pour explorer le catalogue TiVoi — films, séries et
              documentaires premium.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/connexion"
                className="bg-primary text-on-primary-fixed label-md px-6 py-3.5 rounded-lg hover:bg-primary-container transition-colors"
              >
                Se connecter
              </Link>
              <Link
                href="/inscription"
                className="border border-primary text-primary label-md px-6 py-3.5 rounded-lg hover:bg-primary hover:text-on-primary-fixed transition-colors"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
