"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import LoaderCentered from "../../components/LoaderCentered";
import CustomVideoPlayer from "../../components/CustomVideoPlayer";
import YouTubePlayerProgress from "../../components/YouTubePlayerProgress";

export default function Lecteur() {
  const { id } = useParams();
  const router = useRouter();
  const [film, setFilm] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [acces, setAcces] = useState(null); // null = vérification en cours
  const [restart, setRestart] = useState(false);

  useEffect(() => {
    async function load() {
      // ?restart=1 → l'utilisateur a choisi de recommencer du début
      setRestart(window.location.search.includes("restart=1"));
      const { data: f } = await supabase.from("catalogue").select("*").eq("id", id).single();
      if (!f) {
        setFilm(null);
        setChargement(false);
        return;
      }
      // Contrôle d'accès : gratuit → OK ; payant → vérifié côté base (RPC)
      if (f.type_acces === "gratuit") {
        setAcces(true);
      } else {
        const { data: ok } = await supabase.rpc("verifier_acces", { p_contenu_id: f.id });
        setAcces(!!ok);
      }
      setFilm(f);
      setChargement(false);
    }
    load();
  }, [id]);

  if (chargement) {
    return (
      <main className="min-h-screen bg-surface-lowest flex items-center justify-center">
        <LoaderCentered />
      </main>
    );
  }

  if (!film) {
    return (
      <main className="min-h-screen bg-surface-lowest flex items-center justify-center">
        <p className="text-on-surface-variant">Contenu introuvable.</p>
      </main>
    );
  }

  // Accès payant refusé : l'utilisateur paie ou s'abonne, le lecteur ne joue pas
  if (acces === false) {
    return (
      <main className="min-h-screen bg-surface-lowest flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <i className="ph-duotone ph-lock-key text-primary mb-6 inline-block" style={{ fontSize: 64 }} aria-hidden="true" />
          <h1 className="title-lg text-on-surface mb-2">Ce contenu est réservé</h1>
          <p className="body-md text-on-surface-variant mb-8">
            {film.type_acces === "abonnement"
              ? "Abonnez-vous pour accéder à tout le catalogue."
              : "Achetez l'accès à ce contenu pour le regarder."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={film.type_acces === "abonnement" ? "/abonnements" : `/paiement/achat/${film.id}`}
              className="bg-primary text-on-primary-fixed label-md px-8 py-3 rounded hover:bg-primary-container transition-colors"
            >
              {film.type_acces === "abonnement" ? "Voir les abonnements" : `Payer ${(film.prix_fcfa || 0).toLocaleString("fr-FR")} FCFA`}
            </Link>
            <Link
              href={`/catalogue/${film.id}`}
              className="border border-outline-variant text-on-surface label-md px-8 py-3 rounded hover:border-primary hover:text-primary transition-colors"
            >
              Retour à la fiche
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const url = film.bande_annonce_url || film.image_url;
  const idYoutube = url
    ? url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/)
    : null;
  const estMp4 = url && /\.(mp4|webm|mov)(\?|#|$)/i.test(url);

  return (
    <main className="relative min-h-screen bg-surface-lowest flex items-center justify-center overflow-hidden select-none">
      {idYoutube ? (
        <div className="w-full h-screen">
          <YouTubePlayerProgress videoId={idYoutube[1]} contenuId={film.id} restart={restart} />
        </div>
      ) : estMp4 ? (
        <div className="w-full h-screen">
          <CustomVideoPlayer src={url} contenuId={film.id} restart={restart} />
        </div>
      ) : (
        <div className="relative w-full h-screen">
          <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${film.image_url || ""}')` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
          <div className="absolute bottom-16 left-5 md:left-20">
            <h1 className="display-lg text-on-surface">{film.titre}</h1>
            <p className="body-lg text-on-surface-variant mt-2 max-w-xl">
              Le flux vidéo de ce contenu sera disponible dès la connexion du CDN vidéo.
            </p>
          </div>
        </div>
      )}

      {/* Bouton retour : revient à l'écran précédent (fiche ou accueil) */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 right-6 z-50 flex items-center gap-2 rounded-lg glass-panel px-4 py-2.5 text-on-surface hover:text-primary transition-colors"
      >
        <i className="ph-duotone ph-arrow-left" style={{ fontSize: 18 }} /> <span className="text-sm">Retour</span>
      </button>

      {/* Filigrane */}
      <span className="absolute top-6 left-6 z-20 font-display font-bold text-xl text-primary/50 pointer-events-none">
        TiVoi
      </span>
    </main>
  );
}
