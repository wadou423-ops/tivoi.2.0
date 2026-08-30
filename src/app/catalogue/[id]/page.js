"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Play, Coins, Plus, Send } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import LoaderCentered from "../../components/LoaderCentered";

export default function FicheContenu() {
  const { id } = useParams();
  const router = useRouter();
  const [film, setFilm] = useState(null);
  const [moyenne, setMoyenne] = useState(null);
  const [nbNotes, setNbNotes] = useState(0);
  const [commentaires, setCommentaires] = useState([]);
  const [maNote, setMaNote] = useState(0);
  const [texte, setTexte] = useState("");
  const [acces, setAcces] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    async function load() {
      const [f, notes, coms, session] = await Promise.all([
        supabase.from("catalogue").select("*").eq("id", id).single(),
        supabase.from("notes").select("note").eq("contenu_id", id),
        supabase
          .from("commentaires")
          .select("id, pseudo, texte, created_at")
          .eq("contenu_id", id)
          .order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ]);
      setFilm(f.data);
      if (notes.data?.length) {
        setMoyenne(notes.data.reduce((s, n) => s + n.note, 0) / notes.data.length);
        setNbNotes(notes.data.length);
      }
      setCommentaires(coms.data || []);

      const user = session.data.user;
      if (user) {
        const [mn, a] = await Promise.all([
          supabase
            .from("notes")
            .select("note")
            .eq("contenu_id", id)
            .eq("user_id", user.id)
            .maybeSingle(),
          f.data?.type_acces !== "gratuit"
            ? supabase
                .from("acces_contenus")
                .select("id, expire_le")
                .eq("contenu_id", id)
                .eq("user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: true }),
        ]);
        setMaNote(mn.data?.note || 0);
        setAcces(a.data);
      }
    }
    load();
  }, [id]);

  async function noter(note) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/connexion");

    if (maNote) {
      await supabase.from("notes").update({ note }).eq("contenu_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("notes").insert({ contenu_id: id, user_id: user.id, note });
    }
    setMaNote(note);
    const { data: notes } = await supabase.from("notes").select("note").eq("contenu_id", id);
    if (notes?.length) {
      setMoyenne(notes.reduce((s, n) => s + n.note, 0) / notes.length);
      setNbNotes(notes.length);
    }
  }

  async function commenter(e) {
    e.preventDefault();
    setEnvoi(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setEnvoi(false);
      return router.push("/connexion");
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", user.id)
      .single();

    const { data: c, error } = await supabase
      .from("commentaires")
      .insert({ contenu_id: id, user_id: user.id, pseudo: profile?.pseudo, texte })
      .select("id, pseudo, texte, created_at")
      .single();
    if (!error && c) setCommentaires([c, ...commentaires]);
    setTexte("");
    setEnvoi(false);
  }

  if (!film) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <LoaderCentered />
      </main>
    );
  }

  const meta = [film.annee, film.duree_minutes ? `${film.duree_minutes} min` : null, film.categorie]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="relative min-h-screen pb-12">
      {/* Retour */}
      <Link
        href="/catalogue"
        className="absolute top-24 left-5 md:left-20 z-50 flex items-center justify-center w-12 h-12 rounded-full glass-panel hover:bg-surface-high transition-colors"
      >
        <ArrowLeft size={20} className="text-on-surface" />
      </Link>

      {/* Hero */}
      <section className="relative w-full h-[614px] md:h-[720px] flex flex-col justify-end">
        <div className="absolute inset-0 w-full h-full -z-0">
          <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${film.image_url || ""}')` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
        </div>

        <div className="relative z-10 px-5 md:px-20 pb-12 w-full md:w-2/3 lg:w-1/2">
          <div className="flex items-center gap-2 mb-4">
            {film.badge && (
              <span className="px-3 py-1 caption text-primary border border-primary/30 rounded bg-primary/5">
                {film.badge}
              </span>
            )}
            {moyenne && (
              <span className="caption text-on-surface-variant flex items-center gap-1">
                <Star size={14} fill="currentColor" className="text-primary" />
                {moyenne.toFixed(1)} ({nbNotes} avis)
              </span>
            )}
          </div>
          <h1 className="display-lg text-on-surface mb-2">{film.titre}</h1>
          <div className="flex flex-wrap items-center gap-4 mb-6 body-md text-on-surface-variant">
            <span>{meta}</span>
            <span className="border border-outline-variant px-1 rounded text-xs">16+</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {film.type_acces === "gratuit" || acces ? (
              <Link
                href={`/lecteur/${film.id}`}
                className="bg-primary text-on-primary-fixed label-md px-8 py-3 rounded hover:bg-primary-container transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
              >
                <Play size={18} fill="currentColor" /> Regarder
              </Link>
            ) : (
              <Link
                href={`/paiement/achat/${film.id}`}
                className="bg-primary text-on-primary-fixed label-md px-8 py-3 rounded hover:bg-primary-container transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
              >
                {film.type_acces === "abonnement"
                  ? "S'abonner pour regarder"
                  : `Louer — ${(film.prix_fcfa || 0).toLocaleString("fr-FR")} FCFA`}
              </Link>
            )}
            <Link
              href="/jetons"
              className="glass-panel label-md px-8 py-3 rounded flex items-center justify-center gap-2 hover:border-primary/50 transition-colors"
            >
              <Coins size={18} className="text-primary" /> Acheter des Jetons
            </Link>
          </div>
        </div>
      </section>

      {/* Corps */}
      <div className="px-5 md:px-20 grid grid-cols-1 lg:grid-cols-3 gap-6 mt-12">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <section>
            <h2 className="headline-md text-on-surface mb-3">Synopsis</h2>
            <p className="body-lg text-on-surface-variant">{film.description || "Aucune description disponible."}</p>
          </section>
          {film.acteurs && (
            <section>
              <h2 className="headline-md text-on-surface mb-3">Distribution</h2>
              <p className="body-md text-on-surface-variant">{film.acteurs}</p>
            </section>
          )}

          {/* Commentaires */}
          <section>
            <h2 className="headline-md text-on-surface mb-4">Commentaires ({commentaires.length})</h2>
            <form onSubmit={commenter} className="glass-panel glow-focus rounded-xl p-4 mb-6">
              <textarea
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                required
                rows={3}
                placeholder="Partagez votre avis..."
                className="w-full bg-transparent border-0 outline-none text-on-surface resize-none placeholder:text-on-surface-variant/50"
              />
              <button
                type="submit"
                disabled={envoi}
                className="bg-primary text-on-primary-fixed label-md px-6 py-2 rounded hover:bg-primary-container transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={14} /> Publier
              </button>
            </form>
            <div className="space-y-4">
              {commentaires.map((c) => (
                <div key={c.id} className="border-b border-outline-variant/20 pb-4">
                  <p className="label-md text-primary">@{c.pseudo || "anonyme"}</p>
                  <p className="body-md text-on-surface-variant mt-1">{c.texte}</p>
                </div>
              ))}
              {commentaires.length === 0 && (
                <p className="body-md text-on-surface-variant">Soyez le premier à commenter.</p>
              )}
            </div>
          </section>
        </div>

        {/* Colonne droite : notation */}
        <aside className="glass-panel rounded-xl p-6 h-fit">
          <h2 className="title-lg text-primary mb-4">Votre note</h2>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => noter(n)} className="transition-transform hover:scale-110">
                <Star
                  size={28}
                  className={n <= maNote ? "text-primary" : "text-outline-variant"}
                  fill={n <= maNote ? "currentColor" : "none"}
                />
              </button>
            ))}
          </div>
          {moyenne && (
            <p className="caption text-on-surface-variant mt-3">
              Note moyenne : {moyenne.toFixed(1)}/5 sur {nbNotes} avis
            </p>
          )}
          <div className="mt-6 pt-6 border-t border-outline-variant/20">
            <p className="label-md text-on-surface mb-2">Détails</p>
            <ul className="caption text-on-surface-variant space-y-2">
              <li>Catégorie : {film.categorie || "—"}</li>
              <li>Durée : {film.duree_minutes ? `${film.duree_minutes} min` : "—"}</li>
              <li>Année : {film.annee || "—"}</li>
              <li>
                Accès :{" "}
                {film.type_acces === "gratuit"
                  ? "Gratuit"
                  : film.type_acces === "abonnement"
                    ? "Avec abonnement"
                    : `${(film.prix_fcfa || 0).toLocaleString("fr-FR")} FCFA à la séance`}
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
